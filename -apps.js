import "../styles/globals.css";
import Footer from "./components/Footer";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      {/* Footer is rendered only on desktop using hidden md:block */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );
}

export default MyApp;
