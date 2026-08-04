// frontend/src/services/medicion.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Medicion {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  timestamp: string;
  contaminantes: Array<{ contaminante: string; valor: number }>;
  temperatura: number | null;
  flujo: number | null;
  oxigeno: number | null;
  estado: string;
  procesada_ia?: number;
}

export interface FiltrosMedicion {
  sensor_id?: number;
  contaminante?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  min_valor?: number;
  max_valor?: number;
}

class MedicionService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getMediciones(filtros?: FiltrosMedicion, empresa_id?: number): Promise<Medicion[]> {
    try {
      const params: any = { ...filtros };
      if (empresa_id) {
        params.empresa_id = empresa_id;
      }
      
      // Eliminar parámetros undefined o null
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });
      
      console.log('Consultando mediciones con params:', params);
      const response = await api.get('/mediciones/', { params });
      console.log('Mediciones recibidas:', response.data?.length || 0);
      return response.data || [];
    } catch (error) {
      console.error('Error cargando mediciones:', error);
      return [];
    }
  }

  async getMedicionesPorSensor(sensor_id: number): Promise<Medicion[]> {
    try {
      const response = await api.get(`/mediciones/?sensor_id=${sensor_id}`);
      return response.data || [];
    } catch (error) {
      console.error(`Error cargando mediciones del sensor ${sensor_id}:`, error);
      return [];
    }
  }

  async getContaminantesBySensor(sensorId: number): Promise<string[]> {
    try {
      const response = await api.get(`/mediciones/sensor/${sensorId}/contaminantes`);
      return response.data.contaminantes || [];
    } catch (error) {
      console.error(`Error cargando contaminantes del sensor ${sensorId}:`, error);
      return [];
    }
  }

  async getAllContaminantesUnicos(): Promise<string[]> {
    try {
      const response = await api.get('/mediciones/contaminantes');
      return response.data || [];
    } catch (error) {
      console.error('Error cargando todos los contaminantes:', error);
      return ['CO', 'NO', 'NO2', 'NOX'];
    }
  }

  async getEstadisticas(fecha_inicio?: string, fecha_fin?: string): Promise<any> {
    try {
      const params: any = {};
      if (fecha_inicio) params.fecha_inicio = fecha_inicio;
      if (fecha_fin) params.fecha_fin = fecha_fin;
      
      const response = await api.get('/mediciones/estadisticas', { params });
      return response.data || { total: 0, contaminantes: {} };
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      return { total: 0, contaminantes: {} };
    }
  }
}

export const medicionService = new MedicionService();