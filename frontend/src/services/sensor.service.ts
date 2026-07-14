// frontend/src/services/sensor.service.ts
import { BaseService } from './base.service';
import api from './api';
import { medicionService } from './medicion.service';

export interface Sensor {
  id: number;
  nombre: string;
  tipo_analizador: string;
  modelo: string;
  fabricante: string;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'CALIBRACION';
  id_planta: number;
  planta_nombre?: string;
  fecha_instalacion: string;
  ultima_calibracion?: string;
  frecuencia_medicion: number;
  observaciones?: string;
  contaminantes: string[];
}

export interface UmbralSensor {
  id: number;
  id_sensor: number;
  contaminante: string;
  limite_alerta: number;
  limite_critico: number;
  unidad: string;
  fecha_aplicacion: string;
}

export interface Calibracion {
  id: number;
  id_sensor: number;
  fecha: string;
  tecnico: string;
  observaciones: string;
  proxima_calibracion: string;
}

export interface SensorCreate {
  nombre: string;
  tipo_analizador?: string;
  modelo?: string;
  fabricante?: string;
  estado?: 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'CALIBRACION';
  id_planta: number;
  fecha_instalacion?: string;
  frecuencia_medicion?: number;
  observaciones?: string;
  contaminantes?: string[];
}

// Datos mock - se usan solo si la API falla
const mockSensores: Sensor[] = [
  { 
    id: 1, nombre: 'Sensor Principal CO', tipo_analizador: 'Láser', modelo: 'LASER-2000', 
    fabricante: 'Siemens', estado: 'ACTIVO', id_planta: 1, planta_nombre: 'Planta Madrid',
    fecha_instalacion: '2023-01-15', ultima_calibracion: '2024-01-15', frecuencia_medicion: 60,
    contaminantes: ['CO', 'NO', 'NO2', 'NOX']
  },
  { 
    id: 2, nombre: 'Sensor NO', tipo_analizador: 'Químico', modelo: 'CHEM-X', 
    fabricante: 'ABB', estado: 'ACTIVO', id_planta: 1, planta_nombre: 'Planta Madrid',
    fecha_instalacion: '2023-02-20', ultima_calibracion: '2024-02-20', frecuencia_medicion: 30,
    contaminantes: ['NO']
  },
  { 
    id: 3, nombre: 'Sensor NO₂', tipo_analizador: 'Químico', modelo: 'CHEM-Y', 
    fabricante: 'ABB', estado: 'MANTENIMIENTO', id_planta: 2, planta_nombre: 'Planta Barcelona',
    fecha_instalacion: '2023-03-10', ultima_calibracion: '2023-12-10', frecuencia_medicion: 60,
    contaminantes: ['CO', 'NO', 'NO2', 'NOX']
  },
  { 
    id: 4, nombre: 'Sensor NOx', tipo_analizador: 'Espectrómetro', modelo: 'SPEC-1000', 
    fabricante: 'Thermo Fisher', estado: 'ACTIVO', id_planta: 2, planta_nombre: 'Planta Barcelona',
    fecha_instalacion: '2023-04-05', ultima_calibracion: '2024-01-05', frecuencia_medicion: 45,
    contaminantes: ['CO', 'NO', 'NO2', 'NOX']
  },
  { 
    id: 5, nombre: 'Sensor Multigas', tipo_analizador: 'Espectrómetro', modelo: 'SPEC-2000', 
    fabricante: 'Thermo Fisher', estado: 'CALIBRACION', id_planta: 3, planta_nombre: 'Planta Valencia',
    fecha_instalacion: '2023-05-12', ultima_calibracion: '2024-03-12', frecuencia_medicion: 15,
    contaminantes: ['CO', 'NO', 'NO2', 'NOX']
  },
];

const mockUmbrales: UmbralSensor[] = [
  { id: 1, id_sensor: 1, contaminante: 'CO', limite_alerta: 60, limite_critico: 100, unidad: 'mg/m³', fecha_aplicacion: '2023-01-15' },
  { id: 2, id_sensor: 2, contaminante: 'NO', limite_alerta: 50, limite_critico: 80, unidad: 'mg/m³', fecha_aplicacion: '2023-02-20' },
  { id: 3, id_sensor: 3, contaminante: 'NO2', limite_alerta: 40, limite_critico: 70, unidad: 'mg/m³', fecha_aplicacion: '2023-03-10' },
  { id: 4, id_sensor: 4, contaminante: 'NOx', limite_alerta: 90, limite_critico: 150, unidad: 'mg/m³', fecha_aplicacion: '2023-04-05' },
  { id: 5, id_sensor: 5, contaminante: 'CO', limite_alerta: 50, limite_critico: 85, unidad: 'mg/m³', fecha_aplicacion: '2023-05-12' },
];

const mockCalibraciones: Calibracion[] = [
  { id: 1, id_sensor: 1, fecha: '2024-01-15', tecnico: 'Juan Pérez', observaciones: 'Calibración anual CO', proxima_calibracion: '2025-01-15' },
  { id: 2, id_sensor: 2, fecha: '2024-02-20', tecnico: 'María López', observaciones: 'Ajuste de sensibilidad NO', proxima_calibracion: '2025-02-20' },
  { id: 3, id_sensor: 3, fecha: '2023-12-10', tecnico: 'Carlos Ruiz', observaciones: 'Mantenimiento preventivo NO₂', proxima_calibracion: '2024-12-10' },
];

class SensorService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  private sensores = [...mockSensores];
  private umbrales = [...mockUmbrales];
  private calibraciones = [...mockCalibraciones];
  private nextId = 6;
  private nextUmbralId = 6;
  private nextCalibracionId = 4;

  // ============ SENSORES ============
  async getSensores(planta_id?: number, empresa_id?: number): Promise<Sensor[]> {
    try {
      const params: any = {};
      if (planta_id) params.planta_id = planta_id;
      if (empresa_id) params.empresa_id = empresa_id;
      
      const response = await api.get('/sensores', { params });
      const data = response.data || [];
      
      const sensoresConPlanta = await Promise.all(data.map(async (sensor: Sensor) => {
        try {
          const plantaResponse = await api.get(`/plantas/${sensor.id_planta}`);
          return {
            ...sensor,
            planta_nombre: plantaResponse.data.nombre
          };
        } catch {
          return {
            ...sensor,
            planta_nombre: `Planta ${sensor.id_planta}`
          };
        }
      }));
      
      return sensoresConPlanta;
    } catch (error) {
      console.error('Error cargando sensores:', error);
      let filtrados = [...this.sensores];
      if (planta_id) {
        filtrados = filtrados.filter(s => s.id_planta === planta_id);
      }
      return filtrados;
    }
  }

  async getSensor(id: number): Promise<Sensor | null> {
    try {
      const response = await api.get(`/sensores/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error cargando sensor ${id}:`, error);
      return this.sensores.find(s => s.id === id) || null;
    }
  }

  async createSensor(data: Partial<Sensor>): Promise<Sensor> {
    try {
      const response = await api.post('/sensores', data);
      return response.data;
    } catch (error) {
      console.error('Error creando sensor:', error);
      const newSensor: Sensor = {
        id: this.nextId++,
        nombre: data.nombre || '',
        tipo_analizador: data.tipo_analizador || '',
        modelo: data.modelo || '',
        fabricante: data.fabricante || '',
        estado: data.estado || 'ACTIVO',
        id_planta: data.id_planta || 0,
        fecha_instalacion: data.fecha_instalacion || new Date().toISOString().split('T')[0],
        frecuencia_medicion: data.frecuencia_medicion || 60,
        observaciones: data.observaciones || '',
        contaminantes: data.contaminantes || []
      };
      this.sensores.push(newSensor);
      return newSensor;
    }
  }

  async updateSensor(id: number, data: Partial<Sensor>): Promise<Sensor> {
    try {
      const response = await api.put(`/sensores/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando sensor ${id}:`, error);
      const index = this.sensores.findIndex(s => s.id === id);
      if (index !== -1) {
        this.sensores[index] = { ...this.sensores[index], ...data };
        return this.sensores[index];
      }
      throw error;
    }
  }

  async deleteSensor(id: number): Promise<void> {
    try {
      await api.delete(`/sensores/${id}`);
    } catch (error) {
      console.error(`Error eliminando sensor ${id}:`, error);
      this.sensores = this.sensores.filter(s => s.id !== id);
      this.umbrales = this.umbrales.filter(u => u.id_sensor !== id);
    }
  }

  // ============ UMBRALES ============
  async getUmbrales(sensor_id: number): Promise<UmbralSensor[]> {
    try {
      const response = await api.get(`/sensores/${sensor_id}/umbrales`);
      return response.data || [];
    } catch (error) {
      console.error(`Error cargando umbrales del sensor ${sensor_id}:`, error);
      return this.umbrales.filter(u => u.id_sensor === sensor_id);
    }
  }

  async createUmbral(data: Partial<UmbralSensor>): Promise<UmbralSensor> {
    try {
      const response = await api.post(`/sensores/${data.id_sensor}/umbrales`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando umbral:', error);
      const newUmbral: UmbralSensor = {
        id: this.nextUmbralId++,
        id_sensor: data.id_sensor || 0,
        contaminante: data.contaminante || '',
        limite_alerta: data.limite_alerta || 0,
        limite_critico: data.limite_critico || 0,
        unidad: data.unidad || 'mg/m³',
        fecha_aplicacion: new Date().toISOString().split('T')[0]
      };
      this.umbrales.push(newUmbral);
      return newUmbral;
    }
  }

  async updateUmbral(id: number, data: Partial<UmbralSensor>): Promise<UmbralSensor> {
    try {
      const response = await api.put(`/umbrales/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando umbral ${id}:`, error);
      const index = this.umbrales.findIndex(u => u.id === id);
      if (index !== -1) {
        this.umbrales[index] = { ...this.umbrales[index], ...data };
        return this.umbrales[index];
      }
      throw error;
    }
  }

  async deleteUmbral(id: number): Promise<void> {
    try {
      await api.delete(`/umbrales/${id}`);
    } catch (error) {
      console.error(`Error eliminando umbral ${id}:`, error);
      this.umbrales = this.umbrales.filter(u => u.id !== id);
    }
  }

  // ============ CALIBRACIONES ============
  async getCalibraciones(sensor_id: number): Promise<Calibracion[]> {
    try {
      const response = await api.get(`/sensores/${sensor_id}/calibraciones`);
      return response.data || [];
    } catch (error) {
      console.error(`Error cargando calibraciones del sensor ${sensor_id}:`, error);
      return this.calibraciones.filter(c => c.id_sensor === sensor_id);
    }
  }

  async registrarCalibracion(data: Partial<Calibracion>): Promise<Calibracion> {
    try {
      const response = await api.post(`/sensores/${data.id_sensor}/calibrar`, data);
      return response.data;
    } catch (error) {
      console.error('Error registrando calibración:', error);
      const newCalibracion: Calibracion = {
        id: this.nextCalibracionId++,
        id_sensor: data.id_sensor || 0,
        fecha: new Date().toISOString().split('T')[0],
        tecnico: data.tecnico || '',
        observaciones: data.observaciones || '',
        proxima_calibracion: data.proxima_calibracion || ''
      };
      this.calibraciones.push(newCalibracion);
      const sensorIndex = this.sensores.findIndex(s => s.id === data.id_sensor);
      if (sensorIndex !== -1) {
        this.sensores[sensorIndex].ultima_calibracion = newCalibracion.fecha;
      }
      return newCalibracion;
    }
  }

  async getEstadosSensor(): Promise<string[]> {
    return ['ACTIVO', 'MANTENIMIENTO', 'INACTIVO', 'CALIBRACION'];
  }

  async getContaminantesBySensor(sensorId: number): Promise<string[]> {
    try {
      const contaminantes = await medicionService.getContaminantesBySensor(sensorId);
      if (contaminantes.length > 0) {
        return contaminantes.map(c => c.toUpperCase());
      }
    } catch (error) {
      console.error('Error obteniendo contaminantes desde mediciones:', error);
    }
    const sensor = this.sensores.find(s => s.id === sensorId);
    return sensor?.contaminantes || ['CO', 'NO', 'NO2', 'NOX'];
  }

  async getAllContaminantesUnicos(): Promise<string[]> {
    try {
      const contaminantes = await medicionService.getAllContaminantesUnicos();
      if (contaminantes.length > 0) {
        return contaminantes.map(c => c.toUpperCase()).sort();
      }
    } catch (error) {
      console.error('Error obteniendo todos los contaminantes:', error);
    }
    return ['CO', 'NO', 'NO2', 'NOX'];
  }

  async getContaminantes(sensor_id?: number): Promise<string[]> {
    if (sensor_id) {
      return this.getContaminantesBySensor(sensor_id);
    }
    return this.getAllContaminantesUnicos();
  }
}

export const sensorService = new SensorService();