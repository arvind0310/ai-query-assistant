import { useState } from 'react';
import { getDemoToken } from '../api.js';

export default function Login({ onLogin, error, setError }) {
  const [pastedToken, setPastedToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function demoLogin() {
    setLoading(true);
    try {
      const data = await getDemoToken();
      onLogin(data.token);
    } catch (err) {
      // 404 means ENABLE_DEMO_LOGIN is off on the backend
      setError(err.status === 404 ? 'Demo login is turned off. Paste a token instead.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    if (pastedToken.trim()) onLogin(pastedToken.trim());
  }

  return (
    <section className="card login">
      <h2>Sign in</h2>
      <p className="muted">The API needs a JWT token. Click below to get a test one.</p>

      <button className="button" onClick={demoLogin} disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in as demo user'}
      </button>

      <form className="login__paste" onSubmit={handlePaste}>
        <label htmlFor="token">
          Or paste a token (run <code>npm run token</code> in the backend folder)
        </label>
        <div className="login__row">
          <input
            id="token"
            type="password"
            value={pastedToken}
            onChange={(e) => setPastedToken(e.target.value)}
            placeholder="eyJhbGciOi..."
          />
          <button type="submit" className="button button--ghost" disabled={!pastedToken.trim()}>
            Use token
          </button>
        </div>
      </form>

      {error && <p className="alert">{error}</p>}
    </section>
  );
}
