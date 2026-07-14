// frontend/src/components/ui/Breadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb } from 'react-bootstrap';

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  mediciones: 'Mediciones',
  alarmas: 'Alarmas',
  reportes: 'Reportes',
  empresas: 'Empresas',
  sensores: 'Sensores',
  usuarios: 'Usuarios',
  perfil: 'Mi Perfil',
  mantenimiento: 'Mantenimiento'
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  return (
    <Breadcrumb className="mb-0">
      <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/dashboard' }}>
        <i className="bi bi-house-door me-1"></i>Inicio
      </Breadcrumb.Item>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = pageNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
        
        return isLast ? (
          <Breadcrumb.Item active key={name}>
            {displayName}
          </Breadcrumb.Item>
        ) : (
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: routeTo }} key={name}>
            {displayName}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
}