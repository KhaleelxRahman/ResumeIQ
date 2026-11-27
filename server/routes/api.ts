import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  sanitizeDisplayFilename,
  validateFileSignature,
  validateUploadMetadata,
} from '../parsers/detector.js';
import { parseDocxDocument } from '../parsers/docxParser.js';
import {
  composeSectionsText,
  extractStructuredResumeEntities,
} from '../parsers/entities.js';
import { parsePdfDocument } from '../parsers/pdfParser.js';
import { renderResumePdf } from '../reports/pdfExporter.js';
import {
  appConfig,
  assertWorkspaceOwnership,
  buildHeaderSection,
  createNewVersionRecord,
  deleteResumeRecord,
  deleteWorkspaceCascade,
  enforceWorkspaceResumeQuota,
  getJobRoleBySlug,
  getResumeById,
  getSampleById,
  hashWorkspaceToken,
  issueWorkspaceSession,
  listAllJobRoles,
  listAllSamples,
  listWorkspaceResumes,
  nlpTaxonomyLoaded,
  purgeExpiredWorkspaces,
  rateLimiter,
  resolveValidWorkspace,
  saveBuilderResume,
  saveUploadedResume,
} from '../store.js';
import {
  ApiError,
  type BuilderContactInput,
  type ResumeRecord,
  type ResumeVersionRecord,
  type SegmentedSection,
  type TemplateSlug,
  type WorkspaceRecord,
} from '../types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TEMPLATES = new Set<TemplateSlug>(['swiss-technical', 'academic-editorial']);
const VALID_BUILDER_SECTIONS = new Set([
  'summary',
  'education',
  'skills',
  'projects',
  'internships',
  'experience',
  'certifications',
  'achievements',
  'languages',
  'other',
]);

interface WorkspaceRequest extends Request {
  workspace?: WorkspaceRecord;
}

function parseUuid(rawId: string, label = 'Identifier'): string {
  if (!UUID_RE.test(rawId)) {
    throw new ApiError(400, 'INVALID_UUID', `${label} must be a valid UUID.`);
  }
  return rawId;
}

function getClientIdentity(req: WorkspaceRequest): string {
  if (req.workspace) return `ws:${req.workspace.id}`;
  const rawToken = (req.header('X-Workspace-Token') ?? '').trim();
  if (rawToken.length >= 32) {
    return `tok:${hashWorkspaceToken(rawToken).slice(0, 16)}`;
  }
  const forwarded = (req.header('X-Forwarded-For') ?? '').split(',')[0].trim();
  return `ip:${forwarded || req.ip || 'local'}`;
}

function enforceRateLimit(req: WorkspaceRequest, scope: string, limit: number, windowSeconds = 60): void {
  if (!appConfig.RATE_LIMIT_ENABLED) return;
  const key = `${scope}:${getClientIdentity(req)}`;
  const [allowed, retryAfter] = rateLimiter.check(key, limit, windowSeconds);
  if (!allowed) {
    throw new ApiError(
      429,
      'RATE_LIMIT_EXCEEDED',
      `Too many requests for this operation. Please retry in ${retryAfter} seconds.`,
      { retry_after_seconds: retryAfter, limit, window_seconds: windowSeconds },
    );
  }
}

function requireWorkspace(req: WorkspaceRequest, _res: Response, next: NextFunction): void {
  try {
    req.workspace = resolveValidWorkspace(req.header('X-Workspace-Token'));
    next();
  } catch (err) {
    next(err);
  }
}

function toResumeDetailDto(resume: ResumeRecord, version: ResumeVersionRecord) {
  const sortedVersions = [...resume.versions].sort((a, b) => a.version_number - b.version_number);
  const sortedSections = [...version.sections].sort((a, b) => a.order_index - b.order_index);
  return {
    id: resume.id,
    title: resume.title,
    source_type: resume.source_type,
    is_sample: resume.is_sample,
    active_version_id: resume.active_version_id,
    created_at: resume.created_at,
    updated_at: resume.updated_at,
    version: {
      ...version,
      sections: sortedSections,
    },
    versions: sortedVersions.map((v) => ({
      version_id: v.version_id,
      version_number: v.version_number,
      template_slug: v.template_slug,
      word_count: v.word_count,
      created_at: v.created_at,
    })),
  };
}

function cleanSingleLine(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseBuilderContact(raw: unknown): BuilderContactInput {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Valid contact details are required.');
  }
  const obj = raw as Record<string, unknown>;
  const fullName = cleanSingleLine(obj.full_name).slice(0, 120);
  if (!fullName) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'contact.full_name is required.');
  }
  return {
    full_name: fullName,
    email: cleanSingleLine(obj.email).slice(0, 160),
    phone: cleanSingleLine(obj.phone).slice(0, 60),
    location: cleanSingleLine(obj.location).slice(0, 120),
    github: cleanSingleLine(obj.github).slice(0, 240),
    linkedin: cleanSingleLine(obj.linkedin).slice(0, 240),
    portfolio: cleanSingleLine(obj.portfolio).slice(0, 240),
  };
}

function parseBuilderSections(raw: unknown): Array<{ section_type: string; raw_heading: string; content_text: string }> {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 25) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Between 1 and 25 sections are required.');
  }
  return raw.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid section entry.');
    }
    const obj = item as Record<string, unknown>;
    const secType = typeof obj.section_type === 'string' ? obj.section_type.trim() : '';
    const heading = typeof obj.raw_heading === 'string' ? obj.raw_heading.trim() : '';
    const content = typeof obj.content_text === 'string' ? obj.content_text.trim() : '';
    if (!VALID_BUILDER_SECTIONS.has(secType) || !heading || !content) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Each section requires valid section_type, raw_heading, and content_text.');
    }
    return {
      section_type: secType,
      raw_heading: heading.slice(0, 120),
      content_text: content.slice(0, 40000),
    };
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: appConfig.MAX_UPLOAD_BYTES + appConfig.MULTIPART_OVERHEAD_BYTES,
    files: 1,
  },
});

export function createApiRouter(): Router {
  const router = Router();

  // Health
  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      db: 'ok',
      nlp_ready: nlpTaxonomyLoaded,
      hf_mode: appConfig.ENABLE_HF_EMBEDDINGS ? 'enabled' : 'disabled',
      version: appConfig.APP_VERSION,
      engine_version: appConfig.ENGINE_VERSION,
    });
  });

  // Workspaces
  router.post('/workspaces/session', (req: WorkspaceRequest, res) => {
    enforceRateLimit(req, 'workspace_session_create', appConfig.RATE_LIMIT_SESSION_PER_MIN, 60);
    purgeExpiredWorkspaces(25);
    const { workspace, rawToken } = issueWorkspaceSession(appConfig.WORKSPACE_TTL_DAYS);
    res.status(201).json({
      workspace_id: workspace.id,
      token: rawToken,
      expires_at: workspace.expires_at,
    });
  });

  router.get('/workspaces/current', requireWorkspace, (req: WorkspaceRequest, res) => {
    const ws = req.workspace!;
    res.status(200).json({
      workspace_id: ws.id,
      created_at: ws.created_at,
      last_seen_at: ws.last_seen_at,
      expires_at: ws.expires_at,
    });
  });

  router.delete('/workspaces/current', requireWorkspace, (req: WorkspaceRequest, res) => {
    enforceRateLimit(req, 'workspace_delete', appConfig.RATE_LIMIT_DELETE_PER_MIN, 60);
    deleteWorkspaceCascade(req.workspace!.id);
    res.status(204).send();
  });

  // Job roles
  router.get('/job-roles', (_req, res) => {
    const roles = listAllJobRoles().map((role) => ({
      id: role.id,
      slug: role.slug,
      title: role.title,
      category: role.category,
      is_core_mandatory: role.is_core_mandatory,
      description: role.description,
      mandatory_count: role.skills.filter((s) => s.requirement_level === 'mandatory').length,
      preferred_count: role.skills.filter((s) => s.requirement_level === 'preferred').length,
    }));
    res.status(200).json({ roles });
  });

  router.get('/job-roles/:slug', (req, res) => {
    const slug = String(req.params.slug);
    const role = getJobRoleBySlug(slug);
    if (!role) {
      throw new ApiError(404, 'JOB_ROLE_NOT_FOUND', `Target job role '${slug}' was not found.`);
    }
    const sortedSkills = [...role.skills].sort((a, b) => {
      const lvlDiff = (a.requirement_level === 'mandatory' ? 0 : 1) - (b.requirement_level === 'mandatory' ? 0 : 1);
      if (lvlDiff !== 0) return lvlDiff;
      if (a.learning_priority !== b.learning_priority) return a.learning_priority - b.learning_priority;
      return a.skill_name.localeCompare(b.skill_name);
    });
    res.status(200).json({
      id: role.id,
      slug: role.slug,
      title: role.title,
      category: role.category,
      is_core_mandatory: role.is_core_mandatory,
      description: role.description,
      mandatory_count: role.skills.filter((s) => s.requirement_level === 'mandatory').length,
      preferred_count: role.skills.filter((s) => s.requirement_level === 'preferred').length,
      skills: sortedSkills,
    });
  });

  // Samples
  router.get('/samples', (_req, res) => {
    const items = listAllSamples()
      .map((resume) => {
        const version = resume.versions[0];
        if (!version) return null;
        return {
          id: resume.id,
          title: resume.title,
          candidate_label: version.candidate_label,
          template_slug: version.template_slug,
          word_count: version.word_count,
          active_version_id: version.version_id,
          sections_count: version.sections.length,
        };
      })
      .filter(Boolean);
    res.status(200).json({ samples: items });
  });

  router.get('/samples/:sampleId', (req, res) => {
    const sampleId = parseUuid(String(req.params.sampleId), 'Sample identifier');
    const resume = getSampleById(sampleId);
    if (!resume || resume.versions.length === 0) {
      throw new ApiError(404, 'SAMPLE_NOT_FOUND', 'Synthetic sample resume not found.');
    }
    const version = resume.versions[0];
    const sections = [...version.sections]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        section_type: s.section_type,
        raw_heading: s.raw_heading,
        content_text: s.content_text,
        order_index: s.order_index,
      }));
    res.status(200).json({
      id: resume.id,
      title: resume.title,
      is_sample: true,
      candidate_label: version.candidate_label,
      template_slug: version.template_slug,
      word_count: version.word_count,
      contact_flags: version.contact_flags,
      masked_contact: version.masked_contact,
      skills: Array.isArray(version.structured_payload.skills) ? version.structured_payload.skills : [],
      sections,
    });
  });

  // Resumes
  router.post(
    '/resumes/upload',
    requireWorkspace,
    upload.single('file'),
    async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
      try {
        enforceRateLimit(req, 'resume_upload', appConfig.RATE_LIMIT_UPLOAD_PER_MIN, 60);
        const ws = req.workspace!;
        enforceWorkspaceResumeQuota(ws, appConfig.MAX_RESUMES_PER_WORKSPACE);

        if (!req.file) {
          throw new ApiError(400, 'MISSING_FILE', "Multipart form field 'file' is required.");
        }

        const rawBytes = req.file.buffer;
        const meta = validateUploadMetadata(
          req.file.originalname,
          req.file.mimetype,
          rawBytes.length,
          appConfig.MAX_UPLOAD_BYTES,
        );

        const zip = await validateFileSignature(rawBytes, meta.extension);
        const parsed =
          meta.extension === 'pdf'
            ? await parsePdfDocument(rawBytes)
            : await parseDocxDocument(zip!);

        const titleOverride = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        const stem = meta.safe_display_name.includes('.')
          ? meta.safe_display_name.slice(0, meta.safe_display_name.lastIndexOf('.'))
          : meta.safe_display_name;
        const cleanTitle = (titleOverride || stem).slice(0, 160) || 'Uploaded Resume';

        const { resume, version } = saveUploadedResume({
          workspace: ws,
          title: cleanTitle,
          extension: meta.extension,
          fileName: meta.safe_display_name,
          fileSizeBytes: meta.size_bytes,
          rawText: parsed.raw_text,
          pageCount: parsed.page_count,
          warnings: parsed.warnings,
          layoutPenalty: parsed.layout_penalty,
        });

        res.status(201).json(toResumeDetailDto(resume, version));
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/resumes', requireWorkspace, (req: WorkspaceRequest, res) => {
    const rawInclude = String(req.query.include_samples ?? 'true').toLowerCase();
    const includeSamples = !['0', 'false', 'no'].includes(rawInclude);
    const items = listWorkspaceResumes(req.workspace!, includeSamples)
      .map((r) => {
        const activeVer =
          r.versions.find((v) => v.version_id === r.active_version_id) ?? r.versions[0];
        if (!activeVer) return null;
        return {
          id: r.id,
          title: r.title,
          source_type: r.source_type,
          is_sample: r.is_sample,
          active_version_id: r.active_version_id,
          candidate_label: activeVer.candidate_label,
          word_count: activeVer.word_count,
          extraction_confidence: activeVer.extraction_confidence,
          warnings_count: activeVer.parse_warnings.length,
          created_at: r.created_at,
        };
      })
      .filter(Boolean);
    res.status(200).json({ resumes: items });
  });

  router.get('/resumes/:resumeId', requireWorkspace, (req: WorkspaceRequest, res) => {
    const resumeId = parseUuid(String(req.params.resumeId), 'Resume ID');
    const rawVerId = typeof req.query.version_id === 'string' ? req.query.version_id : null;
    const versionId = rawVerId ? parseUuid(rawVerId, 'Version ID') : null;

    const resume = getResumeById(resumeId);
    assertWorkspaceOwnership(resume.workspace_id, req.workspace!, 'Resume', {
      allowSharedSample: true,
      isSample: resume.is_sample,
    });

    if (versionId) {
      const selected = resume.versions.find((v) => v.version_id === versionId);
      if (!selected) {
        throw new ApiError(404, 'RESUME_VERSION_NOT_FOUND', 'Requested resume version was not found.');
      }
      res.status(200).json(toResumeDetailDto(resume, selected));
      return;
    }

    const active =
      resume.versions.find((v) => v.version_id === resume.active_version_id) ?? resume.versions[0];
    if (!active) {
      throw new ApiError(404, 'RESUME_VERSION_NOT_FOUND', 'Active resume version not found.');
    }
    res.status(200).json(toResumeDetailDto(resume, active));
  });

  router.post('/resumes/builder', requireWorkspace, (req: WorkspaceRequest, res) => {
    enforceRateLimit(req, 'resume_builder', appConfig.RATE_LIMIT_UPLOAD_PER_MIN, 60);
    const ws = req.workspace!;
    enforceWorkspaceResumeQuota(ws, appConfig.MAX_RESUMES_PER_WORKSPACE);

    const body = req.body;
    if (!body || typeof body !== 'object') {
      throw new ApiError(400, 'INVALID_JSON', 'A valid JSON request body is required.');
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
    if (!title) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'title is required.');
    }
    const templateSlug: TemplateSlug = VALID_TEMPLATES.has(body.template_slug)
      ? body.template_slug
      : 'swiss-technical';
    const contact = parseBuilderContact(body.contact);
    const inputSections = parseBuilderSections(body.sections);

    const header = buildHeaderSection(contact);
    const bodySections: SegmentedSection[] = inputSections.map((sec, idx) => ({
      section_type: sec.section_type,
      raw_heading: sec.raw_heading,
      content_text: sec.content_text,
      confidence: 1.0,
      order_index: idx + 1,
    }));

    const { resume, version } = saveBuilderResume({
      workspace: ws,
      title,
      templateSlug,
      contact,
      sections: [header, ...bodySections],
    });

    res.status(201).json(toResumeDetailDto(resume, version));
  });

  router.post('/resumes/:resumeId/versions', requireWorkspace, (req: WorkspaceRequest, res) => {
    enforceRateLimit(req, 'resume_builder', appConfig.RATE_LIMIT_UPLOAD_PER_MIN, 60);
    const resumeId = parseUuid(String(req.params.resumeId), 'Resume ID');
    const resume = getResumeById(resumeId);
    assertWorkspaceOwnership(resume.workspace_id, req.workspace!, 'Resume', {
      allowSharedSample: false,
      isSample: resume.is_sample,
    });

    if (resume.versions.length >= 50) {
      throw new ApiError(
        429,
        'VERSION_QUOTA_EXCEEDED',
        'Maximum saved snapshots (50) reached for this resume.',
      );
    }

    const body = req.body;
    if (!body || typeof body !== 'object') {
      throw new ApiError(400, 'INVALID_JSON', 'A valid JSON request body is required.');
    }

    const templateSlug: TemplateSlug = VALID_TEMPLATES.has(body.template_slug)
      ? body.template_slug
      : 'swiss-technical';
    const contact = parseBuilderContact(body.contact);
    const inputSections = parseBuilderSections(body.sections);
    if (typeof body.title === 'string' && body.title.trim()) {
      resume.title = body.title.trim().slice(0, 160);
    }

    const header = buildHeaderSection(contact);
    const bodySections: SegmentedSection[] = inputSections.map((sec, idx) => ({
      section_type: sec.section_type,
      raw_heading: sec.raw_heading,
      content_text: sec.content_text,
      confidence: 1.0,
      order_index: idx + 1,
    }));
    const combinedSections = [header, ...bodySections];
    const nextNumber = Math.max(0, ...resume.versions.map((v) => v.version_number)) + 1;

    const version = createNewVersionRecord({
      resume,
      versionNumber: nextNumber,
      templateSlug,
      rawText: composeSectionsText(combinedSections),
      sections: combinedSections,
      candidateLabelOverride: contact.full_name,
      extraPayload: { builder_contact: contact },
    });

    res.status(201).json(toResumeDetailDto(resume, version));
  });

  router.get(
    '/resumes/:resumeId/versions/:versionId/export',
    requireWorkspace,
    async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
      try {
        const resumeId = parseUuid(String(req.params.resumeId), 'Resume ID');
        const versionId = parseUuid(String(req.params.versionId), 'Version ID');
        const fmt = String(req.query.format ?? 'pdf').trim().toLowerCase();

        if (fmt === 'docx' && !appConfig.ENABLE_DOCX_BUILDER_EXPORT) {
          throw new ApiError(
            400,
            'FORMAT_DEFERRED',
            'DOCX builder export is intentionally deferred until core QA passes. Export PDF instead.',
            { format: fmt },
          );
        }
        if (fmt !== 'pdf') {
          throw new ApiError(
            400,
            'UNSUPPORTED_EXPORT_FORMAT',
            'Only format=pdf export is supported in the current milestone.',
            { format: fmt },
          );
        }

        const resume = getResumeById(resumeId);
        assertWorkspaceOwnership(resume.workspace_id, req.workspace!, 'Resume', {
          allowSharedSample: true,
          isSample: resume.is_sample,
        });

        const version = resume.versions.find((v) => v.version_id === versionId);
        if (!version) {
          throw new ApiError(404, 'RESUME_VERSION_NOT_FOUND', 'Resume version was not found.');
        }

        const sortedSections = [...version.sections].sort((a, b) => a.order_index - b.order_index);
        const builderContact = version.structured_payload.builder_contact as
          | Record<string, unknown>
          | undefined;

        let candidateLabel = version.candidate_label;
        const contactLines: string[] = [];

        if (builderContact && typeof builderContact === 'object') {
          const fullName = String(builderContact.full_name ?? '').trim();
          if (fullName) candidateLabel = fullName;
          const items = (['email', 'phone', 'location', 'github', 'linkedin', 'portfolio'] as const)
            .map((k) => String(builderContact[k] ?? '').trim())
            .filter(Boolean);
          if (items.length > 0) contactLines.push(items.join(' | '));
        } else {
          const headerSec = sortedSections.find((s) => s.section_type === 'header_contact');
          if (headerSec) {
            const rawLines = headerSec.content_text
              .split('\n')
              .map((ln) => ln.trim())
              .filter(Boolean);
            if (rawLines.length > 0) {
              if (!candidateLabel) {
                candidateLabel = rawLines[0];
                contactLines.push(...rawLines.slice(1));
              } else if (rawLines[0].toLowerCase() === candidateLabel.toLowerCase()) {
                contactLines.push(...rawLines.slice(1));
              } else {
                contactLines.push(...rawLines);
              }
            }
          }
        }

        const templateSlug: TemplateSlug = VALID_TEMPLATES.has(version.template_slug)
          ? version.template_slug
          : 'swiss-technical';

        const pdfBytes = await renderResumePdf({
          title: resume.title,
          candidate_label: candidateLabel,
          template_slug: templateSlug,
          contact_lines: contactLines,
          sections: sortedSections
            .filter((s) => s.section_type !== 'header_contact')
            .map((s) => ({
              section_type: s.section_type,
              raw_heading: s.raw_heading,
              content_text: s.content_text,
            })),
        });

        const safeName = sanitizeDisplayFilename(resume.title);
        const stem = (safeName.includes('.') ? safeName.slice(0, safeName.lastIndexOf('.')) : safeName).replace(/^[._]+|[._]+$/g, '') || 'resume';
        const downloadName = `${stem}_v${version.version_number}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(pdfBytes);
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch('/resumes/:resumeId/versions/:versionId', requireWorkspace, (req: WorkspaceRequest, res) => {
    const resumeId = parseUuid(String(req.params.resumeId), 'Resume ID');
    const versionId = parseUuid(String(req.params.versionId), 'Version ID');

    const body = req.body;
    if (!body || typeof body !== 'object') {
      throw new ApiError(400, 'INVALID_JSON', 'A valid JSON request body is required.');
    }

    const resume = getResumeById(resumeId);
    assertWorkspaceOwnership(resume.workspace_id, req.workspace!, 'Resume', {
      allowSharedSample: false,
      isSample: resume.is_sample,
    });

    const version = resume.versions.find((v) => v.version_id === versionId);
    if (!version) {
      throw new ApiError(404, 'RESUME_VERSION_NOT_FOUND', 'Resume version was not found.');
    }

    if (typeof body.title === 'string' && body.title.trim()) {
      resume.title = body.title.trim().slice(0, 160);
    }

    if (VALID_TEMPLATES.has(body.template_slug)) {
      version.template_slug = body.template_slug;
    }

    const hasContact = body.contact !== undefined && body.contact !== null;
    const contactObj = hasContact ? parseBuilderContact(body.contact) : null;
    const explicitCandidateLabel = Object.prototype.hasOwnProperty.call(body, 'candidate_label');

    if (contactObj) {
      version.candidate_label = contactObj.full_name;
    } else if (explicitCandidateLabel) {
      version.candidate_label =
        typeof body.candidate_label === 'string' && body.candidate_label.trim()
          ? body.candidate_label.trim().slice(0, 120)
          : null;
    }

    if (Array.isArray(body.sections) || contactObj) {
      const existingSorted = [...version.sections].sort((a, b) => a.order_index - b.order_index);
      const rawSectionsInput: Array<[string, string, string]> = Array.isArray(body.sections)
        ? body.sections
            .filter(
              (s: unknown): s is { section_type: string; raw_heading: string; content_text: string } =>
                Boolean(
                  s &&
                    typeof s === 'object' &&
                    typeof (s as Record<string, unknown>).section_type === 'string' &&
                    typeof (s as Record<string, unknown>).raw_heading === 'string' &&
                    typeof (s as Record<string, unknown>).content_text === 'string' &&
                    String((s as Record<string, unknown>).raw_heading).trim() &&
                    String((s as Record<string, unknown>).content_text).trim(),
                ),
            )
            .map((s: { section_type: string; raw_heading: string; content_text: string }) => [
              s.section_type.trim().slice(0, 48),
              s.raw_heading.trim().slice(0, 120),
              s.content_text.slice(0, 40000),
            ])
        : existingSorted
            .filter((s) => s.section_type !== 'header_contact')
            .map((s) => [s.section_type, s.raw_heading, s.content_text]);

      const combinedTuples: Array<[string, string, string]> = contactObj
        ? (() => {
            const h = buildHeaderSection(contactObj);
            const nonHeader = rawSectionsInput.filter(([t]) => t !== 'header_contact');
            return [[h.section_type, h.raw_heading, h.content_text], ...nonHeader];
          })()
        : rawSectionsInput;

      version.sections = combinedTuples.map(([secType, heading, content], idx) => ({
        id: crypto.randomUUID(),
        section_type: secType,
        raw_heading: heading,
        content_text: content,
        confidence: 1.0,
        order_index: idx,
      }));

      const segmented: SegmentedSection[] = version.sections.map((s) => ({
        section_type: s.section_type,
        raw_heading: s.raw_heading,
        content_text: s.content_text,
        confidence: s.confidence,
        order_index: s.order_index,
      }));
      const editedText = composeSectionsText(segmented);
      const derived = extractStructuredResumeEntities(editedText, segmented, [], 0);

      if (!contactObj && !explicitCandidateLabel && derived.candidate_label) {
        version.candidate_label = derived.candidate_label;
      }

      const prevPayload = version.structured_payload;
      version.structured_payload = {
        ...derived.structured_payload,
        ...(prevPayload.page_count !== undefined ? { page_count: prevPayload.page_count } : {}),
        ...(contactObj
          ? { builder_contact: contactObj }
          : prevPayload.builder_contact !== undefined
            ? { builder_contact: prevPayload.builder_contact }
            : {}),
      };
      version.word_count = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;
      version.contact_flags = derived.contact_flags;
      version.masked_contact = derived.masked_contact;
    }

    const nowIso = new Date().toISOString();
    version.structured_payload = {
      ...version.structured_payload,
      candidate_label: version.candidate_label,
      user_edited: true,
      edited_at: nowIso,
    };
    resume.updated_at = nowIso;

    res.status(200).json(toResumeDetailDto(resume, version));
  });

  router.delete('/resumes/:resumeId', requireWorkspace, (req: WorkspaceRequest, res) => {
    const resumeId = parseUuid(String(req.params.resumeId), 'Resume ID');
    const resume = getResumeById(resumeId);
    assertWorkspaceOwnership(resume.workspace_id, req.workspace!, 'Resume', {
      allowSharedSample: false,
      isSample: resume.is_sample,
    });
    deleteResumeRecord(resumeId);
    res.status(204).send();
  });

  // API error handler
  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
      if (err.statusCode === 429 && typeof err.details.retry_after_seconds === 'number') {
        res.setHeader('Retry-After', String(err.details.retry_after_seconds));
      }
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Uploaded file exceeds the ${appConfig.MAX_UPLOAD_BYTES} byte maximum limit.`,
            details: { max_bytes: appConfig.MAX_UPLOAD_BYTES },
          },
        });
        return;
      }
      res.status(400).json({
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message,
        },
      });
      return;
    }

    console.error('[ResumeIQ API Error]', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
      },
    });
  });

  return router;
}
