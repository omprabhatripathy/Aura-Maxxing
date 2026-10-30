import { useState } from "react";
import type { FormEvent } from "react";
import "./Auth.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    console.log("Register:", {
      username,
      email,
      password,
    });
  };

  return (
    <div className="auth-container surface-level-2-glass">
      <h2 className="auth-title glow-primary">Register</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="auth-input"
        />

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
          Register
        </button>
      </form>
    </div>
  );
}