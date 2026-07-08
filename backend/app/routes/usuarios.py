#backend/app/routes/usuarios.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from database import get_db
from models import Usuario, Empresa
from schemas import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
    UsuarioChangePassword
)
from auth import (
    get_current_user, get_current_super_admin, get_current_empresa_admin,
    can_manage_users, can_create_admin_for_empresa, get_password_hash,
    check_user_has_empresa_access
)

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.get("/", response_model=List[UsuarioResponse])
def get_usuarios(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar usuarios (según permisos)"""
    if current_user.rol == "SUPER_ADMIN":
        usuarios = db.query(Usuario).all()
    else:
        usuarios = db.query(Usuario).filter(
            Usuario.id_empresa == current_user.id_empresa
        ).all()
    return usuarios

@router.post("/", response_model=UsuarioResponse)
def create_usuario(
    usuario_data: UsuarioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear usuario (solo SUPER_ADMIN o EMPRESA_ADMIN)"""
    
    if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    if usuario_data.id_empresa:
        if current_user.rol == "EMPRESA_ADMIN" and usuario_data.id_empresa != current_user.id_empresa:
            raise HTTPException(status_code=403, detail="No puedes crear usuarios para otra empresa")
        
        empresa = db.query(Empresa).filter(Empresa.id == usuario_data.id_empresa).first()
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    if usuario_data.rol == "EMPRESA_ADMIN" and current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede crear administradores de empresa")
    
    existing = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    new_user = Usuario(
        nombre=usuario_data.nombre,
        email=usuario_data.email,
        password_hash=get_password_hash(usuario_data.password),
        rol=usuario_data.rol,
        id_empresa=usuario_data.id_empresa,
        telefono=usuario_data.telefono,
        creado_por=current_user.id,
        activo=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{usuario_id}/activar")
def activar_usuario(
    usuario_id: int,
    activo: bool,
    current_user: Usuario = Depends(get_current_empresa_admin),
    db: Session = Depends(get_db)
):
    """Activar/desactivar usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not can_manage_users(current_user, usuario):
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    usuario.activo = 1 if activo else 0
    db.commit()
    return {"message": f"Usuario {'activado' if activo else 'desactivado'}"}

@router.delete("/{usuario_id}")
def delete_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    """Eliminar usuario (solo SUPER_ADMIN)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if usuario.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    db.delete(usuario)
    db.commit()
    return {"message": "Usuario eliminado"}

@router.put("/{usuario_id}")
def update_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar datos de un usuario (solo admin o el propio usuario)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    puede_editar = False
    if current_user.rol == "SUPER_ADMIN":
        puede_editar = True
    elif current_user.rol == "EMPRESA_ADMIN" and usuario.id_empresa == current_user.id_empresa:
        puede_editar = True
    elif current_user.id == usuario_id:
        puede_editar = True
    
    if not puede_editar:
        raise HTTPException(status_code=403, detail="Sin permiso para editar este usuario")
    
    if usuario_data.rol and usuario_data.rol != usuario.rol:
        if current_user.rol != "SUPER_ADMIN":
            raise HTTPException(status_code=403, detail="Solo SUPER_ADMIN puede cambiar el rol")
        usuario.rol = usuario_data.rol
    
    if usuario_data.email and usuario_data.email != usuario.email:
        existing = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email ya registrado por otro usuario")
        usuario.email = usuario_data.email
    
    if usuario_data.nombre:
        usuario.nombre = usuario_data.nombre
    if usuario_data.telefono:
        usuario.telefono = usuario_data.telefono
    if usuario_data.activo is not None:
        if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
            raise HTTPException(status_code=403, detail="Sin permiso para cambiar estado")
        usuario.activo = usuario_data.activo
    
    db.commit()
    db.refresh(usuario)
    
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "telefono": usuario.telefono,
        "activo": usuario.activo
    }

@router.put("/{usuario_id}/password")
def change_password(
    usuario_id: int,
    password_data: UsuarioChangePassword,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cambiar contraseña de un usuario"""
    if current_user.id != usuario_id and current_user.rol != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="No puedes cambiar la contraseña de otro usuario")
    
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if current_user.rol != "SUPER_ADMIN":
        from auth import verify_password
        if not verify_password(password_data.password_actual, usuario.password_hash):
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    from auth import get_password_hash
    usuario.password_hash = get_password_hash(password_data.password_nueva)
    db.commit()
    
    return {"message": "Contraseña actualizada correctamente"}

@router.get("/{usuario_id}")
def get_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener usuario por ID"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if current_user.rol != "SUPER_ADMIN" and usuario.id_empresa != current_user.id_empresa:
        raise HTTPException(status_code=403, detail="Sin permiso")
    
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "id_empresa": usuario.id_empresa,
        "telefono": usuario.telefono,
        "activo": usuario.activo,
        "fecha_creacion": usuario.fecha_creacion
    }