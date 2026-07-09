#backend/app/routes/websocket_sensor.py
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import json
import logging
from database import SessionLocal
from models import Medicion, Sensor
from services.alarma_service import verificar_y_generar_alarmas
from fastapi import APIRouter

router = APIRouter(tags=["WebSocket Sensor"])

# Configurar logging
logger = logging.getLogger(__name__)

@router.websocket("/ws/sensor/{sensor_id}")
async def websocket_sensor(websocket: WebSocket, sensor_id: int):
    """Sensor hardware se conecta aquí para enviar mediciones"""
    
    await websocket.accept()
    logger.info(f"Sensor {sensor_id} conectado")
    
    db = SessionLocal()
    
    try:
        # Verificar que el sensor existe
        sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if not sensor:
            await websocket.close(code=1008, reason="Sensor no encontrado")
            logger.warning(f"Sensor {sensor_id} no encontrado en BD")
            return
        
        while True:
            # Recibir datos del sensor
            try:
                data = await websocket.receive_text()
                datos = json.loads(data)
            except json.JSONDecodeError as e:
                logger.error(f"Error decodificando JSON del sensor {sensor_id}: {e}")
                await websocket.send_json({"status": "error", "mensaje": "JSON inválido"})
                continue
            
            # Validar que los datos sean un diccionario
            if not isinstance(datos, dict):
                await websocket.send_json({"status": "error", "mensaje": "Formato inválido"})
                continue
            
            logger.info(f"Datos recibidos de sensor {sensor_id}: {datos}")
            
            # Extraer valores (SOLO CO, NO, NO2, NOX)
            co = datos.get("co")
            no = datos.get("no")
            no2 = datos.get("no2")
            nox = datos.get("nox")
            
            # Validar que al menos un contaminante tenga valor
            if co is None and no is None and no2 is None and nox is None:
                await websocket.send_json({
                    "status": "error", 
                    "mensaje": "Debe enviar al menos un contaminante (co, no, no2, nox)"
                })
                continue
            
            # Crear medición (SOLO CO, NO, NO2, NOX)
            nueva = Medicion(
                id_sensor=sensor_id,
                timestamp=datetime.now(),
                co=co,
                no=no,
                no2=no2,
                nox=nox,
                estado="VALIDADO"
            )
            db.add(nueva)
            db.commit()
            db.refresh(nueva)
            
            # Generar alarmas si es necesario
            try:
                await verificar_y_generar_alarmas(db, nueva.id)
            except Exception as e:
                logger.error(f"Error generando alarmas para sensor {sensor_id}: {e}")
            
            # Confirmar recepción
            await websocket.send_json({
                "status": "ok",
                "medicion_id": nueva.id,
                "timestamp": nueva.timestamp.isoformat()
            })
            
    except WebSocketDisconnect:
        logger.info(f"Sensor {sensor_id} desconectado")
    except Exception as e:
        logger.error(f"Error procesando datos del sensor {sensor_id}: {e}")
        try:
            await websocket.send_json({
                "status": "error",
                "mensaje": f"Error interno: {str(e)}"
            })
        except:
            pass
    finally:
        db.close()
        logger.info(f"Conexión del sensor {sensor_id} cerrada")