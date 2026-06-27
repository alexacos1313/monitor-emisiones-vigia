# backend/app/scripts/init_db_simple.py
import sys
import os
from datetime import datetime, timedelta
import json
import bcrypt

# Añadir el directorio padre al path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal, Base
from models import (
    ZonaNormativa, Ubicacion, Empresa, Planta, Sensor,
    UmbralNormativo, UmbralSensor, Medicion, MedicionContaminante, Usuario,
    MantenimientoSensor, Alarma
)

# Función para hashear contraseña sin depender de auth.py
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def init_database():
    """Crea las tablas y carga los datos de ejemplo"""
    
    print(" Creando tablas con SQLAlchemy...")
    
    # Crear tablas
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print(" Tablas creadas")
    
    db = SessionLocal()
    
    print(" Cargando datos de ejemplo...")
    
    # =====================================================
    # ZONAS NORMATIVAS
    # =====================================================
    zonas = [
        ZonaNormativa(nombre="Zona Centro Madrid", descripcion="Distritos centrales", 
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid", 
                      municipio="Madrid", nivel_proteccion=5, normativa_aplicable="Ordenanza 34/2021"),
        ZonaNormativa(nombre="Zona Industrial Sur", descripcion="Getafe, Leganés, Fuenlabrada",
                      comunidad_autonoma="Comunidad de Madrid", provincia="Madrid",
                      nivel_proteccion=4, normativa_aplicable="Ley 34/2007"),
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
    
    # =====================================================
    # UBICACIONES
    # =====================================================
    ubicaciones = [
        Ubicacion(provincia="Madrid", municipio="Madrid", distrito="Villaverde", 
                  codigo_postal="28021", latitud=40.3478, longitud=-3.7040, zona_normativa_id=2),
        Ubicacion(provincia="Madrid", municipio="Getafe", codigo_postal="28901",
                  latitud=40.3062, longitud=-3.7338, zona_normativa_id=2),
        Ubicacion(provincia="Madrid", municipio="Alcalá de Henares", codigo_postal="28801",
                  latitud=40.4839, longitud=-3.3658, zona_normativa_id=4),
        Ubicacion(provincia="Madrid", municipio="Alcobendas", codigo_postal="28100",
                  latitud=40.5474, longitud=-3.6415, zona_normativa_id=3),
    ]
    for ubicacion in ubicaciones:
        db.add(ubicacion)
    db.commit()
    print("   Ubicaciones cargadas")
    
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
    
    # =====================================================
    # PLANTAS
    # =====================================================
    plantas = [
        Planta(id_empresa=1, id_ubicacion=2, nombre="Planta Cementos Getafe",
               direccion="Calle del Cemento 12, Getafe", actividad="fabricacion_cemento",
               autorizacion_ambiental="AA-M-2021-0845", fecha_autorizacion=datetime(2021, 3, 15)),
        Planta(id_empresa=1, id_ubicacion=1, nombre="Planta Villaverde",
               direccion="Calle de los Metales 34, Madrid", actividad="preparacion_materias",
               autorizacion_ambiental="AA-M-2022-0123", fecha_autorizacion=datetime(2022, 1, 20)),
        Planta(id_empresa=2, id_ubicacion=3, nombre="Planta Farmacéutica Alcalá",
               direccion="Polígono Industrial 1, Alcalá", actividad="farmaceutica",
               autorizacion_ambiental="AA-M-2019-0567", fecha_autorizacion=datetime(2019, 7, 10)),
        Planta(id_empresa=3, id_ubicacion=2, nombre="Centro de Reciclaje Fuenlabrada",
               direccion="Polígono Los Ángeles, Fuenlabrada", actividad="reciclaje_plastico",
               autorizacion_ambiental="AA-M-2020-0987", fecha_autorizacion=datetime(2020, 9, 20)),
    ]
    for planta in plantas:
        db.add(planta)
    db.commit()
    print("   Plantas cargadas")
    
    # =====================================================
    # SENSORES
    # =====================================================
    sensores = [
        Sensor(id_planta=1, nombre="Chimenea Horno 1", tipo_analizador="Láser NDIR",
               modelo="LaserGas III", fabricante="Norsk Analyse",
               fecha_instalacion=datetime(2021, 4, 1), ultima_calibracion=datetime(2024, 1, 15),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NO", "NO2", "NOX"])),
        Sensor(id_planta=1, nombre="Chimenea Horno 2", tipo_analizador="Láser NDIR",
               modelo="LaserGas III", fabricante="Norsk Analyse",
               fecha_instalacion=datetime(2021, 4, 1), ultima_calibracion=datetime(2024, 1, 15),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NO", "NO2", "NOX"])),
        Sensor(id_planta=2, nombre="Chimenea Principal", tipo_analizador="FTIR",
               modelo="MGA 12", fabricante="SICK",
               fecha_instalacion=datetime(2020, 2, 15), ultima_calibracion=datetime(2024, 3, 1),
               frecuencia_medicion=60, contaminantes=json.dumps(["CO", "NO2", "SO2"])),
        Sensor(id_planta=3, nombre="Chimenea Caldera", tipo_analizador="FTIR",
               modelo="MGA 12", fabricante="SICK",
               fecha_instalacion=datetime(2019, 8, 1), ultima_calibracion=datetime(2024, 2, 10),
               frecuencia_medicion=60, contaminantes=json.dumps(["NO", "NOX", "CO"])),
        Sensor(id_planta=4, nombre="Extrusora 1", tipo_analizador="NDIR",
               modelo="S710", fabricante="ABB",
               fecha_instalacion=datetime(2020, 10, 1), ultima_calibracion=datetime(2024, 1, 20),
               frecuencia_medicion=30, contaminantes=json.dumps(["CO", "NOX", "SO2", "PARTICULAS"])),
    ]
    for sensor in sensores:
        db.add(sensor)
    db.commit()
    print("   Sensores cargados")
    
    # =====================================================
    # UMBRALES NORMATIVOS
    # =====================================================
    umbrales_normativos = [
        UmbralNormativo(zona_normativa_id=2, contaminante="CO", limite_alerta=80, limite_critico=150, referencia_legal="Ley 34/2007"),
        UmbralNormativo(zona_normativa_id=2, contaminante="NO", limite_alerta=60, limite_critico=100, referencia_legal="Ley 34/2007"),
        UmbralNormativo(zona_normativa_id=2, contaminante="NO2", limite_alerta=50, limite_critico=80, referencia_legal="Ley 34/2007"),
        UmbralNormativo(zona_normativa_id=2, contaminante="NOX", limite_alerta=120, limite_critico=250, referencia_legal="Ley 34/2007"),
        UmbralNormativo(zona_normativa_id=4, contaminante="CO", limite_alerta=80, limite_critico=150, referencia_legal="Plan Zonal"),
        UmbralNormativo(zona_normativa_id=4, contaminante="NO", limite_alerta=60, limite_critico=100, referencia_legal="Plan Zonal"),
        UmbralNormativo(zona_normativa_id=4, contaminante="NO2", limite_alerta=50, limite_critico=80, referencia_legal="Plan Zonal"),
        UmbralNormativo(zona_normativa_id=4, contaminante="NOX", limite_alerta=120, limite_critico=250, referencia_legal="Plan Zonal"),
    ]
    for umbral in umbrales_normativos:
        db.add(umbral)
    db.commit()
    print("   Umbrales normativos cargados")
    
    # =====================================================
    # UMBRALES POR SENSOR
    # =====================================================
    umbrales_sensor = [
        UmbralSensor(id_sensor=1, contaminante="CO", limite_alerta=60, limite_critico=100, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NO", limite_alerta=50, limite_critico=80, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NO2", limite_alerta=40, limite_critico=70, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=1, contaminante="NOX", limite_alerta=90, limite_critico=150, motivo="Compromiso voluntario"),
        UmbralSensor(id_sensor=3, contaminante="CO", limite_alerta=40, limite_critico=70, motivo="Cercanía a núcleo urbano"),
        UmbralSensor(id_sensor=3, contaminante="NO2", limite_alerta=25, limite_critico=45, motivo="Cercanía a núcleo urbano"),
        UmbralSensor(id_sensor=4, contaminante="NO", limite_alerta=55, limite_critico=90, motivo="Zona industrial"),
        UmbralSensor(id_sensor=4, contaminante="NOX", limite_alerta=100, limite_critico=160, motivo="Zona industrial"),
    ]
    for umbral in umbrales_sensor:
        db.add(umbral)
    db.commit()
    print("   Umbrales por sensor cargados")
    
    # =====================================================
    # MEDICIONES
    # =====================================================
    now = datetime.now()
    
    mediciones_data = []
    for i in range(20):
        timestamp = now - timedelta(minutes=i * 6)
        
        co = 45.2 + (i % 10)
        no = 30.0 + (i % 15)
        no2 = 20.0 + (i % 10)
        nox = no + no2
        
        estado = "VALIDADO"
        if i == 12:
            co = 120
            nox = 180
            estado = "ANOMALO"
        elif i == 13:
            no = 90
            estado = "ANOMALO"
        
        mediciones_data.append({
            "id_sensor": 1,
            "timestamp": timestamp,
            "contaminantes": {
                "CO": co,
                "NO": no,
                "NO2": no2,
                "NOX": nox
            },
            "temperatura": 22.5 + (i % 5),
            "flujo": 85.0 + (i % 10),
            "oxigeno": 18.0 + (i % 3),
            "estado": estado
        })
    
    for data in mediciones_data:
        medicion = Medicion(
            id_sensor=data["id_sensor"],
            timestamp=data["timestamp"],
            temperatura=data["temperatura"],
            flujo=data["flujo"],
            oxigeno=data["oxigeno"],
            estado=data["estado"]
        )
        db.add(medicion)
        db.flush()
        
        for contaminante, valor in data["contaminantes"].items():
            if valor is not None:
                db.add(MedicionContaminante(
                    id_medicion=medicion.id,
                    contaminante=contaminante,
                    valor=float(valor)
                ))
    
    db.commit()
    print("   Mediciones dinámicas cargadas")
    
    # =====================================================
    # ALARMAS
    # =====================================================
    medicion_alarma = db.query(Medicion).filter(
        Medicion.id_sensor == 1,
        Medicion.estado == "ANOMALO"
    ).first()
    
    if medicion_alarma:
        alarma = Alarma(
            id_medicion=medicion_alarma.id,
            id_sensor=1,
            tipo="CRITICO",
            contaminante="CO",
            valor=120.0,
            umbral=100.0,
            mensaje="Alarma crítica: CO supera límite de 100 mg/m³",
            timestamp=medicion_alarma.timestamp,
            enviada=0
        )
        db.add(alarma)
        db.commit()
        print("   Alarmas cargadas")
    
    # =====================================================
    # USUARIOS
    # =====================================================
    usuarios = [
        Usuario(
            nombre="Super Administrador",
            email="admin@sistema.es",
            rol="SUPER_ADMIN",
            password_hash=get_password_hash("admin123"),
            activo=1
        ),
        Usuario(
            id_empresa=1,
            nombre="María González",
            email="maria@cementosmadrid.es",
            rol="EMPRESA_ADMIN",
            password_hash=get_password_hash("maria123"),
            creado_por=1,
            activo=1
        ),
        Usuario(
            id_empresa=1,
            nombre="Carlos López",
            email="carlos@cementosmadrid.es",
            rol="TECNICO",
            password_hash=get_password_hash("carlos123"),
            creado_por=2,
            activo=1
        ),
        Usuario(
            id_empresa=2,
            nombre="Javier Martínez",
            email="javier@farmaalcala.es",
            rol="EMPRESA_ADMIN",
            password_hash=get_password_hash("javier123"),
            creado_por=1,
            activo=1
        ),
    ]
    for usuario in usuarios:
        db.add(usuario)
    db.commit()
    print("   Usuarios cargados")
    
    # =====================================================
    # MANTENIMIENTO
    # =====================================================
    mantenimientos = [
        MantenimientoSensor(
            id_sensor=1,
            fecha=datetime(2024, 1, 15),
            tipo="CALIBRACION",
            tecnico="Juan Pérez",
            observaciones="Calibración anual",
            proxima_calibracion=datetime(2025, 1, 15)
        ),
        MantenimientoSensor(
            id_sensor=3,
            fecha=datetime(2024, 2, 10),
            tipo="CALIBRACION",
            tecnico="Carlos Ruiz",
            observaciones="Calibración FTIR",
            proxima_calibracion=datetime(2025, 2, 10)
        ),
    ]
    for mantenimiento in mantenimientos:
        db.add(mantenimiento)
    db.commit()
    print("   Mantenimiento cargado")
    
    db.close()
    
    print("\n Base de datos SQLAlchemy inicializada correctamente")
    print(" Tablas creadas y datos de ejemplo cargados")
    print("\n CREDENCIALES DE ACCESO:")
    print("    admin@sistema.es / admin123 (SUPER_ADMIN)")
    print("    maria@cementosmadrid.es / maria123 (ADMIN empresa 1)")
    print("    carlos@cementosmadrid.es / carlos123 (TECNICO empresa 1)")
    print("    javier@farmaalcala.es / javier123 (ADMIN empresa 2)")

if __name__ == "__main__":
    init_database()