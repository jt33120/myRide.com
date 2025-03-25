import { useState } from 'react';
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Make sure this import is correct
import styles from '../styles/Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');  // State for storing error message
  const router = useRouter();

  const handleSignIn = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user; // Extract the user object
      console.log('User signed in:', user);

      // Redirect to the dashboard with user information
      router.push({
        pathname: "/myDashboard_page",
        query: { uid: user.uid, email: user.email }, // Pass user details as query parameters
      });
    } catch (error) {
      console.error("Error during sign-in:", error.code); // Log only the error code for debugging

      // Provide user-friendly error messages
      switch (error.code) {
        case 'auth/user-not-found':
          setError('The email you entered is not associated with an account.');
          break;
        case 'auth/wrong-password':
          setError('The password you entered is incorrect.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        case 'auth/invalid-credential':
          setError('There was an issue with your credentials. Please try again.');
          break;
        default:
          setError('Unable to log in. Please check your credentials and try again.');
          break;
      }
    }
  };

  return (
    <div className={styles.authContainer}>
      <h2>Login</h2>
      <p>For privacy reason, you need to be logged in to access any data on the website.</p>

      <input 
        type="email" 
        placeholder="Email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />

      <button onClick={() => handleSignIn(email, password)}>Login</button>

      {/* Display error message if there is an error */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <p>
        No account yet? Create one, it takes 2sec!{" "}
        <button onClick={() => router.push("/signup_page")}>Register</button>
      </p>
    </div>
  );
}
