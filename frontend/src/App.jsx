import { useRef, useState } from 'react';
import { askQuestion } from './api.js';
import Login from './components/Login.jsx';
import QuestionForm from './components/QuestionForm.jsx';
import Answer from './components/Answer.jsx';

// sessionStorage so a page refresh doesn't log you out, but closing the tab does
function loadToken() {
  try {
    return sessionStorage.getItem('token');
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    if (token) sessionStorage.setItem('token', token);
    else sessionStorage.removeItem('token');
  } catch {
    // storage blocked (private mode etc.) - token just stays in memory
  }
}

export default function App() {
  const [token, setToken] = useState(loadToken);
  const [loginError, setLoginError] = useState('');
  const [history, setHistory] = useState([]); // newest first
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  function login(newToken) {
    saveToken(newToken);
    setToken(newToken);
    setLoginError('');
  }

  function logout(message = '') {
    abortRef.current?.abort();
    saveToken(null);
    setToken(null);
    setHistory([]);
    setLoginError(message);
  }

  async function handleAsk(question) {
    const id = Date.now();
    setHistory((prev) => [{ id, question, status: 'loading' }, ...prev]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const updateItem = (changes) =>
      setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

    try {
      const result = await askQuestion(question, token, controller.signal);
      updateItem({ status: 'done', result });
    } catch (err) {
      updateItem({ status: 'error', error: { code: err.code, message: err.message } });
      // token expired or invalid -> send the user back to login
      if (err.status === 401) logout(err.message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>AI Query Assistant</h1>
        {token && (
          <button className="button button--ghost" onClick={() => logout()}>
            Sign out
          </button>
        )}
      </header>

      <main className="main">
        {!token ? (
          <Login onLogin={login} error={loginError} setError={setLoginError} />
        ) : (
          <>
            <QuestionForm onAsk={handleAsk} onCancel={() => abortRef.current?.abort()} loading={loading} />

            {history.length === 0 ? (
              <p className="empty">Ask something and the answer will show up here.</p>
            ) : (
              <ol className="history">
                {history.map((item) => (
                  <Answer key={item.id} item={item} />
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </div>
  );
}
