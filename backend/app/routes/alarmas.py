#backend/app/routes/alarmas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import Alarma, Medicion, Sensor, Planta, Usuario
from schemas import AlarmaResponse, ConfirmarAlarma
from auth import get_current_user, get_current_empresa_admin, get_current_super_admin

router = APIRouter(prefix="/alarmas", tags=["Alarmas"])

@router.get("/", response_model=List[AlarmaResponse])
def get_alarmas(
    sensor_id: Optional[int] = Query(None),
    enviada: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar alarmas segun permisos"""
    query = db.query(Alarma)
    
    if sensor_id:
        query = query.filter(Alarma.id_sensor == sensor_id)
    
    if enviada is not None:
        query = query.filter(Alarma.enviada == enviada)
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    return query.order_by(Alarma.timestamp.desc()).all()

@router.get("/pendientes", response_model=List[AlarmaResponse])
def get_alarmas_pendientes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener alarmas no confirmadas"""
    query = db.query(Alarma).filter(Alarma.confirmada_por == None)
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    return query.order_by(Alarma.timestamp.desc()).all()

@router.put("/{alarma_id}/confirmar")
def confirmar_alarma(
    alarma_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirmar una alarma"""
    alarma = db.query(Alarma).filter(Alarma.id == alarma_id).first()
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    
    if current_user.rol != "SUPER_ADMIN":
        sensor = db.query(Sensor).filter(Sensor.id == alarma.id_sensor).first()
        planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso")
    
    alarma.confirmada_por = current_user.id
    alarma.confirmada_en = datetime.now()
    db.commit()
    
    return {"message": "Alarma confirmada"}

@router.get("/estadisticas")
def get_estadisticas_alarmas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Estadisticas de alarmas"""
    query = db.query(Alarma)
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    total = query.count()
    pendientes = query.filter(Alarma.confirmada_por == None).count()
    confirmadas = query.filter(Alarma.confirmada_por != None).count()
    
    por_contaminante = db.query(
        Alarma.contaminante, 
        db.func.count(Alarma.id)
    ).group_by(Alarma.contaminante)
    
    if current_user.rol != "SUPER_ADMIN":
        por_contaminante = por_contaminante.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    return {
        "total": total,
        "pendientes": pendientes,
        "confirmadas": confirmadas,
        "por_contaminante": [{"contaminante": c, "total": t} for c, t in por_contaminante.all()]
    }

@router.delete("/{alarma_id}")
def delete_alarma(
    alarma_id: int,
    current_user: Usuario = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Eliminar una alarma (solo SUPER_ADMIN)"""
    alarma = db.query(Alarma).filter(Alarma.id == alarma_id).first()
    if not alarma:
        raise HTTPException(status_code=404, detail="Alarma no encontrada")
    
    db.delete(alarma)
    db.commit()
    
    return {"message": "Alarma eliminada correctamente"}

@router.delete("/")
def delete_todas_alarmas(
    current_user: Usuario = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Eliminar todas las alarmas (solo SUPER_ADMIN)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede eliminar todas las alarmas")
    
    cantidad = db.query(Alarma).delete()
    db.commit()
    
    return {"message": f"Se eliminaron {cantidad} alarmas"}