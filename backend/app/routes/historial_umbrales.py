# backend/app/routes/historial_umbrales.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import Usuario, Sensor, Planta, HistorialUmbral
from auth import get_current_user

router = APIRouter(prefix="/historial/umbrales", tags=["Historial Umbrales"])

# ============================================
# OBTENER HISTORIAL DE UMBRALES
# ============================================
@router.get("/")
def get_historial_umbrales(
    sensor_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener historial de cambios de umbrales"""
    
    # Construir query base
    query = db.query(HistorialUmbral)
    
    # Filtrar por sensor si se especifica
    if sensor_id:
        # Verificar que el sensor existe y el usuario tiene permiso
        sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if not sensor:
            raise HTTPException(status_code=404, detail="Sensor no encontrado")
        
        if current_user.rol != "SUPER_ADMIN":
            planta = db.query(Planta).filter(Planta.id == sensor.id_planta).first()
            if not planta or planta.id_empresa != current_user.id_empresa:
                raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
        
        query = query.filter(HistorialUmbral.id_sensor == sensor_id)
    
    # Si no es SUPER_ADMIN, filtrar por su empresa
    if current_user.rol != "SUPER_ADMIN":
        # Obtener sensores de la empresa del usuario
        sensores_ids = db.query(Sensor.id).join(Planta).filter(
            Planta.id_empresa == current_user.id_empresa
        ).subquery()
        query = query.filter(HistorialUmbral.id_sensor.in_(sensores_ids))
    
    # Ordenar por fecha descendente (más reciente primero)
    resultados = query.order_by(HistorialUmbral.fecha_cambio.desc()).all()
    
    # Convertir a formato esperado por el frontend
    return [
        {
            "id": h.id,
            "id_sensor": h.id_sensor,
            "sensor_nombre": h.sensor.nombre if h.sensor else None,
            "contaminante": h.contaminante,
            "limite_alerta_antiguo": h.limite_alerta_antiguo,
            "limite_alerta_nuevo": h.limite_alerta_nuevo,
            "limite_critico_antiguo": h.limite_critico_antiguo,
            "limite_critico_nuevo": h.limite_critico_nuevo,
            "fecha_cambio": h.fecha_cambio,
            "usuario_id": h.usuario_id,
            "usuario_nombre": h.usuario.nombre if h.usuario else None,
            "motivo": h.motivo
        }
        for h in resultados
    ]