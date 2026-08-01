// frontend/src/services/reporte.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface FiltrosReporte {
  empresa_id?: number;
  fecha_inicio: string;
  fecha_fin: string;
}

class ReporteService extends BaseService {
  constructor() {
    super({ useMock: false });
    console.log(' Servicio de reportes inicializado');
  }

  async descargarReportePDF(filtros: FiltrosReporte): Promise<Blob> {
    // Validar filtros
    if (!filtros.fecha_inicio || !filtros.fecha_fin) {
      throw new Error('Las fechas de inicio y fin son obligatorias');
    }

    // Construir parámetros
    const params = new URLSearchParams();
    if (filtros.empresa_id) {
      params.append('empresa_id', filtros.empresa_id.toString());
    }
    params.append('fecha_inicio', filtros.fecha_inicio);
    params.append('fecha_fin', filtros.fecha_fin);
    
    try {
      console.log(' Descargando reporte PDF con parámetros:', params.toString());
      
      const response = await api.get(`/reportes/emisiones?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Verificar que la respuesta es un PDF
      const contentType = response.headers['content-type'];
      if (!contentType?.includes('pdf') && !contentType?.includes('application/pdf')) {
        // Si no es PDF, podría ser un error en formato JSON
        const text = await response.data.text();
        try {
          const errorJson = JSON.parse(text);
          throw new Error(errorJson.detail || 'Error al generar el reporte');
        } catch {
          throw new Error('Error al generar el reporte');
        }
      }
      
      return response.data;
    } catch (error: any) {
      console.error(' Error descargando reporte:', error);
      
      // Si el error tiene una respuesta del backend, intentar extraer el mensaje
      if (error.response?.data) {
        try {
          const errorData = await error.response.data.text();
          const errorJson = JSON.parse(errorData);
          throw new Error(errorJson.detail || 'Error al generar el reporte');
        } catch {
          throw new Error('Error al generar el reporte');
        }
      }
      
      throw error;
    }
  }

  async obtenerDatosReporte(filtros: FiltrosReporte): Promise<any> {
    const params = new URLSearchParams();
    if (filtros.empresa_id) {
      params.append('empresa_id', filtros.empresa_id.toString());
    }
    params.append('fecha_inicio', filtros.fecha_inicio);
    params.append('fecha_fin', filtros.fecha_fin);
    
    try {
      const response = await api.get(`/reportes/emisiones/datos?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error(' Error obteniendo datos del reporte:', error);
      throw error;
    }
  }
}

export const reporteService = new ReporteService();