// hooks/useEmpresaId.ts
export function useEmpresaId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // console.log(' useEmpresaId - user:', user);
  // console.log(' useEmpresaId - user.id_empresa:', user.id_empresa);

  // Si el usuario tiene empresa (EMPRESA_ADMIN o TECNICO)
  if (user.id_empresa) {
    // console.log(' useEmpresaId - retornando id_empresa del user:', user.id_empresa);
    return user.id_empresa;
  }
  
  // Si es SUPER_ADMIN, buscar la empresa seleccionada
  const empresaSeleccionada = localStorage.getItem('empresa_seleccionada_id');
  if (empresaSeleccionada) {
    return Number(empresaSeleccionada);
  }
  
  // No hay empresa
  return null;
}

export function useEmpresaNombre() {
  const empresaStr = localStorage.getItem('empresa_seleccionada');
  if (empresaStr) {
    try {
      const empresa = JSON.parse(empresaStr);
      return empresa.nombre;
    } catch {
      return null;
    }
  }
  return null;
}