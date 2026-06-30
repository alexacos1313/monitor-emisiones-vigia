# backend/app/scripts/seed_zonas.py
from app.models import ZonaNormativa

def seed_zonas(db):
    zonas = [
        ZonaNormativa(nombre="Zona Centro Madrid", descripcion="Distritos centrales", 
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid", 
                      municipio="Madrid", nivel_proteccion=5, normativa_aplicable="Ley 34/2007"),
        ZonaNormativa(nombre="Zona Industrial Sur", descripcion="Getafe, Leganés, Fuenlabrada",
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid",
                      nivel_proteccion=4, normativa_aplicable=" RD 1042/2017 (Anexo II, Cuadro 1 y 2) y Resolución AAI (RD Leg. 1/2016)"),
        ZonaNormativa(nombre="Zona Norte", descripcion="Alcobendas, San Sebastián",
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid",
                      nivel_proteccion=3, normativa_aplicable="Ley 34/2007"),
        ZonaNormativa(nombre="Zona Este", descripcion="Alcalá, Torrejón, Coslada",
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid",
                      nivel_proteccion=4, normativa_aplicable="Plan Zonal"),
        ZonaNormativa(nombre="Zona Oeste", descripcion="Majadahonda, Pozuelo",
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid",
                      nivel_proteccion=3, normativa_aplicable="Ley 34/2007"),
    ]
    for zona in zonas:
        db.add(zona)
    
    db.commit()
    print("   Zonas normativas cargadas")