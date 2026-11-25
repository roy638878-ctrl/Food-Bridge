const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export async function apiRequest(path, { method = "GET", body, isFormData = false } = {}) {
  const token = localStorage.getItem("foodbridge_token");
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!isFormData && body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const rawText = await res.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!json) {
    throw new Error(
      res.status >= 500
        ? "Backend API server unreachable. Start the backend on port 5000 (cd backend && npm.cmd run dev)."
        : `Invalid server response (HTTP ${res.status})`
    );
  }
  if (!res.ok || !json.success) {
    const errMsg =
      json.errors && json.errors.length > 0
        ? `${json.message}: ${json.errors.map((e) => e.message).join(", ")}`
        : json.message || "Request failed";
    throw new Error(errMsg);
  }
  return json.data;
}
