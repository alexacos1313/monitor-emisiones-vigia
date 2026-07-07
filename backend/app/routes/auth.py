#backend/app/routes/auth.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel, EmailStr
from database import get_db
from models import Usuario
from schemas import LoginRequest, LoginResponse, UsuarioCreate
from auth import authenticate_user, create_access_token, get_password_hash, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticacion"])
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Iniciar sesion y obtener token"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario_id": user.id,
        "nombre": user.nombre,
        "rol": user.rol,
        "id_empresa": user.id_empresa if user.id_empresa else None
    }

@router.post("/register")
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario"""
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
        activo=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Usuario creado exitosamente", "usuario_id": new_user.id}

@router.get("/me")
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Obtener informacion del usuario actual"""
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "rol": current_user.rol,
        "id_empresa": current_user.id_empresa,
        "telefono": current_user.telefono
    }