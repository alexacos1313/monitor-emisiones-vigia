# backend/app/model.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base 

# =====================================================
# TABLAS GEOGRÁFICAS Y NORMATIVAS
# =====================================================

class ZonaNormativa(Base):
    __tablename__ = "zonas_normativas"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String)
    comunidad_autonoma = Column(String, nullable=False)
    provincia = Column(String, nullable=False)
    municipio = Column(String)
    nivel_proteccion = Column(Integer, default=3)
    normativa_aplicable = Column(String)

class Ubicacion(Base):
    __tablename__ = "ubicaciones"
    
    id = Column(Integer, primary_key=True, index=True)
    provincia = Column(String, nullable=False)
    municipio = Column(String, nullable=False)
    distrito = Column(String)
    codigo_postal = Column(String)
    latitud = Column(Float)
    longitud = Column(Float)
    zona_normativa_id = Column(Integer, ForeignKey("zonas_normativas.id"))
    
    zona_normativa = relationship("ZonaNormativa")

# =====================================================
# TABLAS DE EMPRESAS Y PLANTAS
# =====================================================

class Empresa(Base):
    __tablename__ = "empresas"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    cif = Column(String(12), unique=True, nullable=False)
    direccion_social = Column(String)
    telefono = Column(String)
    email = Column(String)
    fecha_registro = Column(DateTime, default=datetime.now)
    activo = Column(Integer, default=1)  
    
    plantas = relationship("Planta", back_populates="empresa")
    usuarios = relationship("Usuario", back_populates="empresa")

class Planta(Base):
    __tablename__ = "plantas"
    
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    id_ubicacion = Column(Integer, ForeignKey("ubicaciones.id"), nullable=False)
    nombre = Column(String, nullable=False)
    direccion = Column(String)
    actividad = Column(String)
    autorizacion_ambiental = Column(String)
    fecha_autorizacion = Column(DateTime)
    fecha_alta = Column(DateTime, default=datetime.now)
    activo = Column(Integer, default=1)
    
    empresa = relationship("Empresa", back_populates="plantas")
    ubicacion = relationship("Ubicacion")
    sensores = relationship("Sensor", back_populates="planta")

# =====================================================
# SENSORES Y ANALIZADORES
# =====================================================

class Sensor(Base):
    __tablename__ = "sensores"
    
    id = Column(Integer, primary_key=True, index=True)
    id_planta = Column(Integer, ForeignKey("plantas.id"), nullable=False)
    nombre = Column(String, nullable=False)
    tipo_analizador = Column(String)
    modelo = Column(String)
    fabricante = Column(String)
    fecha_instalacion = Column(DateTime)
    ultima_calibracion = Column(DateTime)
    frecuencia_medicion = Column(Integer, default=60)
    estado = Column(String, default="ACTIVO")
    contaminantes = Column(JSON)  # Lista de contaminantes que mide: ["CO","NO","NO2","NOX"]
    
    planta = relationship("Planta", back_populates="sensores")
    mediciones = relationship("Medicion", back_populates="sensor")
    umbrales = relationship("UmbralSensor", back_populates="sensor")
    mantenimientos = relationship("MantenimientoSensor", back_populates="sensor")

# =====================================================
# UMBRALES
# =====================================================

class UmbralNormativo(Base):
    __tablename__ = "umbrales_normativos"
    
    id = Column(Integer, primary_key=True, index=True)
    zona_normativa_id = Column(Integer, ForeignKey("zonas_normativas.id"), nullable=False)
    contaminante = Column(String, nullable=False)
    limite_alerta = Column(Float, nullable=False)
    limite_critico = Column(Float, nullable=False)
    tiempo_ventana = Column(Integer, default=0)
    unidad = Column(String, default="mg/m³")
    referencia_legal = Column(String)
    fecha_aprobacion = Column(DateTime)
    
    zona_normativa = relationship("ZonaNormativa")

class UmbralSensor(Base):
    __tablename__ = "umbrales_sensor"
    
    id = Column(Integer, primary_key=True, index=True)
    id_sensor = Column(Integer, ForeignKey("sensores.id"), nullable=False)
    contaminante = Column(String, nullable=False)
    limite_alerta = Column(Float, nullable=False)
    limite_critico = Column(Float, nullable=False)
    tiempo_ventana = Column(Integer, default=0)
    motivo = Column(String)
    fecha_aplicacion = Column(DateTime, default=datetime.now)
    
    sensor = relationship("Sensor", back_populates="umbrales")

# =====================================================
# MEDICIONES (VERSIÓN DINÁMICA - TABLA NORMALIZADA)
# =====================================================

class Medicion(Base):
    __tablename__ = "mediciones"
    
    id = Column(Integer, primary_key=True, index=True)
    id_sensor = Column(Integer, ForeignKey("sensores.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.now, nullable=False)
    temperatura = Column(Float)
    flujo = Column(Float)
    oxigeno = Column(Float)
    estado = Column(String, default="VALIDADO")
    procesada_ia = Column(Integer, default=0)
    
    sensor = relationship("Sensor", back_populates="mediciones")
    contaminantes_rel = relationship("MedicionContaminante", back_populates="medicion", cascade="all, delete-orphan")
    alarmas = relationship("Alarma", back_populates="medicion")

class MedicionContaminante(Base):
    __tablename__ = "mediciones_contaminantes"
    
    id = Column(Integer, primary_key=True, index=True)
    id_medicion = Column(Integer, ForeignKey("mediciones.id", ondelete="CASCADE"), nullable=False)
    contaminante = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    
    medicion = relationship("Medicion", back_populates="contaminantes_rel")

# =====================================================
# ALARMAS
# =====================================================

class Alarma(Base):
    __tablename__ = "alarmas"
    
    id = Column(Integer, primary_key=True, index=True)
    id_medicion = Column(Integer, ForeignKey("mediciones.id"), nullable=False)
    id_sensor = Column(Integer, ForeignKey("sensores.id"), nullable=False)
    tipo = Column(String, nullable=False)
    contaminante = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    umbral = Column(Float, nullable=False)
    mensaje = Column(Text)
    timestamp = Column(DateTime, default=datetime.now)
    enviada = Column(Integer, default=0)
    fecha_envio = Column(DateTime)
    confirmada_por = Column(Integer, ForeignKey("usuarios.id"))
    confirmada_en = Column(DateTime)
    
    medicion = relationship("Medicion", back_populates="alarmas")
    sensor = relationship("Sensor")
    confirmador = relationship("Usuario", foreign_keys=[confirmada_por])

# =====================================================
# USUARIOS
# =====================================================

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    rol = Column(String, default="TECNICO")
    password_hash = Column(String, nullable=False)
    telefono = Column(String)
    ultimo_acceso = Column(DateTime)
    activo = Column(Integer, default=1)
    creado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  
    fecha_creacion = Column(DateTime, default=datetime.now)
    
    empresa = relationship("Empresa", back_populates="usuarios")
    creador = relationship("Usuario", remote_side=[id])

# =====================================================
# LOGS Y MANTENIMIENTO
# =====================================================

class LogSistema(Base):
    __tablename__ = "logs_sistema"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    nivel = Column(String)
    origen = Column(String)
    mensaje = Column(Text)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))

class MantenimientoSensor(Base):
    __tablename__ = "mantenimiento_sensores"
    
    id = Column(Integer, primary_key=True, index=True)
    id_sensor = Column(Integer, ForeignKey("sensores.id"), nullable=False)
    fecha = Column(DateTime, nullable=False)
    tipo = Column(String)
    tecnico = Column(String)
    observaciones = Column(Text)
    proxima_calibracion = Column(DateTime)
    
    sensor = relationship("Sensor", back_populates="mantenimientos")

class HistorialUmbral(Base):
    __tablename__ = "historial_umbrales"
    
    id = Column(Integer, primary_key=True, index=True)
    id_sensor = Column(Integer, ForeignKey("sensores.id"))
    contaminante = Column(String)
    limite_alerta_antiguo = Column(Float)
    limite_alerta_nuevo = Column(Float)
    limite_critico_antiguo = Column(Float)
    limite_critico_nuevo = Column(Float)
    fecha_cambio = Column(DateTime, default=datetime.now)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    motivo = Column(String)