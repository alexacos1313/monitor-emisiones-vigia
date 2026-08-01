# backend/app/services/reporte_service.py
import os
import io
from datetime import datetime
from collections import defaultdict

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from models import Empresa, Sensor, Medicion, MedicionContaminante, Alarma, Planta

def generar_reporte_emisiones(
    db: Session,
    empresa_id: int,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    current_user_nombre: str
) -> bytes:
    """Genera un reporte PDF de emisiones para una empresa"""
    
    # =====================================================
    # OBTENER DATOS DE LA BASE DE DATOS
    # =====================================================
    
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise ValueError(f"Empresa {empresa_id} no encontrada")
    
    plantas = db.query(Planta).filter(Planta.id_empresa == empresa_id, Planta.activo == 1).all()
    plantas_ids = [p.id for p in plantas]
    
    sensores = db.query(Sensor).filter(Sensor.id_planta.in_(plantas_ids), Sensor.estado == "ACTIVO").all()
    sensores_ids = [s.id for s in sensores]
    
    mediciones = db.query(Medicion).filter(
        Medicion.id_sensor.in_(sensores_ids),
        Medicion.timestamp >= fecha_inicio,
        Medicion.timestamp <= fecha_fin
    ).all()
    
    mediciones_ids = [m.id for m in mediciones]
    
    contaminantes = db.query(MedicionContaminante).filter(
        MedicionContaminante.id_medicion.in_(mediciones_ids)
    ).all()
    
    alarmas = db.query(Alarma).filter(
        Alarma.id_sensor.in_(sensores_ids),
        Alarma.timestamp >= fecha_inicio,
        Alarma.timestamp <= fecha_fin
    ).all()
    
    # =====================================================
    # CREAR PDF
    # =====================================================
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=20,
        textColor=colors.HexColor('#2E7D32')
    )
    
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1B5E20'),
        spaceAfter=10
    )
    
    normal_style = styles['Normal']
    
    elements = []
    
    # =====================================================
    # 1. CABECERA
    # =====================================================
    elements.append(Paragraph(f"Monitor de Emisiones Industriales - VIGIA", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>Empresa:</b> {empresa.nombre}", normal_style))
    elements.append(Paragraph(f"<b>CIF:</b> {empresa.cif}", normal_style))
    elements.append(Paragraph(f"<b>Periodo:</b> {fecha_inicio.strftime('%d/%m/%Y')} - {fecha_fin.strftime('%d/%m/%Y')}", normal_style))
    elements.append(Paragraph(f"<b>Generado por:</b> {current_user_nombre}", normal_style))
    elements.append(Paragraph(f"<b>Fecha de generación:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    elements.append(Spacer(1, 20))
    
    # =====================================================
    # 2. RESUMEN DE MEDICIONES
    # =====================================================
    elements.append(Paragraph("Resumen de Mediciones", heading_style))
    elements.append(Paragraph(f"Total de mediciones en el período: <b>{len(mediciones)}</b>", normal_style))
    elements.append(Paragraph(f"Total de mediciones válidas: <b>{len([m for m in mediciones if m.estado == 'VALIDADO'])}</b>", normal_style))
    elements.append(Spacer(1, 10))
    
    # =====================================================
    # 3. PROMEDIOS POR CONTAMINANTE (TABLA)
    # =====================================================
    if contaminantes:
        elements.append(Paragraph("Promedios por Contaminante", heading_style))
        
        # Calcular promedios
        promedios = defaultdict(list)
        for c in contaminantes:
            promedios[c.contaminante].append(c.valor)
        
        data = [["Contaminante", "Promedio (mg/m³)", "Máximo (mg/m³)", "Mínimo (mg/m³)", "Mediciones"]]
        for contaminante, valores in sorted(promedios.items()):
            data.append([
                contaminante,
                f"{sum(valores) / len(valores):.2f}",
                f"{max(valores):.2f}",
                f"{min(valores):.2f}",
                str(len(valores))
            ])
        
        table = Table(data, colWidths=[4*cm, 3*cm, 3*cm, 3*cm, 2.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E7D32')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        # =====================================================
        # 4. GRÁFICO DE PROMEDIOS (CORREGIDO)
        # =====================================================
        try:
            # Crear gráfico con matplotlib
            fig, ax = plt.subplots(figsize=(8, 4))
            
            # Obtener datos
            contaminantes_nombres = list(promedios.keys())
            contaminantes_valores = [sum(v)/len(v) for v in promedios.values()]
            
            # Colores personalizados
            colors_plot = ['#2E7D32', '#1B5E20', '#388E3C', '#4CAF50', '#66BB6A', '#81C784']
            
            # Crear barras
            bars = ax.bar(contaminantes_nombres, contaminantes_valores, 
                         color=colors_plot[:len(contaminantes_nombres)])
            
            # Configurar gráfico
            ax.set_title('Promedios por Contaminante', fontsize=14, fontweight='bold')
            ax.set_ylabel('Concentración (mg/m³)', fontsize=12)
            ax.set_xlabel('Contaminante', fontsize=12)
            ax.grid(axis='y', alpha=0.3)
            
            # Añadir valores encima de las barras
            for bar, valor in zip(bars, contaminantes_valores):
                ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, 
                       f'{valor:.1f}', ha='center', va='bottom', fontsize=10)
            
            plt.tight_layout()
            
            # Guardar gráfico en buffer
            img_buffer = io.BytesIO()
            plt.savefig(img_buffer, format='png', dpi=120, bbox_inches='tight')
            plt.close()
            img_buffer.seek(0)
            
            # Crear imagen para ReportLab
            img = ReportLabImage(img_buffer, width=16*cm, height=8*cm)
            
            # Añadir al PDF
            elements.append(Paragraph("Gráfico de Promedios por Contaminante", heading_style))
            elements.append(Spacer(1, 10))
            elements.append(img)
            elements.append(Spacer(1, 20))
            
        except Exception as e:
            print(f"Error generando gráfico: {e}")
            elements.append(Paragraph("No se pudo generar el gráfico.", normal_style))
    
    # =====================================================
    # 5. PROMEDIOS POR SENSOR (DESGLOSE)
    # =====================================================
    if sensores and contaminantes:
        elements.append(Paragraph("Promedios por Sensor", heading_style))
        elements.append(Spacer(1, 10))
        
        # Calcular promedios por sensor
        promedios_por_sensor = {}
        for sensor in sensores:
            sensor_mediciones_ids = [m.id for m in mediciones if m.id_sensor == sensor.id]
            sensor_contaminantes = [c for c in contaminantes if c.id_medicion in sensor_mediciones_ids]
            
            if sensor_contaminantes:
                promedios_por_sensor[sensor.nombre] = {}
                for c in sensor_contaminantes:
                    if c.contaminante not in promedios_por_sensor[sensor.nombre]:
                        promedios_por_sensor[sensor.nombre][c.contaminante] = []
                    promedios_por_sensor[sensor.nombre][c.contaminante].append(c.valor)
        
        if promedios_por_sensor:
            # Obtener todos los contaminantes únicos
            todos_contaminantes = sorted(set([c.contaminante for c in contaminantes]))
            
            data = [["Sensor"] + todos_contaminantes]
            for sensor_nombre, contaminantes_data in promedios_por_sensor.items():
                row = [sensor_nombre[:25]]
                for cont in todos_contaminantes:
                    if cont in contaminantes_data:
                        valores = contaminantes_data[cont]
                        row.append(f"{sum(valores)/len(valores):.2f}")
                    else:
                        row.append("-")
                data.append(row)
            
            if len(data) > 1:
                num_cols = len(data[0])
                col_width = 15 / num_cols * cm
                col_widths = [col_width] * num_cols
                
                table = Table(data, colWidths=col_widths)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1565C0')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 15))
    
    # =====================================================
    # 6. ALARMAS
    # =====================================================
    elements.append(Paragraph("Alarmas Registradas", heading_style))
    if alarmas:
        alarmas_confirmadas = len([a for a in alarmas if a.confirmada_por is not None])
        alarmas_pendientes = len(alarmas) - alarmas_confirmadas
        
        elements.append(Paragraph(f"Total de alarmas: <b>{len(alarmas)}</b>", normal_style))
        elements.append(Paragraph(f"Alarmas confirmadas: <b>{alarmas_confirmadas}</b>", normal_style))
        elements.append(Paragraph(f"Alarmas pendientes: <b>{alarmas_pendientes}</b>", normal_style))
        elements.append(Spacer(1, 5))
        
        # Últimas 5 alarmas
        elements.append(Paragraph("Últimas 5 alarmas:", normal_style))
        data = [["Fecha", "Sensor", "Tipo", "Contaminante", "Valor"]]
        for a in alarmas[-5:]:
            sensor = db.query(Sensor).filter(Sensor.id == a.id_sensor).first()
            sensor_nombre = sensor.nombre if sensor else "Sensor desconocido"
            data.append([
                a.timestamp.strftime('%d/%m/%Y %H:%M'),
                sensor_nombre[:20],
                a.tipo,
                a.contaminante,
                f"{a.valor:.2f}"
            ])
        
        if len(data) > 1:
            table = Table(data, colWidths=[4*cm, 3.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#C62828')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
            ]))
            elements.append(table)
    else:
        elements.append(Paragraph("No hay alarmas registradas en el período seleccionado.", normal_style))
    
    elements.append(Spacer(1, 20))
    
    # =====================================================
    # 7. PIE DE PÁGINA
    # =====================================================
    elements.append(Paragraph("---", normal_style))
    elements.append(Paragraph("Este reporte ha sido generado automáticamente por el sistema VIGIA.", normal_style))
    elements.append(Paragraph(f"Documento generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}", normal_style))
    
    # Construir el PDF
    doc.build(elements)
    
    buffer.seek(0)
    return buffer.getvalue()