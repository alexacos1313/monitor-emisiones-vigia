# backend/app/scripts/seed_usuarios.py
from app.models import Usuario
import bcrypt

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def seed_usuarios(db):
    usuarios = [
        Usuario(
            nombre="Super Administrador",
            email="admin@sistema.es",
            rol="SUPER_ADMIN",
            password_hash=get_password_hash("admin123"),
            activo=1
        ),
        Usuario(
            id_empresa=1,
            nombre="María González",
            email="maria@cementosmadrid.es",
            rol="EMPRESA_ADMIN",
            password_hash=get_password_hash("maria123"),
            creado_por=1,
            activo=1
        ),
        Usuario(
            id_empresa=1,
            nombre="Carlos López",
            email="carlos@cementosmadrid.es",
            rol="TECNICO",
            password_hash=get_password_hash("carlos123"),
            creado_por=2,
            activo=1
        ),
        Usuario(
            id_empresa=2,
            nombre="Javier Martínez",
            email="javier@farmaalcala.es",
            rol="EMPRESA_ADMIN",
            password_hash=get_password_hash("javier123"),
            creado_por=1,
            activo=1
        ),
    ]
    for usuario in usuarios:
        db.add(usuario)
    
    db.commit()
    print("   Usuarios cargados")