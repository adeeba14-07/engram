# Engram frontend

Next.js 14 (App Router) + Tailwind. Screens: `/`, `/signup`, `/login`, `/onboarding`, `/chat` (the chat layout is responsive, so there is no separate mobile page).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Backend: `https://engram-api-srkb.onrender.com` (set in `.env.local`; the backend must allow your frontend origin in CORS). On Vercel, add the same env var.

Theme: light/dark toggle in every header, saved in localStorage and defaulting to the OS setting.
