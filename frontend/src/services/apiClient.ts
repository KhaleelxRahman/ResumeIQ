import type {
  ApiErrorEnvelope,
  CreateBuilderResumeRequest,
  HealthResponse,
  JobRoleDetail,
  JobRoleSummary,
  ResumeDetail,
  ResumeListItem,
  SaveBuilderVersionRequest,
  UpdateParsedVersionRequest,
  WorkspaceSessionResponse,
  WorkspaceStatusResponse,
} from '../types/api';

function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  if (!configured) return '/api';
  if (
    typeof window !== 'undefined' &&
    /^https?:\/\/(127\.0\.0\.1|localhost):5000\/api$/i.test(configured) &&
    window.location.port !== '5173'
  ) {
    return '/api';
  }
  return configured;
}

const API_BASE = resolveApiBase();

const STORAGE_KEY = 'resumeiq_server_workspace_token';

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredWorkspaceToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredWorkspaceToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage unavailability in restricted contexts.
  }
}

function saveWorkspaceToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Ignore storage unavailability.
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  workspaceToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (workspaceToken) {
    headers.set('X-Workspace-Token', workspaceToken);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const errPayload = parsed as ApiErrorEnvelope | null;
    const code = errPayload?.error?.code ?? 'HTTP_ERROR';
    const message = errPayload?.error?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(res.status, code, message, errPayload?.error?.details);
  }

  return parsed as T;
}

/**
 * Ensure a server-issued workspace token exists. Never invents client-side tokens.
 */
export async function ensureServerWorkspaceSession(): Promise<WorkspaceStatusResponse> {
  const existing = getStoredWorkspaceToken();
  if (existing) {
    try {
      return await requestJson<WorkspaceStatusResponse>('/workspaces/current', {}, existing);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        clearStoredWorkspaceToken();
      } else {
        throw err;
      }
    }
  }

  const created = await requestJson<WorkspaceSessionResponse>('/workspaces/session', {
    method: 'POST',
  });
  saveWorkspaceToken(created.token);
  return await requestJson<WorkspaceStatusResponse>('/workspaces/current', {}, created.token);
}

async function requestWithWorkspace<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureServerWorkspaceSession();
  const token = getStoredWorkspaceToken();
  try {
    return await requestJson<T>(path, options, token);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) {
      clearStoredWorkspaceToken();
      await ensureServerWorkspaceSession();
      return await requestJson<T>(path, options, getStoredWorkspaceToken());
    }
    throw err;
  }
}

export async function purgeCurrentWorkspace(): Promise<void> {
  const token = getStoredWorkspaceToken();
  if (!token) return;
  await requestJson<void>('/workspaces/current', { method: 'DELETE' }, token);
  clearStoredWorkspaceToken();
}

export async function fetchHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health');
}

export async function fetchJobRoles(): Promise<JobRoleSummary[]> {
  const data = await requestJson<{ roles?: JobRoleSummary[] }>('/job-roles');
  return Array.isArray(data?.roles) ? data.roles : [];
}

export async function fetchJobRoleDetail(slug: string): Promise<JobRoleDetail> {
  return requestJson<JobRoleDetail>(`/job-roles/${encodeURIComponent(slug)}`);
}

export async function uploadResumeFile(file: File, title?: string): Promise<ResumeDetail> {
  const formData = new FormData();
  formData.append('file', file);
  if (title && title.trim()) {
    formData.append('title', title.trim());
  }
  return requestWithWorkspace<ResumeDetail>('/resumes/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchWorkspaceResumes(): Promise<ResumeListItem[]> {
  const data = await requestWithWorkspace<{ resumes?: ResumeListItem[] }>('/resumes');
  return Array.isArray(data?.resumes) ? data.resumes : [];
}

export async function fetchResumeDetail(resumeId: string, versionId?: string): Promise<ResumeDetail> {
  const query = versionId ? `?version_id=${encodeURIComponent(versionId)}` : '';
  return requestWithWorkspace<ResumeDetail>(`/resumes/${encodeURIComponent(resumeId)}${query}`);
}

export async function createBuilderResume(payload: CreateBuilderResumeRequest): Promise<ResumeDetail> {
  return requestWithWorkspace<ResumeDetail>('/resumes/builder', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveBuilderVersion(
  resumeId: string,
  payload: SaveBuilderVersionRequest,
): Promise<ResumeDetail> {
  return requestWithWorkspace<ResumeDetail>(
    `/resumes/${encodeURIComponent(resumeId)}/versions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateParsedVersion(
  resumeId: string,
  versionId: string,
  payload: UpdateParsedVersionRequest,
): Promise<ResumeDetail> {
  return requestWithWorkspace<ResumeDetail>(
    `/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function downloadResumePdf(
  resumeId: string,
  versionId: string,
  fallbackFilename = 'resume.pdf',
): Promise<string> {
  await ensureServerWorkspaceSession();
  let token = getStoredWorkspaceToken();
  const path = `/resumes/${encodeURIComponent(resumeId)}/versions/${encodeURIComponent(versionId)}/export?format=pdf`;

  let res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: token ? { 'X-Workspace-Token': token } : {},
  });

  if (res.status === 401) {
    clearStoredWorkspaceToken();
    await ensureServerWorkspaceSession();
    token = getStoredWorkspaceToken();
    res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: token ? { 'X-Workspace-Token': token } : {},
    });
  }

  if (!res.ok) {
    const text = await res.text();
    let parsed: ApiErrorEnvelope | null = null;
    try {
      parsed = text ? (JSON.parse(text) as ApiErrorEnvelope) : null;
    } catch {
      parsed = null;
    }
    throw new ApiClientError(
      res.status,
      parsed?.error?.code ?? 'EXPORT_ERROR',
      parsed?.error?.message ?? 'Could not generate the PDF export right now.',
      parsed?.error?.details,
    );
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const fileName = match?.[1] || fallbackFilename;

  const objectUrl = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  }

  return fileName;
}

export async function deleteResume(resumeId: string): Promise<void> {
  await requestWithWorkspace<void>(`/resumes/${encodeURIComponent(resumeId)}`, {
    method: 'DELETE',
  });
}

