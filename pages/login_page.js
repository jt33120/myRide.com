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

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // If authentication is successful, redirect to the dashboard
      router.push("/myDashboard_page");
    } catch {
      // If authentication fails, display an error message
      setError('Invalid email or password. Please try again.');
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

      <button onClick={handleLogin}>Login</button>

      {/* Display error message if there is an error */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <p>
        No account yet? Create one, it takes 2sec!{" "}
        <button onClick={() => router.push("/signup_page")}>Register</button>
      </p>
    </div>
  );
}
