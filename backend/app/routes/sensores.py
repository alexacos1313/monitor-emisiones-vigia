# backend/app/routes/sensores.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import Sensor, Planta, Empresa, Usuario, UmbralSensor, Medicion, MedicionContaminante
from schemas import (
    SensorCreate, SensorResponse, SensorUpdate,  # <--- AÑADIDO SensorUpdate
    UmbralSensorCreate, UmbralSensorResponse
)
from auth import get_current_user, get_current_empresa_admin

router = APIRouter(prefix="/sensores", tags=["Sensores"], redirect_slashes=False)

CONTAMINANTES_VALIDOS = ["CO", "NO", "NO2", "NOX"]

@router.get("/", response_model=List[SensorResponse])
def get_sensores(
    planta_id: Optional[int] = Query(None),
    empresa_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar sensores (filtrados por permisos de empresa)"""
    query = db.query(Sensor)
    
    if planta_id:
        query = query.filter(Sensor.id_planta == planta_id)
    
    if empresa_id:
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == empresa_id).subquery()
        query = query.filter(Sensor.id_planta.in_(plantas_ids))
    
    if current_user.rol != "SUPER_ADMIN":
        plantas_ids = db.query(Planta.id).filter(Planta.id_empresa == current_user.id_empresa).subquery()
        query = query.filter(Sensor.id_planta.in_(plantas_ids))
    
    return query.all()

@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(
    sensor_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener sensor por ID"""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
    
    return sensor

@router.post("/", response_model=SensorResponse)
def create_sensor(
    sensor_data: SensorCreate,
    current_user: Usuario = Depends(get_current_empresa_admin),
    db: Session = Depends(get_db)
):
    """Crear nuevo sensor (solo ADMIN o SUPER_ADMIN)"""
    planta = db.query(Planta).filter(Planta.id == sensor_data.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="No puedes crear sensores para otra empresa")
    
    new_sensor = Sensor(
        id_planta=sensor_data.id_planta,
        nombre=sensor_data.nombre,
        tipo_analizador=sensor_data.tipo_analizador,
        modelo=sensor_data.modelo,
        fabricante=sensor_data.fabricante,
        fecha_instalacion=sensor_data.fecha_instalacion or datetime.now(),
        frecuencia_medicion=sensor_data.frecuencia_medicion,
        estado="ACTIVO",
        contaminantes=sensor_data.contaminantes  # <--- AÑADIDO
    )
    db.add(new_sensor)
    db.commit()
    db.refresh(new_sensor)
    return new_sensor

@router.put("/{sensor_id}", response_model=SensorResponse)
def update_sensor(
    sensor_id: int,
    sensor_data: SensorUpdate,
    current_user: Usuario = Depends(get_current_empresa_admin),
    db: Session = Depends(get_db)
):
    """Actualizar un sensor"""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso")
    
    for key, value in sensor_data.model_dump(exclude_unset=True).items():
        setattr(sensor, key, value)
    
    db.commit()
    db.refresh(sensor)
    return sensor

@router.put("/{sensor_id}/calibrar")
def calibrar_sensor(
    sensor_id: int,
    current_user: Usuario = Depends(get_current_empresa_admin),
    db: Session = Depends(get_db)
):
    """Registrar calibracion de sensor"""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso")
    
    sensor.ultima_calibracion = datetime.now()
    db.commit()
    
    return {"message": "Calibracion registrada", "fecha": sensor.ultima_calibracion}

@router.get("/{sensor_id}/umbrales", response_model=List[UmbralSensorResponse])
def get_umbrales_sensor(
    sensor_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener umbrales de un sensor"""
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    umbrales = db.query(UmbralSensor).filter(UmbralSensor.id_sensor == sensor_id).all()
    return umbrales

@router.post("/{sensor_id}/umbrales", response_model=UmbralSensorResponse)
def create_umbral(
    sensor_id: int,
    umbral_data: UmbralSensorCreate,
    current_user: Usuario = Depends(get_current_empresa_admin),
    db: Session = Depends(get_db)
):
    """Crear umbral para un sensor"""
    if umbral_data.contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso")
    
    existing = db.query(UmbralSensor).filter(
        UmbralSensor.id_sensor == sensor_id,
        UmbralSensor.contaminante == umbral_data.contaminante
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un umbral para {umbral_data.contaminante}")
    
    new_umbral = UmbralSensor(
        id_sensor=sensor_id,
        contaminante=umbral_data.contaminante,
        limite_alerta=umbral_data.limite_alerta,
        limite_critico=umbral_data.limite_critico,
        tiempo_ventana=umbral_data.tiempo_ventana,
        motivo=umbral_data.motivo,
        fecha_aplicacion=datetime.now()
    )
    db.add(new_umbral)
    db.commit()
    db.refresh(new_umbral)
    return new_umbral

@router.get("/{sensor_id}/contaminantes")
def get_contaminantes_sensor(
    sensor_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener los contaminantes que mide un sensor específico.
    """
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
    
    contaminantes_db = db.query(MedicionContaminante.contaminante).distinct().join(
        Medicion
    ).filter(Medicion.id_sensor == sensor_id).all()
    
    if contaminantes_db:
        return [c[0] for c in contaminantes_db]
    
    if sensor.contaminantes:
        return sensor.contaminantes
    
    return ["CO", "NO", "NO2", "NOX"]