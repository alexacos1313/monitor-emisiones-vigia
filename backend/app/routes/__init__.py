from .auth import router as auth_router
from .empresas import router as empresas_router
from .plantas import router as plantas_router
from .sensores import router as sensores_router
from .mediciones import router as mediciones_router   
from .alarmas import router as alarmas_router       
from .dashboard import router as  dashboard_router
from .reportes import router as  reportes_router
from .usuarios import router as  usuarios_router  

__all__ = [
    "auth_router",
    "empresas_router",
    "plantas_router",
    "sensores_router",
    "mediciones_router",   
    "alarmas_router",  
    "dashboard_router",
    "reportes_router",
    "usuarios_router",   
]