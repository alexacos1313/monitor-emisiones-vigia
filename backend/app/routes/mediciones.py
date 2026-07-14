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

@router.get("/sensor/{sensor_id}/validar")
def validar_mediciones_sensor(
    sensor_id: int,
    db: Session = Depends(get_db)
):
    """
    Verificar el estado de las mediciones de un sensor.
    """
    total = db.query(Medicion).filter(Medicion.id_sensor == sensor_id).count()
    
    con_datos = db.query(Medicion).filter(
        Medicion.id_sensor == sensor_id,
        Medicion.contaminantes_rel.any()
    ).count()
    
    sin_datos = total - con_datos
    
    # Obtener contaminantes disponibles
    contaminantes = db.query(MedicionContaminante.contaminante).distinct().join(
        Medicion
    ).filter(Medicion.id_sensor == sensor_id).all()
    contaminantes_lista = [c[0] for c in contaminantes]
    
    return {
        "sensor_id": sensor_id,
        "total_mediciones": total,
        "con_datos": con_datos,
        "sin_datos": sin_datos,
        "contaminantes_disponibles": contaminantes_lista,
        "tiene_datos": con_datos > 0
    }

@router.post("/", response_model=MedicionResponse)
async def create_medicion(
    medicion_data: MedicionCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva medición con contaminantes dinámicos"""
    
    # Verificar que el sensor existe
    sensor = db.query(Sensor).filter(Sensor.id == medicion_data.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    # Extraer contaminantes del payload
    contaminantes_dict = medicion_data.contaminantes
    
    # Crear la medición
    nueva = Medicion(
        id_sensor=medicion_data.id_sensor,
        timestamp=datetime.now(),
        temperatura=medicion_data.temperatura,
        flujo=medicion_data.flujo,
        oxigeno=medicion_data.oxigeno,
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
    
    # Obtener los contaminantes de la medición para la respuesta
    contaminantes_guardados = db.query(MedicionContaminante).filter(
        MedicionContaminante.id_medicion == nueva.id
    ).all()
    
    contaminantes_respuesta = {c.contaminante: c.valor for c in contaminantes_guardados}
    

    return {
        "id": nueva.id,
        "id_sensor": nueva.id_sensor,
        "timestamp": nueva.timestamp,
        "contaminantes": contaminantes_respuesta,
        "temperatura": nueva.temperatura,
        "flujo": nueva.flujo,
        "oxigeno": nueva.oxigeno,
        "estado": nueva.estado,
        "procesada_ia": 0
    }

@router.delete("/limpiar/sensor/{sensor_id}")
def limpiar_mediciones_sin_datos(
    sensor_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar mediciones de un sensor que no tienen datos de contaminantes.
    Útil para limpiar mediciones vacías.
    """
    # Buscar mediciones sin contaminantes
    mediciones_sin_datos = db.query(Medicion).filter(
        Medicion.id_sensor == sensor_id,
        ~Medicion.contaminantes_rel.any()  # No tiene contaminantes asociados
    ).all()
    
    ids_eliminados = [m.id for m in mediciones_sin_datos]
    
    # Eliminar
    for m in mediciones_sin_datos:
        db.delete(m)
    
    db.commit()
    
    return {
        "mensaje": f"Se eliminaron {len(ids_eliminados)} mediciones sin datos",
        "ids_eliminados": ids_eliminados,
        "total_eliminados": len(ids_eliminados)
    }

@router.delete("/sensor/{sensor_id}")
def eliminar_todas_mediciones_sensor(
    sensor_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar TODAS las mediciones de un sensor (cuidado).
    """
    # Verificar que el sensor existe
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    # Contar antes de eliminar
    total = db.query(Medicion).filter(Medicion.id_sensor == sensor_id).count()
    
    # Eliminar
    db.query(Medicion).filter(Medicion.id_sensor == sensor_id).delete()
    db.commit()
    
    return {
        "mensaje": f"Se eliminaron {total} mediciones del sensor {sensor_id}",
        "sensor_id": sensor_id,
        "total_eliminados": total
    }

@router.delete("/limpiar/todas")
def limpiar_todas_mediciones_sin_datos(
    db: Session = Depends(get_db)
):
    """
    Eliminar TODAS las mediciones sin datos de contaminantes de todos los sensores.
    """
    mediciones_sin_datos = db.query(Medicion).filter(
        ~Medicion.contaminantes_rel.any()
    ).all()
    
    ids_eliminados = [m.id for m in mediciones_sin_datos]
    
    for m in mediciones_sin_datos:
        db.delete(m)
    
    db.commit()
    
    return {
        "mensaje": f"Se eliminaron {len(ids_eliminados)} mediciones sin datos",
        "total_eliminados": len(ids_eliminados)
    }

