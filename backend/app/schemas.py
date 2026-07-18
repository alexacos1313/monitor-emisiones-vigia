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
# MODELOS DE UBICACIONES
# =====================================================

class UbicacionBase(BaseModel): 
    provincia: str
    municipio: str
    distrito: Optional[str] = None
    codigo_postal: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    zona_normativa_id: Optional[int] = None

class UbicacionCreate(UbicacionBase):
    pass

class UbicacionResponse(UbicacionBase):
    id: int
    
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
    empresa_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PlantaUpdate(BaseModel):
    nombre: Optional[str] = None
    id_ubicacion: Optional[int] = None
    direccion: Optional[str] = None
    actividad: Optional[str] = None
    autorizacion_ambiental: Optional[str] = None
    fecha_autorizacion: Optional[datetime] = None
    activo: Optional[int] = None  

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
    contaminantes: Optional[List[str]] = None

class SensorResponse(SensorBase):
    id: int
    planta_nombre: Optional[str] = None
    ultima_calibracion: Optional[datetime] = None
    estado: str
    contaminantes: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE SENSOR 
# =====================================================
class SensorUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo_analizador: Optional[str] = None
    modelo: Optional[str] = None
    fabricante: Optional[str] = None
    fecha_instalacion: Optional[datetime] = None
    frecuencia_medicion: Optional[int] = None
    estado: Optional[str] = None
    contaminantes: Optional[List[str]] = None
    
# =====================================================
# MODELOS DE UMBRALES DE SENSOR 
# =====================================================

class UmbralSensorBase(BaseModel):
    contaminante: str
    limite_alerta: float
    limite_critico: float
    tiempo_ventana: Optional[int] = 0
    motivo: Optional[str] = None

class UmbralSensorCreate(UmbralSensorBase):
    id_sensor: int

class UmbralSensorUpdate(BaseModel):
    limite_alerta: Optional[float] = None
    limite_critico: Optional[float] = None
    tiempo_ventana: Optional[int] = None
    motivo: Optional[str] = None

class UmbralSensorResponse(UmbralSensorBase):
    id: int
    id_sensor: int
    fecha_aplicacion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE MEDICIONES
# =====================================================

class MedicionContaminanteSchema(BaseModel):
    contaminante: str
    valor: float

class MedicionBase(BaseModel):
    id_sensor: int
    contaminantes: List[MedicionContaminanteSchema]  # Lista de {contaminante, valor}
    temperatura: Optional[float] = None
    flujo: Optional[float] = None
    oxigeno: Optional[float] = None
    estado: Optional[str] = "VALIDADO"

class MedicionCreate(MedicionBase):
    pass

class MedicionResponse(BaseModel):
    id: int
    id_sensor: int
    timestamp: datetime
    temperatura: Optional[float] = None
    flujo: Optional[float] = None
    oxigeno: Optional[float] = None
    estado: str
    procesada_ia: int
    sensor_nombre: Optional[str] = None
    contaminantes: List[MedicionContaminanteSchema]
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE ALARMAS
# =====================================================

class AlarmaResponse(BaseModel):
    id: int
    id_medicion: int
    id_sensor: int
    sensor_nombre: Optional[str] = None
    tipo: str
    contaminante: str
    valor: float
    umbral: float
    mensaje: Optional[str]
    timestamp: datetime
    enviada: int
    fecha_envio: Optional[datetime] = None
    confirmada_por: Optional[int]
    confirmada_en: Optional[datetime]
    confirmado_por_nombre: Optional[str] = None
    
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
# MODELOS DE ZONAS NORMATIVAS
# =====================================================

class ZonaNormativaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    comunidad_autonoma: str
    provincia: str
    municipio: Optional[str] = None
    nivel_proteccion: int = 3
    normativa_aplicable: Optional[str] = None

class ZonaNormativaResponse(ZonaNormativaBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# =====================================================
# MODELOS DE UMBRALES NORMATIVOS
# =====================================================

class UmbralNormativoBase(BaseModel):
    zona_normativa_id: int
    contaminante: str
    limite_alerta: float
    limite_critico: float
    unidad: str = "mg/m³"
    referencia_legal: Optional[str] = None
    fecha_aprobacion: Optional[datetime] = None

class UmbralNormativoResponse(UmbralNormativoBase):
    id: int
    zona_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)