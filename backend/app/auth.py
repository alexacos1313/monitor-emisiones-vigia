#backend\app\auth.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario

SECRET_KEY = "tu-clave-secreta-cambiarla-en-produccion"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def get_password_hash(password: str) -> str:
    if len(password) > 72:
        password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(db: Session, email: str, password: str):
    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.activo == 1).first()
    if not usuario:
        return False
    if not verify_password(password, usuario.password_hash):
        return False
    return usuario

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales invalidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.activo == 1).first()
    if usuario is None:
        raise credentials_exception
    return usuario

def check_user_has_empresa_access(usuario: Usuario, empresa_id: int) -> bool:
    if usuario.rol == "SUPER_ADMIN":
        return True
    return usuario.id_empresa == empresa_id

def can_manage_users(usuario: Usuario, target_usuario: Usuario = None) -> bool:
    if usuario.rol == "SUPER_ADMIN":
        return True
    if usuario.rol == "EMPRESA_ADMIN":
        if target_usuario:
            return target_usuario.id_empresa == usuario.id_empresa
        return True
    return False

def can_create_admin_for_empresa(usuario: Usuario, empresa_id: int) -> bool:
    if usuario.rol == "SUPER_ADMIN":
        return True
    return False

async def get_current_super_admin(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de SUPER_ADMIN"
        )
    return current_user

async def get_current_empresa_admin(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol not in ["SUPER_ADMIN", "EMPRESA_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren privilegios de administrador de empresa"
        )
    return current_user