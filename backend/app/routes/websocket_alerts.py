# backend/app/routes/websocket_alerts.py
from fastapi import WebSocket, WebSocketDisconnect
import jwt
import os
import json
from database import SessionLocal
from models import Usuario
from websocket_manager import manager
from fastapi import APIRouter

SECRET_KEY = os.getenv("SECRET_KEY", "mi-clave-secreta-cambiar-en-produccion-12345")
ALGORITHM = "HS256"

router = APIRouter(tags=["WebSocket Alertas"])

async def get_user_from_token(token: str):
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
    except jwt.InvalidTokenError as e:
        print(f"Token invalido: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

@router.websocket("/ws/alerts/{token}")
async def websocket_alerts(websocket: WebSocket, token: str):
    print("WebSocket intentando conectar...")
    
    user = await get_user_from_token(token)
    if not user:
        print("Autenticacion fallida")
        await websocket.close(code=1008, reason="Autenticacion fallida")
        return
    
    print(f"Usuario {user.id} ({user.nombre}) autenticado")
    await websocket.accept()
    
    await manager.connect(user.id, websocket)
    
    await manager.send_personal_message(user.id, {
        "tipo": "conexion",
        "mensaje": f"Conectado a alertas como {user.nombre}",
        "usuario_id": user.id,
        "rol": user.rol
    })
    
    print(f"Usuario {user.id} conectado a WebSocket")
    
    try:
        while True:
            data = await websocket.receive_text()
            print(f"Mensaje: {data}")
            
            try:
                mensaje = json.loads(data)
                if mensaje.get("tipo") == "ping":
                    await manager.send_personal_message(user.id, {
                        "tipo": "pong",
                        "mensaje": "Conexion activa"
                    })
            except json.JSONDecodeError:
                print(f"Mensaje no valido: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
        print(f"Usuario {user.id} desconectado")