# scripts/seed_umbrales_normativos.py
from models import UmbralNormativo

def seed_umbrales_normativos(db):
    """Carga los umbrales normativos"""
    print("    Cargando umbrales normativos...")
    
    umbrales_normativos = [
        # Zona Industrial Sur (id=2)
        UmbralNormativo(
            zona_normativa_id=2, 
            contaminante="CO", 
            limite_alerta=80, 
            limite_critico=150, 
            referencia_legal="Ley 34/2007"
        ),
        UmbralNormativo(
            zona_normativa_id=2, 
            contaminante="NO", 
            limite_alerta=60, 
            limite_critico=100, 
            referencia_legal="Ley 34/2007"
        ),
        UmbralNormativo(
            zona_normativa_id=2, 
            contaminante="NO2", 
            limite_alerta=50, 
            limite_critico=80, 
            referencia_legal="Ley 34/2007"
        ),
        UmbralNormativo(
            zona_normativa_id=2, 
            contaminante="NOX", 
            limite_alerta=120, 
            limite_critico=250, 
            referencia_legal="Ley 34/2007"
        ),
        # Zona Este (id=4)
        UmbralNormativo(
            zona_normativa_id=4, 
            contaminante="CO", 
            limite_alerta=80, 
            limite_critico=150, 
            referencia_legal="Plan Zonal"
        ),
        UmbralNormativo(
            zona_normativa_id=4, 
            contaminante="NO", 
            limite_alerta=60, 
            limite_critico=100, 
            referencia_legal="Plan Zonal"
        ),
        UmbralNormativo(
            zona_normativa_id=4, 
            contaminante="NO2", 
            limite_alerta=50, 
            limite_critico=80, 
            referencia_legal="Plan Zonal"
        ),
        UmbralNormativo(
            zona_normativa_id=4, 
            contaminante="NOX", 
            limite_alerta=120, 
            limite_critico=250, 
            referencia_legal="Plan Zonal"
        ),
    ]
    
    for umbral in umbrales_normativos:
        db.add(umbral)
    db.commit()
    print("    Umbrales normativos cargados (8)")