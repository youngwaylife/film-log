import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './Profile.css';

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Fetch profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileError) throw profileError;
        
        if (!profileData) {
          setError('Profile not found.');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // 2. Fetch user's logs
        const { data: logsData, error: logsError } = await supabase
          .from('movie_logs')
          .select('*')
          .eq('user_id', profileData.id)
          .order('watched_date', { ascending: false });

        if (logsError) throw logsError;
        
        setLogs(logsData || []);
      } catch (err) {
        console.error('Error fetching profile:', err.message);
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username]);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return (
    <div className="profile-error">
      <h2>{error}</h2>
      <Link to="/" className="back-link">Return Home</Link>
    </div>
  );

  return (
    <div className="app-container">
      <header className="navbar">
        <Link to="/" className="logo-link"><h1 className="logo">Raca Studio</h1></Link>
      </header>

      <main className="main-content">
        <section className="shared-profile-section">
          <div className="profile-header-info">
            <div className="avatar-large">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`${profile.username} avatar`} />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <h2>{profile.username}'s Archive</h2>
            {profile.bio && <p className="shared-bio">{profile.bio}</p>}
          </div>
        </section>

        <h3 className="section-title">Watched Films ({logs.length})</h3>
        
        <div className="movie-grid">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="movie-card">
                {log.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w500${log.poster_path}`} 
                    alt="Movie poster" 
                    className="movie-poster"
                  />
                ) : (
                  <div className="movie-poster-placeholder">No Poster</div>
                )}
                <div className="movie-overlay">
                  <p className="rating">★ {log.rating}</p>
                  {log.theater_name && <p className="theater">@ {log.theater_name}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No movies tracked yet.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
