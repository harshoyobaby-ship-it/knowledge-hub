const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8000";

export class RagServiceError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RagServiceError";
  }
}

export async function ragFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${RAG_SERVICE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function ragJson<T>(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await ragFetch(path, token, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new RagServiceError(detail || response.statusText, response.status);
  }
  return response.json() as Promise<T>;
}

export async function getRagHealth(): Promise<unknown> {
  const response = await fetch(`${RAG_SERVICE_URL}/health`, { cache: "no-store" });
  if (!response.ok) {
    throw new RagServiceError("RAG service unavailable", response.status);
  }
  return response.json();
}

export interface RagSession {
  user_id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
}

export async function getRagSession(token: string): Promise<RagSession> {
  return ragJson<RagSession>("/api/v1/session", token);
}
