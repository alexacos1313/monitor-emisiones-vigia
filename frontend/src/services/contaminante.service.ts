// frontend/src/services/contaminante.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Contaminante {
  id: number;
  nombre: string;
  unidad: string;
  formula: string;
  descripcion?: string;
}

//  Contaminantes por defecto (cuando no hay datos del backend)
const contaminantesPorDefecto: Contaminante[] = [
  { id: 1, nombre: 'CO', unidad: 'mg/m³', formula: 'CO', descripcion: 'Monóxido de carbono' },
  { id: 2, nombre: 'NO', unidad: 'mg/m³', formula: 'NO', descripcion: 'Óxido nítrico' },
  { id: 3, nombre: 'NO2', unidad: 'mg/m³', formula: 'NO₂', descripcion: 'Dióxido de nitrógeno' },
  { id: 4, nombre: 'NOX', unidad: 'mg/m³', formula: 'NOx', descripcion: 'Óxidos de nitrógeno' },
];

class ContaminanteService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getContaminantes(): Promise<Contaminante[]> {
    try {
      const response = await api.get('/contaminantes/');
      const data = response.data;
      
      //  Si el backend devuelve un array de strings, convertirlos a Contaminante[]
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        return data.map((nombre: string, index: number) => ({
          id: index + 1,
          nombre: nombre,
          unidad: 'mg/m³',
          formula: nombre,
          descripcion: nombre
        }));
      }
      
      return data || contaminantesPorDefecto;
    } catch (error) {
      console.warn('No se pudieron cargar contaminantes, usando defecto:', error);
      return contaminantesPorDefecto;
    }
  }

  async getContaminantesPorSensor(sensor_id: number): Promise<Contaminante[]> {
    try {
      const response = await api.get(`/sensores/${sensor_id}/contaminantes`);
      const data = response.data;
      
      //  El backend devuelve un array de strings: ["CO", "NO", "NO2", "NOX"]
      // Lo convertimos al formato Contaminante[]
      if (Array.isArray(data)) {
        return data.map((nombre: string, index: number) => ({
          id: index + 1,
          nombre: nombre,
          unidad: 'mg/m³',
          formula: nombre,
          descripcion: nombre
        }));
      }
      
      // Si no hay datos, devolver contaminantes por defecto
      return contaminantesPorDefecto;
    } catch (error) {
      console.warn(`No se pudieron cargar contaminantes del sensor ${sensor_id}, usando defecto:`, error);
      return contaminantesPorDefecto;
    }
  }
}

export const contaminanteService = new ContaminanteService();