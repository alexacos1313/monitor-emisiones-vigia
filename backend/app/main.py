# backend/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from routes import *
from auth import get_current_user

app = FastAPI(title="VIGIA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas publicas (no requieren autenticacion)
app.include_router(auth_router)

# Rutas protegidas (requieren autenticacion)
app.include_router(empresas_router, dependencies=[Depends(get_current_user)])
app.include_router(plantas_router, dependencies=[Depends(get_current_user)])
app.include_router(sensores_router, dependencies=[Depends(get_current_user)])

@app.get("/")
def root():
    return {"message": "VIGIA API funcionando", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}