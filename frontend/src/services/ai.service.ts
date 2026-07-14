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

// Datos mock para respuestas de IA
const mockRespuestas: Record<string, string> = {
  'alarmas': 'Hay 3 alarmas pendientes y 25 alarmas totales este mes.',
  'promedio': 'El promedio de CO₂ es 385.6 mg/m³, dentro de los límites normales.',
  'sensores': 'Hay 12 sensores activos, 1 en mantenimiento y 2 fuera de servicio.',
  'críticas': 'Hay 2 alarmas críticas pendientes de atención.',
};

class AIService extends BaseService {
  constructor() {
      super({ useMock: false });
    }

  async preguntar(pregunta: string): Promise<AIResponse> {
    const preguntaLower = pregunta.toLowerCase();
    
    // Respuestas mock inteligentes
    let respuesta = '';
    if (preguntaLower.includes('alarma')) {
      respuesta = mockRespuestas['alarmas'];
    } else if (preguntaLower.includes('promedio') || preguntaLower.includes('co2')) {
      respuesta = mockRespuestas['promedio'];
    } else if (preguntaLower.includes('sensor')) {
      respuesta = mockRespuestas['sensores'];
    } else if (preguntaLower.includes('crític') || preguntaLower.includes('critic')) {
      respuesta = mockRespuestas['críticas'];
    } else {
      respuesta = `He entendido tu pregunta sobre: "${pregunta}". Puedo ayudarte con información sobre alarmas, sensores, mediciones y tendencias. ¿Qué más necesitas saber?`;
    }

    return this.handleRequest(
      { pregunta, respuesta, sql_generada: undefined },
      () => api.post('/ai/consultar', { pregunta }),
      'Error consultando IA'
    );
  }
}

export const aiService = new AIService();