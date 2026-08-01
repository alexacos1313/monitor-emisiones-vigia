// frontend/src/components/sensor/SensorUmbrales.tsx
import { Table, Button, Badge } from 'react-bootstrap';

interface Umbral {
  id: number;
  contaminante: string;
  limite_alerta: number;
  limite_critico: number;
  unidad: string;
  fecha_aplicacion: string;
}

interface SensorUmbralesProps {
  umbrales: Umbral[];
  onAdd: () => void;
  onDelete: (id: number) => void;
}

export default function SensorUmbrales({ umbrales, onAdd, onDelete }: SensorUmbralesProps) {
  if (umbrales.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">
          <i className="bi bi-exclamation-triangle me-2"></i>
          No hay umbrales configurados para este sensor.
        </p>
        <Button variant="primary" size="sm" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Crear Umbral
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          {umbrales.length} umbral(es) configurados
        </span>
        <Button variant="primary" size="sm" onClick={onAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Crear Umbral
        </Button>
      </div>

      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Contaminante</th>
            <th>Límite Alerta</th>
            <th>Límite Crítico</th>
            <th>Unidad</th>
            <th>Fecha Aplicación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {umbrales.map((umbral) => (
            <tr key={umbral.id}>
              <td><Badge bg="info">{umbral.contaminante}</Badge></td>
              <td><span className="text-warning">{umbral.limite_alerta}</span></td>
              <td><span className="text-danger">{umbral.limite_critico}</span></td>
              <td>{umbral.unidad}</td>
              <td>{new Date(umbral.fecha_aplicacion).toLocaleDateString()}</td>
              <td>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => onDelete(umbral.id)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}