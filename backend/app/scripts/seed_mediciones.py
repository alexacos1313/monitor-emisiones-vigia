# scripts/seed_mediciones.py
from datetime import datetime, timedelta
from models import Medicion, MedicionContaminante
import random

def seed_mediciones(db):
    """Carga mediciones (modelo dinámico) en varias fechas"""
    print("    Cargando mediciones y contaminantes...")
    
    contaminantes = ["CO", "NO", "NO2", "NOX"]
    
    # Fechas base para distribuir las mediciones
    fechas_base = [
        datetime.now() - timedelta(days=3),  # 3 días atrás
        datetime.now() - timedelta(days=2),  # 2 días atrás
        datetime.now() - timedelta(days=1),  # 1 día atrás
        datetime.now(),                       # Hoy
    ]
    
    mediciones_creadas = 0
    
    for idx_fecha, fecha_base in enumerate(fechas_base):
        # Para cada fecha, crear entre 5 y 10 mediciones
        num_mediciones = random.randint(5, 10)
        
        for i in range(num_mediciones):
            # Distribuir las mediciones a lo largo del día (cada 30-60 minutos)
            minutos_offset = random.randint(0, 23) * 60 + random.randint(0, 59)
            timestamp = fecha_base.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(minutes=minutos_offset)
            
            # Valores base simulados con variación
            co = round(45.2 + random.uniform(-10, 30), 1)
            no = round(30.0 + random.uniform(-10, 20), 1)
            no2 = round(20.0 + random.uniform(-8, 15), 1)
            nox = round(no + no2 + random.uniform(-5, 10), 1)
            
            # Temperatura, flujo y oxígeno
            temperatura = round(120.5 + random.uniform(-10, 10), 1)
            flujo = round(2.3 + random.uniform(-0.5, 1.0), 1)
            oxigeno = round(8.5 + random.uniform(-1.0, 1.5), 1)
            
            # Estado (la mayoría validado, algunas anomalías)
            estado = "VALIDADO"
            if random.random() < 0.1:  # 10% de probabilidad de anomalía
                estado = random.choice(["ANOMALO", "VALIDADO"])
                if estado == "ANOMALO":
                    # Valor alto para simular anomalía
                    co = round(co * random.uniform(1.5, 3.0), 1)
                    nox = round(nox * random.uniform(1.5, 3.0), 1)
            
            # Crear medición para sensor 1
            medicion = Medicion(
                id_sensor=1,
                timestamp=timestamp,
                temperatura=temperatura,
                flujo=flujo,
                oxigeno=oxigeno,
                estado=estado,
                procesada_ia=0
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
            
            mediciones_creadas += 1
        
        print(f"      - {fecha_base.strftime('%Y-%m-%d')}: {num_mediciones} mediciones")
    
    # También crear algunas mediciones para el sensor 2 y 3 (menos cantidad)
    sensores_extra = [2, 3]
    for sensor_id in sensores_extra:
        for i in range(5):  # 5 mediciones por sensor extra
            timestamp = datetime.now() - timedelta(days=random.randint(0, 2), hours=random.randint(0, 12))
            
            co = round(40.0 + random.uniform(-10, 25), 1)
            no = round(28.0 + random.uniform(-8, 18), 1)
            no2 = round(18.0 + random.uniform(-6, 12), 1)
            nox = round(no + no2 + random.uniform(-5, 8), 1)
            
            medicion = Medicion(
                id_sensor=sensor_id,
                timestamp=timestamp,
                temperatura=round(120.0 + random.uniform(-8, 12), 1),
                flujo=round(2.5 + random.uniform(-0.5, 0.8), 1),
                oxigeno=round(8.8 + random.uniform(-0.8, 1.2), 1),
                estado="VALIDADO",
                procesada_ia=0
            )
            db.add(medicion)
            db.flush()
            
            valores = {"CO": co, "NO": no, "NO2": no2, "NOX": nox}
            for contaminante, valor in valores.items():
                db.add(MedicionContaminante(
                    id_medicion=medicion.id,
                    contaminante=contaminante,
                    valor=valor
                ))
            
            mediciones_creadas += 1
        
        print(f"      - Sensor {sensor_id}: 5 mediciones")
    
    db.commit()
    print(f"    Mediciones y contaminantes cargados ({mediciones_creadas} mediciones en total)")

if __name__ == "__main__":
    # Prueba rápida
    from database import SessionLocal
    db = SessionLocal()
    seed_mediciones(db)
    db.close()