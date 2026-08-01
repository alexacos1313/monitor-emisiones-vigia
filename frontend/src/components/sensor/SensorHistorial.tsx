// frontend/src/components/sensor/SensorHistorial.tsx
import { Table, Badge } from 'react-bootstrap';

interface Historial {
  id: number;
  contaminante: string;
  limite_alerta_antiguo: number;
  limite_alerta_nuevo: number;
  limite_critico_antiguo: number;
  limite_critico_nuevo: number;
  fecha_cambio: string;
  usuario_nombre?: string;
  motivo: string;
}

interface SensorHistorialProps {
  historial: Historial[];
}

export default function SensorHistorial({ historial }: SensorHistorialProps) {
  if (historial.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">
          <i className="bi bi-clock-history me-2"></i>
          No hay historial de cambios para este sensor.
        </p>
      </div>
    );
  }

  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Contaminante</th>
          <th>Alerta Antiguo</th>
          <th>Alerta Nuevo</th>
          <th>Crítico Antiguo</th>
          <th>Crítico Nuevo</th>
          <th>Usuario</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        {historial.map((item) => (
          <tr key={item.id}>
            <td>{new Date(item.fecha_cambio).toLocaleString()}</td>
            <td><Badge bg="info">{item.contaminante}</Badge></td>
            <td className="text-warning">{item.limite_alerta_antiguo}</td>
            <td className="text-success">{item.limite_alerta_nuevo}</td>
            <td className="text-danger">{item.limite_critico_antiguo}</td>
            <td className="text-success">{item.limite_critico_nuevo}</td>
            <td>{item.usuario_nombre || 'Sistema'}</td>
            <td><small>{item.motivo}</small></td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}