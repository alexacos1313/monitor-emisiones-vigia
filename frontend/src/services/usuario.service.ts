import { BaseService } from './base.service';
import api from './api';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  id_empresa?: number;
  telefono?: string;
  activo: number;
  fecha_creacion: string;
  password?: string;
}

// Datos mock para desarrollo
const mockUsuarios: Usuario[] = [
  {
    id: 1,
    nombre: 'Admin Principal',
    email: 'admin@demo.com',
    rol: 'SUPER_ADMIN',
    telefono: '+34 600 000 001',
    activo: 1,
    fecha_creacion: new Date().toISOString(),
  },
  {
    id: 2,
    nombre: 'Empresa Admin',
    email: 'empresa@demo.com',
    rol: 'EMPRESA_ADMIN',
    id_empresa: 1,
    telefono: '+34 600 000 002',
    activo: 1,
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 3,
    nombre: 'Técnico López',
    email: 'tecnico@demo.com',
    rol: 'TECNICO',
    id_empresa: 1,
    telefono: '+34 600 000 003',
    activo: 1,
    fecha_creacion: new Date().toISOString()
  },
  {
    id: 4,
    nombre: 'Consultor García',
    email: 'consultor@demo.com',
    rol: 'CONSULTOR',
    id_empresa: 1,
    telefono: '+34 600 000 004',
    activo: 0,
    fecha_creacion: new Date().toISOString()
  },
];

class UsuarioService extends BaseService {
  private usuarios = [...mockUsuarios];
  private nextId = 5;

  async getUsuarios(): Promise<Usuario[]> {
    return this.handleRequest(
      this.usuarios,
      () => api.get('/usuarios'),
      'Error cargando usuarios'
    );
  }

  async getUsuario(id: number): Promise<Usuario | null> {
    return this.handleRequest(
      this.usuarios.find(u => u.id === id) || null,
      () => api.get(`/usuarios/${id}`),
      `Error cargando usuario ${id}`
    );
  }

  async createUsuario(data: { 
    nombre: string; 
    email: string; 
    rol: string; 
    password?: string; 
    telefono?: string 
  }): Promise<Usuario> {
    const newUsuario: Usuario = {
      id: this.nextId++,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      telefono: data.telefono || '',
      activo: 1,
      fecha_creacion: new Date().toISOString()
    };
    this.usuarios.push(newUsuario);
    
    return this.handleRequest(
      newUsuario,
      () => api.post('/usuarios', { ...data, password: data.password }),
      'Error creando usuario'
    );
  }

  async updateUsuario(id: number, data: Partial<Usuario>): Promise<Usuario> {
    const index = this.usuarios.findIndex(u => u.id === id);
    if (index !== -1) {
      this.usuarios[index] = { ...this.usuarios[index], ...data };
    }

    return this.handleRequest(
      this.usuarios[index] || { id, ...data } as Usuario,
      () => api.put(`/usuarios/${id}`, data),
      `Error actualizando usuario ${id}`
    );
  }

  async deleteUsuario(id: number): Promise<void> {
    const index = this.usuarios.findIndex(u => u.id === id);
    if (index !== -1) {
      this.usuarios.splice(index, 1);
    }

    return this.handleRequest(
      undefined,
      () => api.delete(`/usuarios/${id}`),
      `Error eliminando usuario ${id}`
    );
  }

  async toggleActivo(id: number, activo: boolean): Promise<Usuario> {
    return this.updateUsuario(id, { activo: activo ? 1 : 0 });
  }
}

export const usuarioService = new UsuarioService();