import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StarRating from './StarRating';
import { getMovieCredits } from './tmdb';
import './MovieModal.css';

const MovieModal = ({ movie, onClose, onAdd }) => {
  const [rating, setRating] = useState(3.0);
  const [notes, setNotes] = useState('');
  const [theater, setTheater] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [director, setDirector] = useState('');

  useEffect(() => {
    if (movie && movie.id) {
      getMovieCredits(movie.id).then(credits => {
        if (credits && credits.crew) {
          const dir = credits.crew.find(person => person.job === 'Director');
          if (dir) setDirector(dir.name);
        }
      });
    }
  }, [movie]);

  if (!movie) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to save a log.");
        return;
      }

      const { data, error } = await supabase
        .from('movie_logs')
        .insert([
          { 
            user_id: session.user.id,
            tmdb_id: movie.id, 
            watched_date: date,
            rating: parseFloat(rating),
            notes: notes,
            theater_name: theater,
            poster_path: movie.poster_path
          }
        ])
        .select();

      if (error) {
        console.error("Supabase insert error details:", error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      onAdd(data[0]); // pass the new log back to parent
      onClose();
    } catch (err) {
      console.error('Error saving movie log:', err);
      alert(`Failed to save: ${err.message}\nCheck console for details.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img 
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
            alt={movie.title} 
            className="modal-poster" 
          />
          <div className="modal-title-area">
            <h2>{movie.title}</h2>
            <p className="modal-year">
              {movie.release_date?.substring(0,4)}
              {director && ` • Dir. ${director}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Watched Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              required
            />
          </div>
          
          <div className="form-group star-group">
            <label>Rating</label>
            <StarRating rating={rating} setRating={setRating} />
          </div>

          <div className="form-group">
            <label>Theater / Venue (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. AMC Lincoln Square" 
              value={theater} 
              onChange={e => setTheater(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Personal Notes</label>
            <textarea 
              rows="3" 
              placeholder="What did you think?" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>

          <button type="submit" className="save-button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Log'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MovieModal;
