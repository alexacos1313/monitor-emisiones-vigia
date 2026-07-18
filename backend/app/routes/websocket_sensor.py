# backend/app/routes/websocket_sensor.py
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import json
import logging
from database import SessionLocal
from models import Medicion, Sensor, MedicionContaminante
from services.alarma_service import verificar_y_generar_alarmas
from fastapi import APIRouter
from websocket_manager import manager 

router = APIRouter(tags=["WebSocket Sensor"], redirect_slashes=False)
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
            
            # Crear medición
            nueva_medicion = Medicion(
                id_sensor=sensor_id,
                timestamp=datetime.now(),
                temperatura=datos.get("temperatura"),
                flujo=datos.get("flujo"),
                oxigeno=datos.get("oxigeno"),
                estado="VALIDADO"
            )
            db.add(nueva_medicion)
            db.flush()  # Para obtener el ID
            
            # Guardar contaminantes (CO, NO, NO2, NOX)
            contaminantes_objetos = []  # Para guardar los objetos
            contaminantes_guardados = []  #  Para los logs
            for cont in ['co', 'no', 'no2', 'nox']:
                valor = datos.get(cont)
                if valor is not None:
                    cont_upper = cont.upper()
                    mc = MedicionContaminante(
                        id_medicion=nueva_medicion.id,
                        contaminante=cont_upper,
                        valor=float(valor)
                    )
                    db.add(mc)
                    contaminantes_objetos.append(mc) 
                    contaminantes_guardados.append(f"{cont_upper}={valor}")
            
            db.commit()
            db.refresh(nueva_medicion)
            
            logger.info(f"Medición {nueva_medicion.id} guardada con contaminantes: {', '.join(contaminantes_guardados)}")
            
            #  ENVIAR MEDICIÓN POR WEBSOCKET usando los objetos
            try:
                mensaje_medicion = {
                    "tipo": "nueva_medicion",
                    "data": {
                        "id": nueva_medicion.id,
                        "id_sensor": nueva_medicion.id_sensor,
                        "sensor": sensor.nombre,
                        "timestamp": nueva_medicion.timestamp.isoformat(),
                        "contaminantes": {
                            mc.contaminante: mc.valor for mc in contaminantes_objetos 
                        }
                    }
                }
                # Enviar a todos los usuarios conectados
                await manager.broadcast_to_all(mensaje_medicion)
                logger.info(f"Medición {nueva_medicion.id} enviada por WebSocket")
            except Exception as e:
                logger.error(f"Error enviando medición por WebSocket: {e}")
            
            # Generar alarmas si es necesario
            try:
                await verificar_y_generar_alarmas(db, nueva_medicion.id)
            except Exception as e:
                logger.error(f"Error generando alarmas para sensor {sensor_id}: {e}")
            
            # Confirmar recepción
            await websocket.send_json({
                "status": "ok",
                "medicion_id": nueva_medicion.id,
                "timestamp": nueva_medicion.timestamp.isoformat()
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