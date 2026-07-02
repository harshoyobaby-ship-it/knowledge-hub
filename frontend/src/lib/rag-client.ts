const RAG_SERVICE_URL =
  process.env.RAG_SERVICE_URL?.trim() ||
  (process.env.NODE_ENV === "production"
    ? "https://kharesiya-rag.onrender.com"
    : "http://localhost:8000");

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

  try {
    return await fetch(`${RAG_SERVICE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network error";
    throw new RagServiceError(
      `Cannot reach RAG service (${RAG_SERVICE_URL}): ${reason}`,
      503
    );
  }
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

export type RagHealthServices = Record<string, string>;

export interface RagHealth {
  status: string;
  version?: string;
  services?: RagHealthServices;
}

export async function getRagHealth(): Promise<RagHealth> {
  const response = await fetch(`${RAG_SERVICE_URL}/health/ready`, { cache: "no-store" });
  if (!response.ok) {
    throw new RagServiceError("RAG service unavailable", response.status);
  }
  return response.json() as Promise<RagHealth>;
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
