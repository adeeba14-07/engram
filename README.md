# ENGRAM
## The support agent that remembers your laptop.

Tell Engram about your laptop once. It remembers every symptom and every fix, so you never explain the same problem twice.

## Live demo: 
https://engram-frontend-nine.vercel.app

## What it does
Engram is a laptop troubleshooting agent with persistent memory. You sign up, describe your device once, and from then on the agent remembers it: the symptoms you've reported, the fixes it suggested, and whether those fixes worked.

The point is the second conversation. A stateless chatbot asks you the same diagnostic questions every time. Engram doesn't — because it remembers what you said last week, and what already failed.

## How it works
Frontend: Next.js + Tailwind (Vercel)

Backend: FastAPI + PostgreSQL (Render)

Memory: Hindsight, one bank per user — https://github.com/vectorize-io/hindsight

LLM: Groq, openai/gpt-oss-120b

Every chat turn runs through a simple loop:

Recall — pull relevant memories from the user's Hindsight bank

Respond — call Groq with the recalled memories in the prompt

Retain — write the exchange back, but only if it matches the retention classifier

Memory is per-user, isolated by the JWT sub claim. There is no shared bank.

## Repository layout
```
engram/
├── backend/      FastAPI app, auth, agent, Hindsight integration
├── frontend/     Next.js app, chat UI, memory panel
└── docs/         Screenshots and design notes
```

## Key backend files
backend/main.py — API routes (auth, onboarding, chat, memory)

backend/agent.py — the recall/respond/retain loop, retention classifier, injection filter

backend/auth.py — JWT signup/login, get_current_user

backend/models.py — SQLAlchemy models (User, Device, Chat, Message, Outcome)

## Key frontend files
frontend/app/chat/page.tsx — the chat screen with the live memory panel

frontend/components/MemoryPanel.tsx — shows what Engram currently knows

frontend/lib/api.ts — typed API client with JWT handling

## To Run locally
Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
Frontend
```
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
Open http://localhost:3000.
```
## Memory design notes
Three deliberate choices worth knowing about:

Selective retention. Messages are only written to Hindsight if they hit a laptop-related signal. Small talk, meta-conversation, and injection attempts never reach the memory layer.

Injection defense before recall and retain. Prompt injection is a bigger problem with memory than without. The agent checks for injection patterns pre-LLM and returns a fixed response before touching memory.

Honest recall flag. Each recalled memory carries a used_in_prompt boolean, set by a relevance score threshold. The frontend renders this so the user can see which memories actually shaped the reply.

## Links
Hindsight GitHub: https://github.com/vectorize-io/hindsight

Hindsight docs: https://hindsight.vectorize.io/

Vectorize agent memory: https://vectorize.io/what-is-agent-memory
