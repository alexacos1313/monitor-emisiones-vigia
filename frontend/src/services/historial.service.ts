// frontend/src/services/historial.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface HistorialUmbral {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  contaminante: string;
  limite_alerta_antiguo: number;
  limite_alerta_nuevo: number;
  limite_critico_antiguo: number;
  limite_critico_nuevo: number;
  fecha_cambio: string;
  usuario_id: number;
  usuario_nombre?: string;
  motivo: string;
}

// Datos mock - se usan solo si la API falla
const mockHistorial: HistorialUmbral[] = [
  {
    id: 1, id_sensor: 1, sensor_nombre: 'Sensor Principal CO₂', contaminante: 'CO₂',
    limite_alerta_antiguo: 380, limite_alerta_nuevo: 400,
    limite_critico_antiguo: 420, limite_critico_nuevo: 450,
    fecha_cambio: '2024-01-15T10:30:00', usuario_id: 1, usuario_nombre: 'Admin', motivo: 'Actualización normativa'
  },
  {
    id: 2, id_sensor: 1, sensor_nombre: 'Sensor Principal CO₂', contaminante: 'CO',
    limite_alerta_antiguo: 8, limite_alerta_nuevo: 10,
    limite_critico_antiguo: 12, limite_critico_nuevo: 15,
    fecha_cambio: '2024-01-15T10:30:00', usuario_id: 1, usuario_nombre: 'Admin', motivo: 'Ajuste por calibración'
  },
  {
    id: 3, id_sensor: 2, sensor_nombre: 'Sensor Partículas', contaminante: 'Partículas',
    limite_alerta_antiguo: 45, limite_alerta_nuevo: 50,
    limite_critico_antiguo: 65, limite_critico_nuevo: 75,
    fecha_cambio: '2024-02-20T14:15:00', usuario_id: 2, usuario_nombre: 'Técnico López', motivo: 'Cambio normativo'
  },
];

class HistorialService extends BaseService {
  constructor() {
    super({ useMock: false });
    console.log(' Servicio de historial inicializado');
  }

  async getHistorialUmbrales(sensor_id?: number): Promise<HistorialUmbral[]> {
    try {
      const params: any = {};
      if (sensor_id) {
        params.sensor_id = sensor_id;
      }
      
      const response = await api.get('/historial/umbrales/', { params });
      return response.data || [];
    } catch (error) {
      console.error('Error cargando historial de umbrales:', error);
      
      // Fallback a datos mock
      let filtrados = [...mockHistorial];
      if (sensor_id) {
        filtrados = filtrados.filter(h => h.id_sensor === sensor_id);
      }
      return filtrados.sort((a, b) => 
        new Date(b.fecha_cambio).getTime() - new Date(a.fecha_cambio).getTime()
      );
    }
  }
}

export const historialService = new HistorialService();