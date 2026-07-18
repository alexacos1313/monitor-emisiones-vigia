# backend/app/routes/plantas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import Planta, Sensor, Usuario  
from schemas import PlantaBase, PlantaCreate, PlantaResponse, PlantaUpdate, SensorResponse  
from auth import get_current_user  

router = APIRouter(prefix="/plantas", tags=["Plantas"])

# ============================================
# LISTAR PLANTAS
# ============================================
@router.get("/", response_model=List[PlantaResponse])
def get_plantas(
    empresa_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),  
    db: Session = Depends(get_db)
):
    """Listar plantas (todas, activas e inactivas)"""
    query = db.query(Planta)
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.filter(Planta.id_empresa == current_user.id_empresa)
    elif empresa_id:
        query = query.filter(Planta.id_empresa == empresa_id)
    
    return query.order_by(Planta.nombre).all()

# ============================================
# OBTENER PLANTA POR ID
# ============================================
@router.get("/{planta_id}", response_model=PlantaResponse)
def get_planta(
    planta_id: int,
    current_user: Usuario = Depends(get_current_user),  
    db: Session = Depends(get_db)
):
    """Obtener planta por ID (con permisos)"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para esta planta")
    
    return planta

# ============================================
# CREAR PLANTA
# ============================================
@router.post("/", response_model=PlantaResponse)
def create_planta(
    planta_data: PlantaCreate,
    current_user: Usuario = Depends(get_current_user),  
    db: Session = Depends(get_db)
):
    """Crear una nueva planta"""
    if current_user.rol != "SUPER_ADMIN" and current_user.id_empresa != planta_data.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para crear plantas en esta empresa")
    
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

# ============================================
# ACTUALIZAR PLANTA (USANDO PlantaUpdate)
# ============================================
@router.put("/{planta_id}", response_model=PlantaResponse)
def update_planta(
    planta_id: int,
    planta_data: PlantaUpdate,  
    current_user: Usuario = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Actualizar una planta (permite actualizar activo)"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para modificar esta planta")
    
    #  Actualizar solo los campos que vienen en la petición
    update_data = planta_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(planta, key) and value is not None:
            setattr(planta, key, value)
    
    db.commit()
    db.refresh(planta)
    return planta

# ============================================
# ELIMINAR PLANTA (DESACTIVAR)
# ============================================
@router.delete("/{planta_id}")
def delete_planta(
    planta_id: int,
    current_user: Usuario = Depends(get_current_user),  
    db: Session = Depends(get_db)
):
    """Eliminar planta (desactivar)"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar esta planta")
    
    planta.activo = 0
    db.commit()
    return {"message": "Planta desactivada correctamente"}

# ============================================
# OBTENER SENSORES DE UNA PLANTA
# ============================================
@router.get("/{planta_id}/sensores", response_model=List[SensorResponse])
def get_sensores_de_planta(
    planta_id: int,
    current_user: Usuario = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Obtener sensores de una planta"""
    planta = db.query(Planta).filter(Planta.id == planta_id).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para ver esta planta")
    
    sensores = db.query(Sensor).filter(
        Sensor.id_planta == planta_id,
        Sensor.estado == "ACTIVO"
    ).all()
    return sensores