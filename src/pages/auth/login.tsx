import { useState } from "react";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  console.log('Login:', { email, password });
};

  return (
    <div className="auth-container surface-level-2-glass">
      <h2 className="auth-title glow-primary">Login</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />

        <button type="submit" className="auth-button">
          Login
        </button>
      </form>
    </div>
  );
}