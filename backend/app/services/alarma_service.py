# backend/app/services/alarma_service.py
from sqlalchemy.orm import Session
from models import Medicion, Sensor, Planta, Empresa, UmbralSensor, Alarma, Usuario, MedicionContaminante
from datetime import datetime, timedelta
import asyncio
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Intentar importar configuraciones (pueden no existir en entorno de prueba)
try:
    from email_config import enviar_correo
except ImportError:
    def enviar_correo(destinatario, subject, body):
        print(f"Correo a {destinatario}: {subject}")
        return True

try:
    from whatsapp_config import enviar_whatsapp
except ImportError:
    def enviar_whatsapp(mensaje, destinatario):
        print(f"WhatsApp a {destinatario}: {mensaje}")
        return True

# Lista de contaminantes válidos
CONTAMINANTES_VALIDOS = ["co", "no", "no2", "nox"]

def enviar_email_alarma(destinatario: str, nombre_empresa: str, sensor_nombre: str, contaminante: str, valor: float, tipo: str, mensaje: str):
    """Enviar email de alarma"""
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
    """Verificar si una medicion genera alarmas"""
    
    # Obtener la medición
    medicion = db.query(Medicion).filter(Medicion.id == medicion_id).first()
    if not medicion:
        logger.warning(f"Medición {medicion_id} no encontrada")
        return []
    
    # Obtener umbrales del sensor
    umbrales = db.query(UmbralSensor).filter(UmbralSensor.id_sensor == medicion.id_sensor).all()
    if not umbrales:
        logger.info(f"No hay umbrales configurados para sensor {medicion.id_sensor}")
        return []
    
    # Obtener información del sensor
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
    
    # Obtener administradores para notificar
    admins = db.query(Usuario).filter(
        Usuario.id_empresa == empresa.id,
        Usuario.rol.in_(["SUPER_ADMIN", "EMPRESA_ADMIN"]),
        Usuario.activo == 1
    ).all()
    
    logger.info(f"Administradores encontrados para empresa {empresa.id}: {len(admins)}")
    
    alarmas_generadas = []
    
    # Obtener todos los contaminantes de la medición
    contaminantes_medicion = db.query(MedicionContaminante).filter(
        MedicionContaminante.id_medicion == medicion.id
    ).all()
    
    # Crear un diccionario para acceso rápido
    valores_contaminantes = {c.contaminante: c.valor for c in contaminantes_medicion}
    
    for umbral in umbrales:
        contaminante_upper = umbral.contaminante.upper()
        
        # Verificar que el contaminante sea válido
        if umbral.contaminante.lower() not in CONTAMINANTES_VALIDOS:
            logger.warning(f"Contaminante no válido: {umbral.contaminante}")
            continue
        
        # Obtener el valor del diccionario
        valor = valores_contaminantes.get(contaminante_upper)
        
        if valor is None:
            logger.info(f"No hay valor para {umbral.contaminante} en la medición {medicion.id}")
            continue
        
        # Determinar tipo de alarma
        if valor >= umbral.limite_critico:
            tipo = "CRITICO"
            mensaje = f"Valor {valor} supera límite crítico ({umbral.limite_critico})"
        elif valor >= umbral.limite_alerta:
            tipo = "ALERTA"
            mensaje = f"Valor {valor} supera límite de alerta ({umbral.limite_alerta})"
        else:
            continue
        
        # Verificar si ya existe una alarma similar en las últimas 24h
        hace_24h = datetime.now() - timedelta(hours=24)
        alarma_existente = db.query(Alarma).filter(
            Alarma.id_sensor == medicion.id_sensor,
            Alarma.contaminante == umbral.contaminante,
            Alarma.tipo == tipo,
            Alarma.timestamp >= hace_24h
        ).first()
        
        if alarma_existente:
            logger.info(f"Alarma ya existe para {umbral.contaminante} en las últimas 24h")
            continue
        
        # Crear la alarma
        alarma = Alarma(
            id_medicion=medicion.id,
            id_sensor=medicion.id_sensor,
            tipo=tipo,
            contaminante=umbral.contaminante,
            valor=valor,
            umbral=umbral.limite_critico if tipo == "CRITICO" else umbral.limite_alerta,
            mensaje=mensaje,
            timestamp=datetime.now(),
            enviada=0
        )
        db.add(alarma)
        db.flush()
        
        # Enviar notificaciones
        emails_enviados = 0
        for admin in admins:
            # Email
            if admin.email:
                try:
                    logger.info(f"Enviando email a {admin.email}")
                    resultado = enviar_email_alarma(
                        admin.email, empresa.nombre, sensor.nombre,
                        umbral.contaminante, valor, tipo, mensaje
                    )
                    if resultado:
                        emails_enviados += 1
                except Exception as e:
                    logger.error(f"Error enviando email a {admin.email}: {e}")
            
            # WhatsApp
            if admin.telefono:
                try:
                    logger.info(f"Enviando WhatsApp a {admin.telefono}")
                    mensaje_whatsapp = (
                        f" ALARMA {tipo}\n"
                        f"Empresa: {empresa.nombre}\n"
                        f"Sensor: {sensor.nombre}\n"
                        f"Contaminante: {umbral.contaminante}\n"
                        f"Valor: {valor}\n"
                        f"{mensaje}"
                    )
                    enviar_whatsapp(mensaje_whatsapp, f"whatsapp:{admin.telefono}")
                except Exception as e:
                    logger.error(f"Error enviando WhatsApp a {admin.telefono}: {e}")
        
        # Marcar como enviada si al menos un email fue enviado
        if emails_enviados > 0:
            alarma.enviada = 1
            alarma.fecha_envio = datetime.now()
        
        alarmas_generadas.append(alarma)
        
        # Notificar por WebSocket
        try:
            from websocket_manager import manager
            asyncio.create_task(manager.broadcast_to_empresa(
                empresa.id,
                {
                    "tipo": "nueva_alarma",
                    "data": {
                        "alarma_id": alarma.id,
                        "sensor": sensor.nombre,
                        "contaminante": umbral.contaminante,
                        "valor": valor,
                        "tipo": tipo,
                        "mensaje": mensaje,
                        "timestamp": datetime.now().isoformat()
                    }
                },
                db
            ))
        except Exception as e:
            logger.error(f"Error notificando WebSocket: {e}")
    
    # Confirmar cambios
    if alarmas_generadas:
        db.commit()
        logger.info(f"Se generaron {len(alarmas_generadas)} alarmas")
    
    return alarmas_generadas