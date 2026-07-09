#backend/app/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"Usuario {user_id} conectado")
    
    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"Usuario {user_id} desconectado")
    
    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
    
    async def broadcast_to_empresa(self, empresa_id: int, message: dict, db):
        from models import Usuario
        usuarios = db.query(Usuario).filter(
            (Usuario.id_empresa == empresa_id) | (Usuario.rol == "SUPER_ADMIN"),
            Usuario.activo == 1
        ).all()
        for usuario in usuarios:
            await self.send_personal_message(usuario.id, message)
    
    async def broadcast_to_all(self, message: dict):
        for user_id in self.active_connections:
            await self.send_personal_message(user_id, message)
    
    def count_active(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())

manager = ConnectionManager()