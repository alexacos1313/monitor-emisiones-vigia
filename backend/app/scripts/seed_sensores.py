# backend/app/scripts/seed_sensores.py
import json
from datetime import datetime
from app.models import Sensor

def seed_sensores(db):
    sensores = [
        Sensor(id_planta=1, nombre="Chimenea Horno 1", tipo_analizador="Láser NDIR",
               modelo="LaserGas III", fabricante="Norsk Analyse",
               fecha_instalacion=datetime(2021, 4, 1), ultima_calibracion=datetime(2024, 1, 15),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NO", "NO2", "NOX"])),
        Sensor(id_planta=1, nombre="Chimenea Horno 2", tipo_analizador="Láser NDIR",
               modelo="LaserGas III", fabricante="Norsk Analyse",
               fecha_instalacion=datetime(2021, 4, 1), ultima_calibracion=datetime(2024, 1, 15),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NO", "NO2", "NOX"])),
        Sensor(id_planta=2, nombre="Chimenea Principal", tipo_analizador="FTIR",
               modelo="MGA 12", fabricante="SICK",
               fecha_instalacion=datetime(2020, 2, 15), ultima_calibracion=datetime(2024, 3, 1),
               frecuencia_medicion=60, contaminantes=json.dumps(["CO", "NO2", "SO2"])),
        Sensor(id_planta=3, nombre="Chimenea Caldera", tipo_analizador="FTIR",
               modelo="MGA 12", fabricante="SICK",
               fecha_instalacion=datetime(2019, 8, 1), ultima_calibracion=datetime(2024, 2, 10),
               frecuencia_medicion=60, contaminantes=json.dumps(["NO", "NOX", "CO"])),
        Sensor(id_planta=4, nombre="Extrusora 1", tipo_analizador="NDIR",
               modelo="S710", fabricante="ABB",
               fecha_instalacion=datetime(2020, 10, 1), ultima_calibracion=datetime(2024, 1, 20),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NOX", "SO2", "PARTICULAS"])),
    ]
    for sensor in sensores:
        db.add(sensor)
    db.commit()
    print("   Sensores cargadas")