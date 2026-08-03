# backend/app/routes/mediciones.py
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import Optional, List
from database import get_db
from models import Medicion, MedicionContaminante, Sensor, Planta, Usuario
from schemas import MedicionResponse, MedicionContaminanteSchema
from auth import get_current_user

router = APIRouter(prefix="/mediciones", tags=["Mediciones"], redirect_slashes=False)

@router.get("/", response_model=List[MedicionResponse])
def get_mediciones(
    sensor_id: Optional[int] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar mediciones con filtros y permisos de empresa"""
    
    # Obtener IDs de sensores permitidos segun el rol
    if current_user.rol == "SUPER_ADMIN":
        query = db.query(Medicion)
    else:
        if not current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Usuario sin empresa asignada")
        
        plantas_ids = db.query(Planta.id).filter(
            Planta.id_empresa == current_user.id_empresa
        ).subquery()
        sensores_ids = db.query(Sensor.id).filter(
            Sensor.id_planta.in_(plantas_ids)
        ).subquery()
        query = db.query(Medicion).filter(
            Medicion.id_sensor.in_(sensores_ids)
        )
    
    # Aplicar filtros
    if sensor_id:
        if current_user.rol != "SUPER_ADMIN":
            sensor = db.query(Sensor).join(Planta).filter(
                Sensor.id == sensor_id,
                Planta.id_empresa == current_user.id_empresa
            ).first()
            if not sensor:
                raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
        query = query.filter(Medicion.id_sensor == sensor_id)
    
    # Manejo de fechas corregido
    if fecha_inicio:
        try:
            # Convertir string a datetime con hora 00:00:00
            fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
            query = query.filter(Medicion.timestamp >= fecha_inicio_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_inicio invalido. Use YYYY-MM-DD")
    
    if fecha_fin:
        try:
            # Convertir string a datetime con hora 23:59:59 para incluir todo el dia
            fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
            query = query.filter(Medicion.timestamp <= fecha_fin_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha_fin invalido. Use YYYY-MM-DD")
    
    # Ejecutar consulta
    mediciones = query.order_by(Medicion.timestamp.desc()).limit(limit).all()
    
    # Construir respuesta
    result = []
    for m in mediciones:
        contaminantes_db = db.query(MedicionContaminante).filter(
            MedicionContaminante.id_medicion == m.id
        ).all()
        
        contaminantes_list = [
            MedicionContaminanteSchema(
                contaminante=c.contaminante,
                valor=c.valor
            ) for c in contaminantes_db
        ]
        
        sensor = db.query(Sensor).filter(Sensor.id == m.id_sensor).first()
        
        result.append(
            MedicionResponse(
                id=m.id,
                id_sensor=m.id_sensor,
                timestamp=m.timestamp,
                temperatura=m.temperatura,
                flujo=m.flujo,
                oxigeno=m.oxigeno,
                estado=m.estado,
                procesada_ia=m.procesada_ia,
                sensor_nombre=sensor.nombre if sensor else None,
                contaminantes=contaminantes_list
            )
        )
    
    return result