import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../css/detalle.css';

export default function Player() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const videoRes = await fetch(`http://localhost:8000/videos/${id}`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideo(videoData);
        }

        const commentsRes = await fetch(`http://localhost:8000/videos/${id}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
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
      const res = await fetch(`http://localhost:8000/videos/${id}/comments`, {
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
      <nav className="navbar">
        <Link to="/home">Volver al Inicio</Link>
      </nav>

      <main className="video-section">
        <video controls width="100%" className="main-video" src={video.video_url}>
          Tu navegador no soporta HTML5 video.
        </video>
        
        <div className="video-details">
          <h2>{video.title}</h2>
          <p className="views-date">{video.views} vistas</p>
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
                <p><strong>Usuario {c.user_id}:</strong> {c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}