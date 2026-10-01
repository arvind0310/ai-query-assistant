# AI Query Assistant

A simple web app where you type a question and get an answer from an AI (Claude, by Anthropic).

Built by **Arvind** as a  assignment for **Husqvarna Group** (Built this at 1 AM after 10 hours of office work .. at 5AM i have to go on a trip with my girlfriend, and here i am building this application! I'll explain in my interview how was the fight bw us in the morning).

* **Frontend:** React (Vite)

* **Backend:** Node.js + Express

* **AI:** Claude, through the official Anthropic SDK

* **Login:** JWT token

***

## What it does

1. You open the website and sign in. For this demo there's a "Sign in as demo user" button.
2. You type a question and press **Ask**.
3. The backend checks that you're logged in, checks that the question is OK, and sends it to Claude.
4. Claude's answer shows up on the page.
5. If something goes wrong (the AI is too slow, the network is down, the question is empty, and so on), you see a clear message instead of a crash.

***

## How it works (flow)

```
 Browser (React)                Backend (Express)                 Claude API
 ───────────────                ─────────────────                 ──────────
 1. Sign in      ──────────▶   gives back a JWT token
 2. Ask question ──────────▶   3. check token (JWT)
    (sends token)               4. check question (not empty, not too long)
                                5. send question  ──────────────▶  6. writes answer
                                7. get answer     ◀──────────────
 8. Show answer  ◀──────────   send answer back as JSON
```

When something fails, the backend always sends the same kind of response:

```json
{ "error": { "code": "LLM_TIMEOUT", "message": "The assistant took too long to respond, please try again" } }
```

The frontend reads `message` and shows it to the user. For some error codes it also shows a small tip.

***

## Folder structure

```
ai_project/
├── package.json             runs backend + frontend together
├── docker-compose.yml       runs both in Docker
├── DEPLOYMENT.md            how to deploy on Google Cloud (+ Azure/AWS mapping)
│
├── backend/
│   ├── app.js               sets up Express, middleware and routes
│   ├── server.js            starts the server
│   ├── src/
│   │   ├── config/          reads settings from .env
│   │   ├── routes/          URL paths (/api/query, /api/auth)
│   │   ├── controllers/     what each route does
│   │   ├── middleware/      JWT check, rate limit, error handler
│   │   ├── services/        talks to Claude
│   │   └── utils/           small helpers (JWT, HttpError, errorCodes)
│   ├── scripts/             generateToken.js, prints a test token
│   ├── test/                backend tests
│   ├── Dockerfile
│   └── .env.example         list of settings (copy this to .env)
│
└── frontend/
    ├── src/
    │   ├── App.jsx          main page: login state and question history
    │   ├── api.js           calls the backend
    │   └── components/      Login, QuestionForm, Answer
    ├── Dockerfile
    └── nginx.conf.template
```

***

## How to run it

**You need:** Node.js 20 or newer, and an Anthropic API key (get one at <https://console.anthropic.com>).

**1. Add your settings**

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

* `ANTHROPIC_API_KEY`: your key

* `JWT_SECRET`: any long random text (32+ characters). You can make one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

**2. Install and start** (from the main `ai_project` folder)

```bash
npm install     # installs everything (root, backend, frontend)
npm run dev     # starts backend (port 3001) and frontend (port 5173)
```

**3. Open** <http://localhost:5173> and click **Sign in as demo user**.

### Run the tests

```bash
npm test
```

These are backend tests. They use a fake Claude, so they don't need an API key or the internet. They cover:

* Login: no token, a wrong token, an expired token

* Bad input: an empty question, a question that's too long, broken JSON

* Turning each kind of Claude error into the right message

* Making sure internal error details are never sent to the user

### Run with Docker

```bash
docker compose up --build    # then open http://localhost:8080
```

To run just the backend container:

```bash
docker build -t ai-query-backend ./backend
docker run -p 3001:3001 --env-file backend/.env ai-query-backend
```

***

## API

| Method | URL                    | Login needed | What it does                                             |
| ------ | ---------------------- | ------------ | -------------------------------------------------------- |
| GET    | `/health`              | No           | Says if the server is up                                 |
| POST   | `/api/auth/demo-token` | No           | Gives a test token (only when `ENABLE_DEMO_LOGIN=true`)  |
| POST   | `/api/query`           | Yes          | Send `{ "query": "your question" }`, get the answer back |

Try it with curl:

```bash
TOKEN=$(cd backend && npm run -s token)

curl -X POST http://localhost:3001/api/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is JWT?"}'
```

A successful answer looks like this:

```json
{
  "answer": "JWT (JSON Web Token) is ...",
  "model": "claude-opus-5-5",
  "truncated": false,
  "usage": { "inputTokens": 40, "outputTokens": 120 }
}
```

***

## Error handling

| What happened                       | Status | Code                                               |
| ----------------------------------- | ------ | -------------------------------------------------- |
| No token, or a wrong one            | 401    | `AUTH_REQUIRED` / `TOKEN_INVALID`                  |
| Token expired                       | 401    | `TOKEN_EXPIRED`                                    |
| Empty or too-long question          | 400    | `INVALID_INPUT`                                    |
| Broken JSON body                    | 400    | `INVALID_JSON`                                     |
| Too many requests from you          | 429    | `RATE_LIMITED`                                     |
| Claude refused to answer            | 422    | `LLM_REFUSED`                                      |
| Claude is busy (rate limit)         | 503    | `LLM_RATE_LIMITED`                                 |
| Claude took too long                | 504    | `LLM_TIMEOUT`                                      |
| Can't reach Claude / Claude is down | 502    | `LLM_UNREACHABLE` / `LLM_UNAVAILABLE`              |
| Our API key is wrong                | 502    | `LLM_MISCONFIGURED`                                |
| Any other bug                       | 500    | `INTERNAL_ERROR` (details only in the server logs) |

All of these codes are listed in one place, `backend/src/utils/errorCodes.js`, so the backend and the frontend use the same names.

The `LLM_*` codes are my own. They're mapped from Anthropic's errors in `backend/src/services/llmService.js`. Anthropic's original error codes and what they mean:

* Anthropic API errors (400, 401, 402, 403, 404, 413, 429, 500, 529): <https://platform.claude.com/docs/en/api/errors>

* Error classes in the Node.js SDK (`RateLimitError`, `APIConnectionTimeoutError`, and so on): <https://github.com/anthropics/anthropic-sdk-typescript#handling-errors>
