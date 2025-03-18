import { SpeedInsights } from "@vercel/speed-insights/next";
import NavBar from './Navbar';

const Layout = ({ children }) => {
  return (
    <>
      <SpeedInsights />
      <NavBar />
      <main>{children}</main>
    </>
  );
};

export default Layout;
