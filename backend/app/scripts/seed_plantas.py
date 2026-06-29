# scripts/seed_plantas.py
from datetime import datetime
from models import Planta

def seed_plantas(db):
    """Carga las plantas"""
    print("    Cargando plantas...")
    
    plantas = [
        Planta(
            id_empresa=1, 
            id_ubicacion=2, 
            nombre="Planta Cementos Getafe",
            direccion="Calle del Cemento 12, Getafe", 
            actividad="fabricacion_cemento",
            autorizacion_ambiental="AA-M-2021-0845", 
            fecha_autorizacion=datetime(2021, 3, 15)
        ),
        Planta(
            id_empresa=1, 
            id_ubicacion=1, 
            nombre="Planta Villaverde",
            direccion="Calle de los Metales 34, Madrid", 
            actividad="preparacion_materias",
            autorizacion_ambiental="AA-M-2022-0123", 
            fecha_autorizacion=datetime(2022, 1, 20)
        ),
        Planta(
            id_empresa=2, 
            id_ubicacion=3, 
            nombre="Planta Farmacéutica Alcalá",
            direccion="Polígono Industrial 1, Alcalá", 
            actividad="farmaceutica",
            autorizacion_ambiental="AA-M-2019-0567", 
            fecha_autorizacion=datetime(2019, 7, 10)
        ),
        Planta(
            id_empresa=3, 
            id_ubicacion=2, 
            nombre="Centro de Reciclaje Fuenlabrada",
            direccion="Polígono Los Ángeles, Fuenlabrada", 
            actividad="reciclaje_plastico",
            autorizacion_ambiental="AA-M-2020-0987", 
            fecha_autorizacion=datetime(2020, 9, 20)
        ),
    ]
    
    for planta in plantas:
        db.add(planta)
    db.commit()
    print("    Plantas cargadas (4)")