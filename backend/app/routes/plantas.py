# backend/app/routes/plantas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import Planta, Sensor
from schemas import PlantaBase, PlantaCreate, PlantaResponse, SensorResponse

router = APIRouter(prefix="/plantas", tags=["Plantas"])

@router.get("/", response_model=List[PlantaResponse])
def get_plantas(
    empresa_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Listar plantas"""
    query = db.query(Planta).filter(Planta.activo == 1)
    if empresa_id:
        query = query.filter(Planta.id_empresa == empresa_id)
    return query.order_by(Planta.nombre).all()

@router.get("/{planta_id}", response_model=PlantaResponse)
def get_planta(planta_id: int, db: Session = Depends(get_db)):
    """Obtener planta por ID"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    return planta

@router.post("/", response_model=PlantaResponse)
def create_planta(
    planta_data: PlantaCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva planta"""
    # Verificar que la empresa existe (opcional)
    # empresa = db.query(Empresa).filter(Empresa.id == planta_data.id_empresa).first()
    # if not empresa:
    #     raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    nueva_planta = Planta(
        id_empresa=planta_data.id_empresa,
        id_ubicacion=planta_data.id_ubicacion,
        nombre=planta_data.nombre,
        direccion=planta_data.direccion,
        actividad=planta_data.actividad,
        autorizacion_ambiental=planta_data.autorizacion_ambiental,
        fecha_autorizacion=planta_data.fecha_autorizacion,
        activo=1
    )
    db.add(nueva_planta)
    db.commit()
    db.refresh(nueva_planta)
    return nueva_planta

@router.put("/{planta_id}", response_model=PlantaResponse)
def update_planta(
    planta_id: int,
    planta_data: PlantaCreate,
    db: Session = Depends(get_db)
):
    """Actualizar una planta"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    planta.id_empresa = planta_data.id_empresa
    planta.id_ubicacion = planta_data.id_ubicacion
    planta.nombre = planta_data.nombre
    planta.direccion = planta_data.direccion
    planta.actividad = planta_data.actividad
    planta.autorizacion_ambiental = planta_data.autorizacion_ambiental
    planta.fecha_autorizacion = planta_data.fecha_autorizacion
    
    db.commit()
    db.refresh(planta)
    return planta

@router.delete("/{planta_id}")
def delete_planta(
    planta_id: int,
    db: Session = Depends(get_db)
):
    """Eliminar planta (desactivar)"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    planta.activo = 0
    db.commit()
    return {"message": "Planta desactivada correctamente"}

@router.get("/{planta_id}/sensores", response_model=List[SensorResponse])
def get_sensores_de_planta(planta_id: int, db: Session = Depends(get_db)):
    """Obtener sensores de una planta"""
    # Verificar que la planta existe
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    sensores = db.query(Sensor).filter(
        Sensor.id_planta == planta_id,
        Sensor.estado == "ACTIVO"
    ).all()
    return sensores