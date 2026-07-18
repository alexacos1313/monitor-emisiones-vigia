# backend/app/routes/ubicaciones.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import Ubicacion, Planta, Empresa, Usuario, ZonaNormativa
from schemas import UbicacionBase, UbicacionCreate, UbicacionResponse
from auth import get_current_user

router = APIRouter(prefix="/ubicaciones", tags=["Ubicaciones"])

# ============================================
# LISTAR UBICACIONES (SOLO DE LA EMPRESA DEL USUARIO)
# ============================================
@router.get("/", response_model=List[UbicacionResponse])
def get_ubicaciones(
    empresa_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar ubicaciones (solo de la empresa del usuario)"""
    query = db.query(Ubicacion)
    
    # Si es SUPER_ADMIN, puede ver todas las ubicaciones
    if current_user.rol == "SUPER_ADMIN":
        if empresa_id:
            query = query.join(Planta).filter(Planta.id_empresa == empresa_id)
    else:
        # Filtrar por la empresa del usuario
        query = query.join(Planta).filter(Planta.id_empresa == current_user.id_empresa)
    
    return query.order_by(Ubicacion.municipio).all()

# ============================================
# OBTENER UBICACIÓN POR ID (CON PERMISOS)
# ============================================
@router.get("/{ubicacion_id}", response_model=UbicacionResponse)
def get_ubicacion(
    ubicacion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener ubicación por ID (con permisos)"""
    ubicacion = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        # Verificar que la ubicación pertenece a la empresa del usuario
        planta = db.query(Planta).filter(Planta.id_ubicacion == ubicacion_id).first()
        if not planta:
            raise HTTPException(status_code=404, detail="Ubicación no asociada a ninguna planta")
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso para esta ubicación")
    
    return ubicacion

# ============================================
# CREAR UBICACIÓN 
# ============================================
@router.post("/", response_model=UbicacionResponse)
def create_ubicacion(
    ubicacion_data: UbicacionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear una nueva ubicación (sin empresa, solo datos geográficos)"""
    
    # Verificar que la zona normativa existe (si se proporciona)
    zona_normativa_id = ubicacion_data.zona_normativa_id
    if zona_normativa_id:
        zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == zona_normativa_id).first()
        if not zona:
            raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    
    nueva_ubicacion = Ubicacion(
        provincia=ubicacion_data.provincia,
        municipio=ubicacion_data.municipio,
        distrito=ubicacion_data.distrito,
        codigo_postal=ubicacion_data.codigo_postal,
        latitud=ubicacion_data.latitud,
        longitud=ubicacion_data.longitud,
        zona_normativa_id=zona_normativa_id
    )
    db.add(nueva_ubicacion)
    db.commit()
    db.refresh(nueva_ubicacion)
    return nueva_ubicacion

# ============================================
# ACTUALIZAR UBICACIÓN
# ============================================
@router.put("/{ubicacion_id}", response_model=UbicacionResponse)
def update_ubicacion(
    ubicacion_id: int,
    ubicacion_data: UbicacionCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar una ubicación"""
    ubicacion = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id_ubicacion == ubicacion_id).first()
        if not planta:
            raise HTTPException(status_code=404, detail="Ubicación no asociada a ninguna planta")
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso para modificar esta ubicación")
    
    
    # Actualizar campos
    ubicacion.provincia = ubicacion_data.provincia
    ubicacion.municipio = ubicacion_data.municipio
    ubicacion.distrito = ubicacion_data.distrito
    ubicacion.codigo_postal = ubicacion_data.codigo_postal
    ubicacion.latitud = ubicacion_data.latitud
    ubicacion.longitud = ubicacion_data.longitud
    ubicacion.zona_normativa_id = ubicacion_data.zona_normativa_id
    
    db.commit()
    db.refresh(ubicacion)
    return ubicacion

# ============================================
# ELIMINAR UBICACIÓN
# ============================================
@router.delete("/{ubicacion_id}")
def delete_ubicacion(
    ubicacion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar una ubicación (solo si no está en uso)"""
    ubicacion = db.query(Ubicacion).filter(Ubicacion.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        planta = db.query(Planta).filter(Planta.id_ubicacion == ubicacion_id).first()
        if not planta:
            raise HTTPException(status_code=404, detail="Ubicación no asociada a ninguna planta")
        if planta.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="Sin permiso para eliminar esta ubicación")
    
    # Verificar que no esté en uso
    plantas = db.query(Planta).filter(Planta.id_ubicacion == ubicacion_id).all()
    if plantas:
        nombres = ", ".join([p.nombre for p in plantas])
        raise HTTPException(
            status_code=400, 
            detail=f"La ubicación está en uso por las plantas: {nombres}"
        )
    
    db.delete(ubicacion)
    db.commit()
    return {"message": "Ubicación eliminada correctamente"}

# ============================================
# OBTENER UBICACIONES 
# ============================================
@router.get("/empresa/{empresa_id}", response_model=List[UbicacionResponse])
def get_ubicaciones_por_empresa(
    empresa_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener todas las ubicaciones de una empresa (a través de sus plantas)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede ver ubicaciones de otras empresas")
    
    # Verificar que la empresa existe
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    ubicaciones = db.query(Ubicacion).join(Planta).filter(Planta.id_empresa == empresa_id).all()
    return ubicaciones