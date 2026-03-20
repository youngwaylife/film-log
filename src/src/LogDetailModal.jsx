import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getMovieDetails, getMovieCredits } from './tmdb';
import './LogDetailModal.css';

const LogDetailModal = ({ log, onClose, session, onCommentAdded, onLogUpdated }) => {
  const [movieDetails, setMovieDetails] = useState(null);
  const [director, setDirector] = useState('Unknown');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!log || !log.tmdb_id) return;
      
      setLoading(true);
      try {
        // 1. Fetch Movie Info from TMDB
        const details = await getMovieDetails(log.tmdb_id);
        const credits = await getMovieCredits(log.tmdb_id);
        
        if (details) setMovieDetails(details);
        if (credits && credits.crew) {
          const dir = credits.crew.find(person => person.job === 'Director');
          if (dir) setDirector(dir.name);
        }

        // 2. Fetch Comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            profiles(username, avatar_url)
          `)
          .eq('log_id', log.id)
          .order('created_at', { ascending: true });

        if (!commentsError && commentsData) {
          setComments(commentsData);
        }

        // 3. Fetch Likes Count & Status
        const { count: totalLikes, error: countError } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('log_id', log.id);
          
        if (!countError) setLikeCount(totalLikes || 0);

        if (session) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('log_id', log.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
            
          if (userLike) setIsLiked(true);
        }

      } catch (err) {
        console.error("Error loading log details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [log, session]);

  const handleToggleLike = async () => {
    if (!session) {
      alert("You need to be logged in to like.");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('log_id', log.id)
          .eq('user_id', session.user.id);
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert([{ log_id: log.id, user_id: session.user.id }]);
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
      if (onLogUpdated) onLogUpdated(log.id, { isLiked: !isLiked, likeCount: isLiked ? likeCount - 1 : likeCount + 1 });
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!session) {
      alert("You need to be logged in to comment.");
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          log_id: log.id,
          user_id: session.user.id,
          content: newComment.trim()
        }])
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setComments(prev => [...prev, data]);
        setNewComment("");
        if (onCommentAdded) onCommentAdded(log.id);
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content log-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        {loading ? (
          <div className="loading">Loading details...</div>
        ) : (
          <div className="detail-split">
            {/* Left: Poster */}
            <div className="detail-left">
              {log.poster_path ? (
                <img 
                  src={`https://image.tmdb.org/t/p/w500${log.poster_path}`} 
                  alt="Movie Poster" 
                  className="detail-poster"
                />
              ) : (
                <div className="movie-poster-placeholder">No Poster</div>
              )}
            </div>
            
            {/* Right: Info & Social */}
            <div className="detail-right">
              <div className="detail-header">
                <h2>{movieDetails?.title || 'Unknown Title'}</h2>
                <p className="detail-meta">
                  {movieDetails?.release_date?.substring(0, 4) || 'YYYY'} • Dir. {director}
                </p>
              </div>

              <div className="user-review-box">
                <div className="review-author">
                  {log.profiles?.avatar_url ? (
                    <img src={log.profiles.avatar_url} alt="Avatar" className="avatar-mini-img" />
                  ) : (
                    <div className="avatar-mini">
                      {log.profiles?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="username">{log.profiles?.username || 'Anonymous'}</span>
                  <span className="rating-badge">★ {log.rating}</span>
                </div>
                {log.notes && <p className="review-notes">"{log.notes}"</p>}
                {log.theater_name && <p className="review-theater">@ {log.theater_name}</p>}
                <p className="review-date">{new Date(log.watched_date).toLocaleDateString()}</p>
              </div>

              <div className="social-actions">
                <button 
                  className={`like-action-btn ${isLiked ? 'liked' : ''}`} 
                  onClick={handleToggleLike}
                >
                  {isLiked ? '♥' : '♡'} {likeCount}
                </button>
              </div>

              <div className="comments-section">
                <h3>Comments ({comments.length})</h3>
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="empty-comments">No comments yet. Be the first!</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="comment-item">
                        <span className="comment-author">{c.profiles?.username}:</span>
                        <span className="comment-text">{c.content}</span>
                      </div>
                    ))
                  )}
                </div>

                {session ? (
                  <form onSubmit={handleAddComment} className="comment-form">
                    <input 
                      type="text" 
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={200}
                    />
                    <button type="submit" disabled={submitting || !newComment.trim()}>Post</button>
                  </form>
                ) : (
                  <p className="login-prompt">Log in to add a comment.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogDetailModal;
