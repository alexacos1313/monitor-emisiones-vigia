// frontend/src/services/auth.service.ts
import api from './api';
import { BaseService } from './base.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario_id: number;
  nombre: string;
  rol: string;
  id_empresa: number | null;
}

class AuthService extends BaseService {
  constructor() {
    super({ useMock: false });
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Error en login:', error);
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();