import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/usuario.css';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  
  const [uploadData, setUploadData] = useState({ title: '', description: '' });
  
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:8000/users/1'); 
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!videoFile || !thumbFile) {
      return alert('Por favor selecciona un video y una miniatura.');
    }

    try {
      const videoUrlRes = await fetch(`http://localhost:8000/s3/presigned-url?filename=${videoFile.name}&file_type=${videoFile.type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const videoUrls = await videoUrlRes.json();

      await fetch(videoUrls.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': videoFile.type },
        body: videoFile
      });

      const thumbUrlRes = await fetch(`http://localhost:8000/s3/presigned-url?filename=${thumbFile.name}&file_type=${thumbFile.type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const thumbUrls = await thumbUrlRes.json();

      await fetch(thumbUrls.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': thumbFile.type },
        body: thumbFile
      });

      const res = await fetch('http://localhost:8000/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: uploadData.title,
          description: uploadData.description,
          video_url: videoUrls.public_url,
          thumbnail_url: thumbUrls.public_url,
          user_id: user.id
        })
      });

      if (res.ok) {
        alert('¡Video publicado con éxito en AWS!');
        setShowUpload(false);
        setUploadData({ title: '', description: '' });
        setVideoFile(null);
        setThumbFile(null);
        
        const userRes = await fetch('http://localhost:8000/users/1');
        if (userRes.ok) setUser(await userRes.json());
      }
    } catch (error) {
      console.error("Error al subir a S3:", error);
      alert('Hubo un error en la subida. Verifica los permisos CORS de tu Bucket S3.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  if (!user) return <p>Cargando perfil...</p>;

  return (
    <div className="profile-container">
      <nav className="navbar">
        <Link to="/home">Volver al Inicio</Link>
        <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
      </nav>

      <div className="profile-header">
        <h1>Perfil de {user.name}</h1>
        <p>Email: {user.email}</p>
        <p>Videos publicados: {user.videos?.length || 0}</p>
      </div>

      <hr />

      <div className="user-videos-section">
        <div className="section-header">
          <h2>Mis Videos</h2>
          <button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancelar' : '+ Publicar Video'}
          </button>
        </div>

        {showUpload && (
          <form onSubmit={handleUploadSubmit} className="upload-form">
            <h3>Subir nuevo video</h3>
            
            <input 
              type="text" 
              placeholder="Título del video" 
              value={uploadData.title}
              onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              required 
            />
            
            <textarea 
              placeholder="Descripción" 
              value={uploadData.description}
              onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              required 
            />
            
            <div className="file-inputs">
              <label>Archivo de Video (MP4):</label>
              <input 
                type="file" 
                accept="video/mp4" 
                onChange={(e) => setVideoFile(e.target.files[0])} 
                required 
              />

              <label>Miniatura (JPG, PNG):</label>
              <input 
                type="file" 
                accept="image/jpeg, image/png" 
                onChange={(e) => setThumbFile(e.target.files[0])} 
                required 
              />
            </div>

            <button type="submit" className="btn-submit">Guardar Video</button>
          </form>
        )}

        <div className="video-list">
          {user.videos?.length > 0 ? (
            user.videos.map(video => (
              <div key={video.id} className="video-item">
                <h4>{video.title}</h4>
                <p>{video.views} vistas</p>
                <div className="video-actions">
                  <button>Editar</button>
                  <button className="delete-btn">Eliminar</button>
                </div>
              </div>
            ))
          ) : (
            <p>No has publicado ningún video todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}