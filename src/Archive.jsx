import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LogDetailModal from './LogDetailModal';
import './Archive.css';

const Archive = ({ session, username }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchArchive();
  }, [session, sortBy]);

  const fetchArchive = async () => {
    if (!session) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('movie_logs')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .eq('user_id', session.user.id);

      if (sortBy === 'latest') {
        query = query.order('watched_date', { ascending: false });
      } else if (sortBy === 'rating') {
        query = query.order('rating', { ascending: false }).order('watched_date', { ascending: false });
      }

      const { data, error } = query;
      if (error) throw error;
      if (data) setLogs(data);
    } catch (err) {
      console.error('Error fetching archive logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogUpdated = (logId, updates) => {
    // Optionally update local state if needed (mostly for likes, though Archive doesn't show likes directly on Grid)
    fetchArchive(); // Simple way is to refresh, though less efficient
  };

  return (
    <div className="archive-view">
      <div className="archive-header-controls">
        <h3 className="section-title">My Archive</h3>
        <select 
          className="sort-select" 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="latest">Sort by Latest</option>
          <option value="rating">Sort by Rating</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading your archive...</div>
      ) : (
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
                  {log.theater_name && <p className="theater">@ {log.theater_name}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No movies tracked yet. Search and add your first film!</p>
          )}
        </div>
      )}

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          session={session} 
          onClose={() => setSelectedLog(null)} 
          onCommentAdded={fetchArchive}
          onLogUpdated={handleLogUpdated}
        />
      )}
    </div>
  );
};

export default Archive;
