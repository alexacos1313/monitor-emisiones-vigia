#backend/app/routes/reportes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from database import get_db
from models import Empresa, Usuario
from auth import get_current_user, get_current_empresa_admin
from services.reporte_service import generar_reporte_emisiones

router = APIRouter(prefix="/reportes", tags=["Reportes"], redirect_slashes=False)

@router.get("/emisiones")
def generar_reporte(
    empresa_id: Optional[int] = Query(None, description="ID de la empresa (obligatorio para SUPER_ADMIN)"),
    fecha_inicio: datetime = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: datetime = Query(..., description="Fecha de fin (YYYY-MM-DD)"),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generar reporte PDF de emisiones"""
    
    # Validar permisos
    if current_user.rol == "SUPER_ADMIN":
        if not empresa_id:
            raise HTTPException(
                status_code=400, 
                detail="Debe especificar empresa_id para generar el reporte"
            )
    else:
        empresa_id = current_user.id_empresa
        if not empresa_id:
            raise HTTPException(
                status_code=400, 
                detail="Usuario no tiene empresa asociada"
            )
    
    # Verificar que la empresa existe
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Validar fechas
    if fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=400, 
            detail="fecha_inicio debe ser anterior a fecha_fin"
        )
    
    # Generar reporte
    try:
        pdf_bytes = generar_reporte_emisiones(
            db=db,
            empresa_id=empresa_id,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            current_user_nombre=current_user.nombre
        )
        
        nombre_archivo = (
            f"reporte_{empresa.nombre}"
            f"_{fecha_inicio.strftime('%Y%m%d')}"
            f"_{fecha_fin.strftime('%Y%m%d')}.pdf"
        )
        
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={nombre_archivo}"
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error generando reporte: {str(e)}"
        )