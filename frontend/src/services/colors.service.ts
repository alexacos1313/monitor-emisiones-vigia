// frontend/src/services/colors.service.ts
// Mapa de colores por contaminante (expandible)
export const CONTAMINANTE_COLORS: Record<string, string> = {
  'CO': '#FF9800',
  'NO': '#9C27B0',
  'NO2': '#F44336',
  'NOX': '#43A047',
  'SO2': '#2196F3',
  'CO2': '#795548',
  'O3': '#00BCD4',
  'PM10': '#607D8B',
  'PM2.5': '#9E9E9E',
  'CH4': '#4CAF50',
  'H2S': '#FF5722',
  'NH3': '#8BC34A',
  'VOCs': '#3F51B5',
};

// Colores para gráficos de pastel
export const PIE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'];

// Función para obtener color de un contaminante
export const getContaminanteColor = (contaminante: string): string => {
  return CONTAMINANTE_COLORS[contaminante] || '#8884d8';
};

// Función para obtener label de un contaminante
export const getContaminanteLabel = (contaminante: string): string => {
  const labels: Record<string, string> = {
    'CO': 'CO',
    'NO': 'NO',
    'NO2': 'NO₂',
    'NOX': 'NOx',
    'SO2': 'SO₂',
    'CO2': 'CO₂',
    'O3': 'O₃',
    'PM10': 'PM10',
    'PM2.5': 'PM2.5',
  };
  return labels[contaminante] || contaminante;
};