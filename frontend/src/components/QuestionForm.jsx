import { useState } from 'react';

// Same limit as the backend (QUERY_MAX_CHARS). Backend checks it anyway.
const MAX_LENGTH = 4000;

export default function QuestionForm({ onAsk, onCancel, loading }) {
  const [question, setQuestion] = useState('');

  const tooLong = question.length > MAX_LENGTH;
  const canSend = question.trim() !== '' && !tooLong && !loading;

  function send(e) {
    e?.preventDefault();
    if (!canSend) return;
    onAsk(question.trim());
    setQuestion('');
  }

  // Enter sends, Shift+Enter adds a new line
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  }

  return (
    <form className="card question-form" onSubmit={send}>
      <textarea
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
        aria-label="Your question"
        autoFocus
      />

      <div className="question-form__footer">
        <span className={tooLong ? 'counter counter--over' : 'counter'}>
          {question.length} / {MAX_LENGTH}
        </span>

        {loading ? (
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button type="submit" className="button" disabled={!canSend}>
            Ask
          </button>
        )}
      </div>
    </form>
  );
}
