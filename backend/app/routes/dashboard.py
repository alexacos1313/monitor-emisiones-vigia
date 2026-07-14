# backend/app/routes/dashboard.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import Optional, List
from database import get_db
from models import Medicion, Sensor, Planta, Empresa, Alarma, Usuario, MedicionContaminante
from auth import get_current_user, get_current_super_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Lista de contaminantes válidos
CONTAMINANTES_VALIDOS = ["co", "no", "no2", "nox"]


@router.get("/resumen")
def get_resumen(
    empresa_id: Optional[int] = Query(None),
    sensor_id: Optional[int] = Query(None),  
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
    
    # Obtener IDs de sensores según permisos
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    #  Construir query de sensores con filtros
    sensores_query = db.query(Sensor.id)
    if empresa_id:
        sensores_query = sensores_query.join(Planta).filter(Planta.id_empresa == empresa_id)
    
    #  Filtrar por sensor si se proporciona
    if sensor_id:
        sensores_query = sensores_query.filter(Sensor.id == sensor_id)
    
    sensores_ids = sensores_query.subquery().select()
    
    # ============================================
    # MÉTRICAS GENERALES
    # ============================================
    
    # Total mediciones
    total_mediciones = db.query(func.count(Medicion.id)).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin
    ).scalar() or 0
    
    # Sensores activos
    query_sensores = db.query(Sensor).filter(Sensor.estado == "ACTIVO")
    if empresa_id:
        query_sensores = query_sensores.join(Planta).filter(Planta.id_empresa == empresa_id)
    if sensor_id:
        query_sensores = query_sensores.filter(Sensor.id == sensor_id)
    sensores_activos = query_sensores.count()
    
    # ============================================
    # PROMEDIOS POR CONTAMINANTE (dinámico)
    # ============================================
    
    promedios = db.query(
        MedicionContaminante.contaminante,
        func.avg(MedicionContaminante.valor).label("promedio")
    ).join(Medicion).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin,
        MedicionContaminante.contaminante.in_(["CO", "NO", "NO2", "NOX"])
    ).group_by(MedicionContaminante.contaminante).all()
    
    promedios_dict = {}
    for p in promedios:
        promedios_dict[p.contaminante.lower()] = float(p.promedio) if p.promedio else 0
    
    # ============================================
    # MÁXIMOS POR CONTAMINANTE (dinámico)
    # ============================================
    
    maximos = db.query(
        MedicionContaminante.contaminante,
        func.max(MedicionContaminante.valor).label("maximo")
    ).join(Medicion).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin,
        MedicionContaminante.contaminante.in_(["CO", "NO", "NO2", "NOX"])
    ).group_by(MedicionContaminante.contaminante).all()
    
    maximos_dict = {}
    for m in maximos:
        maximos_dict[m.contaminante.lower()] = float(m.maximo) if m.maximo else 0
    
    # ============================================
    # ALARMAS
    # ============================================
    
    query_alarmas = db.query(Alarma).filter(
        Alarma.id_sensor.in_(sensores_ids),
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    )
    
    total_alarmas = query_alarmas.count()
    alarmas_pendientes = query_alarmas.filter(Alarma.confirmada_por == None).count()
    alarmas_confirmadas = query_alarmas.filter(Alarma.confirmada_por != None).count()
    
    alarmas_por_tipo = db.query(
        Alarma.tipo, 
        func.count(Alarma.id).label("total")
    ).filter(
        Alarma.id_sensor.in_(sensores_ids),
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    ).group_by(Alarma.tipo).all()
    
    return {
        "periodo": {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin
        },
        "promedios": {
            "co": promedios_dict.get("co", 0),
            "no": promedios_dict.get("no", 0),
            "no2": promedios_dict.get("no2", 0),
            "nox": promedios_dict.get("nox", 0)
        },
        "maximos": {
            "co": maximos_dict.get("co", 0),
            "no": maximos_dict.get("no", 0),
            "no2": maximos_dict.get("no2", 0),
            "nox": maximos_dict.get("nox", 0)
        },
        "alarmas": {
            "total": total_alarmas,
            "pendientes": alarmas_pendientes,
            "confirmadas": alarmas_confirmadas,
            "por_tipo": [{"tipo": t, "total": total} for t, total in alarmas_por_tipo]
        },
        "sensores_activos": sensores_activos,
        "total_mediciones": total_mediciones
    }


@router.get("/tendencias")
def get_tendencias(
    contaminante: str = Query(..., description="co, no, no2, nox"),
    empresa_id: Optional[int] = Query(None),
    sensor_id: Optional[int] = Query(None),
    dias: int = Query(7, ge=1, le=90),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener tendencia de un contaminante por dia"""
    
    # Validar contaminante
    contaminante_upper = contaminante.upper()
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    fecha_fin = datetime.now()
    fecha_inicio = fecha_fin - timedelta(days=dias)
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    # Construir query de sensores
    sensores_query = db.query(Sensor.id)
    
    # Filtrar por empresa
    if empresa_id:
        sensores_query = sensores_query.join(Planta).filter(Planta.id_empresa == empresa_id)
    
    # Filtrar por sensor específico si se proporciona
    if sensor_id:
        # Verificar que el sensor pertenece a la empresa
        sensor_check = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if not sensor_check:
            raise HTTPException(status_code=404, detail="Sensor no encontrado")
        
        # Si el usuario no es SUPER_ADMIN, verificar que el sensor es de su empresa
        if current_user.rol != "SUPER_ADMIN":
            planta = db.query(Planta).filter(Planta.id == sensor_check.id_planta).first()
            if not planta or planta.id_empresa != current_user.id_empresa:
                raise HTTPException(status_code=403, detail="Sin permiso para este sensor")
        
        sensores_query = sensores_query.filter(Sensor.id == sensor_id)
    
    sensores_ids = sensores_query.subquery().select()
    
    # Obtener tendencias desde mediciones_contaminantes
    resultados = db.query(
        func.date(Medicion.timestamp).label("fecha"),
        func.avg(MedicionContaminante.valor).label("promedio"),
        func.max(MedicionContaminante.valor).label("maximo"),
        func.min(MedicionContaminante.valor).label("minimo"),
        func.count(MedicionContaminante.id).label("mediciones")
    ).join(
        Medicion, MedicionContaminante.id_medicion == Medicion.id
    ).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin,
        MedicionContaminante.contaminante == contaminante_upper
    ).group_by(
        func.date(Medicion.timestamp)
    ).order_by("fecha").all()
    
    return {
        "contaminante": contaminante,
        "dias": dias,
        "sensor_id": sensor_id,
        "datos": [
            {
                "fecha": str(r.fecha) if r.fecha else None,
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
    contaminante_upper = contaminante.upper()
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    if current_user.rol != "SUPER_ADMIN":
        empresa_id = current_user.id_empresa
    
    sensores_ids = db.query(Sensor.id)
    if empresa_id:
        sensores_ids = sensores_ids.join(Planta).filter(Planta.id_empresa == empresa_id)
    sensores_ids = sensores_ids.subquery().select()
    
    def obtener_promedio(fecha_inicio, fecha_fin):
        result = db.query(
            func.avg(MedicionContaminante.valor)
        ).join(Medicion).filter(
            Medicion.id_sensor.in_(sensores_ids),
            Medicion.timestamp >= fecha_inicio,
            Medicion.timestamp <= fecha_fin,
            MedicionContaminante.contaminante == contaminante_upper
        ).scalar() or 0
        return float(result)
    
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
    
    contaminante_upper = contaminante.upper()
    
    # Validar contaminante
    if contaminante not in CONTAMINANTES_VALIDOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Contaminante no válido. Use: {', '.join(CONTAMINANTES_VALIDOS)}"
        )
    
    resultados = db.query(
        Empresa.id,
        Empresa.nombre,
        func.avg(MedicionContaminante.valor).label("promedio")
    ).join(
        Planta, Planta.id_empresa == Empresa.id
    ).join(
        Sensor, Sensor.id_planta == Planta.id
    ).join(
        Medicion, Medicion.id_sensor == Sensor.id
    ).join(
        MedicionContaminante, MedicionContaminante.id_medicion == Medicion.id
    ).filter(
        MedicionContaminante.contaminante == contaminante_upper
    ).group_by(
        Empresa.id, Empresa.nombre
    ).order_by(
        func.avg(MedicionContaminante.valor).desc()
    ).limit(limit).all()
    
    return [
        {
            "empresa_id": r.id,
            "empresa_nombre": r.nombre,
            "promedio": round(r.promedio, 2) if r.promedio else 0
        }
        for r in resultados
    ]