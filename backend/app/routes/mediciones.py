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
    limit: int = Query(10000, ge=1, le=100000),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar mediciones con filtros y permisos de empresa"""
    
    print("=== GET MEDICIONES ===")
    print(f"sensor_id: {sensor_id}")
    print(f"fecha_inicio: {fecha_inicio}")
    print(f"fecha_fin: {fecha_fin}")
    print(f"limit: {limit}")
    
    try:
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
        
        # Manejo de fechas CORREGIDO
        if fecha_inicio:
            try:
                # Convertir a datetime con zona horaria local
                fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
                print(f"fecha_inicio_dt: {fecha_inicio_dt}")
                query = query.filter(Medicion.timestamp >= fecha_inicio_dt)
            except ValueError as e:
                print(f"Error fecha_inicio: {e}")
                raise HTTPException(status_code=400, detail="Formato de fecha_inicio invalido. Use YYYY-MM-DD")
        
        if fecha_fin:
            try:
                # Convertir a datetime y sumar 1 día para incluir todo el día
                fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
                print(f"fecha_fin_dt: {fecha_fin_dt}")
                query = query.filter(Medicion.timestamp <= fecha_fin_dt)
            except ValueError as e:
                print(f"Error fecha_fin: {e}")
                raise HTTPException(status_code=400, detail="Formato de fecha_fin invalido. Use YYYY-MM-DD")
        
        # Ejecutar consulta
        print("Ejecutando consulta...")
        mediciones = query.order_by(Medicion.timestamp.desc()).limit(limit).all()
        print(f"Mediciones encontradas: {len(mediciones)}")
        
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
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")


@router.get("/sensor/{sensor_id}/contaminantes")
def get_contaminantes_sensor(
    sensor_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener lista de contaminantes que mide un sensor"""
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        sensor = db.query(Sensor).join(Planta).filter(
            Sensor.id == sensor_id,
            Planta.id_empresa == current_user.id_empresa
        ).first()
        if not sensor:
            raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
    
    # Obtener contaminantes de las mediciones del sensor
    result = db.query(MedicionContaminante.contaminante).distinct().join(
        Medicion
    ).filter(Medicion.id_sensor == sensor_id).all()
    
    # Si no hay mediciones, usar los contaminantes configurados en el sensor
    if not result:
        sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if sensor and sensor.contaminantes:
            return {"contaminantes": sensor.contaminantes}
        return {"contaminantes": ["CO", "NO", "NO2", "NOX"]}
    
    return {"contaminantes": [r[0] for r in result]}

@router.get("/limpiar-hoy")
def limpiar_mediciones_hoy(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar todas las mediciones del día de hoy (SOLO ADMIN)"""
    
    # Solo SUPER_ADMIN o EMPRESA_ADMIN pueden usar esto
    if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
        raise HTTPException(status_code=403, detail="No tienes permiso para esta acción")
    
    hoy = date.today()
    
    # Contar cuántas mediciones hay hoy
    count = db.query(Medicion).filter(
        Medicion.timestamp >= hoy,
        Medicion.timestamp < hoy + timedelta(days=1)
    ).count()
    
    if count == 0:
        return {"mensaje": "No hay mediciones para eliminar hoy", "eliminadas": 0}
    
    # Eliminar contaminantes primero
    db.query(MedicionContaminante).filter(
        MedicionContaminante.id_medicion.in_(
            db.query(Medicion.id).filter(
                Medicion.timestamp >= hoy,
                Medicion.timestamp < hoy + timedelta(days=1)
            )
        )
    ).delete(synchronize_session=False)
    
    # Eliminar mediciones
    db.query(Medicion).filter(
        Medicion.timestamp >= hoy,
        Medicion.timestamp < hoy + timedelta(days=1)
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {"mensaje": f"Se eliminaron {count} mediciones del día de hoy", "eliminadas": count}