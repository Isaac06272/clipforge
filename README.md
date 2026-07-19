# clipforge

React (Vite + Tailwind v4) frontend + Express backend, wired together end to end
following the upload → configure → processing → select → export → history flow.

## What's real vs. mocked

**Real:** routing, session state, the full API contract between frontend and
backend, job polling, multi-clip selection, ratio re-export.

**Mocked (stubbed for you to replace):**
- Video upload — `Configure.jsx` only reads the file's name/size; wire in an
  actual multipart upload (or direct-to-storage) when you add real processing.
- `jobStore.js` simulates processing with a timer instead of running
  Whisper/FFmpeg — swap in real job logic here.
- Candidate clips and download files are placeholders.

## Run it

**Backend**
```
cd backend
npm install
npm run dev        # http://localhost:4000
```

**Frontend**
```
cd frontend
npm install
cp .env.example .env    # points VITE_API_URL at the backend
npm run dev         # http://localhost:5173
```

## Structure

```
frontend/
  src/
    components/    Header, RatioPicker — shared across every screen
    pages/          Landing, Configure, Processing, Select, Export, History
    lib/
      SessionContext.jsx   session state (file, ratio, mode, candidates, etc.)
      api.js                thin fetch wrapper around the backend
backend/
  server.js         express entry point
  jobStore.js        in-memory job simulation — replace with real processing
  routes/
    jobs.js          create job, poll status, get candidates
    export.js         export + re-export + placeholder download
```


