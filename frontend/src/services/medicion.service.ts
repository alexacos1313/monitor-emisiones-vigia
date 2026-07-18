// frontend/src/services/medicion.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface Medicion {
  id: number;
  id_sensor: number;
  sensor_nombre?: string;
  timestamp: string;
  contaminantes: {
    [key: string]: number | null;
  };
  temperatura: number | null;
  flujo: number | null;
  oxigeno: number | null;
  estado: string;
}

export interface FiltrosMedicion {
  sensor_id?: number;
  contaminante?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  min_valor?: number;
  max_valor?: number;
}

// ============================================================
// DATOS MOCK - Simulan mediciones de diferentes sensores
// ============================================================
const mockMediciones: Medicion[] = [];

const contaminantesPorSensor: { [key: number]: string[] } = {
  1: ['CO', 'NO', 'NO2', 'NOX'],
  2: ['NO'],
  3: ['CO', 'NO', 'NO2', 'NOX'],
  4: ['CO', 'NO', 'NO2', 'NOX'],
  5: ['CO', 'NO', 'NO2', 'NOX'],
};

const sensoresInfo = [
  { id: 1, nombre: 'Sensor Principal CO', planta: 'Planta Madrid' },
  { id: 2, nombre: 'Sensor NO', planta: 'Planta Madrid' },
  { id: 3, nombre: 'Sensor NO₂', planta: 'Planta Barcelona' },
  { id: 4, nombre: 'Sensor NOx', planta: 'Planta Barcelona' },
  { id: 5, nombre: 'Sensor Multigas', planta: 'Planta Valencia' },
];

// Generar mediciones para los últimos 30 días - 10 mediciones por día
for (let i = 0; i < 300; i++) {
  const fecha = new Date();
  // Distribuir en los últimos 30 días
  const diasAtras = Math.floor(Math.random() * 30);
  const horas = Math.floor(Math.random() * 24);
  const minutos = Math.floor(Math.random() * 60);
  
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(horas, minutos, 0, 0);
  
  const sensorIndex = Math.floor(Math.random() * sensoresInfo.length);
  const sensor = sensoresInfo[sensorIndex];
  const contaminantesDelSensor = contaminantesPorSensor[sensor.id] || ['CO', 'NO', 'NO2', 'NOX'];
  
  const contaminantes: { [key: string]: number | null } = {};
  contaminantesDelSensor.forEach(nombre => {
    const nombreLower = nombre.toLowerCase();
    let valor = 0;
    
    // Generar valores más realistas y variados
    switch(nombreLower) {
      case 'co': 
        valor = Math.random() * 10 + 1; // 1-11 mg/m³
        break;
      case 'no': 
        valor = Math.random() * 6 + 0.5; // 0.5-6.5 mg/m³
        break;
      case 'no2': 
        valor = Math.random() * 8 + 0.5; // 0.5-8.5 mg/m³
        break;
      case 'nox': 
        valor = Math.random() * 100 + 20; // 20-120 mg/m³
        break;
      default: 
        valor = Math.random() * 10 + 1;
    }
    contaminantes[nombreLower] = parseFloat(valor.toFixed(2));
  });
  
  mockMediciones.push({
    id: i + 1,
    id_sensor: sensor.id,
    sensor_nombre: sensor.nombre,
    timestamp: fecha.toISOString(),
    contaminantes,
    temperatura: parseFloat((Math.random() * 20 + 15).toFixed(1)), // 15-35°C
    flujo: parseFloat((Math.random() * 100 + 50).toFixed(1)), // 50-150 m³/h
    oxigeno: parseFloat((Math.random() * 8 + 12).toFixed(1)), // 12-20%
    estado: Math.random() > 0.1 ? 'VALIDADO' : 'PENDIENTE'
  });
}

// ============================================================
// SERVICIO
// ============================================================
class MedicionService extends BaseService {

  constructor() {
      super({ useMock: false });
    }
  private mediciones = [...mockMediciones];

  async getMediciones(filtros?: FiltrosMedicion): Promise<Medicion[]> {
    let filtradas = [...this.mediciones];
    
    if (filtros?.sensor_id) {
      filtradas = filtradas.filter(m => m.id_sensor === filtros.sensor_id);
    }
    
    if (filtros?.fecha_inicio) {
      filtradas = filtradas.filter(m => m.timestamp >= filtros.fecha_inicio!);
    }
    
    if (filtros?.fecha_fin) {
      filtradas = filtradas.filter(m => m.timestamp <= filtros.fecha_fin!);
    }
    
    if (filtros?.contaminante) {
      const contaminante = filtros.contaminante.toLowerCase();
      if (filtros.min_valor !== undefined) {
        filtradas = filtradas.filter(m => {
          const valor = m.contaminantes[contaminante];
          return valor !== null && valor !== undefined && valor >= filtros.min_valor!;
        });
      }
      if (filtros.max_valor !== undefined) {
        filtradas = filtradas.filter(m => {
          const valor = m.contaminantes[contaminante];
          return valor !== null && valor !== undefined && valor <= filtros.max_valor!;
        });
      }
    }
    
    filtradas.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return this.handleRequest(
      filtradas,
      () => api.get('/mediciones/', { params: filtros }),
      'Error cargando mediciones'
    );
  }

  async getMedicionesPorSensor(sensor_id: number): Promise<Medicion[]> {
    return this.handleRequest(
      this.mediciones.filter(m => m.id_sensor === sensor_id),
      () => api.get(`/mediciones?sensor_id=${sensor_id}`),
      'Error cargando mediciones del sensor'
    );
  }

  async getContaminantesBySensor(sensorId: number): Promise<string[]> {
    const mediciones = this.mediciones.filter(m => m.id_sensor === sensorId);
    if (mediciones.length === 0) return [];
    
    const keys = new Set<string>();
    mediciones.forEach(m => {
      Object.keys(m.contaminantes).forEach(key => keys.add(key));
    });
    
    return Array.from(keys).sort();
  }

  async getAllContaminantesUnicos(): Promise<string[]> {
    const keys = new Set<string>();
    this.mediciones.forEach(m => {
      Object.keys(m.contaminantes).forEach(key => keys.add(key));
    });
    return Array.from(keys).sort();
  }

  async getEstadisticas(fecha_inicio?: string, fecha_fin?: string): Promise<any> {
    let filtradas = [...this.mediciones];
    
    if (fecha_inicio) {
      filtradas = filtradas.filter(m => m.timestamp >= fecha_inicio);
    }
    if (fecha_fin) {
      filtradas = filtradas.filter(m => m.timestamp <= fecha_fin);
    }
    
    if (filtradas.length === 0) {
      return {
        total: 0,
        contaminantes: {},
        temperatura_promedio: 0,
        flujo_promedio: 0
      };
    }
    
    const stats: any = {
      total: filtradas.length,
      contaminantes: {},
      temperatura_promedio: parseFloat((filtradas.reduce((sum, m) => sum + (m.temperatura || 0), 0) / filtradas.length).toFixed(1)),
      flujo_promedio: parseFloat((filtradas.reduce((sum, m) => sum + (m.flujo || 0), 0) / filtradas.length).toFixed(1))
    };
    
    const todosLosContaminantes = await this.getAllContaminantesUnicos();
    todosLosContaminantes.forEach(cont => {
      const valores = filtradas
        .map(m => m.contaminantes[cont])
        .filter(v => v !== null && v !== undefined) as number[];
      
      if (valores.length > 0) {
        stats.contaminantes[cont] = {
          promedio: parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2)),
          maximo: parseFloat(Math.max(...valores).toFixed(2)),
          minimo: parseFloat(Math.min(...valores).toFixed(2)),
          mediciones: valores.length
        };
      }
    });
    
    return this.handleRequest(
      stats,
      () => api.get('/mediciones/estadisticas', { params: { fecha_inicio, fecha_fin } }),
      'Error cargando estadísticas'
    );
  }
}

export const medicionService = new MedicionService();