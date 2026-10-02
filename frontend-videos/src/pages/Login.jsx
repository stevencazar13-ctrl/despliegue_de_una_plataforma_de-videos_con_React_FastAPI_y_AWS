import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import '../css/login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      try {
        const loginData = new URLSearchParams();
        loginData.append('username', formData.email);
        loginData.append('password', formData.password);

        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: loginData
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.access_token);
          navigate('/home'); 
        } else {
          const errorData = await response.json();
          alert(`Error al iniciar sesión: ${errorData.detail}`);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error al conectar con el servidor FastAPI.');
      }
    } else {
      try {
        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password
          })
        });

        if (response.ok) {
          const data = await response.json();
          alert(`¡Cuenta creada con éxito para ${data.name}! Por favor, inicia sesión.`);
          setFormData({ name: '', email: '', password: '' });
          setIsLogin(true); 
        } else {
          const errorData = await response.json();
          alert(`Error al registrar: ${errorData.detail || 'Revisa los datos'}`);
        }
      } catch (error) {
        console.error('Error de conexión:', error);
        alert('Error al conectar con el servidor FastAPI.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label htmlFor="name">Nombre:</label>
              <input 
                type="text" 
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="input-group">
            <label htmlFor="email">Correo:</label>
            <input 
              type="email" 
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Contraseña:</label>
            <input 
              type="password" 
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="btn-submit">
            {isLogin ? 'Ingresar' : 'Registrarse'}
          </button>
        </form>

        <div className="toggle-section">
          <button 
            type="button"
            className="toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ name: '', email: '', password: '' });
            }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}