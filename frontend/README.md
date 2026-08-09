# Clipforge — Frontend

React + Vite + Tailwind CSS v4 SPA for Clipforge. See the [root README](../README.md) for the full project overview.

## Flow

`/` Landing → `/configure` Upload + ratio + clip count/length/language → `/processing` AI job → `/select` pick a highlight → `/editor` CapCut-style styling (themes, 9-position captions, backgrounds, corners, fit, title, presets) → `/export` download.

## Local dev

```bash
npm install
npm run dev          # Vite dev server
```

The backend URL comes from `VITE_API_URL` in `.env` (defaults to `http://localhost:4000`).
