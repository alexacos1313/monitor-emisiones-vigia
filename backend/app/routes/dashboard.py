#backend/app/routes/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import Optional, List
from database import get_db
from models import Medicion, Sensor, Planta, Empresa, Alarma, Usuario
from auth import get_current_user, get_current_super_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Lista de contaminantes válidos
CONTAMINANTES_VALIDOS = ["co", "no", "no2", "nox"]

@router.get("/resumen")
def get_resumen(
    empresa_id: Optional[int] = Query(None),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin: Optional[datetime] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen general del dashboard"""
    
    if not fecha_fin:
        fecha_fin = datetime.now()
    if not fecha_inicio:
        fecha_inicio = fecha_fin - timedelta(days=30)
    
    query_mediciones = db.query(Medicion).filter(
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin
    )
    
    query_alarmas = db.query(Alarma).filter(
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    )
    
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    if empresa_id:
        sensores_ids = db.query(Sensor.id).join(Planta).filter(Planta.id_empresa == empresa_id).subquery()
        query_mediciones = query_mediciones.filter(Medicion.id_sensor.in_(sensores_ids))
        query_alarmas = query_alarmas.filter(Alarma.id_sensor.in_(sensores_ids))
    
    # Calcular promedios (SOLO CO, NO, NO2, NOX)
    promedios = query_mediciones.with_entities(
        func.avg(Medicion.co).label("co_avg"),
        func.avg(Medicion.no).label("no_avg"),
        func.avg(Medicion.no2).label("no2_avg"),
        func.avg(Medicion.nox).label("nox_avg"),
        func.count(Medicion.id).label("total_mediciones")
    ).first()
    
    # Calcular maximos (SOLO CO, NO, NO2, NOX)
    maximos = query_mediciones.with_entities(
        func.max(Medicion.co).label("co_max"),
        func.max(Medicion.no).label("no_max"),
        func.max(Medicion.no2).label("no2_max"),
        func.max(Medicion.nox).label("nox_max")
    ).first()
    
    total_alarmas = query_alarmas.count()
    alarmas_pendientes = query_alarmas.filter(Alarma.confirmada_por == None).count()
    alarmas_confirmadas = query_alarmas.filter(Alarma.confirmada_por != None).count()
    
    alarmas_por_tipo = db.query(
        Alarma.tipo, 
        func.count(Alarma.id).label("total")
    ).filter(
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    )
    if empresa_id:
        alarmas_por_tipo = alarmas_por_tipo.filter(Alarma.id_sensor.in_(sensores_ids))
    alarmas_por_tipo = alarmas_por_tipo.group_by(Alarma.tipo).all()
    
    query_sensores = db.query(Sensor).filter(Sensor.estado == "ACTIVO")
    if empresa_id:
        query_sensores = query_sensores.join(Planta).filter(Planta.id_empresa == empresa_id)
    sensores_activos = query_sensores.count()
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "promedios": {
            "co": round(promedios.co_avg, 2) if promedios.co_avg else 0,
            "no": round(promedios.no_avg, 2) if promedios.no_avg else 0,
            "no2": round(promedios.no2_avg, 2) if promedios.no2_avg else 0,
            "nox": round(promedios.nox_avg, 2) if promedios.nox_avg else 0
        },
        "maximos": {
            "co": round(maximos.co_max, 2) if maximos.co_max else 0,
            "no": round(maximos.no_max, 2) if maximos.no_max else 0,
            "no2": round(maximos.no2_max, 2) if maximos.no2_max else 0,
            "nox": round(maximos.nox_max, 2) if maximos.nox_max else 0
        },
        "alarmas": {
            "total": total_alarmas,
            "pendientes": alarmas_pendientes,
            "confirmadas": alarmas_confirmadas,
            "por_tipo": [{"tipo": t, "total": total} for t, total in alarmas_por_tipo]
        },
        "sensores_activos": sensores_activos,
        "total_mediciones": promedios.total_mediciones or 0
    }

@router.get("/tendencias")
def get_tendencias(
    contaminante: str = Query(..., description="co, no, no2, nox"),
    empresa_id: Optional[int] = Query(None),
    dias: int = Query(7, ge=1, le=90),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener tendencia de un contaminante por dia"""
    
    # Validar contaminante
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    fecha_fin = datetime.now()
    fecha_inicio = fecha_fin - timedelta(days=dias)
    
    query = db.query(
        func.date(Medicion.timestamp).label("fecha"),
        func.avg(getattr(Medicion, contaminante)).label("promedio"),
        func.max(getattr(Medicion, contaminante)).label("maximo"),
        func.min(getattr(Medicion, contaminante)).label("minimo"),
        func.count(Medicion.id).label("mediciones")
    ).filter(
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin,
        getattr(Medicion, contaminante) != None
    )
    
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    if empresa_id:
        sensores_ids = db.query(Sensor.id).join(Planta).filter(Planta.id_empresa == empresa_id).subquery()
        query = query.filter(Medicion.id_sensor.in_(sensores_ids))
    
    resultados = query.group_by(func.date(Medicion.timestamp)).order_by("fecha").all()
    
    return {
        "contaminante": contaminante,
        "dias": dias,
        "datos": [
            {
                "fecha": r.fecha,
                "promedio": round(r.promedio, 2) if r.promedio else 0,
                "maximo": round(r.maximo, 2) if r.maximo else 0,
                "minimo": round(r.minimo, 2) if r.minimo else 0,
                "mediciones": r.mediciones
            }
            for r in resultados
        ]
    }

@router.get("/comparativa")
def get_comparativa(
    contaminante: str = Query(..., description="co, no, no2, nox"),
    periodo1_inicio: datetime = Query(...),
    periodo1_fin: datetime = Query(...),
    periodo2_inicio: datetime = Query(...),
    periodo2_fin: datetime = Query(...),
    empresa_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Comparar dos periodos de tiempo"""
    
    # Validar contaminante
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    def obtener_promedio(fecha_inicio, fecha_fin):
        query = db.query(func.avg(getattr(Medicion, contaminante))).filter(
            Medicion.timestamp >= fecha_inicio,
            Medicion.timestamp <= fecha_fin,
            getattr(Medicion, contaminante) != None
        )
        if empresa_id:
            sensores_ids = db.query(Sensor.id).join(Planta).filter(Planta.id_empresa == empresa_id).subquery()
            query = query.filter(Medicion.id_sensor.in_(sensores_ids))
        return query.scalar() or 0
    
    promedio1 = obtener_promedio(periodo1_inicio, periodo1_fin)
    promedio2 = obtener_promedio(periodo2_inicio, periodo2_fin)
    
    variacion = ((promedio2 - promedio1) / promedio1 * 100) if promedio1 > 0 else 0
    
    return {
        "contaminante": contaminante,
        "periodo1": {
            "inicio": periodo1_inicio,
            "fin": periodo1_fin,
            "promedio": round(promedio1, 2)
        },
        "periodo2": {
            "inicio": periodo2_inicio,
            "fin": periodo2_fin,
            "promedio": round(promedio2, 2)
        },
        "variacion": round(variacion, 2),
        "tendencia": "aumento" if variacion > 0 else "disminucion" if variacion < 0 else "estable"
    }

@router.get("/top-empresas")
def get_top_empresas(
    contaminante: str = Query(..., description="co, no, no2, nox"),
    limit: int = Query(5, ge=1, le=20),
    current_user: Usuario = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Top empresas por nivel de contaminante (solo SUPER_ADMIN)"""
    
    # Validar contaminante
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    resultados = db.query(
        Empresa.id,
        Empresa.nombre,
        func.avg(getattr(Medicion, contaminante)).label("promedio")
    ).join(
        Planta, Planta.id_empresa == Empresa.id
    ).join(
        Sensor, Sensor.id_planta == Planta.id
    ).join(
        Medicion, Medicion.id_sensor == Sensor.id
    ).filter(
        getattr(Medicion, contaminante) != None
    ).group_by(
        Empresa.id, Empresa.nombre
    ).order_by(
        func.avg(getattr(Medicion, contaminante)).desc()
    ).limit(limit).all()
    
    return [
        {
            "empresa_id": r.id,
            "empresa_nombre": r.nombre,
            "promedio": round(r.promedio, 2) if r.promedio else 0
        }
        for r in resultados
    ]