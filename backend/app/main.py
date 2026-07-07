# backend/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from routes import *
from auth import get_current_user

app = FastAPI(
    title="VIGIA API",
    description="Sistema de monitorización de emisiones industriales",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# RUTAS PÚBLICAS (no requieren autenticación)
# ============================================
app.include_router(auth_router, prefix="/auth", tags=["Autenticación"])

# ============================================
# RUTAS PROTEGIDAS (requieren autenticación JWT)
# ============================================
app.include_router(empresas_router, prefix="/empresas", tags=["Empresas"], dependencies=[Depends(get_current_user)])
app.include_router(plantas_router, prefix="/plantas", tags=["Plantas"], dependencies=[Depends(get_current_user)])
app.include_router(sensores_router, prefix="/sensores", tags=["Sensores"], dependencies=[Depends(get_current_user)])

# ============================================
# ENDPOINTS DE SALUD
# ============================================
@app.get("/")
def root():
    return {
        "message": "VIGIA API funcionando",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth/login",
            "empresas": "/empresas",
            "plantas": "/plantas",
            "sensores": "/sensores"
        }
    }

@app.get("/health")
def health():
    return {"status": "healthy", "routers_loaded": ["auth", "empresas", "plantas", "sensores"]}