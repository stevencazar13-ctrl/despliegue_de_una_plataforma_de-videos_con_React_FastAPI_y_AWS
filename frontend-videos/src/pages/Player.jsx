import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_URL } from '../api';
import '../css/detalle.css';

export default function Player() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [recomendados, setRecomendados] = useState([]);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const videoRes = await fetch(`${API_URL}/videos/${id}`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideo(videoData);
        }

        const commentsRes = await fetch(`${API_URL}/videos/${id}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }

        const allVideosRes = await fetch(`${API_URL}/videos`);
        if (allVideosRes.ok) {
          const allVideosData = await allVideosRes.json();
          const filtrados = allVideosData.filter(v => v.id !== Number(id));
          setRecomendados(filtrados.slice(0, 5));
        }
      } catch (error) {
        console.error("Error al cargar detalles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoDetails();
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('Debes iniciar sesión para comentar');

    try {
      const res = await fetch(`${API_URL}/videos/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (res.ok) {
        const addedComment = await res.json();
        setComments([...comments, addedComment]);
        setNewComment('');
      }
    } catch (error) {
      console.error("Error al comentar:", error);
    }
  };

  if (loading) return <p>Cargando reproductor...</p>;
  if (!video) return <p>Video no encontrado.</p>;

  return (
    <div className="player-container">
      <nav className="navbar player-navbar">
        <Link to="/home" className="back-link">Volver al Inicio</Link>
      </nav>

      <div className="player-layout">
        
        <main className="video-section">
          <video controls className="main-video" src={video.video_url}>
            Tu navegador no soporta HTML5 video.
          </video>
          
          <div className="video-details">
            <h2>{video.title}</h2>
            <p className="views-date">{video.views || 0} vistas</p>
            <div className="description-box">
              <p>{video.description}</p>
            </div>
          </div>

          <hr />

          <div className="comments-section">
            <h3>Comentarios ({comments.length})</h3>
            
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Añade un comentario..."
                required 
              />
              <button type="submit">Comentar</button>
            </form>

            <div className="comments-list">
              {comments.map((c, index) => (
                <div key={index} className="comment-item">
                  <p>
                    <strong>{c.user?.name || "Tú"}:</strong> {c.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="recommended-section">
          <h3>Videos Recomendados</h3>
          {recomendados.length > 0 ? (
            recomendados.map((vid) => (
              <div key={vid.id} className="recommendation-card">
                <Link to={`/video/${vid.id}`} className="recommendation-link">
                  <img 
                    src={vid.thumbnail_url} 
                    alt={vid.title} 
                    className="recommendation-thumbnail"
                  />
                  <div className="recommendation-info">
                    <h4 className="recommendation-title">{vid.title}</h4>
                    <p className="recommendation-views">{vid.views || 0} vistas</p>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <p className="recommended-empty">No hay recomendaciones disponibles.</p>
          )}
        </aside>

      </div>
    </div>
  );
}