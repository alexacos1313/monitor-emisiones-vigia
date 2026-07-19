// frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        console.log(' Usuario autenticado desde localStorage:', JSON.parse(storedUser).email);
      } catch (error) {
        console.error(' Error al cargar usuario del localStorage:', error);
        setIsAuthenticated(false);
      }
    }
  }, []);

  const login = (newToken: string, newUser: any) => {
    console.log(' Iniciando sesión:', newUser.email);
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log(' Cerrando sesión del usuario:', user?.email || 'desconocido');
    
    //  Limpiar todo el localStorage relacionado con la sesión
    const keysToRemove = [
      'token',
      'user',
      'empresa_seleccionada_id',
      'empresa_seleccionada'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   Eliminado: ${key}`);
    });
    
    //  Limpiar estado
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    
    //  Redirigir al login
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}