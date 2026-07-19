// frontend/src/services/alarma.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Alarma {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  tipo: 'ALERTA' | 'CRITICO';
  contaminante: string;
  valor: number;
  umbral: number;
  mensaje: string;
  timestamp: string;
  enviada: number;
  confirmada_por?: number;
  confirmada_en?: string;
  confirmado_por_nombre?: string;
}

export interface EstadisticasAlarmas {
  total: number;
  pendientes: number;
  confirmadas: number;
  por_tipo: Array<{ tipo: string; total: number }>;
  por_contaminante: Array<{ contaminante: string; total: number }>;
}

class AlarmaService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getAlarmas(params?: { sensor_id?: number; enviada?: number; tipo?: string }): Promise<Alarma[]> {
    return this.handleRequest(
      [],
      () => api.get('/alarmas/', { params }),
      'Error cargando alarmas'
    );
  }

  async getAlarmasPendientes(): Promise<Alarma[]> {
    return this.handleRequest(
      [],
      () => api.get('/alarmas/pendientes'),
      'Error cargando alarmas pendientes'
    );
  }

  async getEstadisticas(sensor_id?: number): Promise<EstadisticasAlarmas> {
    try {
      const params: any = {};
      if (sensor_id) {
        params.sensor_id = sensor_id;
      }
      
      const response = await api.get('/alarmas/estadisticas', { params });
      const data = response.data;
      
      return {
        total: data.total || 0,
        pendientes: data.pendientes || 0,
        confirmadas: data.confirmadas || 0,
        por_tipo: data.por_tipo || [],
        por_contaminante: data.por_contaminante || []
      };
    } catch (error) {
      console.error('Error cargando estadisticas:', error);
      return {
        total: 0,
        pendientes: 0,
        confirmadas: 0,
        por_tipo: [],
        por_contaminante: []
      };
    }
  }

  async confirmarAlarma(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.put(`/alarmas/${id}/confirmar`),
      `Error confirmando alarma ${id}`
    );
  }

  async deleteAlarma(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete(`/alarmas/${id}`),
      `Error eliminando alarma ${id}`
    );
  }

  //  Eliminar todas las alarmas (solo SUPER_ADMIN)
  async deleteAllAlarmas(): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete('/alarmas/'),
      'Error eliminando todas las alarmas'
    );
  }
}

export const alarmaService = new AlarmaService();