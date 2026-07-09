#backend/app/routes/websocket_alerts.py
from fastapi import WebSocket, WebSocketDisconnect
import jwt
import os
import json
from database import SessionLocal
from models import Usuario
from websocket_manager import manager
from fastapi import APIRouter

# Obtener clave secreta de variables de entorno
SECRET_KEY = os.getenv("SECRET_KEY", "tu-clave-secreta-cambiarla-en-produccion")
ALGORITHM = "HS256"

router = APIRouter(tags=["WebSocket Alertas"])

async def get_user_from_token(token: str):
    """Obtener usuario a partir del token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            return None
        
        db = SessionLocal()
        try:
            usuario = db.query(Usuario).filter(
                Usuario.email == email, 
                Usuario.activo == 1
            ).first()
            return usuario
        finally:
            db.close()
            
    except jwt.ExpiredSignatureError:
        print("Token expirado")
        return None
    except jwt.InvalidTokenError:
        print("Token inválido")
        return None
    except Exception as e:
        print(f"Error al obtener usuario del token: {e}")
        return None

@router.websocket("/ws/alerts/{token}")
async def websocket_alerts(websocket: WebSocket, token: str):
    """Frontend se conecta aquí para recibir alertas en tiempo real"""
    
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008, reason="Autenticacion fallida")
        return
    
    # Conectar al WebSocket
    await manager.connect(user.id, websocket)
    
    # Enviar mensaje de confirmación
    await manager.send_personal_message(user.id, {
        "tipo": "conexion",
        "mensaje": f"Conectado a alertas como {user.nombre}",
        "usuario_id": user.id,
        "rol": user.rol
    })
    
    print(f"Usuario {user.id} ({user.nombre}) conectado a WebSocket")
    
    try:
        while True:
            # Esperar mensajes del cliente
            data = await websocket.receive_text()
            print(f"Mensaje de usuario {user.id}: {data}")
            
            try:
                mensaje = json.loads(data)
                
                # Responder a pings
                if mensaje.get("tipo") == "ping":
                    await manager.send_personal_message(user.id, {
                        "tipo": "pong",
                        "mensaje": "Conexión activa"
                    })
                    
            except json.JSONDecodeError:
                print(f"Mensaje no válido de usuario {user.id}: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
        print(f"Usuario {user.id} ({user.nombre}) desconectado de WebSocket")
    except Exception as e:
        print(f"Error en WebSocket del usuario {user.id}: {e}")
        try:
            await websocket.close(code=1011, reason="Error interno")
        except:
            pass
        manager.disconnect(user.id, websocket)