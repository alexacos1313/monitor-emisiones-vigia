# backend/app/scripts/seed_mediciones.py
from datetime import datetime, timedelta
from app.models import Medicion, MedicionContaminante

def seed_mediciones(db):
    
    now = datetime.now()
    
    mediciones_data = []
    for i in range(20):
        timestamp = now - timedelta(minutes=i * 6)
        
        co = 45.2 + (i % 10)
        no = 30.0 + (i % 15)
        no2 = 20.0 + (i % 10)
        nox = no + no2
        
        estado = "VALIDADO"
        if i == 12:
            co = 120
            nox = 180
            estado = "ANOMALO"
        elif i == 13:
            no = 90
            estado = "ANOMALO"
        
        mediciones_data.append({
            "id_sensor": 1,
            "timestamp": timestamp,
            "contaminantes": {
                "CO": co,
                "NO": no,
                "NO2": no2,
                "NOX": nox
            },
            "temperatura": 22.5 + (i % 5),
            "flujo": 85.0 + (i % 10),
            "oxigeno": 18.0 + (i % 3),
            "estado": estado
        })
    
    for data in mediciones_data:
        medicion = Medicion(
            id_sensor=data["id_sensor"],
            timestamp=data["timestamp"],
            temperatura=data["temperatura"],
            flujo=data["flujo"],
            oxigeno=data["oxigeno"],
            estado=data["estado"]
        )
        db.add(medicion)
        db.flush()
        
        for contaminante, valor in data["contaminantes"].items():
            if valor is not None:
                db.add(MedicionContaminante(
                    id_medicion=medicion.id,
                    contaminante=contaminante,
                    valor=float(valor)
                ))
    
    db.commit()
    print("   Mediciones dinámicas cargadas")