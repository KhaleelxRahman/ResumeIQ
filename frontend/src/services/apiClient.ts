import type {
  ApiErrorEnvelope,
  HealthResponse,
  JobRoleDetail,
  JobRoleSummary,
  ResumeDetail,
  ResumeListItem,
  SampleResumeSummary,
  UpdateParsedVersionRequest,
  WorkspaceSessionResponse,
  WorkspaceStatusResponse,
} from '../types/api';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:5000/api';

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
  const data = await requestJson<{ roles: JobRoleSummary[] }>('/job-roles');
  return data.roles;
}

export async function fetchJobRoleDetail(slug: string): Promise<JobRoleDetail> {
  return requestJson<JobRoleDetail>(`/job-roles/${encodeURIComponent(slug)}`);
}

export async function fetchSamples(): Promise<SampleResumeSummary[]> {
  const data = await requestJson<{ samples: SampleResumeSummary[] }>('/samples');
  return data.samples;
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

export async function fetchWorkspaceResumes(includeSamples = true): Promise<ResumeListItem[]> {
  const query = includeSamples ? 'true' : 'false';
  const data = await requestWithWorkspace<{ resumes: ResumeListItem[] }>(
    `/resumes?include_samples=${query}`,
  );
  return data.resumes;
}

export async function fetchResumeDetail(resumeId: string): Promise<ResumeDetail> {
  return requestWithWorkspace<ResumeDetail>(`/resumes/${encodeURIComponent(resumeId)}`);
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

export async function deleteResume(resumeId: string): Promise<void> {
  await requestWithWorkspace<void>(`/resumes/${encodeURIComponent(resumeId)}`, {
    method: 'DELETE',
  });
}
