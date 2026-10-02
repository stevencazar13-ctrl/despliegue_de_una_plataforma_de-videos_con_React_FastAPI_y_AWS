import React, { useState, useEffect } from 'react';
import { API_URL } from '../api';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({ title: '', description: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    };
    fetchUser();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!videoFile || !thumbFile) {
      return alert('Por favor selecciona un video y una miniatura.');
    }

    try {
      const videoUrlRes = await fetch(`${API_URL}/s3/presigned-url?filename=${videoFile.name}&file_type=${videoFile.type}&is_video=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const videoUrls = await videoUrlRes.json();

      await fetch(videoUrls.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': videoFile.type },
        body: videoFile
      });

      const thumbUrlRes = await fetch(`${API_URL}/s3/presigned-url?filename=${thumbFile.name}&file_type=${thumbFile.type}&is_video=false`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const thumbUrls = await thumbUrlRes.json();

      await fetch(thumbUrls.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': thumbFile.type },
        body: thumbFile
      });

      const res = await fetch(`${API_URL}/videos`, {
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
        
        const userRes = await fetch(`${API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) setUser(await userRes.json());
      } else {
        alert('Error al guardar el registro en la base de datos.');
      }
    } catch (error) {
      console.error("Error al subir a S3:", error);
      alert('Hubo un error en la subida. Verifica los permisos CORS de tus Buckets S3.');
    }
  };

  if (!user) return <div>Cargando perfil...</div>;

  return (
    <div className="profile-container">
      <h2>Perfil de {user.username}</h2>
      <button onClick={() => setShowUpload(!showUpload)}>
        {showUpload ? 'Cancelar Subida' : 'Subir Nuevo Video'}
      </button>

      {showUpload && (
        <form onSubmit={handleUploadSubmit} className="upload-form">
          <h3>Subir Video a AWS S3</h3>
          
          <label>Título:</label>
          <input 
            type="text" 
            required 
            value={uploadData.title} 
            onChange={(e) => setUploadData({...uploadData, title: e.target.value})} 
          />

          <label>Descripción:</label>
          <textarea 
            required 
            value={uploadData.description} 
            onChange={(e) => setUploadData({...uploadData, description: e.target.value})} 
          />

          <label>Archivo de Video (MP4):</label>
          <input 
            type="file" 
            accept="video/*" 
            required 
            onChange={(e) => setVideoFile(e.target.files[0])} 
          />

          <label>Miniatura (Imagen):</label>
          <input 
            type="file" 
            accept="image/*" 
            required 
            onChange={(e) => setThumbFile(e.target.files[0])} 
          />

          <button type="submit">Subir a la Nube</button>
        </form>
      )}

      <div className="user-videos">
        <h3>Tus Videos</h3>
        {user.videos && user.videos.length > 0 ? (
          <div className="videos-grid">
            {user.videos.map(video => (
              <div key={video.id} className="video-card">
                <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', maxWidth: '300px' }} />
                <h4>{video.title}</h4>
                <p>{video.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No has subido videos aún.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;