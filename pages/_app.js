import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import Layout from '../components/Layout';
import Head from 'next/head';
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
        // Redirect only if the user is on public pages
        if (['/Welcome_page', '/login_page', '/signup_page'].includes(router.pathname)) {
          const redirectUrl = router.query.redirect || '/myDashboard_page';
          router.push(redirectUrl); // Redirect to the intended page or dashboard
        }
      } else {
        // Redirect to login with the current page as the redirect parameter
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
        const redirectUrl = router.query.redirect || '/myDashboard_page';
        router.push(redirectUrl); // Redirect to the intended page or dashboard
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
    <>
      <Head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MyRide" />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;