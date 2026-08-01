// frontend/src/components/sensor/SensorCalibraciones.tsx
import { Table, Badge } from 'react-bootstrap';

interface Calibracion {
  id: number;
  fecha: string;
  tecnico: string;
  observaciones: string;
  proxima_calibracion: string;
}

interface SensorCalibracionesProps {
  calibraciones: Calibracion[];
}

export default function SensorCalibraciones({ calibraciones }: SensorCalibracionesProps) {
  if (calibraciones.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">
          <i className="bi bi-tools me-2"></i>
          No hay calibraciones registradas para este sensor.
        </p>
      </div>
    );
  }

  return (
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Técnico</th>
          <th>Observaciones</th>
          <th>Próxima Calibración</th>
        </tr>
      </thead>
      <tbody>
        {calibraciones.map((cal) => (
          <tr key={cal.id}>
            <td>{new Date(cal.fecha).toLocaleDateString()}</td>
            <td>{cal.tecnico}</td>
            <td>{cal.observaciones}</td>
            <td>
              {cal.proxima_calibracion ? (
                new Date(cal.proxima_calibracion).toLocaleDateString()
              ) : (
                <span className="text-muted">No programada</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}