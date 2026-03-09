import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Outlet } from 'react-router-dom';

// We wrap App contents here or use it to manage global auth state if needed.
// For now we will keep App.jsx as the home route and use this space for any global layout changes.
export const AuthContext = React.createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={session}>
      {children}
    </AuthContext.Provider>
  )
}
