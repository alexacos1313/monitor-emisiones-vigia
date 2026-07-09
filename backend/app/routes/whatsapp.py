#backend/app/routes/whatsapp.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from whatsapp_config import enviar_whatsapp
from auth import get_current_user
from models import Usuario
from schemas import WhatsAppRequest  # ← Importar desde schemas

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

@router.post("/test")
async def test_whatsapp(
    request: WhatsAppRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """Enviar WhatsApp de prueba"""
    resultado = enviar_whatsapp(request.mensaje, request.destinatario)
    if resultado:
        return {"status": "enviado", "mensaje": request.mensaje}
    else:
        raise HTTPException(status_code=500, detail="Error enviando WhatsApp")