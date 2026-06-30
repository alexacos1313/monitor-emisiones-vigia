from datetime import datetime, timedelta
from app.models import Empresa

def seed_empresas(db):
    # =====================================================
    # EMPRESAS
    # =====================================================
    empresas = [
        Empresa(nombre="Cementos Madrid SA", cif="B28456789", direccion_social="Calle Principal 123, Getafe",
                telefono="912345678", email="info@cementosmadrid.es", fecha_registro=datetime(2015, 3, 10)),
        Empresa(nombre="Farmacéutica Alcalá SL", cif="B87654321", direccion_social="Avda. Industria 45, Alcalá",
                telefono="918765432", email="info@farmaalcala.es", fecha_registro=datetime(2018, 6, 15)),
        Empresa(nombre="Reciclados del Sur SL", cif="B11223344", direccion_social="Polígono Los Ángeles, Fuenlabrada",
                telefono="916543210", email="info@recicladossur.es", fecha_registro=datetime(2012, 11, 20)),
    ]
    for empresa in empresas:
        db.add(empresa)
    
    db.commit()
    print("   Empresas cargadas")