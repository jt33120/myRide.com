import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import Layout from '../components/Layout';
import '../styles/globals.css';
import '../styles/Navbar.css';
import '../styles/Footer.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthChecked(true);
      if (user) {
        // User is authenticated, redirect to myDashboard_page if trying to access restricted pages
        if (['/Welcome_page', '/login_page', '/signup_page'].includes(router.pathname)) {
          router.push('/myDashboard_page');
        }
      } else {
        // User is not authenticated, redirect to Welcome_page if trying to access any other page
        if (!['/Welcome_page', '/login_page', '/signup_page'].includes(router.pathname)) {
          const redirectUrl = router.asPath;
          router.push(`/login_page?redirect=${encodeURIComponent(redirectUrl)}`);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (authChecked) {
      if (user && ['/Welcome_page', '/login_page', '/signup_page'].includes(router.pathname)) {
        router.push('/myDashboard_page');
      } else if (!user && !['/Welcome_page', '/login_page', '/signup_page'].includes(router.pathname)) {
        const redirectUrl = router.asPath;
        router.push(`/login_page?redirect=${encodeURIComponent(redirectUrl)}`);
      }
    }
  }, [authChecked, user, router]);

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp;