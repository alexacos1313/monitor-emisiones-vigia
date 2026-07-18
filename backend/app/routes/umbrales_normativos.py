# backend/app/routes/umbrales_normativos.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import ZonaNormativa, UmbralNormativo, Usuario
from schemas import UmbralNormativoBase, UmbralNormativoResponse
from auth import get_current_user

router = APIRouter(prefix="/umbrales-normativos", tags=["Umbrales Normativos"], redirect_slashes=False)

# ============================================
# LISTAR UMBRALES NORMATIVOS
# ============================================
@router.get("/", response_model=List[UmbralNormativoResponse])
def get_umbrales_normativos(
    zona_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar umbrales normativos (todos o por zona)"""
    query = db.query(UmbralNormativo)
    
    if zona_id:
        query = query.filter(UmbralNormativo.zona_normativa_id == zona_id)
    
    return query.order_by(UmbralNormativo.contaminante).all()

# ============================================
# OBTENER UMBRAL POR ID
# ============================================
@router.get("/{umbral_id}", response_model=UmbralNormativoResponse)
def get_umbral_normativo(
    umbral_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener umbral normativo por ID"""
    umbral = db.query(UmbralNormativo).filter(UmbralNormativo.id == umbral_id).first()
    if not umbral:
        raise HTTPException(status_code=404, detail="Umbral normativo no encontrado")
    return umbral

# ============================================
# CREAR UMBRAL NORMATIVO
# ============================================
@router.post("/", response_model=UmbralNormativoResponse)
def create_umbral_normativo(
    umbral_data: UmbralNormativoBase,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo umbral normativo"""
    # Solo SUPER_ADMIN y EMPRESA_ADMIN pueden crear
    if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear umbrales normativos")
    
    # Verificar que la zona existe
    zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == umbral_data.zona_normativa_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    
    nuevo_umbral = UmbralNormativo(
        zona_normativa_id=umbral_data.zona_normativa_id,
        contaminante=umbral_data.contaminante,
        limite_alerta=umbral_data.limite_alerta,
        limite_critico=umbral_data.limite_critico,
        unidad=umbral_data.unidad,
        referencia_legal=umbral_data.referencia_legal,
        fecha_aprobacion=umbral_data.fecha_aprobacion
    )
    db.add(nuevo_umbral)
    db.commit()
    db.refresh(nuevo_umbral)
    return nuevo_umbral

# ============================================
# ACTUALIZAR UMBRAL NORMATIVO
# ============================================
@router.put("/{umbral_id}", response_model=UmbralNormativoResponse)
def update_umbral_normativo(
    umbral_id: int,
    umbral_data: UmbralNormativoBase,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar un umbral normativo"""
    if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar umbrales normativos")
    
    umbral = db.query(UmbralNormativo).filter(UmbralNormativo.id == umbral_id).first()
    if not umbral:
        raise HTTPException(status_code=404, detail="Umbral normativo no encontrado")
    
    # Verificar que la zona existe
    zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == umbral_data.zona_normativa_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    
    umbral.zona_normativa_id = umbral_data.zona_normativa_id
    umbral.contaminante = umbral_data.contaminante
    umbral.limite_alerta = umbral_data.limite_alerta
    umbral.limite_critico = umbral_data.limite_critico
    umbral.unidad = umbral_data.unidad
    umbral.referencia_legal = umbral_data.referencia_legal
    umbral.fecha_aprobacion = umbral_data.fecha_aprobacion
    
    db.commit()
    db.refresh(umbral)
    return umbral

# ============================================
# ELIMINAR UMBRAL NORMATIVO
# ============================================
@router.delete("/{umbral_id}")
def delete_umbral_normativo(
    umbral_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un umbral normativo (solo SUPER_ADMIN)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede eliminar umbrales normativos")
    
    umbral = db.query(UmbralNormativo).filter(UmbralNormativo.id == umbral_id).first()
    if not umbral:
        raise HTTPException(status_code=404, detail="Umbral normativo no encontrado")
    
    db.delete(umbral)
    db.commit()
    return {"message": "Umbral normativo eliminado correctamente"}