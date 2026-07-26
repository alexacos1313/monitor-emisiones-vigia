// frontend/src/services/ia.service.ts
import { BaseService } from './base.service';
import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  pregunta: string;
  respuesta: string;
  sql_generada?: string;
}

// Mapeo de contaminantes para normalizar
const MAPEO_CONTAMINANTES: Record<string, string> = {
  'co2': 'CO2',
  'co₂': 'CO2',
  'nox': 'NOX',
  'noₓ': 'NOX',
  'no2': 'NO2',
  'no₂': 'NO2',
  'so2': 'SO2',
  'so₂': 'SO2',
  'co': 'CO',
  'no': 'NO'
};

class AIService extends BaseService {
  constructor() {
    super({ useMock: false });
    console.log(' Servicio de IA inicializado');
  }

  /**
   * Normaliza el nombre del contaminante en la pregunta
   */
  private normalizarContaminante(pregunta: string): string {
    let normalizada = pregunta;
    for (const [key, value] of Object.entries(MAPEO_CONTAMINANTES)) {
      if (normalizada.toLowerCase().includes(key)) {
        normalizada = normalizada.replace(new RegExp(key, 'gi'), value);
      }
    }
    // Reemplazar subíndices si quedan
    normalizada = normalizada.replace(/₂/g, '2');
    normalizada = normalizada.replace(/ₓ/g, 'X');
    return normalizada;
  }

  /**
   * Extrae el contaminante de la pregunta
   */
  private extraerContaminante(pregunta: string): string | null {
    const preguntaLower = pregunta.toLowerCase();
    for (const [key, value] of Object.entries(MAPEO_CONTAMINANTES)) {
      if (preguntaLower.includes(key)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Determina el período de la pregunta
   */
  private extraerPeriodo(pregunta: string): string {
    const preguntaLower = pregunta.toLowerCase();
    if (preguntaLower.includes('mes') || preguntaLower.includes('30')) {
      return '30 days';
    } else if (preguntaLower.includes('semana') || preguntaLower.includes('7')) {
      return '7 days';
    } else if (preguntaLower.includes('día') || preguntaLower.includes('hoy') || preguntaLower.includes('1')) {
      return '1 day';
    } else if (preguntaLower.includes('año') || preguntaLower.includes('365')) {
      return '365 days';
    }
    return '7 days'; // Por defecto
  }

  async preguntar(pregunta: string): Promise<AIResponse> {
    // Normalizar la pregunta (reemplazar CO₂ por CO2, etc.)
    const preguntaNormalizada = this.normalizarContaminante(pregunta);
    
    console.log(' Pregunta original:', pregunta);
    console.log(' Pregunta normalizada:', preguntaNormalizada);

    try {
      const response = await api.post('/ai/consultar', { pregunta: preguntaNormalizada });
      console.log(' Respuesta de la IA:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(' Error consultando IA:', error);
      
      // Si es error 503 (IA no disponible) o 500 (error interno)
      if (error.response?.status === 503 || error.response?.status === 500) {
        return this.getFallbackInteligente(preguntaNormalizada);
      }
      
      // Si es error de conexión
      if (error.code === 'ERR_NETWORK') {
        return {
          pregunta: preguntaNormalizada,
          respuesta: 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:8000'
        };
      }
      
      // Si es error de autenticación
      if (error.response?.status === 401) {
        return {
          pregunta: preguntaNormalizada,
          respuesta: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        };
      }
      
      // Fallback inteligente
      return this.getFallbackInteligente(preguntaNormalizada);
    }
  }

  /**
   * Fallback inteligente cuando la IA no está disponible
   */
  private getFallbackInteligente(pregunta: string): AIResponse {
    const preguntaLower = pregunta.toLowerCase();
    let respuesta = '';
    let sqlGenerada: string | undefined;

    // 1. Preguntas sobre alarmas
    if (preguntaLower.includes('alarma')) {
      if (preguntaLower.includes('cuántas') || preguntaLower.includes('cuantas')) {
        respuesta = ' Para consultar el número de alarmas, ve a la sección de Alarmas en el menú lateral. Allí puedes ver el total y filtrar por tipo (ALERTA/CRITICO) y estado (PENDIENTE/CONFIRMADA).';
        sqlGenerada = 'SELECT COUNT(*) FROM alarmas WHERE confirmada_por IS NULL;';
      } else if (preguntaLower.includes('crítica') || preguntaLower.includes('critica')) {
        respuesta = ' Las alarmas críticas requieren atención inmediata. Puedes verlas en la sección de Alarmas filtrando por tipo "CRITICO".';
        sqlGenerada = 'SELECT * FROM alarmas WHERE tipo = "CRITICO" AND confirmada_por IS NULL;';
      } else {
        respuesta = ' Puedes gestionar todas las alarmas en la sección de Alarmas del menú lateral. Allí puedes ver, confirmar y eliminar alarmas.';
      }
    }
    // 2. Preguntas sobre promedios
    else if (preguntaLower.includes('promedio') || preguntaLower.includes('media')) {
      const contaminante = this.extraerContaminante(pregunta);
      const periodo = this.extraerPeriodo(pregunta);
      
      if (contaminante) {
        const periodoTexto = this.periodoATexto(periodo);
        respuesta = ` Para calcular el promedio de ${contaminante} en los últimos ${periodoTexto}, ve al Dashboard y selecciona el sensor y el contaminante ${contaminante}. Los datos se actualizan en tiempo real.`;
        sqlGenerada = `SELECT AVG(valor) FROM mediciones_contaminantes WHERE contaminante = '${contaminante}' AND id_medicion IN (SELECT id FROM mediciones WHERE timestamp >= datetime('now', '-${periodo}'));`;
      } else {
        respuesta = ' Puedes ver los promedios de emisiones en el Dashboard, seleccionando un sensor y contaminante específico. Los contaminantes disponibles son: CO2, CO, NO, NO2, NOX, SO2.';
      }
    }
    // 3. Preguntas sobre sensores
    else if (preguntaLower.includes('sensor')) {
      if (preguntaLower.includes('activo')) {
        respuesta = ' Los sensores activos están monitorizando emisiones en tiempo real. Puedes ver todos los sensores y su estado en la sección de Sensores del menú lateral.';
        sqlGenerada = 'SELECT * FROM sensores WHERE estado = "ACTIVO";';
      } else if (preguntaLower.includes('mantenimiento')) {
        respuesta = ' Los sensores en mantenimiento están siendo reparados o calibrados. Puedes programar mantenimientos en la sección de Mantenimiento.';
        sqlGenerada = 'SELECT * FROM sensores WHERE estado = "MANTENIMIENTO";';
      } else {
        respuesta = ' Puedes gestionar todos los sensores en la sección de Sensores del menú lateral. Allí puedes ver su estado, configuración y últimas mediciones.';
      }
    }
    // 4. Preguntas sobre empresas
    else if (preguntaLower.includes('empresa')) {
      if (preguntaLower.includes('cuántas') || preguntaLower.includes('cuantas')) {
        respuesta = ' Como administrador, puedes ver la lista completa de empresas en la sección de Empresas del menú lateral.';
        sqlGenerada = 'SELECT COUNT(*) FROM empresas;';
      } else {
        respuesta = ' La información de tu empresa está disponible en la sección "Mi Empresa" del menú lateral.';
      }
    }
    // 5. Preguntas sobre mediciones
    else if (preguntaLower.includes('medición') || preguntaLower.includes('mediciones')) {
      if (preguntaLower.includes('hoy')) {
        respuesta = ' Las mediciones de hoy están disponibles en el Dashboard. Selecciona un sensor y contaminante para ver los datos en tiempo real.';
        sqlGenerada = 'SELECT * FROM mediciones WHERE DATE(timestamp) = DATE("now") LIMIT 10;';
      } else if (preguntaLower.includes('última') || preguntaLower.includes('ultima')) {
        respuesta = ' Las últimas mediciones están disponibles en el Dashboard y en la sección de Mediciones del menú lateral.';
        sqlGenerada = 'SELECT * FROM mediciones ORDER BY timestamp DESC LIMIT 10;';
      } else {
        respuesta = ' Puedes ver todas las mediciones históricas en la sección de Mediciones del menú lateral. Allí puedes filtrar por sensor, fecha y contaminante.';
      }
    }
    // 6. Preguntas sobre mantenimiento
    else if (preguntaLower.includes('mantenimiento')) {
      respuesta = ' Puedes gestionar el mantenimiento de sensores en la sección de Mantenimiento del menú lateral. Allí puedes programar, completar y cancelar mantenimientos.';
    }
    // 7. Preguntas sobre umbrales
    else if (preguntaLower.includes('umbral') || preguntaLower.includes('limite') || preguntaLower.includes('límite')) {
      respuesta = ' Los umbrales normativos definen los límites de alerta y crítico para cada contaminante. Puedes configurarlos en la sección de Umbrales Normativos.';
    }
    // 8. Preguntas generales
    else {
      respuesta = ' No he podido procesar tu pregunta. Puedo ayudarte con consultas sobre:\n' +
                  '  -  Alarmas (¿Cuántas alarmas hay pendientes?)\n' +
                  '  -  Promedios (Promedio de CO de la última semana)\n' +
                  '  -  Sensores (¿Qué sensores están activos?)\n' +
                  '  -  Empresas (¿Cuántas empresas hay?)\n' +
                  '  -  Mediciones (Mediciones de hoy)\n' +
                  '  -  Mantenimiento (Sensores en mantenimiento)\n' +
                  '  -  Umbrales (Límites de emisiones)';
    }

    return {
      pregunta,
      respuesta,
      sql_generada: sqlGenerada
    };
  }

  /**
 * Obtiene los contaminantes disponibles
 */
async getContaminantesDisponibles(): Promise<string[]> {
    try {
        const response = await api.get('/ai/contaminantes');
        return response.data.contaminantes || ['CO', 'NO', 'NO2', 'NOX'];
    } catch (error) {
        console.error('Error obteniendo contaminantes:', error);
        return ['CO', 'NO', 'NO2', 'NOX'];
    }
}

  /**
   * Convierte el período en texto amigable
   */
  private periodoATexto(periodo: string): string {
    switch (periodo) {
      case '1 day': return '1 día';
      case '7 days': return '7 días (1 semana)';
      case '30 days': return '30 días (1 mes)';
      case '365 days': return '365 días (1 año)';
      default: return periodo;
    }
  }

  /**
   * Verifica el estado de la IA
   */
  async checkStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await api.get('/ai/status');
      return response.data;
    } catch (error) {
      console.error('Error verificando estado de IA:', error);
      return {
        available: false,
        message: 'IA no disponible. Verifica la conexión con el backend.'
      };
    }
  }
}

export const aiService = new AIService();