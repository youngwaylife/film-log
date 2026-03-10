const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const searchMovies = async (query) => {
  if (!query) return [];
  
  try {
    const response = await fetch(
      `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch movies');
    }
    
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('TMDB Search Error:', error);
    return [];
  }
};

export const getMovieDetails = async (movieId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch movie details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('TMDB Details Error:', error);
    return null;
  }
};

export const getMovieCredits = async (movieId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=en-US`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch movie credits');
    }
    
    return await response.json();
  } catch (error) {
    console.error('TMDB Credits Error:', error);
    return null;
  }
};
