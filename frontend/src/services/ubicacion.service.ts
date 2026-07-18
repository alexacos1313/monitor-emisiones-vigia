// frontend/src/services/ubicacion.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Ubicacion {
  id: number;
  id_empresa: number;
  provincia: string;
  municipio: string;
  distrito?: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  zona_normativa_id?: number;
}

export interface UbicacionCreate {
  id_empresa: number;
  provincia: string;
  municipio: string;
  distrito?: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  zona_normativa_id?: number;
}

class UbicacionService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getUbicaciones(empresa_id?: number): Promise<Ubicacion[]> {
    const params: any = {};
    if (empresa_id) {
      params.empresa_id = empresa_id;
    }
    return this.handleRequest(
      [],
      () => api.get('/ubicaciones', { params }),
      'Error cargando ubicaciones'
    );
  }

  async getUbicacion(id: number): Promise<Ubicacion | null> {
    return this.handleRequest(
      null,
      () => api.get(`/ubicaciones/${id}`),
      `Error cargando ubicación ${id}`
    );
  }

  async createUbicacion(data: UbicacionCreate): Promise<Ubicacion> {
    return this.handleRequest(
      {} as Ubicacion,
      () => api.post('/ubicaciones', data),
      'Error creando ubicación'
    );
  }

  async updateUbicacion(id: number, data: Partial<UbicacionCreate>): Promise<Ubicacion> {
    return this.handleRequest(
      {} as Ubicacion,
      () => api.put(`/ubicaciones/${id}`, data),
      `Error actualizando ubicación ${id}`
    );
  }

  async deleteUbicacion(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete(`/ubicaciones/${id}`),
      `Error eliminando ubicación ${id}`
    );
  }

  async getUbicacionesPorEmpresa(empresa_id: number): Promise<Ubicacion[]> {
    return this.getUbicaciones(empresa_id);
  }
}

export const ubicacionService = new UbicacionService();