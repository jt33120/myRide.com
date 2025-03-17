// PrivateRoute.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';

const PrivateRoute = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          router.push('/login_page');
        }
      });

      return () => unsubscribe();
    }
  }, [router]);

  return children;
};

export default PrivateRoute;
