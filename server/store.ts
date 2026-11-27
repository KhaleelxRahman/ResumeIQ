import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkillTaxonomy } from './nlp/skillMatcher.js';
import {
  composeSectionsText,
  extractStructuredResumeEntities,
} from './parsers/entities.js';
import { segmentResumeSections } from './parsers/sectioner.js';
import type {
  BuilderContactInput,
  JobRoleRecord,
  ParseWarning,
  ResumeRecord,
  ResumeSectionRecord,
  ResumeVersionRecord,
  RoleSkillRecord,
  SegmentedSection,
  TemplateSlug,
  WorkspaceRecord,
} from './types.js';
import { ApiError } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');

function parseBool(value: string | undefined, defaultVal: boolean): boolean {
  if (value === undefined || value === '') return defaultVal;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseIntEnv(value: string | undefined, defaultVal: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
}

export const appConfig = {
  APP_ENV: process.env.NODE_ENV || 'development',
  MAX_UPLOAD_BYTES: parseIntEnv(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),
  MULTIPART_OVERHEAD_BYTES: parseIntEnv(process.env.MULTIPART_OVERHEAD_BYTES, 256 * 1024),
  WORKSPACE_TTL_DAYS: parseIntEnv(process.env.WORKSPACE_TTL_DAYS, 30),
  MAX_RESUMES_PER_WORKSPACE: parseIntEnv(process.env.MAX_RESUMES_PER_WORKSPACE, 25),
  RATE_LIMIT_ENABLED: parseBool(process.env.RATE_LIMIT_ENABLED, true),
  RATE_LIMIT_SESSION_PER_MIN: parseIntEnv(process.env.RATE_LIMIT_SESSION_PER_MIN, 20),
  RATE_LIMIT_UPLOAD_PER_MIN: parseIntEnv(process.env.RATE_LIMIT_UPLOAD_PER_MIN, 15),
  RATE_LIMIT_DELETE_PER_MIN: parseIntEnv(process.env.RATE_LIMIT_DELETE_PER_MIN, 20),
  ENABLE_HF_EMBEDDINGS: parseBool(process.env.ENABLE_HF_EMBEDDINGS, false),
  ENABLE_DOCX_BUILDER_EXPORT: parseBool(process.env.ENABLE_DOCX_BUILDER_EXPORT, false),
  AUTO_SEED_CORE: parseBool(process.env.AUTO_SEED_CORE, true),
  APP_VERSION: '0.6.0-phase6',
  ENGINE_VERSION: '1.0.0-deterministic',
};

function deterministicUuid(namespace: string): string {
  const hex = crypto.createHash('sha256').update(namespace).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

export class SlidingWindowRateLimiter {
  private buckets = new Map<string, number[]>();

  check(key: string, limit: number, windowSeconds = 60): [boolean, number] {
    if (limit <= 0) return [true, 0];
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const entries = (this.buckets.get(key) ?? []).filter((ts) => ts > cutoff);

    if (entries.length >= limit) {
      const retryAfter = Math.max(1, Math.ceil((entries[0] + windowSeconds * 1000 - now) / 1000));
      this.buckets.set(key, entries);
      return [false, retryAfter];
    }

    entries.push(now);
    this.buckets.set(key, entries);

    if (this.buckets.size > 2048) {
      for (const [k, list] of this.buckets.entries()) {
        if (list.length === 0 || list[list.length - 1] <= cutoff) {
          this.buckets.delete(k);
        }
      }
    }

    return [true, 0];
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

// In-memory store (ephemeral across container restarts)
const workspacesById = new Map<string, WorkspaceRecord>();
const workspaceIdByTokenHash = new Map<string, string>();
const resumesById = new Map<string, ResumeRecord>();
const jobRolesBySlug = new Map<string, JobRoleRecord>();

export let nlpTaxonomyLoaded = false;

export function hashWorkspaceToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken, 'utf-8').digest('hex');
}

export function initializeStore(): void {
  const taxonomy = loadSkillTaxonomy();
  nlpTaxonomyLoaded = taxonomy.length > 0;

  if (!appConfig.AUTO_SEED_CORE) return;

  // Seed job roles
  jobRolesBySlug.clear();
  const rolesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'roles_seed.json'), 'utf-8'),
  ) as {
    roles: Array<{
      slug: string;
      title: string;
      category: string;
      is_core_mandatory: boolean;
      description: string;
      skills: RoleSkillRecord[];
    }>;
  };

  for (const r of rolesRaw.roles) {
    jobRolesBySlug.set(r.slug, {
      id: deterministicUuid(`role:${r.slug}`),
      slug: r.slug,
      title: r.title,
      category: r.category,
      is_core_mandatory: r.is_core_mandatory,
      description: r.description,
      skills: r.skills,
    });
  }

  // Seed synthetic sample resumes
  const samplesRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'samples_seed.json'), 'utf-8'),
  ) as {
    samples: Array<{
      title: string;
      candidate_label: string;
      template_slug: TemplateSlug;
      contact_flags: Record<string, boolean>;
      raw_text: string;
      sections: Array<{ section_type: string; raw_heading: string; content_text: string }>;
    }>;
  };

  const nowIso = new Date().toISOString();
  for (const s of samplesRaw.samples) {
    const resumeId = deterministicUuid(`sample:${s.title}`);
    const versionId = deterministicUuid(`sample-version:${s.title}:1`);
    const segmented: SegmentedSection[] = s.sections.map((sec, idx) => ({
      section_type: sec.section_type,
      raw_heading: sec.raw_heading,
      content_text: sec.content_text,
      confidence: 0.98,
      order_index: idx,
    }));

    const entities = extractStructuredResumeEntities(s.raw_text, segmented, [], 0);
    const sections: ResumeSectionRecord[] = segmented.map((sec) => ({
      id: deterministicUuid(`sample-sec:${s.title}:${sec.order_index}`),
      section_type: sec.section_type,
      raw_heading: sec.raw_heading,
      content_text: sec.content_text,
      confidence: sec.confidence,
      order_index: sec.order_index,
    }));

    const version: ResumeVersionRecord = {
      version_id: versionId,
      version_number: 1,
      file_name: null,
      file_size_bytes: null,
      template_slug: s.template_slug || 'swiss-technical',
      candidate_label: s.candidate_label || entities.candidate_label,
      contact_flags: { ...entities.contact_flags, ...(s.contact_flags ?? {}) },
      masked_contact: entities.masked_contact,
      structured_payload: {
        ...entities.structured_payload,
        candidate_label: s.candidate_label || entities.candidate_label,
        user_edited: false,
      },
      raw_text: s.raw_text,
      word_count: s.raw_text.trim().split(/\s+/).length,
      extraction_confidence: entities.extraction_confidence,
      parse_warnings: entities.warnings,
      sections,
      created_at: nowIso,
    };

    resumesById.set(resumeId, {
      id: resumeId,
      workspace_id: null,
      title: s.title,
      source_type: 'sample',
      is_sample: true,
      active_version_id: versionId,
      created_at: nowIso,
      updated_at: nowIso,
      versions: [version],
    });
  }
}

export function issueWorkspaceSession(ttlDays: number): { workspace: WorkspaceRecord; rawToken: string } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashWorkspaceToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const workspace: WorkspaceRecord = {
    id: crypto.randomUUID(),
    token_hash: tokenHash,
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  workspacesById.set(workspace.id, workspace);
  workspaceIdByTokenHash.set(tokenHash, workspace.id);
  return { workspace, rawToken };
}

export function purgeExpiredWorkspaces(limit = 25): number {
  const nowMs = Date.now();
  let removed = 0;
  for (const [id, ws] of workspacesById.entries()) {
    if (Date.parse(ws.expires_at) <= nowMs) {
      deleteWorkspaceCascade(id);
      removed += 1;
      if (limit > 0 && removed >= limit) break;
    }
  }
  return removed;
}

export function resolveValidWorkspace(rawToken: string | undefined): WorkspaceRecord {
  const trimmed = (rawToken ?? '').trim();
  if (!trimmed || trimmed.length < 32 || trimmed.length > 128) {
    throw new ApiError(
      401,
      'WORKSPACE_TOKEN_REQUIRED',
      'A valid server-issued X-Workspace-Token header is required.',
    );
  }

  const tokenHash = hashWorkspaceToken(trimmed);
  const wsId = workspaceIdByTokenHash.get(tokenHash);
  const workspace = wsId ? workspacesById.get(wsId) : undefined;
  if (!workspace) {
    throw new ApiError(
      401,
      'WORKSPACE_TOKEN_INVALID',
      'Workspace session token is invalid or has been deleted.',
    );
  }

  if (Date.parse(workspace.expires_at) <= Date.now()) {
    throw new ApiError(
      401,
      'WORKSPACE_TOKEN_EXPIRED',
      'Workspace session token has expired; request a new session.',
    );
  }

  workspace.last_seen_at = new Date().toISOString();
  return workspace;
}

export function deleteWorkspaceCascade(workspaceId: string): void {
  const ws = workspacesById.get(workspaceId);
  if (!ws) return;
  workspaceIdByTokenHash.delete(ws.token_hash);
  workspacesById.delete(workspaceId);
  for (const [resId, res] of resumesById.entries()) {
    if (res.workspace_id === workspaceId) {
      resumesById.delete(resId);
    }
  }
}

export function assertWorkspaceOwnership(
  resourceWorkspaceId: string | null,
  activeWorkspace: WorkspaceRecord,
  resourceLabel = 'Resource',
  options: { allowSharedSample?: boolean; isSample?: boolean } = {},
): void {
  if (options.isSample) {
    if (options.allowSharedSample) return;
    throw new ApiError(
      403,
      'SAMPLE_READ_ONLY',
      `${resourceLabel} is a read-only synthetic sample and cannot be modified.`,
    );
  }
  if (!resourceWorkspaceId || resourceWorkspaceId !== activeWorkspace.id) {
    throw new ApiError(
      404,
      'RESOURCE_NOT_FOUND',
      `${resourceLabel} was not found in the active workspace.`,
    );
  }
}

export function listAllJobRoles(): JobRoleRecord[] {
  return Array.from(jobRolesBySlug.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function getJobRoleBySlug(slug: string): JobRoleRecord | undefined {
  return jobRolesBySlug.get(slug);
}

export function listAllSamples(): ResumeRecord[] {
  return Array.from(resumesById.values())
    .filter((r) => r.is_sample)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getSampleById(sampleId: string): ResumeRecord | undefined {
  const res = resumesById.get(sampleId);
  return res && res.is_sample ? res : undefined;
}

export function listWorkspaceResumes(workspace: WorkspaceRecord, includeSamples = true): ResumeRecord[] {
  return Array.from(resumesById.values())
    .filter((r) => r.workspace_id === workspace.id || (includeSamples && r.is_sample))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getResumeById(resumeId: string): ResumeRecord {
  const resume = resumesById.get(resumeId);
  if (!resume) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resume was not found in the active workspace.');
  }
  return resume;
}

export function enforceWorkspaceResumeQuota(workspace: WorkspaceRecord, maxResumes: number): void {
  if (maxResumes <= 0) return;
  let count = 0;
  for (const r of resumesById.values()) {
    if (r.workspace_id === workspace.id) count += 1;
  }
  if (count >= maxResumes) {
    throw new ApiError(
      429,
      'WORKSPACE_QUOTA_EXCEEDED',
      `Workspace resume limit (${maxResumes}) reached. Delete unused resumes before creating or uploading more.`,
      { max_resumes: maxResumes },
    );
  }
}

export function buildHeaderSection(contact: BuilderContactInput): SegmentedSection {
  const parts = [
    contact.email,
    contact.phone,
    contact.location,
    contact.github,
    contact.linkedin,
    contact.portfolio,
  ].filter(Boolean);
  const lines = [contact.full_name];
  if (parts.length > 0) lines.push(parts.join(' | '));
  return {
    section_type: 'header_contact',
    raw_heading: 'HEADER',
    content_text: lines.join('\n'),
    confidence: 1.0,
    order_index: 0,
  };
}

export function createNewVersionRecord(params: {
  resume: ResumeRecord;
  versionNumber: number;
  templateSlug: TemplateSlug;
  rawText: string;
  sections: SegmentedSection[];
  fileName?: string | null;
  fileSizeBytes?: number | null;
  baseWarnings?: ParseWarning[];
  layoutPenalty?: number;
  candidateLabelOverride?: string | null;
  extraPayload?: Record<string, unknown>;
}): ResumeVersionRecord {
  const entities = extractStructuredResumeEntities(
    params.rawText,
    params.sections,
    params.baseWarnings ?? [],
    params.layoutPenalty ?? 0,
  );
  const payloadJson: Record<string, unknown> = {
    ...entities.structured_payload,
    ...(params.extraPayload ?? {}),
    user_edited: false,
  };
  const candidateLabel = params.candidateLabelOverride || entities.candidate_label;
  if (candidateLabel) payloadJson.candidate_label = candidateLabel;

  const nowIso = new Date().toISOString();
  const versionId = crypto.randomUUID();
  const version: ResumeVersionRecord = {
    version_id: versionId,
    version_number: params.versionNumber,
    file_name: params.fileName ?? null,
    file_size_bytes: params.fileSizeBytes ?? null,
    template_slug: params.templateSlug,
    candidate_label: candidateLabel,
    contact_flags: entities.contact_flags,
    masked_contact: entities.masked_contact,
    structured_payload: payloadJson,
    raw_text: params.rawText,
    word_count: params.rawText.trim() ? params.rawText.trim().split(/\s+/).length : 0,
    extraction_confidence: entities.extraction_confidence,
    parse_warnings: entities.warnings,
    sections: params.sections.map((sec) => ({
      id: crypto.randomUUID(),
      section_type: sec.section_type,
      raw_heading: sec.raw_heading,
      content_text: sec.content_text,
      confidence: sec.confidence,
      order_index: sec.order_index,
    })),
    created_at: nowIso,
  };

  params.resume.versions.push(version);
  params.resume.active_version_id = versionId;
  params.resume.updated_at = nowIso;
  return version;
}

export function saveUploadedResume(params: {
  workspace: WorkspaceRecord;
  title: string;
  extension: 'pdf' | 'docx';
  fileName: string;
  fileSizeBytes: number;
  rawText: string;
  pageCount: number;
  warnings: ParseWarning[];
  layoutPenalty: number;
}): { resume: ResumeRecord; version: ResumeVersionRecord } {
  const sections = segmentResumeSections(params.rawText);
  const nowIso = new Date().toISOString();
  const resume: ResumeRecord = {
    id: crypto.randomUUID(),
    workspace_id: params.workspace.id,
    title: params.title,
    source_type: `upload_${params.extension}`,
    is_sample: false,
    active_version_id: null,
    created_at: nowIso,
    updated_at: nowIso,
    versions: [],
  };

  const version = createNewVersionRecord({
    resume,
    versionNumber: 1,
    templateSlug: 'swiss-technical',
    rawText: params.rawText,
    sections,
    fileName: params.fileName,
    fileSizeBytes: params.fileSizeBytes,
    baseWarnings: params.warnings,
    layoutPenalty: params.layoutPenalty,
    extraPayload: { page_count: params.pageCount },
  });

  resumesById.set(resume.id, resume);
  return { resume, version };
}

export function saveBuilderResume(params: {
  workspace: WorkspaceRecord;
  title: string;
  templateSlug: TemplateSlug;
  contact: BuilderContactInput;
  sections: SegmentedSection[];
}): { resume: ResumeRecord; version: ResumeVersionRecord } {
  const rawText = composeSectionsText(params.sections);
  const nowIso = new Date().toISOString();
  const resume: ResumeRecord = {
    id: crypto.randomUUID(),
    workspace_id: params.workspace.id,
    title: params.title,
    source_type: 'builder',
    is_sample: false,
    active_version_id: null,
    created_at: nowIso,
    updated_at: nowIso,
    versions: [],
  };

  const version = createNewVersionRecord({
    resume,
    versionNumber: 1,
    templateSlug: params.templateSlug,
    rawText,
    sections: params.sections,
    candidateLabelOverride: params.contact.full_name,
    extraPayload: { builder_contact: params.contact },
  });

  resumesById.set(resume.id, resume);
  return { resume, version };
}

export function deleteResumeRecord(resumeId: string): void {
  resumesById.delete(resumeId);
}
