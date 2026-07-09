#backend/app/routes/ai.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Usuario, Empresa
from schemas import PreguntaRequest, PreguntaResponse  
from auth import get_current_user
from ai_config import get_query_engine, init_ai
from ai_prompt import SYSTEM_PROMPT

router = APIRouter(prefix="/ai", tags=["Inteligencia Artificial"])

# Inicializar IA al arrancar
@router.on_event("startup")
async def startup_event():
    init_ai()

@router.post("/consultar", response_model=PreguntaResponse)
async def consultar_ai(
    request: PreguntaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Consultar la base de datos en lenguaje natural"""
    
    query_engine = get_query_engine()
    if not query_engine:
        raise HTTPException(status_code=503, detail="IA no disponible")
    
    # Construir pregunta con contexto de empresa
    pregunta = request.pregunta
    
    # Si no es SUPER_ADMIN, filtrar por su empresa
    if current_user.rol != "SUPER_ADMIN":
        empresa = db.query(Empresa).filter(Empresa.id == current_user.id_empresa).first()
        if empresa:
            pregunta = f"{request.pregunta} (considerando solo la empresa '{empresa.nombre}' con id={empresa.id})"
    
    # Si especificó empresa_id y es SUPER_ADMIN
    if request.empresa_id and current_user.rol == "SUPER_ADMIN":
        empresa = db.query(Empresa).filter(Empresa.id == request.empresa_id).first()
        if empresa:
            pregunta = f"{request.pregunta} (considerando solo la empresa '{empresa.nombre}' con id={empresa.id})"
    
    try:
        response = query_engine.query(pregunta)
        
        return PreguntaResponse(
            pregunta=request.pregunta,
            respuesta=str(response),
            sql_generada=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando pregunta: {str(e)}")