// frontend/src/services/websocket.service.ts
import { alarmaService, Alarma } from './alarma.service';
import toast from 'react-hot-toast';

type WebSocketListener = (alarma: Alarma) => void;
type MedicionListener = (medicion: any) => void;

class WebSocketService {
  private listeners: WebSocketListener[] = [];
  private medicionListeners: MedicionListener[] = [];
  private intervalId: number | null = null;  
  private isConnected = false;
  private useMock = false; 
  private ws: WebSocket | null = null;

  connect(token: string) {
    if (this.useMock) {
      console.log('[MOCK WS] Conectado a WebSocket simulado');
      this.isConnected = true;
      this.startMockAlerts();
    } else {
      console.log('[WS] Conectando a WebSocket real...');
      this.connectReal(token);
    }
  }

  private connectReal(token: string) {
    try {
      if (!token) {
        console.error('[WS] No hay token para autenticar');
        return;
      }
      
      const wsUrl = `ws://localhost:8000/ws/alerts/${token}`;
      console.log('[WS] Conectando a:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WS] Conectado al WebSocket real');
        this.isConnected = true;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Mensaje recibido:', data);
          
          if (data.tipo === 'nueva_alarma') {
            this.mostrarAlarma(data.data);
          } else if (data.tipo === 'nueva_medicion') {
            this.notifyMedicionListeners(data.data);
          } else if (data.tipo === 'conexion') {
            console.log('[WS] Conexión confirmada:', data.mensaje);
          }
        } catch (e) {
          console.error('[WS] Error procesando mensaje:', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[WS] Desconectado del WebSocket real');
        this.isConnected = false;
        if (token) {
          setTimeout(() => {
            if (!this.isConnected) {
              console.log('[WS] Intentando reconectar...');
              this.connectReal(token);
            }
          }, 5000);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('[WS] Error en WebSocket:', error);
      };
      
    } catch (error) {
      console.error('[WS] Error conectando al WebSocket:', error);
    }
  }

  private mostrarAlarma(alarmaData: any) {
    const esCritico = alarmaData.tipo === 'CRITICO';
    const contaminante = alarmaData.contaminante || 'Desconocido';
    const valor = alarmaData.valor || 0;
    
    console.log(`🔔 ${esCritico ? '🚨 CRITICO' : '⚠️ ALERTA'}: ${contaminante} = ${valor} mg/m³`);
    
    toast.error(
      `${esCritico ? '🚨 CRITICO' : '⚠️ ALERTA'}: ${contaminante} = ${valor} mg/m³`,
      {
        duration: 8000,
        style: {
          background: esCritico ? '#dc3545' : '#ffc107',
          color: 'white',
          borderRadius: '8px',
          padding: '12px 20px',
          fontWeight: 'bold',
        },
      }
    );
    
    const alarma: Alarma = {
      id: alarmaData.alarma_id || Date.now(),
      id_sensor: alarmaData.sensor_id || 1,
      sensor_nombre: alarmaData.sensor || 'Sensor',
      tipo: esCritico ? 'CRITICO' : 'ALERTA',
      contaminante: contaminante,
      valor: valor,
      umbral: alarmaData.umbral || 0,
      mensaje: alarmaData.mensaje || `${contaminante} = ${valor} mg/m³`,
      timestamp: alarmaData.timestamp || new Date().toISOString(),
      enviada: 1,
      confirmada_por: undefined
    };
    
    this.notifyListeners(alarma);
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('[WS] Desconectado');
  }

  private startMockAlerts() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      this.generarAlarmaAleatoria();
    }, 30000);
  }

  private generarAlarmaAleatoria() {
    const contaminantes = ['CO₂', 'NOx', 'SO₂', 'CO', 'Partículas'];
    const tipos = ['ALERTA', 'CRITICO'];
    const sensores = ['Sensor Principal', 'Sensor Secundario', 'Sensor Planta 1', 'Sensor Planta 2'];
    
    const contaminante = contaminantes[Math.floor(Math.random() * contaminantes.length)];
    const tipo = tipos[Math.floor(Math.random() * tipos.length)] as 'ALERTA' | 'CRITICO';
    const sensor = sensores[Math.floor(Math.random() * sensores.length)];
    
    let valor, umbral;
    if (contaminante === 'CO₂') {
      valor = tipo === 'CRITICO' ? Math.floor(Math.random() * (500 - 420) + 420) : Math.floor(Math.random() * (420 - 380) + 380);
      umbral = tipo === 'CRITICO' ? 450 : 400;
    } else if (contaminante === 'NOx') {
      valor = tipo === 'CRITICO' ? Math.floor(Math.random() * (200 - 150) + 150) : Math.floor(Math.random() * (150 - 100) + 100);
      umbral = tipo === 'CRITICO' ? 180 : 120;
    } else {
      valor = tipo === 'CRITICO' ? Math.floor(Math.random() * (100 - 80) + 80) : Math.floor(Math.random() * (80 - 50) + 50);
      umbral = tipo === 'CRITICO' ? 90 : 70;
    }

    const nuevaAlarma: Alarma = {
      id: Date.now(),
      id_sensor: Math.floor(Math.random() * 10) + 1,
      sensor_nombre: sensor,
      tipo: tipo,
      contaminante: contaminante,
      valor: valor,
      umbral: umbral,
      mensaje: `${tipo === 'CRITICO' ? '🚨' : '⚠️'} Alarma: Nivel de ${contaminante} = ${valor} mg/m³ (Umbral: ${umbral})`,
      timestamp: new Date().toISOString(),
      enviada: 1,
      confirmada_por: undefined
    };

    console.log('[MOCK WS] Nueva alarma:', nuevaAlarma);
    
    const icono = tipo === 'CRITICO' 
      ? '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>' 
      : '<i class="bi bi-exclamation-circle-fill text-warning me-2"></i>';
    
    toast.error(
      `${icono} ${nuevaAlarma.mensaje}`,
      {
        duration: 8000,
        style: {
          background: tipo === 'CRITICO' ? '#dc3545' : '#ffc107',
          color: 'white',
          borderRadius: '8px',
          padding: '12px 20px',
          fontWeight: 'bold',
        },
      }
    );
    
    this.notifyListeners(nuevaAlarma);
  }

  onAlarma(listener: WebSocketListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onMedicion(listener: MedicionListener) {
    this.medicionListeners.push(listener);
    return () => {
      this.medicionListeners = this.medicionListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(alarma: Alarma) {
    this.listeners.forEach(listener => listener(alarma));
  }

  private notifyMedicionListeners(medicion: any) {
    this.medicionListeners.forEach(listener => listener(medicion));
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  setMockMode(enabled: boolean) {
    this.useMock = enabled;
  }
}

export const websocketService = new WebSocketService();