import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './Feed.css';

const Feed = () => {
  const [feedLogs, setFeedLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        // Fetch recent logs from everyone, including their profile info
        const { data, error } = await supabase
          .from('movie_logs')
          .select(`
            *,
            profiles(username, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        if (data) {
          setFeedLogs(data);
        }
      } catch (err) {
        console.error('Error fetching feed:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  if (loading) return <div className="loading">Loading feed...</div>;
  if (feedLogs.length === 0) return <div className="empty-state">No recent activity found.</div>;

  return (
    <div className="feed-container">
      <h3 className="section-title">Community Activity</h3>
      
      <div className="masonry-grid">
        {feedLogs.map(log => (
          <div key={log.id} className="feed-item movie-card">
            {log.poster_path ? (
               <img 
               src={`https://image.tmdb.org/t/p/w400${log.poster_path}`} 
               alt="Movie poster" 
               className="feed-poster movie-poster"
             />
            ) : (
               <div className="movie-poster-placeholder">No Poster</div>
            )}
            
            <div className="movie-overlay feed-overlay">
              <div className="feed-hover-header">
                {log.profiles?.avatar_url ? (
                  <img src={log.profiles.avatar_url} alt="Avatar" className="avatar-mini-img" />
                ) : (
                  <div className="avatar-mini">
                    {log.profiles?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <span className="feed-hover-username">{log.profiles?.username || 'Anonymous'}</span>
              </div>
              
              <div className="feed-hover-rating">★ {log.rating}</div>
              
              {log.notes && <p className="feed-hover-notes">"{log.notes}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
