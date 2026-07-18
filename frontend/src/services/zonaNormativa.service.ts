// frontend/src/services/zonaNormativa.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface ZonaNormativa {
  id: number;
  nombre: string;
  descripcion?: string;
  comunidad_autonoma: string;
  provincia: string;
  municipio?: string;
  nivel_proteccion: number;
  normativa_aplicable?: string;
}

class ZonaNormativaService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async getZonasNormativas(): Promise<ZonaNormativa[]> {
    return this.handleRequest(
      [],
      () => api.get('/zonas-normativas/'),
      'Error cargando zonas normativas'
    );
  }

  async getZonaNormativa(id: number): Promise<ZonaNormativa | null> {
    return this.handleRequest(
      null,
      () => api.get(`/zonas-normativas/${id}`),
      'Error cargando zona normativa'
    );
  }

  //  CREAR zona normativa (solo SUPER_ADMIN)
  async createZonaNormativa(data: any): Promise<ZonaNormativa> {
    return this.handleRequest(
      {} as ZonaNormativa,
      () => api.post('/zonas-normativas/', data),
      'Error creando zona normativa'
    );
  }

  //  ACTUALIZAR zona normativa (solo SUPER_ADMIN)
  async updateZonaNormativa(id: number, data: any): Promise<ZonaNormativa> {
    return this.handleRequest(
      {} as ZonaNormativa,
      () => api.put(`/zonas-normativas/${id}`, data),
      'Error actualizando zona normativa'
    );
  }

  //  ELIMINAR zona normativa (solo SUPER_ADMIN)
  async deleteZonaNormativa(id: number): Promise<void> {
    return this.handleRequest(
      undefined,
      () => api.delete(`/zonas-normativas/${id}`),
      'Error eliminando zona normativa'
    );
  }
}

export const zonaNormativaService = new ZonaNormativaService();