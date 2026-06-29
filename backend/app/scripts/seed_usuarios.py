# scripts/seed_usuarios.py
from models import Usuario
from auth import get_password_hash

def seed_usuarios(db):
    """Carga los usuarios"""
    print("    Cargando usuarios...")
    
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
    print("    Usuarios cargados (4)")
    print("\n    CREDENCIALES:")
    print("      admin@sistema.es / admin123 (SUPER_ADMIN)")
    print("      maria@cementosmadrid.es / maria123 (EMPRESA_ADMIN)")
    print("      carlos@cementosmadrid.es / carlos123 (TECNICO)")
    print("      javier@farmaalcala.es / javier123 (EMPRESA_ADMIN)")