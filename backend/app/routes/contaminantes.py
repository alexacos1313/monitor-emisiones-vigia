# backend/app/routes/contaminantes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import MedicionContaminante, Sensor
from auth import get_current_user
from models import Usuario

router = APIRouter(prefix="/contaminantes", tags=["Contaminantes"])

@router.get("/")
def get_contaminantes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener lista de todos los contaminantes disponibles"""
    
    # Obtener contaminantes únicos de todas las mediciones
    contaminantes = db.query(MedicionContaminante.contaminante).distinct().all()
    
    if contaminantes:
        return [c[0] for c in contaminantes]
    
    # Si no hay datos, devolver lista por defecto
    return ["CO", "NO", "NO2", "NOX"]