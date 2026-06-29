# scripts/seed_umbrales_sensor.py
from models import UmbralSensor

def seed_umbrales_sensor(db):
    """Carga los umbrales por sensor"""
    print("    Cargando umbrales por sensor...")
    
    umbrales_sensor = [
        # Sensor 1 - Chimenea Horno 1 (Getafe)
        UmbralSensor(
            id_sensor=1, 
            contaminante="CO", 
            limite_alerta=60, 
            limite_critico=100, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=1, 
            contaminante="NO", 
            limite_alerta=50, 
            limite_critico=80, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=1, 
            contaminante="NO2", 
            limite_alerta=40, 
            limite_critico=70, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=1, 
            contaminante="NOX", 
            limite_alerta=90, 
            limite_critico=150, 
            motivo="Compromiso voluntario"
        ),
        # Sensor 2 - Chimenea Horno 2 (Getafe)
        UmbralSensor(
            id_sensor=2, 
            contaminante="CO", 
            limite_alerta=60, 
            limite_critico=100, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=2, 
            contaminante="NO", 
            limite_alerta=50, 
            limite_critico=80, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=2, 
            contaminante="NO2", 
            limite_alerta=40, 
            limite_critico=70, 
            motivo="Compromiso voluntario"
        ),
        UmbralSensor(
            id_sensor=2, 
            contaminante="NOX", 
            limite_alerta=90, 
            limite_critico=150, 
            motivo="Compromiso voluntario"
        ),
        # Sensor 3 - Chimenea Principal (Villaverde)
        UmbralSensor(
            id_sensor=3, 
            contaminante="CO", 
            limite_alerta=40, 
            limite_critico=70, 
            motivo="Cercanía a núcleo urbano"
        ),
        UmbralSensor(
            id_sensor=3, 
            contaminante="NO", 
            limite_alerta=30, 
            limite_critico=50, 
            motivo="Cercanía a núcleo urbano"
        ),
        UmbralSensor(
            id_sensor=3, 
            contaminante="NO2", 
            limite_alerta=25, 
            limite_critico=45, 
            motivo="Cercanía a núcleo urbano"
        ),
        UmbralSensor(
            id_sensor=3, 
            contaminante="NOX", 
            limite_alerta=60, 
            limite_critico=100, 
            motivo="Cercanía a núcleo urbano"
        ),
        # Sensor 4 - Chimenea Caldera (Alcalá)
        UmbralSensor(
            id_sensor=4, 
            contaminante="CO", 
            limite_alerta=70, 
            limite_critico=120, 
            motivo="Zona industrial"
        ),
        UmbralSensor(
            id_sensor=4, 
            contaminante="NO", 
            limite_alerta=55, 
            limite_critico=90, 
            motivo="Zona industrial"
        ),
        UmbralSensor(
            id_sensor=4, 
            contaminante="NO2", 
            limite_alerta=45, 
            limite_critico=75, 
            motivo="Zona industrial"
        ),
        UmbralSensor(
            id_sensor=4, 
            contaminante="NOX", 
            limite_alerta=100, 
            limite_critico=160, 
            motivo="Zona industrial"
        ),
        # Sensor 5 - Extrusora 1 (Fuenlabrada)
        UmbralSensor(
            id_sensor=5, 
            contaminante="CO", 
            limite_alerta=50, 
            limite_critico=85, 
            motivo="Reciclaje plástico"
        ),
        UmbralSensor(
            id_sensor=5, 
            contaminante="NO", 
            limite_alerta=40, 
            limite_critico=65, 
            motivo="Reciclaje plástico"
        ),
        UmbralSensor(
            id_sensor=5, 
            contaminante="NO2", 
            limite_alerta=35, 
            limite_critico=55, 
            motivo="Reciclaje plástico"
        ),
        UmbralSensor(
            id_sensor=5, 
            contaminante="NOX", 
            limite_alerta=75, 
            limite_critico=120, 
            motivo="Reciclaje plástico"
        ),
    ]
    
    for umbral in umbrales_sensor:
        db.add(umbral)
    db.commit()
    print("    Umbrales por sensor cargados (20)")