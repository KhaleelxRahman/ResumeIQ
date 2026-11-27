import type {
  BuilderContact,
  BuilderSectionInput,
  BuilderSectionType,
  BuilderTemplateSlug,
  CreateBuilderResumeRequest,
  ResumeDetail,
  ResumeSection,
  SaveBuilderVersionRequest,
  UpdateParsedVersionRequest,
} from '../../types/api';

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  gpa: string;
  highlights: string;
}

export interface ExperienceEntry {
  id: string;
  role: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bullets: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  technologies: string;
  url: string;
  startDate: string;
  endDate: string;
  bullets: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

export interface BuilderSectionState {
  id: string;
  type: BuilderSectionType;
  heading: string;
  summaryText: string;
  educationEntries: EducationEntry[];
  experienceEntries: ExperienceEntry[];
  projectEntries: ProjectEntry[];
  skillItems: string[];
  certificationEntries: CertificationEntry[];
  bodyText: string;
}

export interface BuilderDocumentState {
  resumeId: string | null;
  versionId: string | null;
  versionNumber: number;
  sourceType: string;
  title: string;
  templateSlug: BuilderTemplateSlug;
  contact: BuilderContact;
  sections: BuilderSectionState[];
  updatedAt: string | null;
}

export interface SectionOptionMeta {
  type: BuilderSectionType;
  defaultHeading: string;
  label: string;
  description: string;
  allowMultiple?: boolean;
}

export const SECTION_CATALOG: SectionOptionMeta[] = [
  {
    type: 'summary',
    defaultHeading: 'PROFESSIONAL SUMMARY',
    label: 'Professional Summary',
    description: 'Brief overview of academic background, focus areas, and career goal.',
  },
  {
    type: 'education',
    defaultHeading: 'EDUCATION',
    label: 'Education',
    description: 'Degrees, institutions, graduation dates, GPA, and relevant coursework.',
  },
  {
    type: 'skills',
    defaultHeading: 'TECHNICAL SKILLS',
    label: 'Technical Skills',
    description: 'Verified programming languages, frameworks, databases, and tools.',
  },
  {
    type: 'projects',
    defaultHeading: 'PROJECTS',
    label: 'Projects',
    description: 'Academic, capstone, or personal builds with stack and measurable outcomes.',
  },
  {
    type: 'internships',
    defaultHeading: 'INTERNSHIPS',
    label: 'Internships',
    description: 'Industry or research internship roles and technical contributions.',
  },
  {
    type: 'experience',
    defaultHeading: 'WORK EXPERIENCE',
    label: 'Work Experience',
    description: 'Part-time, full-time, or teaching assistant employment history.',
  },
  {
    type: 'certifications',
    defaultHeading: 'CERTIFICATIONS',
    label: 'Certifications',
    description: 'Verified credentials, coursework certificates, and issuers.',
  },
  {
    type: 'achievements',
    defaultHeading: 'ACHIEVEMENTS',
    label: 'Achievements',
    description: 'Hackathons, scholarships, academic honors, and competition placements.',
  },
  {
    type: 'languages',
    defaultHeading: 'LANGUAGES',
    label: 'Languages',
    description: 'Spoken and written languages with proficiency level.',
  },
  {
    type: 'other',
    defaultHeading: 'LEADERSHIP & ACTIVITIES',
    label: 'Leadership / Custom Section',
    description: 'Student clubs, volunteering, publications, or any custom section heading.',
    allowMultiple: true,
  },
];

let uidCounter = 0;
export function nextBuilderId(prefix = 'blk'): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

export function createEmptyContact(): BuilderContact {
  return {
    full_name: '',
    email: '',
    phone: '',
    location: '',
    github: '',
    linkedin: '',
    portfolio: '',
  };
}

export function createEmptyEducationEntry(): EducationEntry {
  return {
    id: nextBuilderId('edu'),
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    gpa: '',
    highlights: '',
  };
}

export function createEmptyExperienceEntry(): ExperienceEntry {
  return {
    id: nextBuilderId('exp'),
    role: '',
    organization: '',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    bullets: '',
  };
}

export function createEmptyProjectEntry(): ProjectEntry {
  return {
    id: nextBuilderId('prj'),
    name: '',
    technologies: '',
    url: '',
    startDate: '',
    endDate: '',
    bullets: '',
  };
}

export function createEmptyCertificationEntry(): CertificationEntry {
  return {
    id: nextBuilderId('cert'),
    name: '',
    issuer: '',
    date: '',
    credentialUrl: '',
  };
}

export function createSectionState(
  type: BuilderSectionType,
  customHeading?: string,
): BuilderSectionState {
  const meta = SECTION_CATALOG.find((m) => m.type === type);
  return {
    id: nextBuilderId('sec'),
    type,
    heading: (customHeading || meta?.defaultHeading || 'CUSTOM SECTION').trim(),
    summaryText: '',
    educationEntries: type === 'education' ? [createEmptyEducationEntry()] : [],
    experienceEntries:
      type === 'experience' || type === 'internships' ? [createEmptyExperienceEntry()] : [],
    projectEntries: type === 'projects' ? [createEmptyProjectEntry()] : [],
    skillItems: [],
    certificationEntries: type === 'certifications' ? [createEmptyCertificationEntry()] : [],
    bodyText: '',
  };
}

export function createBlankDocument(templateSlug: BuilderTemplateSlug = 'swiss-technical'): BuilderDocumentState {
  return {
    resumeId: null,
    versionId: null,
    versionNumber: 1,
    sourceType: 'builder',
    title: 'Untitled Student Resume',
    templateSlug,
    contact: createEmptyContact(),
    sections: [
      createSectionState('summary'),
      createSectionState('education'),
      createSectionState('skills'),
      createSectionState('projects'),
    ],
    updatedAt: null,
  };
}

export function createStudentStarterDocument(
  templateSlug: BuilderTemplateSlug = 'swiss-technical',
): BuilderDocumentState {
  return {
    resumeId: null,
    versionId: null,
    versionNumber: 1,
    sourceType: 'builder',
    title: 'Student Resume Draft',
    templateSlug,
    contact: createEmptyContact(),
    sections: [
      createSectionState('summary'),
      createSectionState('education'),
      createSectionState('skills'),
      createSectionState('projects'),
      createSectionState('certifications'),
    ],
    updatedAt: null,
  };
}

function cleanSingleLine(val: string): string {
  return val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeSkillName(raw: string): string {
  return cleanSingleLine(raw).replace(/^[-*\u2022]+\s*/, '');
}

export function deduplicateSkills(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const result = [...existing];
  for (const raw of additions) {
    const cleaned = normalizeSkillName(raw);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }
  return result;
}

export function parseSkillInputTokens(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((item) => normalizeSkillName(item))
    .filter(Boolean);
}

function formatDateRange(start: string, end: string, isCurrent: boolean): string {
  const s = cleanSingleLine(start);
  const e = isCurrent ? 'Present' : cleanSingleLine(end);
  if (s && e) return `${s} - ${e}`;
  return s || e;
}

function parseDateRangeText(raw: string): { startDate: string; endDate: string; isCurrent: boolean } {
  const cleaned = cleanSingleLine(raw);
  if (!cleaned) return { startDate: '', endDate: '', isCurrent: false };
  const parts = cleaned.split(/\s*(?:-|–|—|to)\s*/i);
  if (parts.length >= 2) {
    const start = parts[0].trim();
    const endRaw = parts.slice(1).join(' - ').trim();
    const isCurrent = /^(present|current|ongoing|expected\b)/i.test(endRaw);
    return {
      startDate: start,
      endDate: isCurrent && /^present|current|ongoing$/i.test(endRaw) ? '' : endRaw,
      isCurrent,
    };
  }
  return { startDate: cleaned, endDate: '', isCurrent: false };
}

function splitBulletsAndParagraphs(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => (line.startsWith('- ') ? line : `- ${line.replace(/^[-*\u2022]\s*/, '')}`)).join('\n');
}

export function serializeSectionToContentText(sec: BuilderSectionState): string {
  switch (sec.type) {
    case 'summary':
      return sec.summaryText.trim();

    case 'skills':
      return sec.skillItems.map((s) => s.trim()).filter(Boolean).join(', ');

    case 'education': {
      const blocks = sec.educationEntries
        .map((entry) => {
          const degreeLine = [cleanSingleLine(entry.degree), cleanSingleLine(entry.fieldOfStudy)]
            .filter(Boolean)
            .join(' in ');
          const headParts = [degreeLine, cleanSingleLine(entry.institution)].filter(Boolean);
          let header = headParts.join(' | ');
          const dateRange = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
          if (dateRange) {
            header = header ? `${header} (${dateRange})` : `(${dateRange})`;
          }
          const gpa = cleanSingleLine(entry.gpa);
          if (gpa) {
            const gpaFormatted = /^(gpa|cgpa)/i.test(gpa) ? gpa : `GPA: ${gpa}`;
            header = header ? `${header} | ${gpaFormatted}` : gpaFormatted;
          }
          const extra = entry.highlights
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .map((l) => (l.startsWith('- ') ? l : `- ${l.replace(/^[-*\u2022]\s*/, '')}`))
            .join('\n');
          return [header, extra].filter(Boolean).join('\n');
        })
        .filter(Boolean);
      return blocks.join('\n\n');
    }

    case 'experience':
    case 'internships': {
      const blocks = sec.experienceEntries
        .map((entry) => {
          const headParts = [
            cleanSingleLine(entry.role),
            cleanSingleLine(entry.organization),
            cleanSingleLine(entry.location),
          ].filter(Boolean);
          let header = headParts.join(' | ');
          const dateRange = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
          if (dateRange) {
            header = header ? `${header} (${dateRange})` : `(${dateRange})`;
          }
          const bullets = splitBulletsAndParagraphs(entry.bullets);
          return [header, bullets].filter(Boolean).join('\n');
        })
        .filter(Boolean);
      return blocks.join('\n\n');
    }

    case 'projects': {
      const blocks = sec.projectEntries
        .map((entry) => {
          const headParts = [
            cleanSingleLine(entry.name),
            cleanSingleLine(entry.technologies),
          ].filter(Boolean);
          let header = headParts.join(' | ');
          const dateRange = formatDateRange(entry.startDate, entry.endDate, false);
          if (dateRange) {
            header = header ? `${header} (${dateRange})` : `(${dateRange})`;
          }
          const url = cleanSingleLine(entry.url);
          if (url) {
            header = header ? `${header} | ${url}` : url;
          }
          const bullets = splitBulletsAndParagraphs(entry.bullets);
          return [header, bullets].filter(Boolean).join('\n');
        })
        .filter(Boolean);
      return blocks.join('\n\n');
    }

    case 'certifications': {
      const blocks = sec.certificationEntries
        .map((entry) => {
          const name = cleanSingleLine(entry.name);
          const issuer = cleanSingleLine(entry.issuer);
          const date = cleanSingleLine(entry.date);
          const url = cleanSingleLine(entry.credentialUrl);
          if (!name && !issuer && !date && !url) return '';
          let line = [name, issuer].filter(Boolean).join(' — ');
          if (date) {
            line = line ? `${line} (${date})` : `(${date})`;
          }
          if (url) {
            line = line ? `${line} | ${url}` : url;
          }
          return line;
        })
        .filter(Boolean);
      return blocks.join('\n\n');
    }

    default:
      return sec.bodyText.trim();
  }
}

export function serializeBuilderSections(sections: BuilderSectionState[]): BuilderSectionInput[] {
  return sections
    .map((sec) => ({
      section_type: sec.type,
      raw_heading: cleanSingleLine(sec.heading) || 'SECTION',
      content_text: serializeSectionToContentText(sec),
    }))
    .filter((s) => Boolean(s.raw_heading && s.content_text));
}

function splitEntryBlocks(raw: string): string[] {
  const doubleSplit = raw
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (doubleSplit.length > 1) return doubleSplit;

  // Handle single-newline separated blocks where non-bullet title lines start new entries
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return doubleSplit;

  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    const isBullet = /^[-*\u2022]\s+/.test(line);
    if (!isBullet && current.length > 0 && current.some((l) => /^[-*\u2022]\s+/.test(l))) {
      blocks.push(current.join('\n'));
      current = [line];
    } else if (!isBullet && current.length > 0 && line.includes('|') && current[0].includes('|')) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks;
}

function extractTrailingDateParen(text: string): { rest: string; dateRange: string } {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(text);
  if (match && /\d{4}|present|current|expected/i.test(match[2])) {
    return { rest: match[1].trim(), dateRange: match[2].trim() };
  }
  return { rest: text.trim(), dateRange: '' };
}

function parseEducationText(contentText: string): EducationEntry[] {
  const blocks = splitEntryBlocks(contentText);
  if (blocks.length === 0) return [createEmptyEducationEntry()];

  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerLine = lines[0] ?? '';
    const extraLines = lines.slice(1).join('\n');

    const pipeParts = headerLine.split('|').map((p) => p.trim()).filter(Boolean);
    let gpa = '';
    const mainParts: string[] = [];
    for (const part of pipeParts) {
      if (/^(?:c?gpa)\b/i.test(part)) {
        gpa = part.replace(/^(?:c?gpa)\s*[:\-]?\s*/i, '').trim() || part;
      } else {
        mainParts.push(part);
      }
    }

    let degree = '';
    let fieldOfStudy = '';
    let institution = '';
    let dateRange = '';

    if (mainParts.length >= 2) {
      const firstCleaned = extractTrailingDateParen(mainParts[0]);
      const secondCleaned = extractTrailingDateParen(mainParts[1]);
      dateRange = secondCleaned.dateRange || firstCleaned.dateRange;

      const inMatch = /^(.+?)\s+in\s+(.+)$/i.exec(firstCleaned.rest);
      if (inMatch) {
        degree = inMatch[1].trim();
        fieldOfStudy = inMatch[2].trim();
      } else {
        degree = firstCleaned.rest;
      }
      institution = secondCleaned.rest;
    } else {
      const rawOne = mainParts[0] ?? headerLine;
      const { rest, dateRange: extractedDate } = extractTrailingDateParen(rawOne);
      dateRange = extractedDate;
      const commaIdx = rest.indexOf(',');
      if (commaIdx > 0) {
        const left = rest.slice(0, commaIdx).trim();
        const right = rest.slice(commaIdx + 1).trim();
        const inMatch = /^(.+?)\s+in\s+(.+)$/i.exec(left);
        if (inMatch) {
          degree = inMatch[1].trim();
          fieldOfStudy = inMatch[2].trim();
        } else {
          degree = left;
        }
        institution = right;
      } else {
        degree = rest;
      }
    }

    const dates = parseDateRangeText(dateRange);
    return {
      id: nextBuilderId('edu'),
      institution,
      degree,
      fieldOfStudy,
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
      gpa,
      highlights: extraLines,
    };
  });
}

function parseExperienceText(contentText: string): ExperienceEntry[] {
  const blocks = splitEntryBlocks(contentText);
  if (blocks.length === 0) return [createEmptyExperienceEntry()];

  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerLine = lines[0] ?? '';
    const bullets = lines.slice(1).join('\n');

    const { rest, dateRange } = extractTrailingDateParen(headerLine);
    const parts = rest.split('|').map((p) => p.trim()).filter(Boolean);
    const dates = parseDateRangeText(dateRange);

    return {
      id: nextBuilderId('exp'),
      role: parts[0] ?? rest,
      organization: parts[1] ?? '',
      location: parts.slice(2).join(', '),
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
      bullets,
    };
  });
}

function parseProjectsText(contentText: string): ProjectEntry[] {
  const blocks = splitEntryBlocks(contentText);
  if (blocks.length === 0) return [createEmptyProjectEntry()];

  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const headerLine = lines[0] ?? '';
    const bullets = lines.slice(1).join('\n');

    const parts = headerLine.split('|').map((p) => p.trim()).filter(Boolean);
    let url = '';
    const nonUrlParts: string[] = [];
    for (const part of parts) {
      if (/^(https?:\/\/|github\.com\/|gitlab\.com\/|www\.)/i.test(part)) {
        url = part;
      } else {
        nonUrlParts.push(part);
      }
    }

    let dateRange = '';
    const cleanedParts = nonUrlParts.map((part) => {
      const parsed = extractTrailingDateParen(part);
      if (parsed.dateRange && !dateRange) {
        dateRange = parsed.dateRange;
      }
      return parsed.rest;
    });

    const dates = parseDateRangeText(dateRange);
    return {
      id: nextBuilderId('prj'),
      name: cleanedParts[0] ?? headerLine,
      technologies: cleanedParts.slice(1).join(', '),
      url,
      startDate: dates.startDate,
      endDate: dates.endDate,
      bullets,
    };
  });
}

function parseSkillsText(contentText: string): string[] {
  const rawTokens: string[] = [];
  for (const line of contentText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Strip optional category prefixes such as "Languages: Python, SQL"
    const colonIdx = trimmed.indexOf(':');
    const body =
      colonIdx > 0 && colonIdx < 32 && !trimmed.slice(0, colonIdx).includes(',')
        ? trimmed.slice(colonIdx + 1)
        : trimmed;
    rawTokens.push(...parseSkillInputTokens(body));
  }
  return deduplicateSkills([], rawTokens);
}

function parseCertificationsText(contentText: string): CertificationEntry[] {
  const blocks = contentText
    .split(/\n{1,2}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return [createEmptyCertificationEntry()];

  return blocks.map((line) => {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    let credentialUrl = '';
    const mainSegment = parts.filter((p) => {
      if (/^(https?:\/\/|www\.)/i.test(p)) {
        credentialUrl = p;
        return false;
      }
      return true;
    })[0] ?? line;

    const { rest, dateRange } = extractTrailingDateParen(mainSegment);
    const dashParts = rest.split(/\s+[\u2014\u2013—–-]\s+/);
    return {
      id: nextBuilderId('cert'),
      name: dashParts[0]?.trim() || rest,
      issuer: dashParts.slice(1).join(' - ').trim(),
      date: dateRange,
      credentialUrl,
    };
  });
}

function toBuilderSectionType(rawType: string): BuilderSectionType {
  const normalized = rawType.trim().toLowerCase();
  const valid: BuilderSectionType[] = [
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
  ];
  return (valid.includes(normalized as BuilderSectionType)
    ? normalized
    : 'other') as BuilderSectionType;
}

function extractContactFromResume(detail: ResumeDetail): BuilderContact {
  const base = createEmptyContact();
  const stored = detail.version.structured_payload?.builder_contact;
  if (stored && typeof stored === 'object') {
    return {
      full_name: cleanSingleLine(String(stored.full_name ?? detail.version.candidate_label ?? '')),
      email: cleanSingleLine(String(stored.email ?? '')),
      phone: cleanSingleLine(String(stored.phone ?? '')),
      location: cleanSingleLine(String(stored.location ?? '')),
      github: cleanSingleLine(String(stored.github ?? '')),
      linkedin: cleanSingleLine(String(stored.linkedin ?? '')),
      portfolio: cleanSingleLine(String(stored.portfolio ?? '')),
    };
  }

  const headerSec = detail.version.sections.find((s) => s.section_type === 'header_contact');
  const lines = (headerSec?.content_text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  base.full_name = cleanSingleLine(detail.version.candidate_label ?? lines[0] ?? '');

  // Extract contact tokens safely from raw header lines or sample raw_text header (before first blank line)
  const rawHeaderChunk = (detail.version.raw_text || '').split(/\n{2,}/)[0] ?? '';
  const searchSource = [...lines, rawHeaderChunk].join(' | ');
  const tokens = searchSource
    .split(/[|\n•]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const tok of tokens) {
    if (!base.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(tok)) {
      base.email = tok;
    } else if (!base.github && /github\.com\//i.test(tok)) {
      base.github = tok;
    } else if (!base.linkedin && /linkedin\.com\//i.test(tok)) {
      base.linkedin = tok;
    } else if (!base.phone && /\+?\d[\d\s\-().]{6,}\d/.test(tok) && !tok.includes('http')) {
      base.phone = tok;
    } else if (
      !base.portfolio &&
      /^(https?:\/\/|www\.)/i.test(tok) &&
      !/github\.com|linkedin\.com/i.test(tok)
    ) {
      base.portfolio = tok;
    }
  }

  if (!base.full_name && tokens.length > 0 && !tokens[0].includes('@')) {
    base.full_name = cleanSingleLine(tokens[0]);
  }

  return base;
}

export function resumeDetailToBuilderDocument(detail: ResumeDetail): BuilderDocumentState {
  const templateSlug: BuilderTemplateSlug =
    detail.version.template_slug === 'academic-editorial'
      ? 'academic-editorial'
      : 'swiss-technical';

  const contact = extractContactFromResume(detail);
  const sortedSections: ResumeSection[] = [...detail.version.sections]
    .filter((s) => s.section_type !== 'header_contact')
    .sort((a, b) => a.order_index - b.order_index);

  const mappedSections: BuilderSectionState[] = sortedSections.map((sec) => {
    const type = toBuilderSectionType(sec.section_type);
    const base = createSectionState(type, sec.raw_heading);
    if (type === 'summary') {
      base.summaryText = sec.content_text.trim();
    } else if (type === 'education') {
      base.educationEntries = parseEducationText(sec.content_text);
    } else if (type === 'experience' || type === 'internships') {
      base.experienceEntries = parseExperienceText(sec.content_text);
    } else if (type === 'projects') {
      base.projectEntries = parseProjectsText(sec.content_text);
    } else if (type === 'skills') {
      base.skillItems = parseSkillsText(sec.content_text);
    } else if (type === 'certifications') {
      base.certificationEntries = parseCertificationsText(sec.content_text);
    } else {
      base.bodyText = sec.content_text.trim();
    }
    return base;
  });

  return {
    resumeId: detail.id,
    versionId: detail.version.version_id,
    versionNumber: detail.version.version_number,
    sourceType: detail.source_type,
    title: detail.title,
    templateSlug,
    contact,
    sections: mappedSections.length > 0 ? mappedSections : [createSectionState('summary')],
    updatedAt: detail.updated_at,
  };
}

export interface BuilderValidationErrors {
  title?: string;
  full_name?: string;
  email?: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
  sections?: string;
  dateIssues: Record<string, string>;
  urlIssues: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SAFE_URL_RE = /^(?:https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/i;

export function isValidOptionalUrl(raw: string): boolean {
  const val = raw.trim();
  if (!val) return true;
  if (/^(javascript|data|vbscript):/i.test(val)) return false;
  if (/\s/.test(val)) return false;
  return SAFE_URL_RE.test(val);
}

function parseSortableYearMonth(raw: string): number | null {
  const val = raw.trim();
  if (!val) return null;
  const isoMatch = /^(\d{4})(?:-(\d{1,2}))?$/.exec(val);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = isoMatch[2] ? Number(isoMatch[2]) : 1;
    if (month >= 1 && month <= 12) return year * 12 + month;
  }
  const monthNames: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };
  const textMatch = /^([a-z]{3,9})\s+(\d{4})$/i.exec(val);
  if (textMatch) {
    const m = monthNames[textMatch[1].toLowerCase()];
    const y = Number(textMatch[2]);
    if (m) return y * 12 + m;
  }
  const slashMatch = /^(\d{1,2})\/(\d{4})$/.exec(val);
  if (slashMatch) {
    const m = Number(slashMatch[1]);
    const y = Number(slashMatch[2]);
    if (m >= 1 && m <= 12) return y * 12 + m;
  }
  const yearOnly = /\b(19\d{2}|20\d{2})\b/.exec(val);
  if (yearOnly) {
    return Number(yearOnly[1]) * 12 + 1;
  }
  return null;
}

export function isDateRangeChronological(
  startDate: string,
  endDate: string,
  isCurrent: boolean,
): boolean {
  if (isCurrent || !startDate.trim() || !endDate.trim()) return true;
  const s = parseSortableYearMonth(startDate);
  const e = parseSortableYearMonth(endDate);
  if (s === null || e === null) return true;
  return s <= e;
}

export function validateBuilderDocument(doc: BuilderDocumentState): {
  valid: boolean;
  errors: BuilderValidationErrors;
} {
  const errors: BuilderValidationErrors = {
    dateIssues: {},
    urlIssues: {},
  };

  if (!cleanSingleLine(doc.title)) {
    errors.title = 'Enter a resume title so you can find this draft later.';
  }
  if (!cleanSingleLine(doc.contact.full_name)) {
    errors.full_name = 'Enter your full name before saving or exporting.';
  }
  if (doc.contact.email.trim() && !EMAIL_RE.test(doc.contact.email.trim())) {
    errors.email = 'Enter a valid email address (for example, name@university.edu).';
  }
  if (!isValidOptionalUrl(doc.contact.github)) {
    errors.github = 'Enter a valid GitHub link (for example, github.com/username).';
  }
  if (!isValidOptionalUrl(doc.contact.linkedin)) {
    errors.linkedin = 'Enter a valid LinkedIn link (for example, linkedin.com/in/username).';
  }
  if (!isValidOptionalUrl(doc.contact.portfolio)) {
    errors.portfolio = 'Enter a valid website URL (for example, https://yourportfolio.dev).';
  }

  for (const sec of doc.sections) {
    for (const edu of sec.educationEntries) {
      if (!isDateRangeChronological(edu.startDate, edu.endDate, edu.isCurrent)) {
        errors.dateIssues[edu.id] = 'Graduation/end date cannot be earlier than start date.';
      }
    }
    for (const exp of sec.experienceEntries) {
      if (!isDateRangeChronological(exp.startDate, exp.endDate, exp.isCurrent)) {
        errors.dateIssues[exp.id] = 'End date cannot be earlier than start date.';
      }
    }
    for (const prj of sec.projectEntries) {
      if (!isDateRangeChronological(prj.startDate, prj.endDate, false)) {
        errors.dateIssues[prj.id] = 'End date cannot be earlier than start date.';
      }
      if (!isValidOptionalUrl(prj.url)) {
        errors.urlIssues[prj.id] = 'Enter a valid project URL without spaces.';
      }
    }
    for (const cert of sec.certificationEntries) {
      if (!isValidOptionalUrl(cert.credentialUrl)) {
        errors.urlIssues[cert.id] = 'Enter a valid credential URL without spaces.';
      }
    }
  }

  const serializedSections = serializeBuilderSections(doc.sections);
  if (serializedSections.length === 0) {
    errors.sections = 'Add content to at least one resume section before saving.';
  }

  const valid =
    !errors.title &&
    !errors.full_name &&
    !errors.email &&
    !errors.github &&
    !errors.linkedin &&
    !errors.portfolio &&
    !errors.sections &&
    Object.keys(errors.dateIssues).length === 0 &&
    Object.keys(errors.urlIssues).length === 0;

  return { valid, errors };
}

export function buildCreateResumePayload(doc: BuilderDocumentState): CreateBuilderResumeRequest {
  return {
    title: cleanSingleLine(doc.title) || 'Untitled Resume',
    template_slug: doc.templateSlug,
    contact: {
      full_name: cleanSingleLine(doc.contact.full_name),
      email: cleanSingleLine(doc.contact.email),
      phone: cleanSingleLine(doc.contact.phone),
      location: cleanSingleLine(doc.contact.location),
      github: cleanSingleLine(doc.contact.github),
      linkedin: cleanSingleLine(doc.contact.linkedin),
      portfolio: cleanSingleLine(doc.contact.portfolio),
    },
    sections: serializeBuilderSections(doc.sections),
  };
}

export function buildSaveVersionPayload(doc: BuilderDocumentState): SaveBuilderVersionRequest {
  return {
    title: cleanSingleLine(doc.title) || 'Untitled Resume',
    template_slug: doc.templateSlug,
    contact: {
      full_name: cleanSingleLine(doc.contact.full_name),
      email: cleanSingleLine(doc.contact.email),
      phone: cleanSingleLine(doc.contact.phone),
      location: cleanSingleLine(doc.contact.location),
      github: cleanSingleLine(doc.contact.github),
      linkedin: cleanSingleLine(doc.contact.linkedin),
      portfolio: cleanSingleLine(doc.contact.portfolio),
    },
    sections: serializeBuilderSections(doc.sections),
  };
}

export function buildPatchDraftPayload(doc: BuilderDocumentState): UpdateParsedVersionRequest {
  return {
    title: cleanSingleLine(doc.title) || 'Untitled Resume',
    candidate_label: cleanSingleLine(doc.contact.full_name) || null,
    template_slug: doc.templateSlug,
    contact: {
      full_name: cleanSingleLine(doc.contact.full_name),
      email: cleanSingleLine(doc.contact.email),
      phone: cleanSingleLine(doc.contact.phone),
      location: cleanSingleLine(doc.contact.location),
      github: cleanSingleLine(doc.contact.github),
      linkedin: cleanSingleLine(doc.contact.linkedin),
      portfolio: cleanSingleLine(doc.contact.portfolio),
    },
    sections: serializeBuilderSections(doc.sections),
  };
}

export function moveSectionByOffset(
  sections: BuilderSectionState[],
  index: number,
  offset: -1 | 1,
): BuilderSectionState[] {
  const target = index + offset;
  if (index < 0 || index >= sections.length || target < 0 || target >= sections.length) {
    return sections;
  }
  const next = [...sections];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function documentSignature(doc: BuilderDocumentState): string {
  return JSON.stringify({
    title: doc.title,
    templateSlug: doc.templateSlug,
    contact: doc.contact,
    sections: doc.sections.map((s) => ({
      type: s.type,
      heading: s.heading,
      summaryText: s.summaryText,
      educationEntries: s.educationEntries.map(({ id: _id, ...rest }) => rest),
      experienceEntries: s.experienceEntries.map(({ id: _id, ...rest }) => rest),
      projectEntries: s.projectEntries.map(({ id: _id, ...rest }) => rest),
      skillItems: s.skillItems,
      certificationEntries: s.certificationEntries.map(({ id: _id, ...rest }) => rest),
      bodyText: s.bodyText,
    })),
  });
}

export function toFriendlyBuilderError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message || '';
  if (/RATE_LIMIT/i.test(msg) || /too many requests/i.test(msg)) {
    return 'You are saving too quickly. Please wait a few seconds and try again.';
  }
  if (/VALIDATION_ERROR|INVALID_/i.test(msg)) {
    return 'Please check your required fields (Resume title, Full name, and at least one section with content).';
  }
  if (/NetworkError|Failed to fetch|Load failed/i.test(msg)) {
    return 'We could not reach the server to save your changes. Check your connection and retry.';
  }
  if (msg.length > 0 && msg.length <= 140 && !/Traceback|Exception|Stack|ENOENT|SQL/i.test(msg)) {
    return msg;
  }
  return fallback;
}
