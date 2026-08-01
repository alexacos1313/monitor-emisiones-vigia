// frontend/src/components/sensor/UmbralModal.tsx
import { Modal, Form, Button, Spinner } from 'react-bootstrap';

interface UmbralModalProps {
  show: boolean;
  onHide: () => void;
  onSave: () => void;
  formData: {
    contaminante: string;
    limite_alerta: number;
    limite_critico: number;
    unidad: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
}

export default function UmbralModal({
  show,
  onHide,
  onSave,
  formData,
  setFormData,
  loading
}: UmbralModalProps) {
  const contaminantes = ['CO', 'NO', 'NO2', 'NOX', 'SO2'];
  const unidades = ['mg/m³', 'µg/m³', 'ppm'];

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-exclamation-triangle me-2"></i>
          Crear Umbral
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Contaminante *</Form.Label>
            <Form.Select
              value={formData.contaminante}
              onChange={(e) => setFormData({ ...formData, contaminante: e.target.value })}
            >
              <option value="">Seleccionar contaminante</option>
              {contaminantes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Límite de Alerta *</Form.Label>
            <Form.Control
              type="number"
              value={formData.limite_alerta}
              onChange={(e) => setFormData({ ...formData, limite_alerta: Number(e.target.value) })}
              placeholder="Valor de alerta"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Límite Crítico *</Form.Label>
            <Form.Control
              type="number"
              value={formData.limite_critico}
              onChange={(e) => setFormData({ ...formData, limite_critico: Number(e.target.value) })}
              placeholder="Valor crítico"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Unidad</Form.Label>
            <Form.Select
              value={formData.unidad}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
            >
              {unidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Form.Select>
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