# backend/app/scripts/init_db.py

from app.database import engine, SessionLocal, Base

from app.scripts.seed_zonas import seed_zonas
from app.scripts.seed_ubicaciones import seed_ubicaciones
from app.scripts.seed_empresas import seed_empresas
from app.scripts.seed_plantas import seed_plantas
from app.scripts.seed_sensores import seed_sensores
from app.scripts.seed_umbrales_normativos import seed_umbrales_normativos
from app.scripts.seed_umbrales_sensor import seed_umbrales_sensor
from app.scripts.seed_mediciones import seed_mediciones
from app.scripts.seed_usuarios import seed_usuarios
from app.scripts.seed_mantenimiento_sensores import seed_mantenimiento_sensores


def init_database():
    """Crea las tablas y carga los datos de ejemplo"""
    
    print("\n" + "="*60)
    print(" INICIALIZANDO BASE DE DATOS VIGIA")
    print("="*60)

    
    print("\n Creando tablas con SQLAlchemy...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print(" Tablas creadas")
    
    db = SessionLocal()
    
    print(" Cargando datos de ejemplo...")
    
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
    seed_mantenimiento_sensores(db) # 10. Mantenimiento sensores (dependee de sensores y usuarios)
   
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
    print("   • 2 Registros Mantenimiento")
    print("="*60)

if __name__ == "__main__":
    init_database()
