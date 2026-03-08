import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './ProfileModal.css';

const ProfileModal = ({ session, currentUsername, onClose, onUpdate }) => {
  const [username, setUsername] = useState(currentUsername || '');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, bio, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error loading profile details:", error);
        } else if (data) {
          setUsername(data.username || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (session) {
      loadProfile();
    }
  }, [session]);

  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      alert('Error uploading avatar: ' + error.message + '\n\n*Supabase 대시보드에서 avatars 버킷이 생성 및 Public으로 설정되었는지 확인해 주세요!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (!username.trim()) {
      alert('Username cannot be empty.');
      setSaving(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: session.user.id, 
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim()
        })
        .select();

      if (error) throw error;
      
      onUpdate(username.trim(), bio.trim());
      onClose();
    } catch (err) {
      console.error('Error saving profile:', err);
      if (err.code === '23505') { // Unique constraint violation usually
        alert('This username is already taken. Please choose another one.');
      } else {
        alert(`Failed to save: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <div className="modal-title-area">
          <h2>Edit Profile</h2>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group avatar-upload-group">
            <label>Avatar</label>
            <div className="avatar-preview-container">
               {avatarUrl ? (
                 <img src={avatarUrl} alt="Avatar Preview" className="avatar-preview-img" />
               ) : (
                 <div className="avatar-preview-placeholder">No Image</div>
               )}
            </div>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="file-input"
            />
            {uploading && <span className="upload-status">Uploading...</span>}
          </div>

          <div className="form-group">
            <label>Username (Required)</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Unique username"
              required
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea 
              rows="3" 
              placeholder="Tell others about your taste in movies" 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
            />
          </div>

          <button type="submit" className="save-button" disabled={saving || uploading}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
