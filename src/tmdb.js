const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export const searchMovies = async (query) => {
  if (!query) return [];
  
  try {
    let response = await fetch(
      `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ko-KR&page=1&include_adult=false`
    );
    
    if (!response.ok) throw new Error('Failed to fetch movies');
    
    let data = await response.json();

    // Fallback: If no results found, try adding space before numbers (e.g. 범죄도시2 -> 범죄도시 2)
    if (data.results && data.results.length === 0) {
      const spacedQuery = query.replace(/([가-힣a-zA-Z])(\d+)/g, '$1 $2');
      if (spacedQuery !== query) {
        response = await fetch(
          `${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(spacedQuery)}&language=ko-KR&page=1&include_adult=false`
        );
        data = await response.json();
      }
    }
    
    return data.results || [];
  } catch (error) {
    console.error('TMDB Search Error:', error);
    return [];
  }
};

export const getMovieDetails = async (movieId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ko-KR`
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
      `${BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}&language=ko-KR`
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
