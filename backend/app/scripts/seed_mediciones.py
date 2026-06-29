# scripts/seed_mediciones.py
from datetime import datetime, timedelta
from models import Medicion, MedicionContaminante

def seed_mediciones(db):
    """Carga mediciones (modelo dinámico)"""
    print("    Cargando mediciones y contaminantes...")
    
    now = datetime.now()
    contaminantes = ["CO", "NO", "NO2", "NOX"]
    
    for i in range(20):
        timestamp = now - timedelta(minutes=i * 6)
        
        # Valores base simulados
        co = 45.2 + (i % 10)
        no = 30.0 + (i % 15)
        no2 = 20.0 + (i % 10)
        nox = no + no2
        
        # Anomalías para probar alarmas
        estado = "VALIDADO"
        if i == 12:
            co = 120
            nox = 180
            estado = "ANOMALO"
        elif i == 13:
            no = 90
            estado = "ANOMALO"
        
        # Crear medición
        medicion = Medicion(
            id_sensor=1,
            timestamp=timestamp,
            temperatura=120.5 + (i % 5),
            flujo=2.3 + (i % 3) * 0.1,
            oxigeno=8.5 + (i % 2) * 0.5,
            estado=estado
        )
        db.add(medicion)
        db.flush()
        
        # Crear contaminantes
        valores = {"CO": co, "NO": no, "NO2": no2, "NOX": nox}
        for contaminante, valor in valores.items():
            db.add(MedicionContaminante(
                id_medicion=medicion.id,
                contaminante=contaminante,
                valor=valor
            ))
    
    db.commit()
    print("    Mediciones y contaminantes cargados (20 mediciones con 4 contaminantes cada una)")