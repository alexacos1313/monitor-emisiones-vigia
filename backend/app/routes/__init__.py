# backend/app/routes/__init__.py
from .auth import router as auth_router
from .usuarios import router as usuarios_router
from .empresas import router as empresas_router
from .plantas import router as plantas_router
from .ubicaciones import router as ubicaciones_router
from .sensores import router as sensores_router
from .mediciones import router as mediciones_router
from .alarmas import router as alarmas_router
from .dashboard import router as dashboard_router
from .reportes import router as reportes_router
from .whatsapp import router as whatsapp_router
from .zonas_normativas import router as zonas_normativas_router
from .umbrales_normativos import router as umbrales_normativos_router
from .mantenimiento import router as mantenimiento_router 
from .websocket_alerts import router as websocket_alerts_router
from .websocket_sensor import router as websocket_sensor_router
from .ai import router as ai_router 

__all__ = [
    'auth_router',
    'usuarios_router',
    'empresas_router',
    'plantas_router',
    'ubicaciones_router',
    'sensores_router',
    'mediciones_router',
    'alarmas_router',
    'dashboard_router',
    'reportes_router',
    'whatsapp_router',
    'zonas_normativas_router',
    'umbrales_normativos_router',
    'mantenimiento_router',  
    'websocket_alerts_router',
    'websocket_sensor_router',
    'ai_router',
]