from .auth import router as auth_router
from .empresas import router as empresas_router
from .plantas import router as plantas_router
from .sensores import router as sensores_router

__all__ = [
    "auth_router",
    "empresas_router",
    "plantas_router",
    "sensores_router",
]