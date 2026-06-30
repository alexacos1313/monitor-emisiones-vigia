from app.models import MantenimientoSensor
from datetime import datetime

def seed_mantenimiento_sensores(db):
    
    mantenimientos = [
        MantenimientoSensor(
            id_sensor=1,
            fecha=datetime(2024, 1, 15),
            tipo="CALIBRACION",
            tecnico="Juan Pérez",
            observaciones="Calibración anual",
            proxima_calibracion=datetime(2025, 1, 15)
        ),
        MantenimientoSensor(
            id_sensor=3,
            fecha=datetime(2024, 2, 10),
            tipo="CALIBRACION",
            tecnico="Carlos Ruiz",
            observaciones="Calibración FTIR",
            proxima_calibracion=datetime(2025, 2, 10)
        ),
    ]
    for mantenimiento in mantenimientos:
        db.add(mantenimiento)
    
    db.commit()
    print("   Mantenimiento cargado")
    
    db.close()