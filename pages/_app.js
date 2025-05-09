// pages/_app.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import Layout from "../components/Layout";
import Head from "next/head";

// → Import de **tous** tes CSS globaux au même endroit
import "../styles/globals.css";
import "../styles/Navbar.css";

import { UserProvider } from "../context/UserContext";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  // Vérification de l'authentification & redirections
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecked(true);

      if (u) {
        if (
          ["/Welcome_page", "/login_page", "/signup_page"].includes(
            router.pathname
          )
        ) {
          const redirectUrl = router.query.redirect || "/";
          router.push(redirectUrl);
        }
      } else {
        if (router.pathname === "/") {
          router.push("/");
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Timeout de déconnexion pour inactivité (24 h ici)
  useEffect(() => {
    let timeoutId;
    const logoutUser = () => {
      auth.signOut().then(() => {
        router.push("/login_page");
      });
    };
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutUser, 24 * 60 * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
      window.addEventListener(evt, resetTimeout)
    );
    resetTimeout();
    return () => {
      clearTimeout(timeoutId);
      ["mousemove", "keydown", "click", "scroll"].forEach((evt) =>
        window.removeEventListener(evt, resetTimeout)
      );
    };
  }, []);

  // Gestion des erreurs globales
  useEffect(() => {
    const handleRouteChangeError = (err, url) => {
      console.error("Erreur de routage vers :", url, err);
    };

    router.events.on("routeChangeError", handleRouteChangeError);
    return () => {
      router.events.off("routeChangeError", handleRouteChangeError);
    };
  }, [router]);

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <UserProvider>
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
    </UserProvider>
  );
}

export default MyApp;
