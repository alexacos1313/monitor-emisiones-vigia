// frontend/src/components/sensor/SensorDetalles.tsx
import { Card, Badge, Row, Col } from 'react-bootstrap';
import { Sensor } from '../../services/sensor.service';

interface SensorDetallesProps {
  sensor: Sensor;
}

export default function SensorDetalles({ sensor }: SensorDetallesProps) {
  return (
    <div>
      <Row>
        <Col md={6}>
          <p><strong><i className="bi bi-tag me-2"></i>Nombre:</strong> {sensor.nombre}</p>
          <p><strong><i className="bi bi-building me-2"></i>Planta:</strong> {sensor.planta_nombre || 'Sin planta'}</p>
          <p><strong><i className="bi bi-gear me-2"></i>Modelo:</strong> {sensor.modelo || 'No especificado'}</p>
          <p><strong><i className="bi bi-box me-2"></i>Fabricante:</strong> {sensor.fabricante || 'No especificado'}</p>
        </Col>
        <Col md={6}>
          <p><strong><i className="bi bi-cpu me-2"></i>Tipo Analizador:</strong> {sensor.tipo_analizador || 'No especificado'}</p>
          <p><strong><i className="bi bi-calendar me-2"></i>Instalación:</strong> {new Date(sensor.fecha_instalacion).toLocaleDateString()}</p>
          <p><strong><i className="bi bi-clock me-2"></i>Frecuencia:</strong> {sensor.frecuencia_medicion || 60} segundos</p>
          <p>
            <strong><i className="bi bi-droplet me-2"></i>Contaminantes:</strong>
            {sensor.contaminantes?.length > 0 ? (
              sensor.contaminantes.map(c => (
                <Badge key={c} bg="primary" className="ms-1">{c}</Badge>
              ))
            ) : (
              <span className="text-muted ms-1">Sin contaminantes</span>
            )}
          </p>
        </Col>
      </Row>
      {sensor.observaciones && (
        <Row>
          <Col>
            <p><strong><i className="bi bi-file-text me-2"></i>Observaciones:</strong></p>
            <p className="text-muted small">{sensor.observaciones}</p>
          </Col>
        </Row>
      )}
    </div>
  );
}