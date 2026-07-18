# backend/app/routes/zonas_normativas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import ZonaNormativa, Ubicacion, Planta, UmbralNormativo  
from schemas import ZonaNormativaBase, ZonaNormativaResponse
from auth import get_current_user
from models import Usuario

router = APIRouter(prefix="/zonas-normativas", tags=["Zonas Normativas"], redirect_slashes=False)

# ============================================
# LISTAR ZONAS NORMATIVAS (TODOS LOS USUARIOS)
# ============================================
@router.get("/", response_model=List[ZonaNormativaResponse])
def get_zonas_normativas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todas las zonas normativas"""
    zonas = db.query(ZonaNormativa).order_by(ZonaNormativa.nombre).all()
    return zonas

# ============================================
# OBTENER ZONA NORMATIVA POR ID (TODOS LOS USUARIOS)
# ============================================
@router.get("/{zona_id}", response_model=ZonaNormativaResponse)
def get_zona_normativa(
    zona_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener zona normativa por ID"""
    zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    return zona

# ============================================
# CREAR ZONA NORMATIVA (SOLO SUPER_ADMIN)
# ============================================
@router.post("/", response_model=ZonaNormativaResponse)
def create_zona_normativa(
    zona_data: ZonaNormativaBase,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear una nueva zona normativa (solo SUPER_ADMIN)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede crear zonas normativas")
    
    # Verificar que no exista una zona con el mismo nombre
    existe = db.query(ZonaNormativa).filter(ZonaNormativa.nombre == zona_data.nombre).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe una zona normativa con ese nombre")
    
    nueva_zona = ZonaNormativa(
        nombre=zona_data.nombre,
        descripcion=zona_data.descripcion,
        comunidad_autonoma=zona_data.comunidad_autonoma,
        provincia=zona_data.provincia,
        municipio=zona_data.municipio,
        nivel_proteccion=zona_data.nivel_proteccion,
        normativa_aplicable=zona_data.normativa_aplicable
    )
    db.add(nueva_zona)
    db.commit()
    db.refresh(nueva_zona)
    return nueva_zona

# ============================================
# ACTUALIZAR ZONA NORMATIVA (SOLO SUPER_ADMIN)
# ============================================
@router.put("/{zona_id}", response_model=ZonaNormativaResponse)
def update_zona_normativa(
    zona_id: int,
    zona_data: ZonaNormativaBase,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar zona normativa (solo SUPER_ADMIN)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede editar zonas normativas")
    
    zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    
    # Verificar que no exista otra zona con el mismo nombre
    existe = db.query(ZonaNormativa).filter(
        ZonaNormativa.nombre == zona_data.nombre,
        ZonaNormativa.id != zona_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe otra zona con ese nombre")
    
    zona.nombre = zona_data.nombre
    zona.descripcion = zona_data.descripcion
    zona.comunidad_autonoma = zona_data.comunidad_autonoma
    zona.provincia = zona_data.provincia
    zona.municipio = zona_data.municipio
    zona.nivel_proteccion = zona_data.nivel_proteccion
    zona.normativa_aplicable = zona_data.normativa_aplicable
    
    db.commit()
    db.refresh(zona)
    return zona

# ============================================
# ELIMINAR ZONA NORMATIVA (SOLO SUPER_ADMIN)
# ============================================
@router.delete("/{zona_id}")
def delete_zona_normativa(
    zona_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar zona normativa (solo SUPER_ADMIN)"""
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede eliminar zonas normativas")
    
    zona = db.query(ZonaNormativa).filter(ZonaNormativa.id == zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona normativa no encontrada")
    
    #  PASO 1: Verificar si hay ubicaciones asociadas a esta zona
    ubicaciones = db.query(Ubicacion).filter(Ubicacion.zona_normativa_id == zona_id).all()
    
    if ubicaciones:
        # Obtener IDs de ubicaciones
        ubicacion_ids = [u.id for u in ubicaciones]
        
        #  PASO 2: Verificar si hay plantas en esas ubicaciones
        plantas = db.query(Planta).filter(Planta.id_ubicacion.in_(ubicacion_ids)).all()
        
        if plantas:
            nombres = ", ".join([p.nombre for p in plantas[:5]])
            total = len(plantas)
            mensaje = f"No se puede eliminar la zona porque está en uso por {total} planta(s)"
            if total > 5:
                mensaje += f" (mostrando: {nombres}...)"
            else:
                mensaje += f": {nombres}"
            raise HTTPException(status_code=400, detail=mensaje)
    
    #  PASO 3: Verificar si hay umbrales normativos asociados
    umbrales = db.query(UmbralNormativo).filter(UmbralNormativo.zona_normativa_id == zona_id).all()
    if umbrales:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la zona porque tiene {len(umbrales)} umbral(es) normativo(s) asociados"
        )
    
    #  PASO 4: Eliminar la zona (si no tiene dependencias)
    db.delete(zona)
    db.commit()
    return {"message": "Zona normativa eliminada correctamente"}