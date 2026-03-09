import React, { useEffect, useState, useContext } from 'react';
import { supabase } from './supabaseClient';
import { searchMovies } from './tmdb';
import MovieModal from './MovieModal';
import ProfileModal from './ProfileModal';
import Feed from './Feed';
import { AuthContext } from './AuthContext';
import './App.css';

function App() {
  const session = useContext(AuthContext);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [currentView, setCurrentView] = useState('archive'); // 'archive' or 'feed'
  const [username, setUsername] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    // Fetch user's profile to get username for sharing, and ensure profile exists
    const fetchProfile = async () => {
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .maybeSingle(); 
          
        if (data && data.username) {
          setUsername(data.username);
        } else {
          // Profile doesn't exist. Create a default one.
          const fallbackUsername = 'user_' + Math.random().toString(36).substring(2, 8);
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert([{ id: session.user.id, username: fallbackUsername, theme_preference: 'light' }]);
          
          if (!insertError) {
             setUsername(fallbackUsername);
          } else {
             console.error('Error auto-creating profile:', insertError.message);
          }
        }
      }
    };
    fetchProfile();
  }, [session]);

  useEffect(() => {
    // Fetch user's movie logs from Supabase
    const fetchMovieLogs = async () => {
      if (!session) {
        setMovies([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('movie_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .order('watched_date', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setMovies(data);
        }
      } catch (err) {
        console.error('Error fetching movie logs:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieLogs();
  }, [session]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      alert(`Google Login Error: ${error.message}\n(Supabase 대시보드에서 Google Provider가 활성화되어 있는지 확인해주세요.)`);
      console.error('Error logging in:', error.message);
    }
  };

  const handleEmailAuth = async (e, isSignUp) => {
    e.preventDefault();
    const email = prompt("이메일을 입력하세요:");
    if (!email) return;
    const password = prompt("비밀번호를 입력하세요 (최소 6자리):");
    if (!password) return;

    if (isSignUp) {
      // For sign up, we also need a username for the profiles table.
      // We will let the db trigger handle profile creation or just create a random one,
      // actually our DB schema requires 'username'. Let's ask for username.
      const username = prompt("사용할 닉네임을 입력하세요:");
      if (!username) return;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(`가입 오류: ${error.message}`);
      } else {
        // Create profile manually since we don't have a backend trigger
        if (data.user) {
           const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, username: username }]);
            
            if (profileError) {
              console.error("Profile creation error", profileError);
              alert("계정은 생성되었으나 프로필 생성에 실패했습니다. 유저네임이 중복될 수 있습니다.");
            } else {
              alert("회원가입 성공! 이제 로그인 되었습니다.");
            }
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(`로그인 오류: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await searchMovies(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleLogMovie = (movie) => {
    setSelectedMovie(movie);
  };

  const handleModalClose = () => {
    setSelectedMovie(null);
  };

  const handleModalAdd = (newLog) => {
    setMovies(prevMovies => [newLog, ...prevMovies].sort((a,b) => new Date(b.watched_date) - new Date(a.watched_date)));
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <h1 className="logo">FILM LOG</h1>
        <nav>
          {session ? (
            <div className="nav-group">
              <button 
                className={`nav-button ${currentView === 'archive' ? 'active' : ''}`} 
                onClick={() => setCurrentView('archive')}
              >
                Archive
              </button>
              <button 
                className={`nav-button ${currentView === 'feed' ? 'active' : ''}`} 
                onClick={() => setCurrentView('feed')}
              >
                Feed
              </button>
              <button 
                className="nav-button" 
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Profile
              </button>
              <span className="user-email">{session.user?.email}</span>
              <button className="nav-button login" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
             <div className="nav-group">
              <button className="nav-button" onClick={(e) => handleEmailAuth(e, false)}>Email Login</button>
              <button className="nav-button" onClick={(e) => handleEmailAuth(e, true)}>Sign Up</button>
              <button className="nav-button login" onClick={handleGoogleLogin}>Google Login</button>
            </div>
          )}
        </nav>
      </header>
      
      <main className="main-content">
        <section className="profile-section">
          <h2>{session ? "My Movie Archive" : "Welcome to FILM LOG"}</h2>
          <p className="bio">
            {session 
              ? "Collection of films I've watched and loved." 
              : "A minimalist space to log your films and discover others."}
          </p>
          {session && username && currentView === 'archive' && (
            <div className="profile-actions">
              <button 
                className="action-button share-button" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/user/${username}`);
                  alert('Profile link copied to clipboard!');
                }}
              >
                Share Profile Link
              </button>
            </div>
          )}
        </section>

        {session && (
          <section className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <input 
                type="text" 
                placeholder="Search movies by title..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h3>Search Results</h3>
                <div className="movie-grid mini">
                  {searchResults.slice(0, 5).map(movie => (
                    <div key={movie.id} className="movie-card search-card">
                       {movie.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} 
                          alt={movie.title} 
                          className="movie-poster"
                        />
                      ) : (
                        <div className="movie-poster-placeholder">No Poster</div>
                      )}
                      <div className="movie-overlay">
                        <p className="movie-title">{movie.title}</p>
                        <p className="movie-year">{movie.release_date?.substring(0,4)}</p>
                        <button className="add-button" onClick={() => handleLogMovie(movie)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {session && currentView === 'archive' && (
          <>
            <h3 className="section-title">My Logs</h3>
            {loading ? (
              <div className="loading">Loading your archive...</div>
            ) : (
              <div className="movie-grid">
                {movies.length > 0 ? (
                  movies.map((movie) => (
                    <div key={movie.id} className="movie-card">
                      {movie.poster_path ? (
                        <img 
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                          alt="Movie poster" 
                          className="movie-poster"
                        />
                      ) : (
                        <div className="movie-poster-placeholder">No Poster</div>
                      )}
                      <div className="movie-overlay">
                        <p className="rating">★ {movie.rating}</p>
                        {movie.theater_name && <p className="theater">@ {movie.theater_name}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No movies tracked yet. Search and add your first film!</p>
                )}
              </div>
            )}
          </>
        )}

        {session && currentView === 'feed' && (
          <Feed />
        )}
      </main>

      {selectedMovie && (
        <MovieModal 
          movie={selectedMovie} 
          onClose={handleModalClose} 
          onAdd={handleModalAdd} 
        />
      )}

      {isEditingProfile && (
        <ProfileModal 
          session={session} 
          currentUsername={username} 
          onClose={() => setIsEditingProfile(false)} 
          onUpdate={(newUsername) => setUsername(newUsername)} 
        />
      )}
    </div>
  );
}

export default App;
