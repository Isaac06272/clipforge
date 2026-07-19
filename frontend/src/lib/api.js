const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  // If we are sending a FormData object (files), DO NOT set Content-Type.
  // The browser will automatically set it to multipart/form-data.
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { "Content-Type": "application/json" };

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...options.headers },
    ...options,
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  startJob: (payload) =>
    request("/api/jobs", { method: "POST", body: payload }), // Payload can now be FormData

  getJobStatus: (jobId) => request(`/api/jobs/${jobId}/status`),

  getCandidates: (jobId) => request(`/api/jobs/${jobId}/candidates`),

  exportClips: (payload) =>
    request("/api/export", { method: "POST", body: JSON.stringify(payload) }),

  reexport: (payload) =>
    request("/api/reexport", { method: "POST", body: JSON.stringify(payload) }),
};