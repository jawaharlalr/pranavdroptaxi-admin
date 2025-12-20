import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Track admin status
  const [loading, setLoading] = useState(true);

  // The Super Admin UID
  const ADMIN_UID = 'g4FK5ikaqhM74QkTbrC6jYQZYAB2';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if the logged-in user matches your specific UID
        if (user.uid === ADMIN_UID) {
          setIsAdmin(true);
        } else {
          // Optional: You could still check Firestore for other admins here if needed
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};