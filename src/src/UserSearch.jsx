import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './UserSearch.css';

const UserSearch = ({ onUserSelected }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      // Partial match on username (case insensitive)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="user-search-container">
      <h3 className="section-title">Find Users</h3>
      <form onSubmit={handleSearch} className="search-form user-search-form">
        <input 
          type="text" 
          placeholder="Search by username..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {hasSearched && (
        <div className="user-search-results">
          {searchResults.length > 0 ? (
            <div className="user-list">
              {searchResults.map(user => (
                <div 
                  key={user.id} 
                  className="user-list-item clickable"
                  onClick={() => onUserSelected(user.id, user.username)}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="user-list-avatar" />
                  ) : (
                    <div className="user-list-avatar-placeholder">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="user-list-info">
                    <span className="user-list-username">{user.username}</span>
                    {user.bio && <span className="user-list-bio">{user.bio}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No users found matching "{searchQuery}".</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
