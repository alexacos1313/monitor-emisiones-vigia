// frontend/src/services/empresa.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Empresa {
  id: number;
  nombre: string;
  cif: string;
  direccion_social: string;
  telefono: string;
  email: string;
  fecha_registro: string;
  activo: number;
}

export interface Planta {
  id: number;
  id_empresa: number;
  nombre: string;
  direccion: string;
  actividad: string;
  fecha_alta: string;
  activo: number;
}

// Datos mock
const mockEmpresas: Empresa[] = [
  {
    id: 1,
    nombre: 'Industrias del Sur S.A.',
    cif: 'B12345678',
    direccion_social: 'C/ Mayor 123, Madrid',
    telefono: '912345678',
    email: 'info@industriassur.com',
    fecha_registro: '2023-01-15T10:00:00Z',
    activo: 1
  },
  {
    id: 2,
    nombre: 'Químicos del Norte S.L.',
    cif: 'B87654321',
    direccion_social: 'Avda. Cataluña 45, Barcelona',
    telefono: '934567890',
    email: 'contacto@quimicosnorte.com',
    fecha_registro: '2023-03-20T10:00:00Z',
    activo: 1
  },
  {
    id: 3,
    nombre: 'Energías Verdes S.A.',
    cif: 'B11223344',
    direccion_social: 'C/ Industria 78, Valencia',
    telefono: '961234567',
    email: 'info@energiasverdes.com',
    fecha_registro: '2023-06-10T10:00:00Z',
    activo: 0
  }
];

const mockPlantas: Planta[] = [
  { id: 1, id_empresa: 1, nombre: 'Planta Madrid', direccion: 'Polígono Industrial Sur', actividad: 'Fabricación', fecha_alta: '2023-01-20T10:00:00Z', activo: 1 },
  { id: 2, id_empresa: 1, nombre: 'Planta Toledo', direccion: 'C/ Fábrica 5', actividad: 'Almacenamiento', fecha_alta: '2023-02-01T10:00:00Z', activo: 1 },
  { id: 3, id_empresa: 2, nombre: 'Planta Barcelona', direccion: 'Zona Franca', actividad: 'Producción', fecha_alta: '2023-04-01T10:00:00Z', activo: 1 },
  { id: 4, id_empresa: 2, nombre: 'Planta Tarragona', direccion: 'Polígono Norte', actividad: 'Distribución', fecha_alta: '2023-05-01T10:00:00Z', activo: 0 },
  { id: 5, id_empresa: 3, nombre: 'Planta Valencia', direccion: 'Parque Tecnológico', actividad: 'I+D', fecha_alta: '2023-07-01T10:00:00Z', activo: 1 },
];

class EmpresaService extends BaseService {
  private empresas = [...mockEmpresas];
  private plantas = [...mockPlantas];
  private nextId = 4;
  private nextPlantaId = 6;

  // ============ EMPRESAS ============
  async getEmpresas(activas?: boolean): Promise<Empresa[]> {
    let filtradas = [...this.empresas];
    if (activas !== undefined) {
      filtradas = filtradas.filter(e => e.activo === (activas ? 1 : 0));
    }
    return this.handleRequest(
      filtradas,
      () => api.get('/empresas', { params: { activas } }),
      'Error cargando empresas'
    );
  }

  async getEmpresa(id: number): Promise<Empresa | null> {
    return this.handleRequest(
      this.empresas.find(e => e.id === id) || null,
      () => api.get(`/empresas/${id}`),
      `Error cargando empresa ${id}`
    );
  }

  async createEmpresa(data: Partial<Empresa>): Promise<Empresa> {
    const nuevaEmpresa: Empresa = {
      id: this.nextId++,
      nombre: data.nombre || '',
      cif: data.cif || '',
      direccion_social: data.direccion_social || '',
      telefono: data.telefono || '',
      email: data.email || '',
      fecha_registro: new Date().toISOString(),
      activo: 1
    };
    this.empresas.push(nuevaEmpresa);
    
    return this.handleRequest(
      nuevaEmpresa,
      () => api.post('/empresas', data),
      'Error creando empresa'
    );
  }

  async updateEmpresa(id: number, data: Partial<Empresa>): Promise<Empresa> {
    const index = this.empresas.findIndex(e => e.id === id);
    if (index !== -1) {
      this.empresas[index] = { ...this.empresas[index], ...data };
    }
    
    return this.handleRequest(
      this.empresas[index] || { id, ...data } as Empresa,
      () => api.put(`/empresas/${id}`, data),
      `Error actualizando empresa ${id}`
    );
  }

  async deleteEmpresa(id: number, fisico: boolean = false): Promise<void> {
    if (fisico) {
      this.empresas = this.empresas.filter(e => e.id !== id);
    } else {
      const index = this.empresas.findIndex(e => e.id === id);
      if (index !== -1) {
        this.empresas[index].activo = 0;
      }
    }
    
    return this.handleRequest(
      undefined,
      () => api.delete(`/empresas/${id}`, { params: { fisico } }),
      `Error eliminando empresa ${id}`
    );
  }

  // ============ PLANTAS ============
  async getPlantas(empresa_id?: number): Promise<Planta[]> {
    let filtradas = [...this.plantas];
    if (empresa_id) {
      filtradas = filtradas.filter(p => p.id_empresa === empresa_id);
    }
    return this.handleRequest(
      filtradas,
      () => api.get('/plantas', { params: { empresa_id } }),
      'Error cargando plantas'
    );
  }

  async getPlanta(id: number): Promise<Planta | null> {
    return this.handleRequest(
      this.plantas.find(p => p.id === id) || null,
      () => api.get(`/plantas/${id}`),
      `Error cargando planta ${id}`
    );
  }

  async createPlanta(data: Partial<Planta>): Promise<Planta> {
    const nuevaPlanta: Planta = {
      id: this.nextPlantaId++,
      id_empresa: data.id_empresa || 0,
      nombre: data.nombre || '',
      direccion: data.direccion || '',
      actividad: data.actividad || '',
      fecha_alta: new Date().toISOString(),
      activo: 1
    };
    this.plantas.push(nuevaPlanta);
    
    return this.handleRequest(
      nuevaPlanta,
      () => api.post('/plantas', data),
      'Error creando planta'
    );
  }

  async updatePlanta(id: number, data: Partial<Planta>): Promise<Planta> {
    const index = this.plantas.findIndex(p => p.id === id);
    if (index !== -1) {
      this.plantas[index] = { ...this.plantas[index], ...data };
    }
    
    return this.handleRequest(
      this.plantas[index] || { id, ...data } as Planta,
      () => api.put(`/plantas/${id}`, data),
      `Error actualizando planta ${id}`
    );
  }

  async patchEmpresa(id: number, data: Partial<Empresa>): Promise<Empresa> {
    try {
      const response = await api.patch(`/empresas/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error actualizando empresa ${id}:`, error);
      throw error;
    }
  }

  async deletePlanta(id: number): Promise<void> {
    const index = this.plantas.findIndex(p => p.id === id);
    if (index !== -1) {
      this.plantas[index].activo = 0;
    }
    
    return this.handleRequest(
      undefined,
      () => api.delete(`/plantas/${id}`),
      `Error eliminando planta ${id}`
    );
  }

  async getPlantasPorEmpresa(empresa_id: number): Promise<Planta[]> {
    return this.getPlantas(empresa_id);
  }
}

export const empresaService = new EmpresaService({ useMock: false });