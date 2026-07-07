# backend/app/routes/empresas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Empresa
from schemas import EmpresaBase, EmpresaCreate, EmpresaResponse

router = APIRouter(prefix="/empresas", tags=["Empresas"])

@router.get("/", response_model=List[EmpresaResponse])
def get_empresas(
    activas: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Listar empresas"""
    query = db.query(Empresa)
    if activas:
        query = query.filter(Empresa.activo == 1)
    return query.order_by(Empresa.nombre).all()

@router.get("/{empresa_id}", response_model=EmpresaResponse)
def get_empresa(empresa_id: int, db: Session = Depends(get_db)):
    """Obtener empresa por ID"""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa

@router.post("/", response_model=EmpresaResponse)
def create_empresa(
    empresa_data: EmpresaCreate,
    db: Session = Depends(get_db)
):
    """Crear empresa"""
    existe = db.query(Empresa).filter(Empresa.cif == empresa_data.cif).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese CIF")
    
    nueva = Empresa(
        nombre=empresa_data.nombre,
        cif=empresa_data.cif,
        direccion_social=empresa_data.direccion_social,
        telefono=empresa_data.telefono,
        email=empresa_data.email
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.delete("/{empresa_id}")
def delete_empresa(
    empresa_id: int, 
    fisico: bool = Query(False), 
    db: Session = Depends(get_db)
):
    """Eliminar empresa"""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if fisico:
        db.delete(empresa)
    else:
        empresa.activo = 0
    
    db.commit()
    return {"message": "Empresa eliminada"}