# backend/app/routes/empresas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Empresa
from schemas import EmpresaBase, EmpresaCreate, EmpresaResponse
from auth import get_current_user 
from models import Usuario  

router = APIRouter(prefix="/empresas", tags=["Empresas"], redirect_slashes=False)

# ============================================
# LISTAR EMPRESAS
# ============================================
@router.get("/", response_model=List[EmpresaResponse])
def get_empresas(
    activas: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Listar empresas (activas o todas)"""
    query = db.query(Empresa)
    if activas:
        query = query.filter(Empresa.activo == 1)
    return query.order_by(Empresa.nombre).all()

# ============================================
# OBTENER EMPRESA POR ID
# ============================================
@router.get("/{empresa_id}", response_model=EmpresaResponse)
def get_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """Obtener empresa por ID"""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa

# ============================================
# CREAR EMPRESA
# ============================================
@router.post("/", response_model=EmpresaResponse)
def create_empresa(
    empresa_data: EmpresaCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva empresa"""
    # Verificar que el CIF no exista
    existe = db.query(Empresa).filter(Empresa.cif == empresa_data.cif).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese CIF")
    
    nueva = Empresa(
        nombre=empresa_data.nombre,
        cif=empresa_data.cif,
        direccion_social=empresa_data.direccion_social,
        telefono=empresa_data.telefono,
        email=empresa_data.email,
        activo=1  #  Por defecto activa
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

# ============================================
# ACTUALIZAR EMPRESA (TODOS LOS CAMPOS)
# ============================================
@router.put("/{empresa_id}", response_model=EmpresaResponse)
def update_empresa(
    empresa_id: int,
    empresa_data: EmpresaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualizar todos los datos de una empresa"""
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Verificar que el CIF no esté en uso por otra empresa
    existe = db.query(Empresa).filter(
        Empresa.cif == empresa_data.cif,
        Empresa.id != empresa_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe otra empresa con ese CIF")
    
    # Actualizar campos
    empresa.nombre = empresa_data.nombre
    empresa.cif = empresa_data.cif
    empresa.direccion_social = empresa_data.direccion_social
    empresa.telefono = empresa_data.telefono
    empresa.email = empresa_data.email
    #  NOTA: activo NO se actualiza aquí (se usa PATCH para eso)
    
    db.commit()
    db.refresh(empresa)
    return empresa

# ============================================
# CAMBIAR ESTADO (ACTIVAR/DESACTIVAR)
# ============================================
@router.patch("/{empresa_id}", response_model=EmpresaResponse)
def patch_empresa(
    empresa_id: int,
    empresa_data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cambiar el estado de una empresa (activo/inactivo).
    Solo actualiza los campos enviados en la petición.
    """
    # Verificar permisos
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    #  Solo permitir actualizar el campo 'activo'
    if "activo" in empresa_data:
        empresa.activo = empresa_data["activo"]
        db.commit()
        db.refresh(empresa)
        return empresa
    
    raise HTTPException(status_code=400, detail="El campo 'activo' es requerido")

# ============================================
# ELIMINAR EMPRESA 
# ============================================
@router.delete("/{empresa_id}")
def delete_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Eliminar empresa FÍSICAMENTE (PERMANENTE).
    Útil solo para administradores que quieran borrar datos.
    """
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    db.delete(empresa)
    db.commit()
    
    return {"message": f"Empresa '{empresa.nombre}' eliminada permanentemente"}