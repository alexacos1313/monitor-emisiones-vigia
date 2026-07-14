# test_websocket.py
import asyncio
import websockets
import json
import urllib.request
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

EMAIL = os.getenv("TEST_EMAIL", "admin@sistema.es")
PASSWORD = os.getenv("TEST_PASSWORD", "admin123")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

async def test_websocket():
    print("="*50)
    print("TEST DE WEBSOCKET")
    print("="*50)
    
    #  SIEMPRE hacer login para obtener token nuevo
    print(f"Haciendo login con: {EMAIL}")
    login_data = json.dumps({"email": EMAIL, "password": PASSWORD}).encode('utf-8')
    req = urllib.request.Request(
        f"{BACKEND_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            token = data["access_token"]
            print(f"Token obtenido: {token[:40]}...")
    except Exception as e:
        print(f"Error en login: {e}")
        return
    
    # Conectar WebSocket con el token NUEVO
    uri = f"ws://localhost:8000/ws/alerts/{token}"
    print(f"Conectando WebSocket...")
    
    try:
        async with websockets.connect(uri) as websocket:
            welcome = await websocket.recv()
            print(f"Conectado: {welcome}")
            
            print("\n" + "="*50)
            print("ESCUCHANDO ALARMAS")
            print("="*50 + "\n")
            
            while True:
                try:
                    mensaje = await asyncio.wait_for(websocket.recv(), timeout=30)
                    data = json.loads(mensaje)
                    
                    if data.get('tipo') == 'nueva_alarma':
                        alarma = data.get('data', {})
                        print("\n" + "!"*30)
                        print("ALARMA RECIBIDA")
                        print(f"  Tipo: {alarma.get('tipo')}")
                        print(f"  Sensor: {alarma.get('sensor')}")
                        print(f"  Contaminante: {alarma.get('contaminante')}")
                        print(f"  Valor: {alarma.get('valor')} mg/m")
                        print("!"*30 + "\n")
                    else:
                        print(f"Mensaje: {data}")
                        
                except asyncio.TimeoutError:
                    print("Esperando alarmas...")
                except websockets.exceptions.ConnectionClosed:
                    print("Conexion cerrada")
                    break
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())