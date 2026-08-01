// frontend/src/components/sensor/SensorModal.tsx
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { Sensor } from '../../services/sensor.service';
import { Planta } from '../../services/empresa.service';

type EstadoSensor = 'ACTIVO' | 'MANTENIMIENTO' | 'INACTIVO' | 'CALIBRACION';

interface SensorModalProps {
  show: boolean;
  onHide: () => void;
  onSave: () => void;
  editingSensor: Sensor | null;
  formData: {
    nombre: string;
    tipo_analizador: string;
    modelo: string;
    fabricante: string;
    estado: EstadoSensor;
    id_planta: number;
    frecuencia_medicion: number;
    observaciones: string;
    contaminantes: string[];
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  plantas: Planta[];
  loading: boolean;
}

export default function SensorModal({
  show,
  onHide,
  onSave,
  editingSensor,
  formData,
  setFormData,
  plantas,
  loading
}: SensorModalProps) {
  const estados: EstadoSensor[] = ['ACTIVO', 'MANTENIMIENTO', 'INACTIVO', 'CALIBRACION'];
  const contaminantesDisponibles = ['CO', 'NO', 'NO2', 'NOX', 'SO2'];

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-cpu me-2"></i>
          {editingSensor ? 'Editar Sensor' : 'Nuevo Sensor'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Sensor Principal CO"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Planta *</Form.Label>
            <Form.Select
              value={formData.id_planta}
              onChange={(e) => setFormData({ ...formData, id_planta: Number(e.target.value) })}
            >
              <option value={0}>Seleccionar planta</option>
              {plantas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoSensor })}
            >
              {estados.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tipo Analizador</Form.Label>
            <Form.Control
              type="text"
              value={formData.tipo_analizador}
              onChange={(e) => setFormData({ ...formData, tipo_analizador: e.target.value })}
              placeholder="Ej: Láser, FTIR, Químico..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Modelo</Form.Label>
            <Form.Control
              type="text"
              value={formData.modelo}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              placeholder="Ej: LASER-2000"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Fabricante</Form.Label>
            <Form.Control
              type="text"
              value={formData.fabricante}
              onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
              placeholder="Ej: Siemens, ABB..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Frecuencia de Medición (segundos)</Form.Label>
            <Form.Control
              type="number"
              value={formData.frecuencia_medicion}
              onChange={(e) => setFormData({ ...formData, frecuencia_medicion: Number(e.target.value) })}
              min={1}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Contaminantes</Form.Label>
            <Form.Select
              multiple
              value={formData.contaminantes}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, contaminantes: selected });
              }}
            >
              {contaminantesDisponibles.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Mantén presionada la tecla Ctrl (Cmd en Mac) para seleccionar múltiples.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Información adicional del sensor..."
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="primary" onClick={onSave} disabled={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Guardando...
            </>
          ) : (
            'Guardar'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}