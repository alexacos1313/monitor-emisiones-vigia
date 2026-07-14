# backend/app/services/alarma_service.py
from sqlalchemy.orm import Session
from models import Medicion, Sensor, Planta, Empresa, UmbralSensor, Alarma, Usuario, MedicionContaminante
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)

try:
    from app.email_config import enviar_correo
except ImportError:
    def enviar_correo(destinatario, subject, body):
        print(f"Correo a {destinatario}: {subject}")
        return True

try:
    from app.whatsapp_config import enviar_whatsapp
except ImportError:
    def enviar_whatsapp(mensaje, destinatario):
        print(f"WhatsApp a {destinatario}: {mensaje}")
        return True

CONTAMINANTES_VALIDOS = ["CO", "NO", "NO2", "NOX"]

def enviar_email_alarma(destinatario: str, nombre_empresa: str, sensor_nombre: str, contaminante: str, valor: float, tipo: str, mensaje: str):
    subject = f"ALARMA {tipo} - {nombre_empresa} - {contaminante}"
    body = f"""
    <h2>Alarma de Emisiones</h2>
    <p><strong>Empresa:</strong> {nombre_empresa}</p>
    <p><strong>Sensor:</strong> {sensor_nombre}</p>
    <p><strong>Tipo:</strong> {tipo}</p>
    <p><strong>Contaminante:</strong> {contaminante}</p>
    <p><strong>Valor:</strong> {valor}</p>
    <p><strong>Mensaje:</strong> {mensaje}</p>
    <p><strong>Fecha:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    """
    return enviar_correo(destinatario, subject, body)

async def verificar_y_generar_alarmas(db: Session, medicion_id: int):
    logger.info(f"=== INICIANDO VERIFICACION PARA MEDICION {medicion_id} ===")
    
    medicion = db.query(Medicion).filter(Medicion.id == medicion_id).first()
    if not medicion:
        logger.warning(f"Medicion {medicion_id} no encontrada")
        return []
    
    # Obtener contaminantes desde la tabla relacionada
    contaminantes_medicion = db.query(MedicionContaminante).filter(
        MedicionContaminante.id_medicion == medicion_id
    ).all()
    
    if not contaminantes_medicion:
        logger.warning(f"No hay contaminantes para medicion {medicion_id}")
        return []
    
    logger.info(f"Contaminantes encontrados en medicion:")
    for c in contaminantes_medicion:
        logger.info(f"  {c.contaminante} = {c.valor}")
    
    sensor = db.query(Sensor).filter(Sensor.id == medicion.id_sensor).first()
    if not sensor:
        logger.warning(f"Sensor {medicion.id_sensor} no encontrado")
        return []
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        logger.warning(f"Planta {sensor.id_planta} no encontrada")
        return []
    
    empresa = db.query(Empresa).filter(Empresa.id == planta.id_empresa).first()
    if not empresa:
        logger.warning(f"Empresa {planta.id_empresa} no encontrada")
        return []
    
    # Obtener umbrales del sensor
    umbrales = db.query(UmbralSensor).filter(UmbralSensor.id_sensor == sensor.id).all()
    if not umbrales:
        logger.warning(f"No hay umbrales configurados para sensor {sensor.id}")
        return []
    
    logger.info(f"Umbrales configurados para sensor {sensor.id}:")
    for u in umbrales:
        logger.info(f"  {u.contaminante}: alerta={u.limite_alerta}, critico={u.limite_critico}")
    
    admins = db.query(Usuario).filter(
        Usuario.id_empresa == empresa.id,
        Usuario.rol.in_(["SUPER_ADMIN", "EMPRESA_ADMIN"]),
        Usuario.activo == 1
    ).all()
    
    logger.info(f"Administradores encontrados: {len(admins)}")
    
    alarmas_generadas = []
    
    # Crear un diccionario para acceso rápido a los valores de contaminantes
    valores_contaminantes = {c.contaminante: c.valor for c in contaminantes_medicion}
    
    for umbral in umbrales:
        contaminante = umbral.contaminante  # Ej: "CO", "NO", "NO2", "NOX"
        logger.info(f"Verificando contaminante: {contaminante}")
        
        if contaminante not in CONTAMINANTES_VALIDOS:
            logger.warning(f"Contaminante no valido: {contaminante}")
            continue
        
        valor = valores_contaminantes.get(contaminante)
        logger.info(f"  Valor obtenido: {valor}")
        
        if valor is None:
            logger.info(f"  Valor None para {contaminante}")
            continue
        
        logger.info(f"  Comparando: {valor} >= {umbral.limite_alerta}?")
        
        if valor >= umbral.limite_critico:
            tipo = "CRITICO"
            mensaje = f"Valor {valor} supera limite critico ({umbral.limite_critico})"
            logger.info(f"  GENERANDO ALARMA CRITICO para {contaminante}")
        elif valor >= umbral.limite_alerta:
            tipo = "ALERTA"
            mensaje = f"Valor {valor} supera limite de alerta ({umbral.limite_alerta})"
            logger.info(f"  GENERANDO ALARMA ALERTA para {contaminante}")
        else:
            logger.info(f"  No supera umbrales")
            continue
        
        hace_24h = datetime.now() - timedelta(hours=24)
        alarma_existente = db.query(Alarma).filter(
            Alarma.id_sensor == medicion.id_sensor,
            Alarma.contaminante == contaminante,
            Alarma.tipo == tipo,
            Alarma.timestamp >= hace_24h
        ).first()
        
        if alarma_existente:
            logger.info(f"Alarma ya existe para {contaminante} en las ultimas 24h")
            continue
        
        logger.info(f"CREANDO ALARMA para {contaminante}")
        
        alarma = Alarma(
            id_medicion=medicion.id,
            id_sensor=medicion.id_sensor,
            tipo=tipo,
            contaminante=contaminante,
            valor=valor,
            umbral=umbral.limite_critico if tipo == "CRITICO" else umbral.limite_alerta,
            mensaje=mensaje,
            timestamp=datetime.now(),
            enviada=0
        )
        db.add(alarma)
        db.flush()
        
        emails_enviados = 0
        for admin in admins:
            if admin.email:
                try:
                    logger.info(f"Enviando email a {admin.email}")
                    resultado = enviar_email_alarma(
                        admin.email, empresa.nombre, sensor.nombre,
                        contaminante, valor, tipo, mensaje
                    )
                    if resultado:
                        emails_enviados += 1
                except Exception as e:
                    logger.error(f"Error enviando email a {admin.email}: {e}")
            
            if admin.telefono:
                try:
                    logger.info(f"Enviando WhatsApp a {admin.telefono}")
                    mensaje_whatsapp = (
                        f"ALARMA {tipo}\n"
                        f"Empresa: {empresa.nombre}\n"
                        f"Sensor: {sensor.nombre}\n"
                        f"Contaminante: {contaminante}\n"
                        f"Valor: {valor}\n"
                        f"{mensaje}"
                    )
                    enviar_whatsapp(mensaje_whatsapp, f"whatsapp:{admin.telefono}")
                except Exception as e:
                    logger.error(f"Error enviando WhatsApp a {admin.telefono}: {e}")
        
        if emails_enviados > 0:
            alarma.enviada = 1
            alarma.fecha_envio = datetime.now()
        
        alarmas_generadas.append(alarma)
        
        try:
            from websocket_manager import manager
            logger.info(f"Enviando WebSocket a empresa {empresa.id}")
            await manager.broadcast_to_empresa(
                empresa.id,
                {
                    "tipo": "nueva_alarma",
                    "data": {
                        "alarma_id": alarma.id,
                        "sensor": sensor.nombre,
                        "contaminante": contaminante,
                        "valor": valor,
                        "tipo": tipo,
                        "mensaje": mensaje,
                        "timestamp": datetime.now().isoformat()
                    }
                },
                db
            )
        except Exception as e:
            logger.error(f"Error notificando WebSocket: {e}")
    
    if alarmas_generadas:
        db.commit()
        logger.info(f"Se generaron {len(alarmas_generadas)} alarmas")
    else:
        logger.info("No se generaron alarmas")
    
    return alarmas_generadas