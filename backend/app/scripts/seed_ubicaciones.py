# scripts/seed_ubicaciones.py
from models import Ubicacion

def seed_ubicaciones(db):
    """Carga las ubicaciones"""
    print("    Cargando ubicaciones...")
    
    ubicaciones = [
        Ubicacion(
            provincia="Madrid", 
            municipio="Madrid", 
            distrito="Villaverde", 
            codigo_postal="28021", 
            latitud=40.3478, 
            longitud=-3.7040, 
            zona_normativa_id=2
        ),
        Ubicacion(
            provincia="Madrid", 
            municipio="Getafe", 
            codigo_postal="28901",
            latitud=40.3062, 
            longitud=-3.7338, 
            zona_normativa_id=2
        ),
        Ubicacion(
            provincia="Madrid", 
            municipio="Alcalá de Henares", 
            codigo_postal="28801",
            latitud=40.4839, 
            longitud=-3.3658, 
            zona_normativa_id=4
        ),
        Ubicacion(
            provincia="Madrid", 
            municipio="Alcobendas", 
            codigo_postal="28100",
            latitud=40.5474, 
            longitud=-3.6415, 
            zona_normativa_id=3
        ),
    ]
    
    for ubicacion in ubicaciones:
        db.add(ubicacion)
    db.commit()
    print("    Ubicaciones cargadas (4)")