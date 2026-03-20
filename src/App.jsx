import React, { useEffect, useState, useContext } from 'react';
import { supabase } from './supabaseClient';
import { searchMovies } from './tmdb';
import MovieModal from './MovieModal';
import ProfileModal from './ProfileModal';
import Feed from './Feed';
import Archive from './Archive';
import UserSearch from './UserSearch';
import UserProfile from './UserProfile';
import { AuthContext } from './AuthContext';
import './App.css';

function App() {
  const session = useContext(AuthContext);
  
  // Navigation State
  const [currentView, setCurrentView] = useState('archive'); // 'archive', 'feed', 'searchUsers', 'userProfile'
  const [username, setUsername] = useState(null);
  const [viewedUserId, setViewedUserId] = useState(null);
  const [viewedUsername, setViewedUsername] = useState(null);

  const handleUserSelected = (id, targetUsername) => {
    setViewedUserId(id);
    setViewedUsername(targetUsername);
    setCurrentView('userProfile');
  };

  const handleBackToSearch = () => {
    setCurrentView('searchUsers');
    setViewedUserId(null);
    setViewedUsername(null);
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal state
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Refresh trigger for Archive when new log is added
  const [refreshKey, setRefreshKey] = useState(0);

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
          const metaUsername = session.user?.user_metadata?.username;
          let fallbackUsername = metaUsername || ('user_' + Math.random().toString(36).substring(2, 8));
          
          let { error: insertError } = await supabase
            .from('profiles')
            .upsert([{ id: session.user.id, username: fallbackUsername, theme_preference: 'light' }]);
          
          if (insertError) {
             // If duplicate username, append random string
             fallbackUsername = fallbackUsername + '_' + Math.random().toString(36).substring(2, 6);
             const { error: retryError } = await supabase
               .from('profiles')
               .upsert([{ id: session.user.id, username: fallbackUsername, theme_preference: 'light' }]);
             
             insertError = retryError;
          }

          if (!insertError) {
             setUsername(fallbackUsername);
          } else {
             console.error('Error auto-creating profile:', insertError?.message);
             // Even if profile creation fails, we might still want to let them browse
             setUsername(fallbackUsername); 
          }
        }
      }
    };
    fetchProfile();
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
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) {
        alert(`가입 오류: ${error.message}`);
      } else {
        // Check if session exists (email confirmation disabled)
        if (data.session) {
           const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, username: username }]);
            
            if (profileError) {
              console.error("Profile creation error", profileError);
              alert("계정은 생성되었으나 프로필 생성에 실패했습니다. 유저네임이 중복될 수 있습니다.");
            } else {
              alert("회원가입 성공! 이제 로그인 되었습니다.");
            }
        } else {
           // No session means email confirmation is required.
           alert("회원가입 성공! 이메일을 확인하여 인증해주세요. 인증 후 로그인 시 프로필이 생성됩니다.");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message === 'Email not confirmed') {
          alert('이메일 인증이 완료되지 않았습니다. 가입하신 이메일의 수신함을 확인하여 인증을 완료해주세요.');
        } else {
          alert(`로그인 오류: ${error.message}`);
        }
      }
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
    // Instead of pushing to local array, we just trigger a refresh
    // of the Archive and Feed components by updating a key/state
    setRefreshKey(prev => prev + 1);
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
                className={`nav-button ${currentView === 'searchUsers' ? 'active' : ''}`} 
                onClick={() => setCurrentView('searchUsers')}
              >
                Find Users
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
        {(!session || currentView === 'archive') && (
          <section className="profile-section">
            <h2>{session ? "My Movie Archive" : "Welcome to FILM LOG"}</h2>
            <p className="bio">
              {session 
                ? "Collection of films I've watched and loved." 
                : "A minimalist space to log your films and discover others."}
            </p>
            {session && username && (
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
        )}

        {session && currentView === 'archive' && (
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
          <Archive key={refreshKey} session={session} username={username} />
        )}

        {session && currentView === 'feed' && (
          <Feed session={session} onUserClick={handleUserSelected} />
        )}

        {session && currentView === 'searchUsers' && (
          <UserSearch onUserSelected={handleUserSelected} />
        )}

        {session && currentView === 'userProfile' && viewedUserId && (
          <UserProfile 
            session={session} 
            targetUserId={viewedUserId} 
            targetUsername={viewedUsername} 
            onBack={handleBackToSearch} 
          />
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
