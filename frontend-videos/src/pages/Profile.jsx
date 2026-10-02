import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../api';
import '../css/usuario.css'; 

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userVideos, setUserVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const resUser = await fetch(`${API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resUser.ok) {
          const userData = await resUser.json();
          setUser(userData);

          const resVideos = await fetch(`${API_URL}/videos`);
          if (resVideos.ok) {
            const allVideos = await resVideos.json();
            
            const filtrados = allVideos.filter(v => v.user_id === userData.id);
            setUserVideos(filtrados);
          }
        } else {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) return <div>Cargando perfil...</div>;
  if (!user) return <div>No se pudo cargar el perfil.</div>;

  return (
    <div className="profile-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <Link to="/home" style={{ textDecoration: 'none', fontSize: '16px' }}>🏠 Volver al Inicio</Link>
        <button onClick={handleLogout} style={{ cursor: 'pointer', padding: '8px 16px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </nav>

      <div className="user-info">
        <h1 style={{ margin: '0 0 10px 0' }}>Perfil de {user.name}</h1>
        <p style={{ color: '#666', margin: 0 }}>Correo: {user.email}</p>
      </div>

      <hr style={{ margin: '30px 0', border: '1px solid #eee' }} />

      <h2>Tus Videos Publicados ({userVideos.length})</h2>
      
      <div className="videos-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {userVideos.length > 0 ? (
          userVideos.map((video) => (
            <div key={video.id} className="video-card" style={{ width: '250px', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', transition: 'transform 0.2s' }}>
              <Link to={`/video/${video.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <img 
                  src={video.thumbnail_url} 
                  alt={video.title} 
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px' }} 
                />
                <h3 style={{ fontSize: '16px', margin: '10px 0 5px 0' }}>{video.title}</h3>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                  {video.description ? video.description.substring(0, 50) + '...' : 'Sin descripción'}
                </p>
              </Link>
            </div>
          ))
        ) : (
          <p style={{ color: '#666' }}>No has subido videos aún. ¡Anímate a publicar el primero!</p>
        )}
      </div>
    </div>
  );
}