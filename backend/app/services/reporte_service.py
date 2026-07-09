#backend/app/services/reporte_service.py
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from datetime import datetime
from sqlalchemy.orm import Session
from models import Medicion, Sensor, Planta, Empresa, Alarma
import io
import os

# Lista de contaminantes válidos
CONTAMINANTES = {
    "CO": "co",
    "NO": "no",
    "NO2": "no2",
    "NOX": "nox"
}


def generar_reporte_emisiones(
    db: Session,
    empresa_id: int,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    current_user_nombre: str
) -> bytes:
    """Generar reporte PDF de emisiones"""
    
    # Obtener datos de la empresa
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise ValueError("Empresa no encontrada")
    
    # Obtener sensores de la empresa
    sensores = db.query(Sensor).join(Planta).filter(Planta.id_empresa == empresa_id).all()
    sensores_ids = [s.id for s in sensores]
    
    # Obtener mediciones del periodo
    mediciones = db.query(Medicion).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin
    ).order_by(Medicion.timestamp).all()
    
    # Obtener alarmas del periodo
    alarmas = db.query(Alarma).filter(
        Alarma.id_sensor.in_(sensores_ids),
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    ).order_by(Alarma.timestamp.desc()).all()
    
    # Crear buffer para el PDF
    buffer = io.BytesIO()
    
    # Crear documento
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    # Estilo personalizado para titulo
    titulo_style = ParagraphStyle(
        'Titulo',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,  # Centrado
        spaceAfter=30
    )
    
    # =====================================================
    # CABECERA DEL REPORTE
    # =====================================================
    
    # Titulo principal
    story.append(Paragraph("Informe de Emisiones", titulo_style))
    story.append(Paragraph(f"{empresa.nombre}", styles['Heading2']))
    story.append(Spacer(1, 10))
    
    # Periodo
    story.append(Paragraph(
        f"Periodo: {fecha_inicio.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}",
        styles['Normal']
    ))
    story.append(Paragraph(f"Fecha generacion: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    story.append(Paragraph(f"Generado por: {current_user_nombre}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # =====================================================
    # RESUMEN GENERAL
    # =====================================================
    
    story.append(Paragraph("1. Resumen General", styles['Heading2']))
    story.append(Spacer(1, 10))
    
    # Calcular estadisticas
    total_mediciones = len(mediciones)
    total_alarmas = len(alarmas)
    alarmas_alertas = len([a for a in alarmas if a.tipo == "ALERTA"])
    alarmas_criticas = len([a for a in alarmas if a.tipo == "CRITICO"])
    
    datos_resumen = [
        ["Metrica", "Valor"],
        ["Total mediciones", str(total_mediciones)],
        ["Total alarmas", str(total_alarmas)],
        ["Alarmas ALERTA", str(alarmas_alertas)],
        ["Alarmas CRITICAS", str(alarmas_criticas)],
        ["Sensores activos", str(len(sensores))],
    ]
    
    tabla_resumen = Table(datos_resumen, colWidths=[6*cm, 6*cm])
    tabla_resumen.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(tabla_resumen)
    story.append(Spacer(1, 20))
    
    # =====================================================
    # PROMEDIOS POR CONTAMINANTE (SOLO CO, NO, NO2, NOX)
    # =====================================================
    
    story.append(Paragraph("2. Promedios por Contaminante", styles['Heading2']))
    story.append(Spacer(1, 10))
    
    # Calcular promedios (SOLO CO, NO, NO2, NOX)
    promedios = {
        "CO": 0,
        "NO": 0,
        "NO2": 0,
        "NOX": 0
    }
    conteos = {k: 0 for k in promedios}
    
    for m in mediciones:
        if m.co is not None:
            promedios["CO"] += m.co
            conteos["CO"] += 1
        if m.no is not None:
            promedios["NO"] += m.no
            conteos["NO"] += 1
        if m.no2 is not None:
            promedios["NO2"] += m.no2
            conteos["NO2"] += 1
        if m.nox is not None:
            promedios["NOX"] += m.nox
            conteos["NOX"] += 1
    
    for k in promedios:
        if conteos[k] > 0:
            promedios[k] = round(promedios[k] / conteos[k], 2)
    
    datos_promedios = [
        ["Contaminante", "Promedio (mg/m³)", "Mediciones"],
        ["CO", str(promedios["CO"]), str(conteos["CO"])],
        ["NO", str(promedios["NO"]), str(conteos["NO"])],
        ["NO2", str(promedios["NO2"]), str(conteos["NO2"])],
        ["NOX", str(promedios["NOX"]), str(conteos["NOX"])],
    ]
    
    tabla_promedios = Table(datos_promedios, colWidths=[4*cm, 5*cm, 5*cm])
    tabla_promedios.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    story.append(tabla_promedios)
    story.append(Spacer(1, 20))
    
    # =====================================================
    # ALARMAS DEL PERIODO
    # =====================================================
    
    if alarmas:
        story.append(Paragraph("3. Alarmas Registradas", styles['Heading2']))
        story.append(Spacer(1, 10))
        
        datos_alarmas = [
            ["Fecha", "Sensor", "Contaminante", "Tipo", "Valor", "Umbral"]
        ]
        
        for a in alarmas[:50]:  # Limitar a 50 alarmas
            sensor = next((s for s in sensores if s.id == a.id_sensor), None)
            sensor_nombre = sensor.nombre if sensor else "Desconocido"
            
            datos_alarmas.append([
                a.timestamp.strftime('%d/%m/%Y %H:%M'),
                sensor_nombre[:20],
                a.contaminante,
                a.tipo,
                str(a.valor),
                str(a.umbral)
            ])
        
        tabla_alarmas = Table(datos_alarmas, colWidths=[4*cm, 4*cm, 2.5*cm, 2*cm, 2*cm, 2*cm])
        tabla_alarmas.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        story.append(tabla_alarmas)
        story.append(Spacer(1, 20))
    
    # =====================================================
    # PIE DE PAGINA
    # =====================================================
    
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        "Este informe ha sido generado automaticamente por el Sistema de Monitorizacion de Emisiones.",
        styles['Italic']
    ))
    
    # Construir PDF
    doc.build(story)
    
    # Retornar bytes
    buffer.seek(0)
    return buffer.getvalue()