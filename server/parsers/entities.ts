import { extractSkillsFromSections } from '../nlp/skillMatcher.js';
import type { ParseWarning, SegmentedSection } from '../types.js';

const EMAIL_RE = /\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/;
const PHONE_RE = /(?<!\d)(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\d{5}[\s.-]?\d{5}|\d{10})(?!\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/?/i;
const URL_RE = /https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s|,;]*/gi;

const NON_NAME_HEADINGS = new Set([
  'resume',
  'curriculum vitae',
  'cv',
  'profile',
  'bio',
  'contact',
  'summary',
]);

function maskEmail(email: string): string {
  const [local, domain] = email.split('@', 2);
  const prefix = local ? local[0] : '*';
  return `${prefix}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '***';
  return `***-***-${digits.slice(-4)}`;
}

function maskHandle(value: string): string {
  const clean = value.trim();
  if (clean.length <= 1) return '***';
  return `${clean[0]}***`;
}

function maskLinkedin(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  const slug = match ? match[1] : '';
  return `linkedin.com/in/${maskHandle(slug)}`;
}

function maskGithub(url: string): string {
  const match = url.match(/github\.com\/([^/?#\s]+)/i);
  const username = match ? match[1] : '';
  return `github.com/${maskHandle(username)}`;
}

function maskPortfolio(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (!host) return '[portfolio redacted]';
    const labels = host.split('.');
    const maskedHost =
      labels.length >= 2
        ? [...labels.slice(0, -1).map(maskHandle), labels[labels.length - 1]].join('.')
        : maskHandle(host);
    const hasSubpath = Boolean((parsed.pathname && parsed.pathname !== '/') || parsed.search);
    return hasSubpath ? `${maskedHost}/***` : maskedHost;
  } catch {
    return '[portfolio redacted]';
  }
}

export function composeSectionsText(sections: SegmentedSection[]): string {
  const blocks: string[] = [];
  for (const sec of sections) {
    const heading = sec.raw_heading.trim();
    const body = sec.content_text.trim();
    if (sec.section_type !== 'header_contact' && heading && heading.toUpperCase() !== 'HEADER') {
      blocks.push(body ? `${heading}\n${body}` : heading);
    } else if (body) {
      blocks.push(body);
    }
  }
  return blocks.join('\n\n');
}

function inferCandidateLabel(sections: SegmentedSection[], rawText: string): string | null {
  const headerSec = sections.find((s) => s.section_type === 'header_contact');
  const headerText = headerSec ? headerSec.content_text : rawText;
  for (const rawLine of headerText.split('\n').slice(0, 6)) {
    const line = rawLine.split('|')[0].trim();
    if (!line || line.length < 3 || line.length > 55) continue;
    const lower = line.toLowerCase();
    if (NON_NAME_HEADINGS.has(lower)) continue;
    if (
      EMAIL_RE.test(line) ||
      PHONE_RE.test(line) ||
      lower.includes('http') ||
      lower.includes('github.com') ||
      lower.includes('linkedin.com')
    ) {
      continue;
    }
    if (/\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && words.every((w) => /[A-Za-z]/.test(w))) {
      return line;
    }
  }
  return null;
}

function splitEntries(text: string): string[] {
  if (!text.trim()) return [];
  const blocks = text
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  return text
    .split('\n')
    .map((ln) => ln.trim())
    .filter(Boolean);
}

export interface ExtractedResumeBundle {
  candidate_label: string | null;
  contact_flags: Record<string, boolean>;
  masked_contact: Record<string, string | null>;
  structured_payload: Record<string, unknown>;
  extraction_confidence: number;
  warnings: ParseWarning[];
}

export function extractStructuredResumeEntities(
  rawText: string,
  sections: SegmentedSection[],
  baseWarnings: ParseWarning[],
  layoutPenalty = 0.0,
): ExtractedResumeBundle {
  const warnings = [...baseWarnings];
  const topSlice = rawText.split('\n').slice(0, 15).join('\n');
  const searchSpace = `${topSlice}\n${rawText}`;

  const emailMatch = searchSpace.match(EMAIL_RE);
  const phoneMatch = searchSpace.match(PHONE_RE);
  const linkedinMatch = searchSpace.match(LINKEDIN_RE);
  const githubMatch = searchSpace.match(GITHUB_RE);

  let portfolioUrl: string | null = null;
  const urlMatches = searchSpace.match(URL_RE) ?? [];
  for (const urlStr of urlMatches) {
    const lower = urlStr.toLowerCase();
    if (lower.includes('linkedin.com') || lower.includes('github.com')) continue;
    portfolioUrl = urlStr;
    break;
  }

  const contactFlags: Record<string, boolean> = {
    has_email: emailMatch !== null,
    has_phone: phoneMatch !== null,
    has_linkedin: linkedinMatch !== null,
    has_github: githubMatch !== null,
    has_portfolio: portfolioUrl !== null,
  };

  const maskedContact: Record<string, string | null> = {
    email: emailMatch ? maskEmail(emailMatch[0]) : null,
    phone: phoneMatch ? maskPhone(phoneMatch[0]) : null,
    linkedin: linkedinMatch ? maskLinkedin(linkedinMatch[0]) : null,
    github: githubMatch ? maskGithub(githubMatch[0]) : null,
    portfolio: portfolioUrl ? maskPortfolio(portfolioUrl) : null,
  };

  const candidateLabel = inferCandidateLabel(sections, rawText);

  const byType: Record<string, string[]> = {};
  for (const sec of sections) {
    if (!byType[sec.section_type]) byType[sec.section_type] = [];
    byType[sec.section_type].push(sec.content_text);
  }

  const detectedSkills = extractSkillsFromSections(
    sections.map((s) => [s.section_type, s.content_text] as [string, string]),
  );
  const skillList = Array.from(
    new Set(Object.values(detectedSkills).map((hit) => hit.display_name)),
  ).sort();

  const summaryText = (byType.summary ?? []).join('\n\n') || null;
  const educationEntries = splitEntries((byType.education ?? []).join('\n\n'));
  const projectEntries = splitEntries((byType.projects ?? []).join('\n\n'));
  const experienceEntries = splitEntries((byType.experience ?? []).join('\n\n'));
  const internshipEntries = splitEntries((byType.internships ?? []).join('\n\n'));
  const certificationEntries = splitEntries((byType.certifications ?? []).join('\n\n'));
  const achievementEntries = splitEntries((byType.achievements ?? []).join('\n\n'));
  const languageEntries = splitEntries((byType.languages ?? []).join('\n\n'));

  const recognizedTypes = new Set(
    sections
      .map((s) => s.section_type)
      .filter((t) => t !== 'header_contact' && t !== 'other'),
  );
  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;

  let confidence = 1.0 - layoutPenalty;
  if (recognizedTypes.size < 2) {
    confidence -= 0.2;
    warnings.push({
      code: 'MISSING_STANDARD_SECTIONS',
      severity: 'warning',
      message:
        'Fewer than two standard resume headings were detected. Review and verify section blocks below.',
    });
  }
  if (!contactFlags.has_email && !contactFlags.has_phone) {
    confidence -= 0.1;
    warnings.push({
      code: 'MISSING_CONTACT_INFO',
      severity: 'info',
      message: 'Neither email nor phone number was detected in the extracted text.',
    });
  }
  if (wordCount < 80) {
    confidence -= 0.25;
    warnings.push({
      code: 'LOW_WORD_COUNT',
      severity: 'warning',
      message: `Only ${wordCount} words were extracted; verify whether any pages or blocks were missed.`,
    });
  }

  confidence = Math.round(Math.max(0.15, Math.min(1.0, confidence)) * 100) / 100;

  const structuredPayload: Record<string, unknown> = {
    candidate_label: candidateLabel,
    summary: summaryText,
    education: educationEntries,
    skills: skillList,
    projects: projectEntries,
    experience: experienceEntries,
    internships: internshipEntries,
    certifications: certificationEntries,
    achievements: achievementEntries,
    languages: languageEntries,
  };

  return {
    candidate_label: candidateLabel,
    contact_flags: contactFlags,
    masked_contact: maskedContact,
    structured_payload: structuredPayload,
    extraction_confidence: confidence,
    warnings,
  };
}
