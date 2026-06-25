import asyncio
import websockets
import json
import random
import argparse
from datetime import datetime

async def simular_sensor(sensor_id: int = 1, intervalo: int = 10):
    """
    Simula un sensor enviando mediciones al WebSocket del backend.
    
    Args:
        sensor_id: ID del sensor a simular (debe existir en la BD)
        intervalo: Segundos entre mediciones (default: 10)
    """
    uri = f"ws://localhost:8000/ws/sensor/{sensor_id}"
    
    print(f" Conectando simulador del sensor {sensor_id}...")
    print(f" Intervalo: {intervalo} segundos")
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f" Simulador conectado. Enviando mediciones...")
            print("-" * 50)
            
            contador = 0
            while True:
                contador += 1
                
                # Generar valores aleatorios realistas
                # CO: 20-120 mg/m³ (normal 30-60, picos hasta 120)
                co = round(random.uniform(20, 120), 1)
                
                # NO: 15-80 mg/m³ (normal 20-40, picos hasta 80)
                no = round(random.uniform(15, 80), 1)
                
                # NO2: 10-60 mg/m³ (normal 15-30, picos hasta 60)
                no2 = round(random.uniform(10, 60), 1)
                
                # NOX = NO + NO2 (con algo de variación)
                nox = round(no + no2 + random.uniform(-5, 5), 1)
                if nox < 0:
                    nox = 0
                
                # Ocasionalmente generar un pico (anomalía)
                if random.random() < 0.05:  # 5% de probabilidad
                    pico = random.choice(["co", "no", "no2", "nox"])
                    if pico == "co":
                        co = round(random.uniform(130, 200), 1)
                    elif pico == "no":
                        no = round(random.uniform(85, 120), 1)
                    elif pico == "no2":
                        no2 = round(random.uniform(65, 100), 1)
                    else:
                        nox = round(random.uniform(160, 250), 1)
                    print(f"  Pico detectado en {pico.upper()}!")
                
                # Construir datos (SOLO CO, NO, NO2, NOX)
                datos = {
                    "co": co,
                    "no": no,
                    "no2": no2,
                    "nox": nox,
                    "timestamp": datetime.now().isoformat()
                }
                
                # Mostrar en pantalla
                timestamp = datetime.now().strftime("%H:%M:%S")
                print(f" [{timestamp}] Medición #{contador}")
                print(f"   CO:  {co:6.1f} mg/m³")
                print(f"   NO:  {no:6.1f} mg/m³")
                print(f"   NO2: {no2:6.1f} mg/m³")
                print(f"   NOX: {nox:6.1f} mg/m³")
                print(f"   → Enviando al sensor {sensor_id}...")
                
                # Enviar al servidor
                await websocket.send(json.dumps(datos))
                
                # Esperar respuesta
                try:
                    respuesta = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    respuesta_json = json.loads(respuesta)
                    if respuesta_json.get("status") == "ok":
                        print(f"    Medición guardada (ID: {respuesta_json.get('medicion_id')})")
                    else:
                        print(f"    Error: {respuesta_json.get('mensaje')}")
                except asyncio.TimeoutError:
                    print("    Timeout esperando respuesta")
                except json.JSONDecodeError:
                    print(f"    Respuesta no válida: {respuesta}")
                
                print("-" * 50)
                
                # Esperar el intervalo
                await asyncio.sleep(intervalo)
                
    except websockets.exceptions.ConnectionClosedError:
        print(" Conexión cerrada por el servidor")
    except websockets.exceptions.WebSocketException as e:
        print(f" Error de WebSocket: {e}")
    except KeyboardInterrupt:
        print("\n Simulación detenida por el usuario")
    except Exception as e:
        print(f" Error inesperado: {e}")


async def simular_multiples_sensores(sensores: list, intervalo: int = 10):
    """
    Simula múltiples sensores simultáneamente.
    
    Args:
        sensores: Lista de IDs de sensores
        intervalo: Segundos entre mediciones
    """
    print(f"🔌 Conectando {len(sensores)} sensores...")
    
    # Crear tareas para cada sensor
    tareas = []
    for sensor_id in sensores:
        tareas.append(simular_sensor(sensor_id, intervalo))
    
    # Ejecutar todas las tareas en paralelo
    await asyncio.gather(*tareas)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulador de sensor láser para monitor de emisiones")
    parser.add_argument(
        "--sensor", 
        type=int, 
        default=1,
        help="ID del sensor a simular (default: 1)"
    )
    parser.add_argument(
        "--intervalo", 
        type=int, 
        default=10,
        help="Intervalo entre mediciones en segundos (default: 10)"
    )
    parser.add_argument(
        "--multi", 
        nargs="+", 
        type=int,
        help="Simular múltiples sensores: --multi 1 2 3"
    )
    
    args = parser.parse_args()
    
    try:
        if args.multi:
            # Simular múltiples sensores
            asyncio.run(simular_multiples_sensores(args.multi, args.intervalo))
        else:
            # Simular un solo sensor
            asyncio.run(simular_sensor(args.sensor, args.intervalo))
    except KeyboardInterrupt:
        print("\n Simulación detenida")