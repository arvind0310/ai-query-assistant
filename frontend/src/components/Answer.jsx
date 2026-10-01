import Markdown from 'react-markdown';

// Extra tip shown under some errors.
// Keys are the error codes from backend/src/utils/errorCodes.js
const ERROR_TIPS = {
  LLM_TIMEOUT: 'The model might be busy. Try again or ask a shorter question.',
  LLM_RATE_LIMITED: 'Wait a few seconds and try again.',
  RATE_LIMITED: 'You are sending too many requests. Wait a minute.',
  LLM_REFUSED: 'Try asking in a different way.',
  NETWORK_ERROR: 'Check that the backend is running.',
};

export default function Answer({ item }) {
  const { question, status, result, error } = item;

  return (
    <li className="card answer-card">
      <p className="question">{question}</p>

      {status === 'loading' && (
        <p className="loading">
          <span className="spinner" /> Thinking...
        </p>
      )}

      {status === 'done' && (
        <>
          {/* react-markdown doesn't render raw HTML, so this is safe */}
          <div className="answer">
            <Markdown>{result.answer}</Markdown>
          </div>

          {result.truncated && <p className="notice">The answer was cut off because it got too long.</p>}

          <p className="meta">
            {result.model} · {result.usage?.inputTokens} in / {result.usage?.outputTokens} out tokens
          </p>
        </>
      )}

      {status === 'error' && error.code === 'CANCELLED' && <p className="meta">Cancelled</p>}

      {status === 'error' && error.code !== 'CANCELLED' && (
        <div className="alert">
          <strong>{error.message}</strong>
          {ERROR_TIPS[error.code] && <p>{ERROR_TIPS[error.code]}</p>}
          <p className="meta">Error code: {error.code}</p>
        </div>
      )}
    </li>
  );
}
