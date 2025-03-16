// PrivateRoute.js
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { auth } from '../lib/firebase';

const PrivateRoute = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    if (auth.currentUser) {
      router.push("/dashboard"); // Redirect to dashboard if logged in
    }
  }, []);

  return !auth.currentUser ? children : null; // Only render children if not logged in
};

export default PrivateRoute;
