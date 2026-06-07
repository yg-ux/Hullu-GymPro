import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [gym, setGym] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(data => {
          setUser(data.user);
          setGym(data.gym);
          setSubscription(data.subscription);
        })
        .catch(() => {
          // Token invalid/expired — clear everything so user goes to login
          localStorage.removeItem('token');
          localStorage.removeItem('gym');
          localStorage.removeItem('subscription');
          setUser(null);
          setGym(null);
          setSubscription(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    localStorage.setItem('token', data.token);
    localStorage.setItem('gym', JSON.stringify(data.gym));
    localStorage.setItem('subscription', JSON.stringify(data.subscription));
    setUser(data.user);
    setGym(data.gym);
    setSubscription(data.subscription);
    return data;
  };

  const register = async (data) => {
    const response = await api.post('/auth/register', data);
    localStorage.setItem('token', response.token);
    localStorage.setItem('gym', JSON.stringify(response.gym));
    localStorage.setItem('subscription', JSON.stringify(response.subscription));
    setUser(response.user);
    setGym(response.gym);
    setSubscription(response.subscription);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('gym');
    localStorage.removeItem('subscription');
    setUser(null);
    setGym(null);
    setSubscription(null);
  };

  const refreshAuth = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setGym(data.gym);
      setSubscription(data.subscription);
      // Also update localStorage to persist the new subscription across page refreshes
      localStorage.setItem('gym', JSON.stringify(data.gym));
      localStorage.setItem('subscription', JSON.stringify(data.subscription));
      return data;
    } catch (error) {
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      gym, 
      subscription,
      loading, 
      login, 
      register,
      logout,
      refreshAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
