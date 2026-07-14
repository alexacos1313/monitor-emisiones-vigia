// hooks/useLocalStorageMonitor.ts
import { useEffect } from 'react';

export function useLocalStorageMonitor() {
  useEffect(() => {
    // Verificar cada 2 segundos si el token se ha borrado
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      console.log(' Monitor localStorage - Token:', token);
      
      if (!token) {
        console.warn(' El token se ha borrado!');
        // Mostrar stack trace para saber quién lo borró
        console.trace('Stack trace:');
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
}