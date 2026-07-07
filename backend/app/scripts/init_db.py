# scripts/init_db.py
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, Base

# Importar todos los seeds
from scripts.seed_zonas import seed_zonas
from scripts.seed_ubicaciones import seed_ubicaciones
from scripts.seed_empresas import seed_empresas
from scripts.seed_plantas import seed_plantas
from scripts.seed_sensores import seed_sensores
from scripts.seed_umbrales_normativos import seed_umbrales_normativos
from scripts.seed_umbrales_sensor import seed_umbrales_sensor
from scripts.seed_mediciones import seed_mediciones
from scripts.seed_usuarios import seed_usuarios


def init_database():
    """Crea las tablas y carga todos los datos de ejemplo"""
    
    print("\n" + "="*60)
    print(" INICIALIZANDO BASE DE DATOS VIGIA")
    print("="*60)
    
    print("\n Creando tablas con SQLAlchemy...")
    
    # Crear todas las tablas (limpiar primero)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print(" Tablas creadas correctamente")
    
    # Crear sesión
    db = SessionLocal()
    
    print("\n Cargando datos de ejemplo...\n")
    
    # Orden de carga (respetar dependencias)
    seed_zonas(db)              # 1. Zonas normativas
    seed_ubicaciones(db)        # 2. Ubicaciones (depende de zonas)
    seed_empresas(db)           # 3. Empresas
    seed_plantas(db)            # 4. Plantas (depende de empresas y ubicaciones)
    seed_sensores(db)           # 5. Sensores (depende de plantas)
    seed_umbrales_normativos(db) # 6. Umbrales normativos (depende de zonas)
    seed_umbrales_sensor(db)    # 7. Umbrales por sensor (depende de sensores)
    seed_mediciones(db)         # 8. Mediciones (depende de sensores)
    seed_usuarios(db)           # 9. Usuarios (depende de empresas)
    
    db.close()
    
    print("\n" + "="*60)
    print(" BASE DE DATOS INICIALIZADA CORRECTAMENTE")
    print("="*60)
    print("\n Resumen de datos cargados:")
    print("   • 5 Zonas normativas")
    print("   • 4 Ubicaciones")
    print("   • 3 Empresas")
    print("   • 4 Plantas")
    print("   • 5 Sensores")
    print("   • 8 Umbrales normativos")
    print("   • 20 Umbrales por sensor")
    print("   • 20 Mediciones (con 4 contaminantes cada una)")
    print("   • 4 Usuarios")
    print("="*60)


if __name__ == "__main__":
    init_database()