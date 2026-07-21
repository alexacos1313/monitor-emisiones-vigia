# backend/app/routes/mantenimiento.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from database import get_db
from models import MantenimientoSensor, Sensor, Planta, Usuario
from schemas import (
    MantenimientoCreate,
    MantenimientoResponse,
    MantenimientoProgramadoCreate,
    MantenimientoProgramadoResponse
)
from auth import get_current_user

router = APIRouter(prefix="/mantenimiento", tags=["Mantenimiento"])

# ============================================
# OBTENER HISTORIAL DE MANTENIMIENTOS
# ============================================
@router.get("/", response_model=List[MantenimientoResponse])
def get_mantenimientos(
    sensor_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar historial de mantenimientos (según permisos)"""
    query = db.query(MantenimientoSensor)
    
    if sensor_id:
        query = query.filter(MantenimientoSensor.id_sensor == sensor_id)
    
    # Filtrar por empresa si no es SUPER_ADMIN
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    resultados = query.order_by(MantenimientoSensor.fecha.desc()).all()
    
    # Convertir a formato esperado por el frontend
    return [
        {
            "id": m.id,
            "id_sensor": m.id_sensor,
            "sensor_nombre": m.sensor.nombre if m.sensor else None,
            "fecha": m.fecha,
            "tipo": m.tipo,
            "tecnico": m.tecnico,
            "observaciones": m.observaciones,
            "proxima_calibracion": m.proxima_calibracion,
            "completado": bool(m.completado),
            "prioridad": m.prioridad or "MEDIA"
        }
        for m in resultados
    ]


# ============================================
# OBTENER MANTENIMIENTOS PROGRAMADOS
# ============================================
@router.get("/programados", response_model=List[MantenimientoProgramadoResponse])
def get_mantenimientos_programados(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar mantenimientos programados (según permisos)"""
    hoy = datetime.now().date()
    
    query = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.fecha >= hoy,
        MantenimientoSensor.completado == 0
    )
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    resultados = query.order_by(MantenimientoSensor.fecha.asc()).all()
    
    # Convertir a formato esperado por el frontend
    return [
        {
            "id": m.id,
            "id_sensor": m.id_sensor,
            "sensor_nombre": m.sensor.nombre if m.sensor else None,
            "fecha_programada": m.fecha,
            "tipo": m.tipo,
            "descripcion": m.observaciones,
            "prioridad": m.prioridad or "MEDIA",
            "estado": "PENDIENTE" if not m.completado else "COMPLETADO",
            "completado": bool(m.completado)
        }
        for m in resultados
    ]


# ============================================
# OBTENER MANTENIMIENTOS VENCIDOS
# ============================================
@router.get("/vencidos", response_model=List[MantenimientoProgramadoResponse])
def get_mantenimientos_vencidos(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar mantenimientos vencidos (según permisos)"""
    hoy = datetime.now().date()
    
    query = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.fecha < hoy,
        MantenimientoSensor.completado == 0
    )
    
    if current_user.rol != "SUPER_ADMIN":
        query = query.join(Sensor).join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    resultados = query.order_by(MantenimientoSensor.fecha.asc()).all()
    
    return [
        {
            "id": m.id,
            "id_sensor": m.id_sensor,
            "sensor_nombre": m.sensor.nombre if m.sensor else None,
            "fecha_programada": m.fecha,
            "tipo": m.tipo,
            "descripcion": m.observaciones,
            "prioridad": m.prioridad or "MEDIA",
            "estado": "PENDIENTE" if not m.completado else "COMPLETADO",
            "completado": bool(m.completado)
        }
        for m in resultados
    ]


# ============================================
# PROGRAMAR NUEVO MANTENIMIENTO
# ============================================
@router.post("/", response_model=MantenimientoProgramadoResponse)
def crear_mantenimiento_programado(
    mantenimiento_data: MantenimientoProgramadoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Programar un nuevo mantenimiento"""
    
    # Verificar que el sensor existe y pertenece a la empresa del usuario
    sensor = db.query(Sensor).filter(Sensor.id == mantenimiento_data.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para programar mantenimiento en este sensor")
    
    nuevo_mantenimiento = MantenimientoSensor(
        id_sensor=mantenimiento_data.id_sensor,
        fecha=mantenimiento_data.fecha_programada,
        tipo=mantenimiento_data.tipo,
        tecnico=mantenimiento_data.tecnico or current_user.nombre,
        observaciones=mantenimiento_data.descripcion,
        proxima_calibracion=mantenimiento_data.proxima_calibracion,
        prioridad=mantenimiento_data.prioridad,
        completado=0
    )
    
    db.add(nuevo_mantenimiento)
    db.commit()
    db.refresh(nuevo_mantenimiento)
    
    return {
        "id": nuevo_mantenimiento.id,
        "id_sensor": nuevo_mantenimiento.id_sensor,
        "sensor_nombre": sensor.nombre,
        "fecha_programada": nuevo_mantenimiento.fecha,
        "tipo": nuevo_mantenimiento.tipo,
        "descripcion": nuevo_mantenimiento.observaciones,
        "prioridad": nuevo_mantenimiento.prioridad or "MEDIA",
        "estado": "PENDIENTE",
        "completado": False
    }


# ============================================
# COMPLETAR MANTENIMIENTO
# ============================================
@router.put("/{mantenimiento_id}/completar")
def completar_mantenimiento(
    mantenimiento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marcar mantenimiento como completado"""
    
    mantenimiento = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.id == mantenimiento_id
    ).first()
    
    if not mantenimiento:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    
    sensor = db.query(Sensor).filter(Sensor.id == mantenimiento.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para completar este mantenimiento")
    
    mantenimiento.completado = 1
    mantenimiento.tecnico = current_user.nombre
    
    db.commit()
    
    return {"message": "Mantenimiento completado correctamente"}


# ============================================
# CANCELAR MANTENIMIENTO PROGRAMADO
# ============================================
@router.put("/{mantenimiento_id}/cancelar")
def cancelar_mantenimiento(
    mantenimiento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancelar mantenimiento programado"""
    
    mantenimiento = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.id == mantenimiento_id
    ).first()
    
    if not mantenimiento:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    
    sensor = db.query(Sensor).filter(Sensor.id == mantenimiento.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para cancelar este mantenimiento")
    
    # Eliminar el mantenimiento (en lugar de cancelarlo)
    db.delete(mantenimiento)
    db.commit()
    
    return {"message": "Mantenimiento cancelado correctamente"}


# ============================================
# ELIMINAR MANTENIMIENTO PROGRAMADO
# ============================================
@router.delete("/{mantenimiento_id}")
def eliminar_mantenimiento(
    mantenimiento_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar mantenimiento programado (solo SUPER_ADMIN o EMPRESA_ADMIN)"""
    
    mantenimiento = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.id == mantenimiento_id
    ).first()
    
    if not mantenimiento:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    
    sensor = db.query(Sensor).filter(Sensor.id == mantenimiento.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar este mantenimiento")
    
    db.delete(mantenimiento)
    db.commit()
    
    return {"message": "Mantenimiento eliminado correctamente"}


# ============================================
# ACTUALIZAR MANTENIMIENTO PROGRAMADO
# ============================================
@router.put("/{mantenimiento_id}", response_model=MantenimientoProgramadoResponse)
def actualizar_mantenimiento(
    mantenimiento_id: int,
    mantenimiento_data: MantenimientoProgramadoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar mantenimiento programado"""
    
    mantenimiento = db.query(MantenimientoSensor).filter(
        MantenimientoSensor.id == mantenimiento_id
    ).first()
    
    if not mantenimiento:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    
    sensor = db.query(Sensor).filter(Sensor.id == mantenimiento.id_sensor).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no encontrado")
    
    planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
    if not planta:
        raise HTTPException(status_code=404, detail="Planta no encontrada")
    
    if current_user.rol != "SUPER_ADMIN" and planta.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso para actualizar este mantenimiento")
    
    mantenimiento.id_sensor = mantenimiento_data.id_sensor
    mantenimiento.fecha = mantenimiento_data.fecha_programada
    mantenimiento.tipo = mantenimiento_data.tipo
    mantenimiento.observaciones = mantenimiento_data.descripcion
    mantenimiento.proxima_calibracion = mantenimiento_data.proxima_calibracion
    mantenimiento.prioridad = mantenimiento_data.prioridad
    
    db.commit()
    db.refresh(mantenimiento)
    
    # Obtener nombre del sensor actualizado
    sensor_actualizado = db.query(Sensor).filter(Sensor.id == mantenimiento.id_sensor).first()
    
    return {
        "id": mantenimiento.id,
        "id_sensor": mantenimiento.id_sensor,
        "sensor_nombre": sensor_actualizado.nombre if sensor_actualizado else None,
        "fecha_programada": mantenimiento.fecha,
        "tipo": mantenimiento.tipo,
        "descripcion": mantenimiento.observaciones,
        "prioridad": mantenimiento.prioridad or "MEDIA",
        "estado": "PENDIENTE" if not mantenimiento.completado else "COMPLETADO",
        "completado": bool(mantenimiento.completado)
    }