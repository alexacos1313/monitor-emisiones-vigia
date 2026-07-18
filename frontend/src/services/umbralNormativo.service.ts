// frontend/src/services/umbralNormativo.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface UmbralNormativo {
  id: number;
  zona_normativa_id: number;
  zona_nombre?: string;
  contaminante: string;
  limite_alerta: number;
  limite_critico: number;
  unidad: string;
  referencia_legal: string;
  fecha_aprobacion: string;
}

// Datos mock - SOLO CO, NO, NO2, NOX
const mockUmbralesNormativos: UmbralNormativo[] = [
  { 
    id: 1, zona_normativa_id: 1, zona_nombre: 'Zona Industrial', contaminante: 'CO',
    limite_alerta: 80, limite_critico: 150, unidad: 'mg/m³',
    referencia_legal: 'Real Decreto 102/2011', fecha_aprobacion: '2020-01-15'
  },
  { 
    id: 2, zona_normativa_id: 1, zona_nombre: 'Zona Industrial', contaminante: 'NO',
    limite_alerta: 60, limite_critico: 100, unidad: 'mg/m³',
    referencia_legal: 'Real Decreto 102/2011', fecha_aprobacion: '2020-01-15'
  },
  { 
    id: 3, zona_normativa_id: 1, zona_nombre: 'Zona Industrial', contaminante: 'NO2',
    limite_alerta: 50, limite_critico: 80, unidad: 'mg/m³',
    referencia_legal: 'Real Decreto 102/2011', fecha_aprobacion: '2020-01-15'
  },
  { 
    id: 4, zona_normativa_id: 1, zona_nombre: 'Zona Industrial', contaminante: 'NOx',
    limite_alerta: 120, limite_critico: 250, unidad: 'mg/m³',
    referencia_legal: 'Real Decreto 102/2011', fecha_aprobacion: '2020-01-15'
  },
  { 
    id: 5, zona_normativa_id: 2, zona_nombre: 'Zona Residencial', contaminante: 'CO',
    limite_alerta: 60, limite_critico: 100, unidad: 'mg/m³',
    referencia_legal: 'Ley 34/2007', fecha_aprobacion: '2018-06-20'
  },
  { 
    id: 6, zona_normativa_id: 2, zona_nombre: 'Zona Residencial', contaminante: 'NO',
    limite_alerta: 40, limite_critico: 70, unidad: 'mg/m³',
    referencia_legal: 'Ley 34/2007', fecha_aprobacion: '2018-06-20'
  },
  { 
    id: 7, zona_normativa_id: 2, zona_nombre: 'Zona Residencial', contaminante: 'NO2',
    limite_alerta: 35, limite_critico: 55, unidad: 'mg/m³',
    referencia_legal: 'Ley 34/2007', fecha_aprobacion: '2018-06-20'
  },
  { 
    id: 8, zona_normativa_id: 2, zona_nombre: 'Zona Residencial', contaminante: 'NOx',
    limite_alerta: 80, limite_critico: 150, unidad: 'mg/m³',
    referencia_legal: 'Ley 34/2007', fecha_aprobacion: '2018-06-20'
  },
];

class UmbralNormativoService extends BaseService {

  constructor() {
    super({ useMock: false });  
  }

  async getUmbralesNormativos(): Promise<UmbralNormativo[]> {
    return this.handleRequest(
      mockUmbralesNormativos,
      () => api.get('/umbrales-normativos/'),
      'Error cargando umbrales normativos'
    );
  }

  async getUmbralesPorZona(zona_id: number): Promise<UmbralNormativo[]> {
    return this.handleRequest(
      mockUmbralesNormativos.filter(u => u.zona_normativa_id === zona_id),
      () => api.get(`/umbrales-normativos?zona_id=${zona_id}`),
      'Error cargando umbrales por zona'
    );
  }

  //  Crear un nuevo umbral
  async createUmbral(data: any): Promise<UmbralNormativo> {
    return this.handleRequest(
      {} as UmbralNormativo,
      () => api.post('/umbrales-normativos/', data),
      'Error creando umbral'
    );
  }

  //  Actualizar un umbral existente
  async updateUmbral(id: number, data: any): Promise<UmbralNormativo> {
    return this.handleRequest(
      {} as UmbralNormativo,
      () => api.put(`/umbrales-normativos/${id}`, data),
      'Error actualizando umbral'
    );
  }

  //  Eliminar un umbral (opcional)
  async deleteUmbral(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete(`/umbrales-normativos/${id}`),
      'Error eliminando umbral'
    );
  }
}

export const umbralNormativoService = new UmbralNormativoService();