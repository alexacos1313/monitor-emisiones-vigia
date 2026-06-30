# backend/app/scripts/seed_umbrales_sensor.py
from app.models import UmbralSensor

def seed_umbrales_sensor(db):
    umbrales_sensor = [
        UmbralSensor(id_sensor=1, contaminante="CO", limite_alerta=60, limite_critico=100, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NO", limite_alerta=50, limite_critico=80, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NO2", limite_alerta=40, limite_critico=70, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NOX", limite_alerta=90, limite_critico=150, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=3, contaminante="CO", limite_alerta=40, limite_critico=70, motivo="Cercanía a núcleo urbano"),
        UmbralSensor(id_sensor=3, contaminante="NO2", limite_alerta=25, limite_critico=45, motivo="Cercanía a núcleo urbano"),
        UmbralSensor(id_sensor=4, contaminante="NO", limite_alerta=55, limite_critico=90, motivo="Zona industrial"),
        UmbralSensor(id_sensor=4, contaminante="NOX", limite_alerta=100, limite_critico=160, motivo="Zona industrial"),
    ]
    for umbral in umbrales_sensor:
        db.add(umbral)
    
    db.commit()
    print("   Umbrales por sensor cargados")
    