// frontend/src/services/dashboard.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface DashboardResumen {
  total_mediciones: number;
  sensores_activos: number;
  alarmas_pendientes: number;
  alarmas_totales: number;
  promedios: {
    co: number;
    no: number;
    no2: number;
    nox: number;
  };
}

export interface Tendencia {
  fecha: string;
  promedio: number;
  maximo: number;
  minimo: number;
  mediciones: number;
}

class DashboardService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getResumen(empresa_id?: number, sensor_id?: number): Promise<DashboardResumen> {
    try {
      const params: any = {};
       if (empresa_id) params.empresa_id = empresa_id;
    if (sensor_id) params.sensor_id = sensor_id;  
      
      const response = await api.get('/dashboard/resumen', { params });
      const data = response.data;
      
      return {
        total_mediciones: data.total_mediciones || 0,
        sensores_activos: data.sensores_activos || 0,
        alarmas_pendientes: data.alarmas?.pendientes || 0,
        alarmas_totales: data.alarmas?.total || 0,
        promedios: {
          co: data.promedios?.co ? Number(data.promedios.co.toFixed(2)) : 0,
          no: data.promedios?.no ? Number(data.promedios.no.toFixed(2)) : 0,
          no2: data.promedios?.no2 ? Number(data.promedios.no2.toFixed(2)) : 0,
          nox: data.promedios?.nox ? Number(data.promedios.nox.toFixed(2)) : 0
        }
      };
    } catch (error) {
      console.error('Error cargando resumen:', error);
      return {
        total_mediciones: 0,
        sensores_activos: 0,
        alarmas_pendientes: 0,
        alarmas_totales: 0,
        promedios: { co: 0, no: 0, no2: 0, nox: 0 }
      };
    }
  }

  async getTendencias(
    contaminante: string = 'nox', 
    dias: number = 7, 
    sensor_id?: number,
    empresa_id?: number
  ): Promise<Tendencia[]> {
    try {
      const params = new URLSearchParams({
        contaminante,
        dias: dias.toString()
      });
      if (sensor_id) {
        params.append('sensor_id', sensor_id.toString());
      }
      if (empresa_id) {
        params.append('empresa_id', empresa_id.toString());
      }
      
      const response = await api.get(`/dashboard/tendencias?${params.toString()}`);
      const datos = response.data.datos || [];
      
      return datos.map((item: any) => ({
        fecha: item.fecha,
        promedio: item.promedio ? Number(item.promedio.toFixed(2)) : 0,
        maximo: item.maximo ? Number(item.maximo.toFixed(2)) : 0,
        minimo: item.minimo ? Number(item.minimo.toFixed(2)) : 0,
        mediciones: item.mediciones || 0
      }));
    } catch (error) {
      console.error('Error cargando tendencias:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();