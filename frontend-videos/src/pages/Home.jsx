import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../api';
import logo from '../assets/images/Logo.png';
import homeImg from '../assets/images/Home.png';
import profileImg from '../assets/images/Profile.png';
import '../css/home.css';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_URL}/videos`);
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        }
      } catch (error) {
        console.error("Error cargando videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="home-container">
      <nav className="navbar">
        <img src={logo} alt="Logo" />
        <div className="nav-links">
          <Link to="/home"><img src={homeImg} alt="Inicio" /> Inicio</Link>
          <Link to="/profile"><img src={profileImg} alt="Perfil" /> Mi Perfil</Link>
        </div>
      </nav>

      <main className="main-content">
        <h1>Catálogo de Videos</h1>
        
        {loading ? (
          <p>Cargando videos...</p>
        ) : (
          <div className="video-grid">
            {videos.length === 0 ? (
              <p>No hay videos publicados aún.</p>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="video-card">
                  <Link to={`/video/${video.id}`}>
                    <img src={video.thumbnail_url || '/fondo1.jpeg'} alt={video.title} className="thumbnail" />
                    <div className="video-info">
                      <h3>{video.title}</h3>
                      <p className="views">{video.views} vistas</p>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}