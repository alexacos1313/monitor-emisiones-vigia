// frontend/src/services/mantenimiento.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Mantenimiento {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  fecha: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO' | 'CALIBRACION';
  tecnico: string;
  observaciones: string;
  completado: boolean;
}

export interface MantenimientoProgramado {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  fecha_programada: string;
  tipo: string;
  descripcion: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO';
}

// Datos de ejemplo SOLO para cuando el servidor no responde (error de red)
const mockMantenimientos: Mantenimiento[] = [
  { id: 1, id_sensor: 1, sensor_nombre: 'Sensor Principal CO₂', fecha: '2024-01-15', tipo: 'CALIBRACION', tecnico: 'Juan Pérez', observaciones: 'Calibración anual', completado: true },
  { id: 2, id_sensor: 2, sensor_nombre: 'Sensor Partículas', fecha: '2024-02-20', tipo: 'PREVENTIVO', tecnico: 'María López', observaciones: 'Limpieza de lentes', completado: true },
  { id: 3, id_sensor: 1, sensor_nombre: 'Sensor Principal CO₂', fecha: '2024-06-15', tipo: 'PREVENTIVO', tecnico: 'Carlos Ruiz', observaciones: 'Revisión general', completado: false },
];

const mockMantenimientosProgramados: MantenimientoProgramado[] = [
  { id: 1, id_sensor: 1, sensor_nombre: 'Sensor Principal CO₂', fecha_programada: '2024-07-15', tipo: 'PREVENTIVO', descripcion: 'Limpieza y calibración', prioridad: 'ALTA', estado: 'PENDIENTE' },
  { id: 2, id_sensor: 2, sensor_nombre: 'Sensor Partículas', fecha_programada: '2024-08-01', tipo: 'CALIBRACION', descripcion: 'Calibración semestral', prioridad: 'MEDIA', estado: 'PENDIENTE' },
  { id: 3, id_sensor: 3, sensor_nombre: 'Sensor NOx', fecha_programada: '2024-05-10', tipo: 'CORRECTIVO', descripcion: 'Revisión por fallo detectado', prioridad: 'ALTA', estado: 'EN_PROGRESO' },
];

class MantenimientoService extends BaseService {
  constructor() {
    super({ useMock: false });
    console.log('Servicio de mantenimiento inicializado');
  }

  // Obtener el historial completo de mantenimientos
  async getMantenimientos(sensor_id?: number): Promise<Mantenimiento[]> {
    console.log('Obteniendo historial de mantenimientos');
    
    try {
      const params: any = {};
      if (sensor_id) {
        params.sensor_id = sensor_id;
      }
      
      const response = await api.get('/mantenimiento/', { params });
      console.log('Respuesta del servidor (historial):', response.data);
      
      // Si la respuesta es un array (incluso vacío), usar esos datos
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) {
          console.log('No hay mantenimientos en la base de datos');
          return [];
        }
        
        // Convertir los datos al formato que espera el frontend
        return response.data.map((item: any) => ({
          id: item.id,
          id_sensor: item.id_sensor,
          sensor_nombre: item.sensor_nombre || 'Sensor sin nombre',
          fecha: item.fecha,
          tipo: item.tipo || 'PREVENTIVO',
          tecnico: item.tecnico || 'No asignado',
          observaciones: item.observaciones || '',
          completado: item.completado === true || item.completado === 1
        }));
      }
      
      // Si la respuesta no es un array, devolver array vacío
      console.warn('La respuesta no es un array:', response.data);
      return [];
    } catch (error) {
      console.error('Error al obtener mantenimientos:', error);
      // Solo usar mock si hay un error de red (no si es 404 o similar)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        console.warn('Error de red, usando datos de ejemplo');
        return this.getMockMantenimientos(sensor_id);
      }
      return [];
    }
  }

  // Obtener los mantenimientos programados (no completados)
  async getMantenimientosProgramados(): Promise<MantenimientoProgramado[]> {
    console.log('Obteniendo mantenimientos programados');
    
    try {
      const response = await api.get('/mantenimiento/programados');
      console.log('Respuesta del servidor (programados):', response.data);
      
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) {
          console.log('No hay mantenimientos programados');
          return [];
        }
        
        return response.data.map((item: any) => ({
          id: item.id,
          id_sensor: item.id_sensor,
          sensor_nombre: item.sensor_nombre || 'Sensor sin nombre',
          fecha_programada: item.fecha_programada || item.fecha,
          tipo: item.tipo || 'PREVENTIVO',
          descripcion: item.descripcion || item.observaciones || '',
          prioridad: item.prioridad || 'MEDIA',
          estado: item.estado || 'PENDIENTE'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener mantenimientos programados:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        console.warn('Error de red, usando datos de ejemplo');
        return this.getMockProgramados();
      }
      return [];
    }
  }

  // Obtener los mantenimientos que ya vencieron
  async getMantenimientosVencidos(): Promise<MantenimientoProgramado[]> {
    console.log('Obteniendo mantenimientos vencidos');
    
    try {
      const response = await api.get('/mantenimiento/vencidos');
      console.log('Respuesta del servidor (vencidos):', response.data);
      
      if (Array.isArray(response.data)) {
        if (response.data.length === 0) {
          console.log('No hay mantenimientos vencidos');
          return [];
        }
        
        return response.data.map((item: any) => ({
          id: item.id,
          id_sensor: item.id_sensor,
          sensor_nombre: item.sensor_nombre || 'Sensor sin nombre',
          fecha_programada: item.fecha_programada || item.fecha,
          tipo: item.tipo || 'PREVENTIVO',
          descripcion: item.descripcion || item.observaciones || '',
          prioridad: item.prioridad || 'MEDIA',
          estado: item.estado || 'PENDIENTE'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener mantenimientos vencidos:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        console.warn('Error de red, usando datos de ejemplo');
        const hoy = new Date().toISOString().split('T')[0];
        return this.mockMantenimientosProgramados.filter(
          p => p.estado === 'PENDIENTE' && p.fecha_programada < hoy
        );
      }
      return [];
    }
  }

  // Crear un nuevo mantenimiento programado
  async crearMantenimientoProgramado(data: {
    id_sensor: number;
    fecha_programada: string;
    tipo: string;
    descripcion: string;
    prioridad: string;
  }): Promise<MantenimientoProgramado> {
    console.log('Creando nuevo mantenimiento programado:', data);
    
    try {
      const response = await api.post('/mantenimiento/', data);
      console.log('Mantenimiento creado:', response.data);
      
      return {
        id: response.data.id,
        id_sensor: response.data.id_sensor || data.id_sensor,
        sensor_nombre: response.data.sensor_nombre || 'Sensor',
        fecha_programada: response.data.fecha_programada || data.fecha_programada,
        tipo: response.data.tipo || data.tipo,
        descripcion: response.data.descripcion || data.descripcion,
        prioridad: response.data.prioridad || data.prioridad || 'MEDIA',
        estado: response.data.estado || 'PENDIENTE'
      };
    } catch (error) {
      console.error('Error al crear mantenimiento:', error);
      throw error;
    }
  }

  // Marcar un mantenimiento como completado
  async completarMantenimientoProgramado(id: number): Promise<void> {
    console.log(`Completando mantenimiento ${id}`);
    
    try {
      await api.put(`/mantenimiento/${id}/completar`);
      console.log('Mantenimiento completado con éxito');
    } catch (error) {
      console.error('Error al completar mantenimiento:', error);
      throw error;
    }
  }

  // Cancelar un mantenimiento programado
  async cancelarMantenimiento(id: number): Promise<void> {
    console.log(`Cancelando mantenimiento ${id}`);
    
    try {
      await api.put(`/mantenimiento/${id}/cancelar`);
      console.log('Mantenimiento cancelado con éxito');
    } catch (error) {
      console.error('Error al cancelar mantenimiento:', error);
      throw error;
    }
  }

  // Eliminar un mantenimiento programado
  async eliminarMantenimientoProgramado(id: number): Promise<void> {
    console.log(`Eliminando mantenimiento programado ${id}`);
    
    try {
      await api.delete(`/mantenimiento/${id}`);
      console.log('Mantenimiento eliminado con éxito');
    } catch (error) {
      console.error('Error al eliminar mantenimiento:', error);
      throw error;
    }
  }

  // Actualizar un mantenimiento programado
  async actualizarMantenimientoProgramado(id: number, data: Partial<MantenimientoProgramado>): Promise<MantenimientoProgramado> {
    console.log(`Actualizando mantenimiento ${id}`, data);
    
    try {
      const response = await api.put(`/mantenimiento/${id}`, data);
      console.log('Mantenimiento actualizado:', response.data);
      
      return {
        id: response.data.id || id,
        id_sensor: response.data.id_sensor || data.id_sensor || 0,
        sensor_nombre: response.data.sensor_nombre || 'Sensor',
        fecha_programada: response.data.fecha_programada || data.fecha_programada || '',
        tipo: response.data.tipo || data.tipo || 'PREVENTIVO',
        descripcion: response.data.descripcion || data.descripcion || '',
        prioridad: response.data.prioridad || data.prioridad || 'MEDIA',
        estado: response.data.estado || data.estado || 'PENDIENTE'
      };
    } catch (error) {
      console.error('Error al actualizar mantenimiento:', error);
      throw error;
    }
  }

  // Completar un mantenimiento del historial
  async completarMantenimiento(id: number): Promise<void> {
    console.log(`Completando mantenimiento del historial ${id}`);
    
    try {
      await api.put(`/mantenimiento/${id}/completar`);
      console.log('Mantenimiento completado con éxito');
    } catch (error) {
      console.error('Error al completar mantenimiento:', error);
      throw error;
    }
  }

  // Datos de ejemplo solo para errores de red
  private getMockMantenimientos(sensor_id?: number): Mantenimiento[] {
    let filtrados = [...mockMantenimientos];
    if (sensor_id) {
      filtrados = filtrados.filter(m => m.id_sensor === sensor_id);
    }
    return filtrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  private getMockProgramados(): MantenimientoProgramado[] {
    return mockMantenimientosProgramados.filter(p => p.estado !== 'COMPLETADO' && p.estado !== 'CANCELADO');
  }

  // Datos mock como propiedad de la clase (solo para errores)
  private mockMantenimientosProgramados = mockMantenimientosProgramados;
}

export const mantenimientoService = new MantenimientoService();