// frontend/src/components/ia/ChatButton.tsx
import { useState, useRef, useEffect } from 'react';
import { Button, Offcanvas, Form, Spinner, Badge } from 'react-bootstrap';
import { aiService, ChatMessage } from '../../services/ai.service';

export default function ChatButton() {
  const [show, setShow] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: '¡Hola! Soy tu asistente IA. Puedo ayudarte a consultar datos de emisiones, alarmas, tendencias y más. ¿Qué necesitas saber?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiService.preguntar(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response.respuesta }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sugerencias = [
    '¿Cuántas alarmas hay pendientes?',
    'Promedio de CO de la última semana',
    'Sensores activos',
    'Alarmas críticas',
    'Promedio de NOX de este mes'
  ];

  return (
    <>
      {/* Botón flotante */}
      <Button
        onClick={() => setShow(true)}
        className="position-fixed rounded-circle d-flex align-items-center justify-content-center shadow-lg"
        style={{
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none'
        }}
      >
        <i className="bi bi-robot fs-2 text-white"></i>
      </Button>

      {/* Panel de chat lateral */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end" style={{ width: '450px' }}>
        <Offcanvas.Header closeButton className="border-bottom" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Offcanvas.Title>
            <i className="bi bi-robot me-2"></i>
            Asistente IA - Monitor de Emisiones
            <Badge bg="light" text="dark" className="ms-2">
              <i className="bi bi-cpu me-1"></i>
              Groq
            </Badge>
          </Offcanvas.Title>
        </Offcanvas.Header>
        
        <Offcanvas.Body className="d-flex flex-column p-0">
          {/* Mensajes */}
          <div className="flex-grow-1 p-3 overflow-auto" style={{ height: 'calc(100vh - 180px)' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div
                  className={`p-3 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-light'}`}
                  style={{ maxWidth: '85%' }}
                >
                  <div className="d-flex align-items-center mb-1">
                    <i className={`bi ${msg.role === 'user' ? 'bi-person-circle' : 'bi-robot'} me-1`}></i>
                    <small className={msg.role === 'user' ? 'text-white-50' : 'text-muted'}>
                      {msg.role === 'user' ? 'Tú' : 'IA Asistente'}
                    </small>
                  </div>
                  <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="d-flex justify-content-start mb-3">
                <div className="bg-light p-3 rounded-3">
                  <Spinner animation="grow" size="sm" className="me-1" />
                  <Spinner animation="grow" size="sm" className="me-1" />
                  <Spinner animation="grow" size="sm" />
                  <span className="ms-2 text-muted small">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias */}
          <div className="px-3 pt-2 border-top bg-white">
            <div className="d-flex flex-wrap gap-1">
              <small className="text-muted w-100 mb-1">
                <i className="bi bi-lightbulb me-1"></i>
                Preguntas sugeridas:
              </small>
              {sugerencias.map((sug, idx) => (
                <Button
                  key={idx}
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill mb-1"
                  onClick={() => {
                    setInput(sug);
                    setTimeout(handleSend, 100);
                  }}
                >
                  {sug}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-top p-3 bg-white">
            <Form.Group className="d-flex gap-2">
              <Form.Control
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                disabled={loading}
                className="rounded-pill"
              />
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-pill px-3"
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <i className="bi bi-send"></i>
                )}
              </Button>
            </Form.Group>
            <div className="mt-1">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Pregunta sobre alarmas, sensores, mediciones, promedios y empresas
              </small>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}