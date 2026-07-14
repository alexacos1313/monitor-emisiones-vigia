# start_tests.py
import subprocess
import sys
import os
import time
from dotenv import load_dotenv

load_dotenv()

SENSOR_ID = os.getenv("SENSOR_ID", "1")
INTERVALO = os.getenv("INTERVALO", "5")

def ejecutar_simulador():
    print("Iniciando simulador de sensor...")
    try:
        simulador_path = os.path.join(os.path.dirname(__file__), "simulador_sensor.py")
        if os.path.exists(simulador_path):
            if sys.platform == "win32":
                subprocess.Popen(
                    ["python", simulador_path, "--sensor", SENSOR_ID, "--intervalo", INTERVALO],
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
            else:
                subprocess.Popen(["gnome-terminal", "--", "python", simulador_path, "--sensor", SENSOR_ID, "--intervalo", INTERVALO])
            print("Simulador de sensor iniciado")
        else:
            print("No se encontró simulador_sensor.py")
    except Exception as e:
        print(f"Error: {e}")

def ejecutar_test_websocket():
    print("Iniciando test de WebSocket...")
    try:
        test_path = os.path.join(os.path.dirname(__file__), "test_websocket.py")
        if os.path.exists(test_path):
            if sys.platform == "win32":
                subprocess.Popen(
                    ["python", test_path],
                    creationflags=subprocess.CREATE_NEW_CONSOLE
                )
            else:
                subprocess.Popen(["gnome-terminal", "--", "python", test_path])
            print("Test de WebSocket iniciado")
        else:
            print("No se encontró test_websocket.py")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Iniciando tests automaticos...")
    time.sleep(2)
    
    ejecutar_simulador()
    time.sleep(1)
    ejecutar_test_websocket()
    
    print("Tests iniciados correctamente")
    print("Esperando alarmas...")