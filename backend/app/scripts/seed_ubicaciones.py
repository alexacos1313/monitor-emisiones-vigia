# backend/app/scripts/seed_ubicaciones.py
from models import Ubicacion, ZonaNormativa  

def seed_ubicaciones(db):
    """Carga las ubicaciones (sin empresa, solo datos geográficos)"""
    print("    Cargando ubicaciones...")
    
    # Obtener la zona normativa
    zona = db.query(ZonaNormativa).first()
    if not zona:
        print("     No hay zonas normativas, creando una por defecto...")
        zona = ZonaNormativa(
            nombre="Zona por defecto",
            comunidad_autonoma="Madrid",
            provincia="Madrid",
            municipio="Madrid",
            nivel_proteccion=3
        )
        db.add(zona)
        db.flush()
        print(f"     Zona normativa creada: {zona.nombre} (ID: {zona.id})")
    
    datos_ubicaciones = [
        {
            "provincia": "Madrid",
            "municipio": "Madrid",
            "distrito": "Villaverde",
            "codigo_postal": "28021",
            "latitud": 40.3478,
            "longitud": -3.7040
        },
        {
            "provincia": "Madrid",
            "municipio": "Getafe",
            "distrito": "Polígono Industrial",
            "codigo_postal": "28901",
            "latitud": 40.3062,
            "longitud": -3.7338
        },
        {
            "provincia": "Madrid",
            "municipio": "Alcalá de Henares",
            "distrito": "Ensanche",
            "codigo_postal": "28801",
            "latitud": 40.4839,
            "longitud": -3.3658
        },
        {
            "provincia": "Madrid",
            "municipio": "Alcobendas",
            "distrito": "Centro",
            "codigo_postal": "28100",
            "latitud": 40.5474,
            "longitud": -3.6415
        },
    ]
    
    for data in datos_ubicaciones:
        ubicacion = Ubicacion(
            provincia=data["provincia"],
            municipio=data["municipio"],
            distrito=data["distrito"],
            codigo_postal=data["codigo_postal"],
            latitud=data["latitud"],
            longitud=data["longitud"],
            zona_normativa_id=zona.id
        )
        db.add(ubicacion)
        print(f"      - {data['municipio']} ({data['provincia']})")
    
    db.commit()
    print("    Ubicaciones cargadas (4)")