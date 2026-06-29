# scripts/seed_zonas.py
from datetime import datetime
from models import ZonaNormativa

def seed_zonas(db):
    """Carga las zonas normativas"""
    print("    Cargando zonas normativas...")
    
    zonas = [
        ZonaNormativa(
            nombre="Zona Centro Madrid", 
            descripcion="Distritos centrales", 
            comunidad_autonoma="Comunidad de Madrid", 
            provincia="Madrid", 
            municipio="Madrid", 
            nivel_proteccion=5, 
            normativa_aplicable="Ordenanza 34/2021"
        ),
        ZonaNormativa(
            nombre="Zona Industrial Sur", 
            descripcion="Getafe, Leganés, Fuenlabrada",
            comunidad_autonoma="Comunidad de Madrid", 
            provincia="Madrid",
            nivel_proteccion=4, 
            normativa_aplicable="Ley 34/2007"
        ),
        ZonaNormativa(
            nombre="Zona Norte", 
            descripcion="Alcobendas, San Sebastián",
            comunidad_autonoma="Comunidad de Madrid", 
            provincia="Madrid",
            nivel_proteccion=3, 
            normativa_aplicable="Ley 34/2007"
        ),
        ZonaNormativa(
            nombre="Zona Este", 
            descripcion="Alcalá, Torrejón, Coslada",
            comunidad_autonoma="Comunidad de Madrid", 
            provincia="Madrid",
            nivel_proteccion=4, 
            normativa_aplicable="Plan Zonal"
        ),
        ZonaNormativa(
            nombre="Zona Oeste", 
            descripcion="Majadahonda, Pozuelo",
            comunidad_autonoma="Comunidad de Madrid", 
            provincia="Madrid",
            nivel_proteccion=3, 
            normativa_aplicable="Ley 34/2007"
        ),
    ]
    
    for zona in zonas:
        db.add(zona)
    db.commit()
    print("   Zonas normativas cargadas (5)")