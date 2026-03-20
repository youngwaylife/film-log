import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LogDetailModal from './LogDetailModal';
import './Profile.css';

const Profile = ({ session }) => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Follow states
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, [username, session]);

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
      const { data: logsData } = await supabase
        .from('movie_logs')
        .select(`*, profiles(username, avatar_url)`)
        .eq('user_id', profileData.id)
        .order('watched_date', { ascending: false });

      setLogs(logsData || []);

      // 3. Fetch Follows Count
      const { count: fwers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id);
        
      const { count: fwing } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      setFollowersCount(fwers || 0);
      setFollowingCount(fwing || 0);

      // 4. Check if current user is following this profile
      if (session && session.user.id !== profileData.id) {
        const { data: followRel } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', session.user.id)
          .eq('following_id', profileData.id)
          .maybeSingle();
          
        setIsFollowing(!!followRel);
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err.message);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!session) {
      alert("로그인이 필요합니다.");
      return;
    }
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', profile.id);
        setFollowersCount(prev => Math.max(0, prev - 1));
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: session.user.id, following_id: profile.id }]);
        setFollowersCount(prev => prev + 1);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleLogUpdated = () => {
    fetchProfileData();
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (error) return (
    <div className="profile-error">
      <h2>{error}</h2>
      <Link to="/" className="back-link">Return Home</Link>
    </div>
  );

  const isOwnProfile = session && session.user.id === profile.id;

  return (
    <div className="app-container">
      <header className="navbar">
        <Link to="/" className="logo-link"><h1 className="logo">FILM LOG</h1></Link>
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
            
            <div className="follow-stats">
              <span><strong>{followersCount}</strong> Followers</span>
              <span><strong>{followingCount}</strong> Following</span>
            </div>

            {!isOwnProfile && session && (
              <button 
                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={handleToggleFollow}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
        </section>

        <h3 className="section-title">Watched Films ({logs.length})</h3>
        
        <div className="movie-grid">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.id} className="movie-card clickable" onClick={() => setSelectedLog(log)}>
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
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No movies tracked yet.</p>
          )}
        </div>
      </main>

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          session={session} 
          onClose={() => setSelectedLog(null)} 
          onCommentAdded={fetchProfileData}
          onLogUpdated={handleLogUpdated}
        />
      )}
    </div>
  );
};

export default Profile;
