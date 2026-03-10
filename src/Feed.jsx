import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import LogDetailModal from './LogDetailModal';
import './Feed.css';

const Feed = ({ session }) => {
  const [feedLogs, setFeedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchFeed();
  }, [session]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      // For now, fetch all public logs. In a real app, you might filter by 'follows'
      // But we will just show everyone's logs to keep the feed active for demonstration.
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
        // Here we could map through and fetch initial like/comment counts, 
        // but for performance we might just fetch them individually in the modal.
        // Let's do a basic fetch to just display the feed list.
        setFeedLogs(data);
      }
    } catch (err) {
      console.error('Error fetching feed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogUpdated = (logId, updates) => {
    // If we were showing counts directly on the feed, we'd update them here.
  };

  if (loading) return <div className="loading">Loading feed...</div>;
  if (feedLogs.length === 0) return <div className="empty-state">No recent activity found.</div>;

  return (
    <div className="feed-container">
      <h3 className="section-title">Timeline</h3>
      
      <div className="feed-timeline">
        {feedLogs.map(log => (
          <div key={log.id} className="feed-post">
            <div className="feed-post-header">
              {log.profiles?.avatar_url ? (
                <img src={log.profiles.avatar_url} alt="Avatar" className="feed-avatar" />
              ) : (
                <div className="feed-avatar-placeholder">
                  {log.profiles?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span className="feed-username">{log.profiles?.username || 'Anonymous'}</span>
            </div>

            <div className="feed-post-image" onClick={() => setSelectedLog(log)}>
              {log.poster_path ? (
                 <img 
                 src={`https://image.tmdb.org/t/p/w500${log.poster_path}`} 
                 alt="Movie poster" 
               />
              ) : (
                 <div className="movie-poster-placeholder">No Poster</div>
              )}
              <div className="feed-post-overlay">
                <span>View Details</span>
              </div>
            </div>

            <div className="feed-post-content">
              <span className="feed-rating">★ {log.rating}</span>
              {log.notes && (
                <p className="feed-notes">
                  <span className="feed-notes-user">{log.profiles?.username}</span> {log.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          session={session} 
          onClose={() => setSelectedLog(null)} 
          onCommentAdded={fetchFeed}
          onLogUpdated={handleLogUpdated}
        />
      )}
    </div>
  );
};

export default Feed;
