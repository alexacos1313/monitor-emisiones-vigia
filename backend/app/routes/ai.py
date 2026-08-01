# backend/app/routes/ai.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import re
from collections import Counter
from database import get_db
from models import Usuario, Empresa, Sensor, Planta, Alarma, Medicion, MedicionContaminante
from schemas import PreguntaRequest, PreguntaResponse  
from auth import get_current_user
from ai_config import get_query_engine, init_ai
from ai_prompt import SYSTEM_PROMPT

router = APIRouter(prefix="/ai", tags=["Inteligencia Artificial"])

# Palabras clave para validar la pregunta
PALABRAS_CLAVE = [
    'alarma', 'alarmas', 'alerta', 'alertas', 'crítico', 'crítica', 'críticas',
    'medición', 'mediciones', 'promedio', 'media', 'máximo', 'mínimo', 'tendencia',
    'sensor', 'sensores', 'activo', 'inactivo', 'mantenimiento',
    'empresa', 'empresas', 'planta', 'plantas', 'ubicación', 'ubicaciones',
    'emisión', 'emisiones', 'contaminante', 'contaminantes', 'co2', 'nox', 'so2',
    'umbral', 'umbrales', 'límite', 'límites', 'normativa', 'normativas',
    'hoy', 'día', 'semana', 'mes', 'año', 'último', 'última', 'reciente',
    'total', 'cantidad', 'número', 'cuánto', 'cuántos', 'cuántas'
]

# Mapeo de contaminantes para normalizar nombres
MAPEO_CONTAMINANTES = {
    "co2": "CO2",
    "co₂": "CO2",
    "nox": "NOX",
    "noₓ": "NOX",
    "no2": "NO2",
    "no₂": "NO2",
    "so2": "SO2",
    "so₂": "SO2",
    "co": "CO",
    "no": "NO"
}

# Lista de palabras que indican una petición de promedio
PALABRAS_PROMEDIO = ["promedio", "media", "average", "prom", "promediar"]

# Memoria simple para recordar el último contexto de la conversación
contexto_conversacion = {}

def guardar_contexto(usuario_id: int, clave: str, valor: any):
    """Guarda contexto de la conversación para un usuario"""
    if usuario_id not in contexto_conversacion:
        contexto_conversacion[usuario_id] = {}
    contexto_conversacion[usuario_id][clave] = valor

def obtener_contexto(usuario_id: int, clave: str):
    """Obtiene contexto de la conversación para un usuario"""
    if usuario_id in contexto_conversacion:
        return contexto_conversacion[usuario_id].get(clave)
    return None

def limpiar_contexto(usuario_id: int):
    """Limpia el contexto de la conversación para un usuario"""
    if usuario_id in contexto_conversacion:
        contexto_conversacion[usuario_id] = {}

def normalizar_contaminante(pregunta: str) -> str:
    """Normaliza el nombre del contaminante en la pregunta"""
    pregunta_lower = pregunta.lower()
    for key, value in MAPEO_CONTAMINANTES.items():
        if key in pregunta_lower:
            # Reemplazar en la pregunta original
            pregunta = pregunta.replace(key, value)
            pregunta = pregunta.replace(key.upper(), value)
            pregunta = pregunta.replace(key.capitalize(), value)
            # También reemplazar con subíndices
            if "₂" in pregunta:
                pregunta = pregunta.replace("₂", "2")
            if "ₓ" in pregunta:
                pregunta = pregunta.replace("ₓ", "X")
    return pregunta

def extraer_contaminante(pregunta: str) -> Optional[str]:
    """Extrae el contaminante de la pregunta si existe"""
    pregunta_lower = pregunta.lower()
    for key, value in MAPEO_CONTAMINANTES.items():
        if key in pregunta_lower:
            return value
    return None

def extraer_contaminante_de_respuesta(pregunta: str) -> Optional[str]:
    """Extrae el contaminante de una respuesta corta como 'CO', 'NO', etc."""
    pregunta_clean = pregunta.strip().upper()
    contaminantes_validos = ["CO", "NO", "NO2", "NOX", "SO2", "CO2"]
    for c in contaminantes_validos:
        if pregunta_clean == c or pregunta_clean.startswith(c):
            return c
    return None

def es_pregunta_valida(pregunta: str) -> bool:
    """Verifica si la pregunta está relacionada con el dominio del sistema"""
    pregunta_lower = pregunta.lower()
    for palabra in PALABRAS_CLAVE:
        if palabra in pregunta_lower:
            return True
    return False

def es_respuesta_afirmativa(pregunta: str) -> bool:
    """Verifica si la respuesta es afirmativa (si, sí, ok, vale, claro, etc.)"""
    respuestas_afirmativas = ["si", "sí", "yes", "ok", "vale", "claro", "por supuesto", "dale", "vamos"]
    pregunta_clean = pregunta.lower().strip()
    return pregunta_clean in respuestas_afirmativas or pregunta_clean.startswith("si")

def es_pregunta_promedio(pregunta: str) -> bool:
    """Verifica si la pregunta es sobre un promedio"""
    pregunta_lower = pregunta.lower()
    for palabra in PALABRAS_PROMEDIO:
        if palabra in pregunta_lower:
            return True
    return False

def obtener_contaminantes_disponibles(db: Session, empresa_id: Optional[int] = None) -> List[str]:
    """Obtiene la lista de contaminantes disponibles en la base de datos"""
    query = db.query(MedicionContaminante.contaminante).distinct()
    
    if empresa_id:
        # Filtrar por empresa
        query = query.join(
            Medicion, Medicion.id == MedicionContaminante.id_medicion
        ).join(
            Sensor, Sensor.id == Medicion.id_sensor
        ).join(
            Planta, Planta.id == Sensor.id_planta
        ).filter(Planta.id_empresa == empresa_id)
    
    resultados = query.all()
    return [r[0] for r in resultados] if resultados else ["CO", "NO", "NO2", "NOX"]

def obtener_contexto_empresa(current_user: Usuario, db: Session) -> dict:
    """Obtiene el contexto de la empresa del usuario"""
    contexto = {
        "empresa_id": None,
        "empresa_nombre": None,
        "sensores": [],
        "plantas": [],
        "total_sensores": 0,
        "total_plantas": 0,
        "total_empresas": db.query(Empresa).count()
    }
    
    if current_user.rol == "SUPER_ADMIN":
        # SUPER_ADMIN puede ver todo
        contexto["empresa_id"] = None
        contexto["empresa_nombre"] = "Todas las empresas"
        contexto["total_sensores"] = db.query(Sensor).count()
        contexto["total_plantas"] = db.query(Planta).count()
        return contexto
    
    # Para otros roles, obtener su empresa
    if current_user.id_empresa:
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        if empresa:
            contexto["empresa_id"] = empresa.id
            contexto["empresa_nombre"] = empresa.nombre
            
            # Obtener plantas y sensores de la empresa
            plantas = db.query(Planta).filter(Planta.id_empresa == empresa.id).all()
            contexto["total_plantas"] = len(plantas)
            contexto["plantas"] = [{"id": p.id, "nombre": p.nombre} for p in plantas]
            
            for planta in plantas:
                sensores = db.query(Sensor).filter(Sensor.id_planta == planta.id).all()
                for sensor in sensores:
                    contexto["sensores"].append({
                        "id": sensor.id,
                        "nombre": sensor.nombre,
                        "planta": planta.nombre,
                        "estado": sensor.estado
                    })
            contexto["total_sensores"] = len(contexto["sensores"])
    
    return contexto

def obtener_resumen_empresa(current_user: Usuario, db: Session) -> str:
    """Obtiene un resumen de la empresa para dar contexto a la IA"""
    contexto = obtener_contexto_empresa(current_user, db)
    
    if current_user.rol == "SUPER_ADMIN":
        return f"Eres SUPER_ADMIN. Puedes ver datos de todas las empresas. Total: {contexto['total_empresas']} empresas, {contexto['total_plantas']} plantas, {contexto['total_sensores']} sensores."
    
    if not contexto["empresa_nombre"]:
        return "No tienes una empresa asociada."
    
    resumen = f"Empresa: {contexto['empresa_nombre']} (ID: {contexto['empresa_id']})"
    resumen += f"\nPlantas: {contexto['total_plantas']}"
    for p in contexto["plantas"]:
        resumen += f"\n  - {p['nombre']}"
    
    if contexto["sensores"]:
        resumen += f"\nSensores: {contexto['total_sensores']}"
        for s in contexto["sensores"]:
            resumen += f"\n  - {s['nombre']} (Planta: {s['planta']}) - Estado: {s['estado']}"
    
    return resumen

def contar_alarmas_por_sensor(current_user: Usuario, db: Session) -> str:
    """Cuenta las alarmas pendientes por sensor para dar una respuesta detallada"""
    if current_user.rol == "SUPER_ADMIN":
        alarmas = db.query(Alarma).filter(Alarma.confirmada_por == None).all()
        empresas_nombre = "todas las empresas"
    else:
        # Obtener sensores de la empresa del usuario
        sensores_ids = db.query(Sensor.id).join(Planta).filter(
            Planta.id_empresa == current_user.id_empresa
        ).subquery()
        alarmas = db.query(Alarma).filter(
            Alarma.id_sensor.in_(sensores_ids),
            Alarma.confirmada_por == None
        ).all()
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        empresas_nombre = f"tu empresa '{empresa.nombre}'" if empresa else "tu empresa"
    
    if not alarmas:
        return f"No hay alarmas pendientes en {empresas_nombre}."
    
    # Contar por sensor y tipo
    contador_sensor = Counter()
    contador_tipo = Counter()
    detalles = []
    
    for alarma in alarmas:
        sensor = db.query(Sensor).filter(Sensor.id == alarma.id_sensor).first()
        if sensor:
            contador_sensor[sensor.nombre] += 1
            contador_tipo[alarma.tipo] += 1
            detalles.append(f"  - {sensor.nombre}: {alarma.tipo} - {alarma.contaminante} ({alarma.valor} mg/m³)")
    
    resultado = f"Hay {len(alarmas)} alarmas pendientes en {empresas_nombre}:\n"
    resultado += f"  Por tipo: {', '.join([f'{tipo}: {cantidad}' for tipo, cantidad in contador_tipo.most_common()])}\n"
    resultado += "  Por sensor:\n"
    for sensor, cantidad in contador_sensor.most_common():
        resultado += f"    - {sensor}: {cantidad} alarma(s)\n"
    
    # Mostrar las últimas 3 alarmas como ejemplo
    if len(alarmas) > 0:
        resultado += "\n  Últimas alarmas:\n"
        for detalle in detalles[:3]:
            resultado += f"    {detalle}\n"
        if len(detalles) > 3:
            resultado += f"    ... y {len(detalles) - 3} más\n"
    
    return resultado

def contar_empresas(current_user: Usuario, db: Session) -> str:
    """Cuenta las empresas según el rol del usuario"""
    if current_user.rol == "SUPER_ADMIN":
        total = db.query(Empresa).count()
        empresas = db.query(Empresa).all()
        nombres = ", ".join([e.nombre for e in empresas])
        return f"Hay {total} empresas en el sistema:\n  - {nombres}"
    else:
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        if empresa:
            return f"Eres parte de la empresa '{empresa.nombre}'. Solo tienes acceso a los datos de tu empresa."
        else:
            return "No tienes una empresa asociada."

def contar_sensores(current_user: Usuario, db: Session) -> str:
    """Cuenta los sensores según el rol del usuario"""
    if current_user.rol == "SUPER_ADMIN":
        total = db.query(Sensor).count()
        activos = db.query(Sensor).filter(Sensor.estado == "ACTIVO").count()
        mantenimiento = db.query(Sensor).filter(Sensor.estado == "MANTENIMIENTO").count()
        inactivos = db.query(Sensor).filter(Sensor.estado == "INACTIVO").count()
        return f"Hay {total} sensores en total:\n  - Activos: {activos}\n  - En mantenimiento: {mantenimiento}\n  - Inactivos: {inactivos}"
    else:
        # Obtener IDs de plantas de la empresa del usuario
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == current_user.id_empresa).subquery()
        sensores = db.query(Sensor).filter(Sensor.id_planta.in_(plantas_ids)).all()
        
        total = len(sensores)
        activos = len([s for s in sensores if s.estado == "ACTIVO"])
        mantenimiento = len([s for s in sensores if s.estado == "MANTENIMIENTO"])
        inactivos = len([s for s in sensores if s.estado == "INACTIVO"])
        
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        nombre_empresa = empresa.nombre if empresa else "tu empresa"
        
        return f"Hay {total} sensores en {nombre_empresa}:\n  - Activos: {activos}\n  - En mantenimiento: {mantenimiento}\n  - Inactivos: {inactivos}"

def calcular_promedio_contaminante(current_user: Usuario, db: Session, contaminante: str, periodo: str = "7 days") -> str:
    """Calcula el promedio de un contaminante para la empresa del usuario"""
    contaminante_normalizado = normalizar_contaminante(contaminante)
    
    from sqlalchemy import func
    
    if current_user.rol == "SUPER_ADMIN":
        query = db.query(MedicionContaminante).join(
            Medicion, Medicion.id == MedicionContaminante.id_medicion
        ).join(
            Sensor, Sensor.id == Medicion.id_sensor
        ).filter(
            MedicionContaminante.contaminante == contaminante_normalizado,
            Medicion.timestamp >= func.datetime('now', f'-{periodo}')
        )
    else:
        query = db.query(MedicionContaminante).join(
            Medicion, Medicion.id == MedicionContaminante.id_medicion
        ).join(
            Sensor, Sensor.id == Medicion.id_sensor
        ).join(
            Planta, Planta.id == Sensor.id_planta
        ).filter(
            MedicionContaminante.contaminante == contaminante_normalizado,
            Planta.id_empresa == current_user.id_empresa,
            Medicion.timestamp >= func.datetime('now', f'-{periodo}')
        )
    
    resultados = query.all()
    
    if not resultados:
        # Si no hay datos en el período, usar todos los datos
        if current_user.rol == "SUPER_ADMIN":
            query_total = db.query(MedicionContaminante).join(
                Medicion, Medicion.id == MedicionContaminante.id_medicion
            ).join(
                Sensor, Sensor.id == Medicion.id_sensor
            ).filter(
                MedicionContaminante.contaminante == contaminante_normalizado
            )
        else:
            query_total = db.query(MedicionContaminante).join(
                Medicion, Medicion.id == MedicionContaminante.id_medicion
            ).join(
                Sensor, Sensor.id == Medicion.id_sensor
            ).join(
                Planta, Planta.id == Sensor.id_planta
            ).filter(
                MedicionContaminante.contaminante == contaminante_normalizado,
                Planta.id_empresa == current_user.id_empresa
            )
        
        resultados_total = query_total.all()
        
        if not resultados_total:
            return f"No hay datos de {contaminante_normalizado} en el sistema."
        
        valores = [r.valor for r in resultados_total]
        promedio = sum(valores) / len(valores)
        maximo = max(valores)
        minimo = min(valores)
        
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        nombre_empresa = empresa.nombre if empresa else "tu empresa"
        
        return f"El promedio de {contaminante_normalizado} en {nombre_empresa} (todos los datos históricos) es de {round(promedio, 2)} mg/m³.\n" + \
               f"  - Máximo: {round(maximo, 2)} mg/m³\n" + \
               f"  - Mínimo: {round(minimo, 2)} mg/m³\n" + \
               f"  - Total de mediciones: {len(valores)}"
    
    # Si hay datos en el período
    valores = [r.valor for r in resultados]
    promedio = sum(valores) / len(valores)
    maximo = max(valores)
    minimo = min(valores)
    
    empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
    nombre_empresa = empresa.nombre if empresa else "tu empresa"
    
    periodo_texto = {
        "1 day": "1 día",
        "7 days": "7 días (1 semana)",
        "30 days": "30 días (1 mes)",
        "365 days": "365 días (1 año)"
    }.get(periodo, periodo)
    
    return f"El promedio de {contaminante_normalizado} en {nombre_empresa} en los últimos {periodo_texto} es de {round(promedio, 2)} mg/m³.\n" + \
           f"  - Máximo: {round(maximo, 2)} mg/m³\n" + \
           f"  - Mínimo: {round(minimo, 2)} mg/m³\n" + \
           f"  - Total de mediciones: {len(valores)}"

def listar_sensores_activos(current_user: Usuario, db: Session) -> str:
    """Lista los sensores activos de la empresa del usuario"""
    if current_user.rol == "SUPER_ADMIN":
        sensores = db.query(Sensor).filter(Sensor.estado == "ACTIVO").all()
        empresa_texto = "todas las empresas"
    else:
        # Obtener plantas de la empresa del usuario
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == current_user.id_empresa).subquery()
        sensores = db.query(Sensor).filter(
            Sensor.id_planta.in_(plantas_ids),
            Sensor.estado == "ACTIVO"
        ).all()
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        empresa_texto = f"tu empresa '{empresa.nombre}'" if empresa else "tu empresa"
    
    if not sensores:
        return f"No hay sensores activos en {empresa_texto}."
    
    resultado = f"Sensores activos en {empresa_texto}:\n"
    for sensor in sensores:
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        planta_nombre = planta.nombre if planta else "Sin planta"
        contaminantes_str = ", ".join(sensor.contaminantes) if sensor.contaminantes else "Sin contaminantes"
        resultado += f"  - {sensor.nombre} (Planta: {planta_nombre}) - Contaminantes: {contaminantes_str}\n"
    
    return resultado

def listar_sensores_mantenimiento(current_user: Usuario, db: Session) -> str:
    """Lista los sensores en mantenimiento de la empresa del usuario"""
    if current_user.rol == "SUPER_ADMIN":
        sensores = db.query(Sensor).filter(Sensor.estado == "MANTENIMIENTO").all()
        empresa_texto = "todas las empresas"
    else:
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == current_user.id_empresa).subquery()
        sensores = db.query(Sensor).filter(
            Sensor.id_planta.in_(plantas_ids),
            Sensor.estado == "MANTENIMIENTO"
        ).all()
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        empresa_texto = f"tu empresa '{empresa.nombre}'" if empresa else "tu empresa"
    
    if not sensores:
        return f"No hay sensores en mantenimiento en {empresa_texto}."
    
    resultado = f"Sensores en mantenimiento en {empresa_texto}:\n"
    for sensor in sensores:
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        planta_nombre = planta.nombre if planta else "Sin planta"
        resultado += f"  - {sensor.nombre} (Planta: {planta_nombre})\n"
    
    return resultado

def listar_sensores_inactivos(current_user: Usuario, db: Session) -> str:
    """Lista los sensores inactivos de la empresa del usuario"""
    if current_user.rol == "SUPER_ADMIN":
        sensores = db.query(Sensor).filter(Sensor.estado == "INACTIVO").all()
        empresa_texto = "todas las empresas"
    else:
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == current_user.id_empresa).subquery()
        sensores = db.query(Sensor).filter(
            Sensor.id_planta.in_(plantas_ids),
            Sensor.estado == "INACTIVO"
        ).all()
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        empresa_texto = f"tu empresa '{empresa.nombre}'" if empresa else "tu empresa"
    
    if not sensores:
        return f"No hay sensores inactivos en {empresa_texto}."
    
    resultado = f"Sensores inactivos en {empresa_texto}:\n"
    for sensor in sensores:
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        planta_nombre = planta.nombre if planta else "Sin planta"
        resultado += f"  - {sensor.nombre} (Planta: {planta_nombre})\n"
    
    return resultado

@router.post("/consultar", response_model=PreguntaResponse)
async def consultar_ai(
    request: PreguntaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Consultar la base de datos en lenguaje natural"""
    
    # Normalizar contaminantes en la pregunta
    pregunta_normalizada = normalizar_contaminante(request.pregunta)
    pregunta_lower = pregunta_normalizada.lower()
    usuario_id = current_user.id
    
    # ============================================
    # MANEJAR RESPUESTA CORTA (CO, NO, etc.) - NUEVO
    # ============================================
    contaminante_corto = extraer_contaminante_de_respuesta(pregunta_normalizada)
    if contaminante_corto:
        # Verificar si hay contexto de contaminantes sugeridos
        contaminantes_sugeridos = obtener_contexto(usuario_id, "contaminantes_sugeridos")
        if contaminantes_sugeridos and contaminante_corto in contaminantes_sugeridos:
            # Limpiar contexto
            limpiar_contexto(usuario_id)
            
            # Calcular promedio directamente
            empresa_id = current_user.id_empresa if current_user.rol != "SUPER_ADMIN" else None
            contaminantes_disponibles = obtener_contaminantes_disponibles(db, empresa_id)
            
            if contaminante_corto in contaminantes_disponibles:
                respuesta = calcular_promedio_contaminante(current_user, db, contaminante_corto, "7 days")
                return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
            else:
                return PreguntaResponse(
                    pregunta=request.pregunta,
                    respuesta=f"No tenemos datos de {contaminante_corto} en el sistema."
                )
    
    # ============================================
    # MANEJAR RESPUESTA AFIRMATIVA (si, sí, ok, vale, etc.)
    # ============================================
    if es_respuesta_afirmativa(pregunta_normalizada):
        contaminantes_sugeridos = obtener_contexto(usuario_id, "contaminantes_sugeridos")
        if contaminantes_sugeridos:
            primer_contaminante = contaminantes_sugeridos[0]
            contaminantes_lista = "\n".join([f"  - {c}" for c in contaminantes_sugeridos])
            
            # Limpiar contexto después de mostrar opciones
            # No limpiamos aquí para que el usuario pueda escribir el nombre directamente
            # limpiar_contexto(usuario_id)
            
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta=f"Perfecto. ¿De cuál de estos contaminantes quieres el promedio?\n\n{contaminantes_lista}\n\n" +
                         f"Puedes escribir directamente el nombre del contaminante, por ejemplo: 'CO' o 'NOX'"
            )
        else:
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta="¿Qué te gustaría consultar? Puedo ayudarte con alarmas, sensores, mediciones o promedios de contaminantes."
            )
    
    # ============================================
    # PREGUNTAS SOBRE SENSORES ACTIVOS
    # ============================================
    if ("sensor" in pregunta_lower or "sensores" in pregunta_lower) and "activo" in pregunta_lower:
        respuesta = listar_sensores_activos(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE SENSORES EN MANTENIMIENTO
    # ============================================
    if ("sensor" in pregunta_lower or "sensores" in pregunta_lower) and "mantenimiento" in pregunta_lower:
        respuesta = listar_sensores_mantenimiento(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE SENSORES INACTIVOS
    # ============================================
    if ("sensor" in pregunta_lower or "sensores" in pregunta_lower) and "inactivo" in pregunta_lower:
        respuesta = listar_sensores_inactivos(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE EMPRESAS
    # ============================================
    if "empresa" in pregunta_lower and ("cuántas" in pregunta_lower or "cuántas" in pregunta_lower):
        respuesta = contar_empresas(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE CANTIDAD DE SENSORES
    # ============================================
    if "sensor" in pregunta_lower and ("cuántos" in pregunta_lower or "cuántas" in pregunta_lower):
        respuesta = contar_sensores(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE ALARMAS
    # ============================================
    if "alarma" in pregunta_lower and ("cuántas" in pregunta_lower or "cuántas" in pregunta_lower):
        respuesta_detallada = contar_alarmas_por_sensor(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta_detallada)
    
    # ============================================
    # PREGUNTAS SOBRE PROMEDIOS 
    # ============================================
    if es_pregunta_promedio(pregunta_normalizada) or "promedio" in pregunta_lower:
        contaminante = extraer_contaminante(pregunta_normalizada)
        
        # Obtener contaminantes disponibles
        empresa_id = current_user.id_empresa if current_user.rol != "SUPER_ADMIN" else None
        contaminantes_disponibles = obtener_contaminantes_disponibles(db, empresa_id)
        
        if contaminante:
            # Verificar si el contaminante existe en la base de datos
            if contaminante not in contaminantes_disponibles:
                contaminantes_str = ", ".join(contaminantes_disponibles)
                # Guardar contexto para cuando el usuario responda
                guardar_contexto(usuario_id, "contaminantes_sugeridos", contaminantes_disponibles)
                
                return PreguntaResponse(
                    pregunta=request.pregunta,
                    respuesta=f"No tenemos datos de {contaminante} en el sistema. Los contaminantes disponibles son: {contaminantes_str}.\n\n" +
                             f"¿Quieres que te muestre el promedio de alguno de estos? (Puedes escribir el nombre directamente: 'CO', 'NOX', etc.)"
                )
            
            # Determinar el período
            periodo = "7 days"  # Por defecto
            if "mes" in pregunta_lower:
                periodo = "30 days"
            elif "semana" in pregunta_lower:
                periodo = "7 days"
            elif "día" in pregunta_lower or "hoy" in pregunta_lower:
                periodo = "1 day"
            elif "año" in pregunta_lower:
                periodo = "365 days"
            
            respuesta = calcular_promedio_contaminante(current_user, db, contaminante, periodo)
            return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
        else:
            # Si no se especifica contaminante, mostrar los disponibles
            contaminantes_str = ", ".join(contaminantes_disponibles)
            guardar_contexto(usuario_id, "contaminantes_sugeridos", contaminantes_disponibles)
            
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta=f"No pude identificar el contaminante en tu pregunta. Los contaminantes disponibles son: {contaminantes_str}.\n\n" +
                         f"¿Quieres que te muestre el promedio de alguno de estos? (Puedes escribir el nombre directamente: 'CO', 'NOX', etc.)"
            )
    
    # ============================================
    # PREGUNTAS SOBRE SENSORES (genérico)
    # ============================================
    if "sensor" in pregunta_lower or "sensores" in pregunta_lower:
        respuesta = contar_sensores(current_user, db)
        return PreguntaResponse(pregunta=request.pregunta, respuesta=respuesta)
    
    # ============================================
    # PREGUNTAS SOBRE MEDICIONES
    # ============================================
    if "medición" in pregunta_lower or "mediciones" in pregunta_lower:
        if "hoy" in pregunta_lower:
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta="Las mediciones de hoy están disponibles en el Dashboard. Selecciona un sensor y contaminante para ver los datos en tiempo real."
            )
        elif "última" in pregunta_lower or "ultima" in pregunta_lower:
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta="Las últimas mediciones están disponibles en el Dashboard y en la sección de Mediciones del menú lateral."
            )
        else:
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta="Puedes ver todas las mediciones históricas en la sección de Mediciones del menú lateral. Allí puedes filtrar por sensor, fecha y contaminante."
            )
    
    # ============================================
    # PREGUNTAS SOBRE MANTENIMIENTO
    # ============================================
    if "mantenimiento" in pregunta_lower:
        return PreguntaResponse(
            pregunta=request.pregunta,
            respuesta="Puedes gestionar el mantenimiento de sensores en la sección de Mantenimiento del menú lateral. Allí puedes programar, completar y cancelar mantenimientos."
        )
    
    # ============================================
    # PREGUNTAS SOBRE UMBRALES
    # ============================================
    if "umbral" in pregunta_lower or "límite" in pregunta_lower or "limite" in pregunta_lower:
        return PreguntaResponse(
            pregunta=request.pregunta,
            respuesta="Los umbrales normativos definen los límites de alerta y crítico para cada contaminante. Puedes configurarlos en la sección de Umbrales Normativos."
        )
    
    # ============================================
    # PREGUNTAS SOBRE OTROS TEMAS (validación)
    # ============================================
    if not es_pregunta_valida(pregunta_normalizada):
        return PreguntaResponse(
            pregunta=request.pregunta,
            respuesta="Lo siento, solo puedo ayudarte con consultas sobre emisiones industriales, alarmas, sensores, mediciones y empresas. Por ejemplo: '¿Cuántas alarmas hay pendientes?' o '¿Cuál es el promedio de CO?'"
        )
    
    # ============================================
    # OBTENER CONTEXTO DE LA EMPRESA
    # ============================================
    contexto = obtener_contexto_empresa(current_user, db)
    
    # ============================================
    # INICIALIZAR IA
    # ============================================
    query_engine = get_query_engine()
    if not query_engine:
        success = init_ai()
        if not success:
            raise HTTPException(status_code=503, detail="IA no disponible. Verifique la configuración de Groq.")
        query_engine = get_query_engine()
    
    # Construir pregunta con contexto de empresa
    pregunta = pregunta_normalizada
    
    # Añadir contexto específico para la IA
    if current_user.rol != "SUPER_ADMIN" and contexto["empresa_id"]:
        # Dar contexto de la empresa a la IA
        contexto_texto = f"La empresa del usuario es '{contexto['empresa_nombre']}' con ID {contexto['empresa_id']}. "
        contexto_texto += f"Tiene {len(contexto['sensores'])} sensores: "
        for i, s in enumerate(contexto['sensores']):
            contexto_texto += f"{s['nombre']}"
            if i < len(contexto['sensores']) - 1:
                contexto_texto += ", "
        
        pregunta = f"{contexto_texto}. Pregunta del usuario: {pregunta_normalizada}. Responde considerando SOLO los datos de esta empresa."
    
    try:
        response = query_engine.query(pregunta)
        respuesta = str(response)
        
        # Limpiar la respuesta si es muy larga
        if len(respuesta) > 500:
            lines = respuesta.split('\n')
            clean_lines = []
            for line in lines:
                if not line.strip().startswith('SELECT') and 'sql' not in line.lower():
                    clean_lines.append(line)
            if clean_lines:
                respuesta = '\n'.join(clean_lines[:5])
        
        return PreguntaResponse(
            pregunta=request.pregunta,
            respuesta=respuesta,
            sql_generada=None
        )
    except Exception as e:
        error_msg = str(e)
        if "syntax" in error_msg.lower() or "SQL" in error_msg or "no such column" in error_msg.lower():
            return PreguntaResponse(
                pregunta=request.pregunta,
                respuesta="No pude procesar tu consulta correctamente. Por favor, reformula tu pregunta. Ejemplos: '¿Cuántas alarmas hay pendientes?' o '¿Cuál es el promedio de CO de la última semana?'"
            )
        raise HTTPException(status_code=500, detail=f"Error procesando pregunta: {str(e)}")

@router.get("/contexto")
async def get_contexto(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener el contexto de la empresa para el usuario actual"""
    contexto = obtener_contexto_empresa(current_user, db)
    resumen = obtener_resumen_empresa(current_user, db)
    
    return {
        "contexto": contexto,
        "resumen": resumen,
        "rol": current_user.rol
    }

@router.get("/contaminantes")
async def get_contaminantes_disponibles(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la lista de contaminantes disponibles para el usuario"""
    empresa_id = current_user.id_empresa if current_user.rol != "SUPER_ADMIN" else None
    contaminantes = obtener_contaminantes_disponibles(db, empresa_id)
    
    return {
        "contaminantes": contaminantes,
        "total": len(contaminantes),
        "empresa": current_user.id_empresa if current_user.rol != "SUPER_ADMIN" else "TODAS"
    }