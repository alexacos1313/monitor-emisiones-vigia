// frontend/src/services/planta.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Planta {
  id: number;
  id_empresa: number;
  id_ubicacion?: number;
  nombre: string;
  direccion?: string;
  actividad?: string;
  autorizacion_ambiental?: string;
  fecha_autorizacion?: string;
  fecha_alta: string;
  activo: number;
  empresa_nombre?: string;
}

export interface PlantaCreate {
  id_empresa: number;
  nombre: string;
  direccion?: string;
  actividad?: string;
  autorizacion_ambiental?: string;
  fecha_autorizacion?: string;
}

export interface PlantaUpdate {
  nombre?: string;
  direccion?: string;
  actividad?: string;
  autorizacion_ambiental?: string;
  fecha_autorizacion?: string;
  activo?: number;
}

class PlantaService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  // ============ PLANTAS ============
  
  async getPlantas(empresa_id?: number): Promise<Planta[]> {
    const params: any = {};
    if (empresa_id) {
      params.empresa_id = empresa_id;
    }
    
    return this.handleRequest(
      [],
      () => api.get('/plantas', { params }),
      'Error cargando plantas'
    );
  }

  async getPlanta(id: number): Promise<Planta | null> {
    return this.handleRequest(
      null,
      () => api.get(`/plantas/${id}`),
      `Error cargando planta ${id}`
    );
  }

  async createPlanta(data: PlantaCreate): Promise<Planta> {
    return this.handleRequest(
      {} as Planta,
      () => api.post('/plantas', data),
      'Error creando planta'
    );
  }

  async updatePlanta(id: number, data: PlantaUpdate): Promise<Planta> {
    return this.handleRequest(
      {} as Planta,
      () => api.put(`/plantas/${id}`, data),
      `Error actualizando planta ${id}`
    );
  }

  async deletePlanta(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete(`/plantas/${id}`),
      `Error eliminando planta ${id}`
    );
  }

  async getSensoresDePlanta(planta_id: number): Promise<any[]> {
    return this.handleRequest(
      [],
      () => api.get(`/plantas/${planta_id}/sensores`),
      `Error cargando sensores de planta ${planta_id}`
    );
  }

  async getPlantasPorEmpresa(empresa_id: number): Promise<Planta[]> {
    return this.getPlantas(empresa_id);
  }
}

export const plantaService = new PlantaService();