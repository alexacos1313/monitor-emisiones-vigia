# backend/app/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# =====================================================
# MODELOS DE AUTENTICACIÓN
# =====================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    usuario_id: int
    nombre: str
    rol: str
    id_empresa: Optional[int] = None

# =====================================================
# MODELOS DE USUARIO
# =====================================================

class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: str
    telefono: Optional[str] = None

class UsuarioCreate(UsuarioBase):
    password: str
    id_empresa: Optional[int] = None

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[int] = None

class UsuarioChangePassword(BaseModel):
    password_actual: str
    password_nueva: str

class UsuarioResponse(UsuarioBase):
    id: int
    id_empresa: Optional[int] = None
    activo: int
    fecha_creacion: datetime
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE EMPRESA
# =====================================================

class EmpresaBase(BaseModel):
    nombre: str
    cif: str
    direccion_social: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaResponse(EmpresaBase):
    id: int
    fecha_registro: Optional[datetime] = None
    activo: int = 1
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE PLANTAS
# =====================================================

class PlantaBase(BaseModel):
    id_empresa: int
    id_ubicacion: int
    nombre: str
    direccion: Optional[str] = None
    actividad: Optional[str] = None
    autorizacion_ambiental: Optional[str] = None
    fecha_autorizacion: Optional[datetime] = None

class PlantaCreate(PlantaBase):
    pass

class PlantaResponse(PlantaBase):
    id: int
    fecha_alta: Optional[datetime] = None
    activo: int = 1
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE SENSOR
# =====================================================

class SensorBase(BaseModel):
    id_planta: int
    nombre: str
    tipo_analizador: Optional[str] = None
    modelo: Optional[str] = None
    fabricante: Optional[str] = None
    fecha_instalacion: Optional[datetime] = None
    frecuencia_medicion: int = 60

class SensorCreate(SensorBase):
    contaminantes: Optional[List[str]] = None  # Lista de contaminantes que mide

class SensorResponse(SensorBase):
    id: int
    ultima_calibracion: Optional[datetime] = None
    estado: str
    contaminantes: Optional[List[str]] = None  # Lista de contaminantes que mide
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE UMBRAL
# =====================================================

class UmbralBase(BaseModel):
    contaminante: str
    limite_alerta: float
    limite_critico: float
    motivo: Optional[str] = None

class UmbralCreate(UmbralBase):
    pass

class UmbralResponse(UmbralBase):
    id: int
    id_sensor: int
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE MEDICIONES
# =====================================================

# Schema para los contaminantes individuales
class MedicionContaminanteSchema(BaseModel):
    contaminante: str
    valor: float

# Schema base con contaminantes dinámicos
class MedicionBase(BaseModel):
    id_sensor: int
    contaminantes: Dict[str, float]  # {"CO": 45.2, "NO": 15.6, "NO2": 8.2}
    temperatura: Optional[float] = None
    flujo: Optional[float] = None
    oxigeno: Optional[float] = None
    estado: Optional[str] = "VALIDADO"

# Schema para crear (igual que el base)
class MedicionCreate(MedicionBase):
    pass

# Schema para respuesta (incluye campos adicionales)
class MedicionResponse(MedicionBase):
    id: int
    id_sensor: int
    timestamp: datetime
    sensor_nombre: Optional[str] = None
    procesada_ia: int = 0
    
    model_config = ConfigDict(from_attributes=True)

# Schema para estadísticas por contaminante
class MedicionEstadisticaContaminante(BaseModel):
    contaminante: str
    promedio: Optional[float] = None
    maximo: Optional[float] = None
    minimo: Optional[float] = None
    total: int = 0

class MedicionEstadisticasResponse(BaseModel):
    fecha: str
    contaminantes: Dict[str, MedicionEstadisticaContaminante]
    total_mediciones: int

# =====================================================
# MODELOS DE ALARMAS
# =====================================================

class AlarmaResponse(BaseModel):
    id: int
    id_medicion: int
    id_sensor: int
    tipo: str
    contaminante: str
    valor: float
    umbral: float
    mensaje: Optional[str]
    timestamp: datetime
    enviada: int
    confirmada_por: Optional[int]
    confirmada_en: Optional[datetime]
    sensor_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ConfirmarAlarma(BaseModel):
    usuario_id: int

# =====================================================
# MODELOS DE IA
# =====================================================

class PreguntaRequest(BaseModel):
    pregunta: str
    empresa_id: Optional[int] = None

class PreguntaResponse(BaseModel):
    pregunta: str
    respuesta: str
    sql_generada: Optional[str] = None

# =====================================================
# MODELOS DE WHATSAPP
# =====================================================

class WhatsAppRequest(BaseModel):
    mensaje: str
    destinatario: Optional[str] = None

# =====================================================
# MODELOS DE DASHBOARD
# =====================================================

class DashboardMetricas(BaseModel):
    total_sensores: int
    sensores_activos: int
    alarmas_pendientes: int
    alarmas_hoy: int
    mediciones_hoy: int

class DashboardGrafico(BaseModel):
    fecha: str
    contaminante: str
    valor: float
    sensor_id: int
    sensor_nombre: str

class DashboardResponse(BaseModel):
    metricas: DashboardMetricas
    graficos: List[DashboardGrafico]
    ultimas_alarmas: List[AlarmaResponse]

# =====================================================
# MODELOS DE REPORTES
# =====================================================

class ReporteRequest(BaseModel):
    fecha_inicio: str
    fecha_fin: str
    sensor_id: Optional[int] = None
    contaminantes: Optional[List[str]] = None
    formato: str = "pdf"

class ReporteResponse(BaseModel):
    mensaje: str
    archivo: Optional[str] = None
    url_descarga: Optional[str] = None