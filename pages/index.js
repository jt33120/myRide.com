// pages/index.js
import PrivateRoute from "../components/PrivateRoute";  // Adjust path if necessary
import WelcomePage from "../pages/Welcome_page";  // Adjust path if necessary

export default function Home() {
  return (
    <PrivateRoute>
      <WelcomePage />
    </PrivateRoute>
  );
}
