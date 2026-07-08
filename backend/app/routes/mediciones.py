# backend/app/routes/mediciones.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, Dict, Any, List
from database import get_db
from models import Medicion, MedicionContaminante, Sensor
from schemas import MedicionCreate, MedicionResponse

router = APIRouter(prefix="/mediciones", tags=["Mediciones"])

@router.get("/", response_model=list[MedicionResponse])
def get_mediciones(
    sensor_id: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Listar mediciones con filtros"""
    query = db.query(Medicion)
    
    if sensor_id:
        query = query.filter(Medicion.id_sensor == sensor_id)
    
    if fecha_inicio:
        query = query.filter(Medicion.timestamp >= fecha_inicio)
    
    if fecha_fin:
        query = query.filter(Medicion.timestamp <= fecha_fin)
    
    return query.order_by(Medicion.timestamp.desc()).limit(limit).all()

@router.get("/sensor/{sensor_id}/contaminantes")
def get_contaminantes_sensor(
    sensor_id: int,
    db: Session = Depends(get_db)
):
    """Obtener lista de contaminantes que mide un sensor"""
    result = db.query(MedicionContaminante.contaminante).distinct().join(
        Medicion
    ).filter(Medicion.id_sensor == sensor_id).all()
    
    return {"contaminantes": [r[0] for r in result]}

@router.get("/sensor/{sensor_id}/estadisticas")
def get_estadisticas(
    sensor_id: int,
    fecha: str = Query(default=datetime.now().strftime("%Y-%m-%d")),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas diarias por contaminante"""
    # Obtener todos los contaminantes del sensor
    contaminantes = db.query(MedicionContaminante.contaminante).distinct().join(
        Medicion
    ).filter(Medicion.id_sensor == sensor_id).all()
    
    result = {}
    
    for c in contaminantes:
        nombre = c[0]
        stats = db.query(
            func.avg(MedicionContaminante.valor).label("avg"),
            func.max(MedicionContaminante.valor).label("max"),
            func.min(MedicionContaminante.valor).label("min"),
            func.count(MedicionContaminante.id).label("total")
        ).join(Medicion).filter(
            Medicion.id_sensor == sensor_id,
            MedicionContaminante.contaminante == nombre,
            func.date(Medicion.timestamp) == fecha
        ).first()
        
        result[nombre] = {
            "promedio": float(stats.avg) if stats.avg else None,
            "maximo": stats.max,
            "minimo": stats.min,
            "total": stats.total or 0
        }
    
    return result

@router.post("/", response_model=MedicionResponse)
async def create_medicion(
    medicion_data: MedicionCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva medición con contaminantes dinámicos"""
    sensor = db.query(Sensor).filter(Sensor.id == medicion_data["id_sensor"]).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    # Extraer contaminantes del payload
    contaminantes_dict = medicion_data.get("contaminantes", {})
    
    # Crear la medición
    nueva = Medicion(
        id_sensor=medicion_data["id_sensor"],
        timestamp=datetime.now(),
        temperatura=medicion_data.get("temperatura"),
        flujo=medicion_data.get("flujo"),
        oxigeno=medicion_data.get("oxigeno"),
        estado="VALIDADO"
    )
    db.add(nueva)
    db.flush()  # Para obtener el ID
    
    # Guardar contaminantes
    for contaminante, valor in contaminantes_dict.items():
        if valor is not None:
            db.add(MedicionContaminante(
                id_medicion=nueva.id,
                contaminante=contaminante,
                valor=valor
            ))
    
    db.commit()
    db.refresh(nueva)
    
    return nueva