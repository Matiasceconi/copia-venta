import React, { useState, useEffect } from 'react';
import { fileToTransparentPng } from '@/lib/playerPhotoPng';

// name=src/components/PlayerImageUploader.jsx
export default function PlayerImageUploader({ playerId, currentImageUrl, onSaved, currentUser }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const maxSizeMB = 5;

  // Roles allowed to change avatar (normalize names to lower case, no accents)
  const allowedRoles = ['admin', 'administrador', 'preparador fisico', 'preparador', 'preparador_fisico', 'tecnico', 'técnico'];
  function normalizeRole(r) {
    if (!r) return '';
    return r.toString().toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  }
  const userRoles = (currentUser && currentUser.roles) || (currentUser && currentUser.role ? [currentUser.role] : []);
  const canEdit = userRoles.map(normalizeRole).some(r => allowedRoles.includes(r));

  useEffect(() => {
    setPreview(currentImageUrl || '');
  }, [currentImageUrl]);

  async function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      return alert('Solo se permiten imágenes.');
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      return alert(`Máximo ${maxSizeMB} MB.`);
    }
    const pngFile = await fileToTransparentPng(f);
    setFile(pngFile);
    setPreview(URL.createObjectURL(pngFile));
  }

  async function upload() {
    if (!file) return alert('Seleccioná una imagen primero.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('playerId', playerId);

      const res = await fetch('/api/players/upload-avatar', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error al subir la imagen');
      }
      const { imageUrl } = await res.json();

      // Optionally PATCH player to set avatarUrl if upload endpoint doesn't do it
      try {
        await fetch(`/api/players/${playerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarUrl: imageUrl })
        });
      } catch (err) {
        // Not fatal; server/upload endpoint may already set the field
        console.warn('Could not PATCH player after upload', err);
      }

      onSaved && onSaved(imageUrl);
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen. ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
  }

  if (!canEdit) return null;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#222' }}>
        {preview ? (
          <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ color: '#666', padding: 8 }}>Sin foto</div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={onFileChange} />
        <div style={{ marginTop: 6 }}>
          <button onClick={upload} disabled={uploading}>{uploading ? 'Subiendo...' : 'Guardar imagen'}</button>
        </div>
      </div>
    </div>
  );
}