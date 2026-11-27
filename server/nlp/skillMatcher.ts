import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../data/skill_aliases.json');
const BOUNDARY_CHARS = 'A-Za-z0-9_+#.';

export interface SkillEntry {
  canonical_key: string;
  display_name: string;
  category: string;
  aliases: string[];
  disambiguation: string;
  implies: string[];
}

export interface DetectedSkill {
  canonical_key: string;
  display_name: string;
  category: string;
  matched_alias: string;
  section: string;
  snippet: string;
  start: number;
  end: number;
}

let cachedTaxonomy: SkillEntry[] | null = null;

export function loadSkillTaxonomy(): SkillEntry[] {
  if (cachedTaxonomy) {
    return cachedTaxonomy;
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as {
    skills: Array<{
      canonical_key: string;
      display_name: string;
      category: string;
      aliases: string[];
      disambiguation?: string;
      implies?: string[];
    }>;
  };
  cachedTaxonomy = raw.skills.map((item) => ({
    canonical_key: item.canonical_key,
    display_name: item.display_name,
    category: item.category,
    aliases: item.aliases,
    disambiguation: item.disambiguation ?? 'standard',
    implies: item.implies ?? [],
  }));
  return cachedTaxonomy;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildBoundaryRegex(alias: string, caseSensitive: boolean): RegExp {
  const escaped = escapeRegex(alias);
  const pattern = `(?<![${BOUNDARY_CHARS}])${escaped}(?![A-Za-z0-9_+#])(?!\\.[A-Za-z0-9])`;
  return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
}

function extractSnippet(text: string, start: int, end: int, radius = 55): string {
  const left = Math.max(0, start - radius);
  const right = Math.min(text.length, end + radius);
  let snippet = text.slice(left, right).replace(/\s+/g, ' ').trim();
  if (left > 0) snippet = '...' + snippet;
  if (right < text.length) snippet = snippet + '...';
  return snippet.slice(0, 300);
}

type int = number;

function passesDisambiguation(
  entry: SkillEntry,
  alias: string,
  text: string,
  start: number,
  end: number,
  sectionName: string,
): boolean {
  const mode = entry.disambiguation;
  const matchedToken = text.slice(start, end);
  const before = text.slice(Math.max(0, start - 24), start);
  const after = text.slice(end, Math.min(text.length, end + 28));
  const window = `${before}${matchedToken}${after}`;

  if (mode === 'strict_c') {
    if (matchedToken !== 'C') return false;
    if (/\b(grade|option|section|part|track|vitamin|series|group)\s+$/i.test(before)) return false;
    if (/^\s*&/.test(after)) return false;
    const hasDelimiter =
      /([,/:|(&]|\bLanguages\b|\bSkills\b)/.test(before) ||
      /^\s*([,/;)|]|\bprogramming\b|\blanguage\b|\bembedded\b)/i.test(after);
    return hasDelimiter || sectionName === 'skills';
  }

  if (mode === 'strict_r') {
    if (alias === 'R' && matchedToken !== 'R') return false;
    if (/^\s*&\s*D\b/i.test(after)) return false;
    if (alias === 'RStudio') return true;
    const hasDelimiter =
      /([,/:|(]|\bLanguages\b|\bSkills\b|\bin\s+$)/i.test(before) ||
      /^\s*([,/;)|]|\bprogramming\b|\bstatistics\b|\bstudio\b)/i.test(after);
    return hasDelimiter || sectionName === 'skills';
  }

  if (mode === 'strict_go') {
    if (alias.toLowerCase() === 'golang') return true;
    if (matchedToken !== 'Go') return false;
    if (/^\s+(to|for|ahead|beyond|through|into|with|on|back|live)\b/i.test(after)) return false;
    const hasTechContext =
      /([,/:|(]|\bLanguages\b|\bSkills\b|\bin\s+$)/i.test(before) ||
      /^\s*([,/;)|]|\bbackend\b|\bmicroservices\b|\bAPIs?\b|\bservices\b)/i.test(after);
    return hasTechContext || sectionName === 'skills';
  }

  if (mode === 'case_token_js') {
    if (alias === 'JS') return matchedToken === 'JS';
    return true;
  }

  if (mode === 'strict_upper') {
    if (alias === 'RAG' || alias === 'IAM') return matchedToken === alias;
    return true;
  }

  if (mode === 'strict_case_title') {
    if (alias === 'Express') {
      if (matchedToken !== 'Express') return false;
      return /(Node|React|Flask|API|[,/:|]|\bExpress\b)/.test(window);
    }
    return true;
  }

  return true;
}

export function extractSkillsFromSections(
  sections: Array<[string, string]>,
): Record<string, DetectedSkill> {
  const taxonomy = loadSkillTaxonomy();
  const aliasCandidates: Array<[string, SkillEntry]> = [];
  for (const entry of taxonomy) {
    for (const alias of entry.aliases) {
      aliasCandidates.push([alias, entry]);
    }
  }
  aliasCandidates.sort((a, b) => b[0].length - a[0].length);

  const detected: Record<string, DetectedSkill> = {};

  for (const [sectionType, text] of sections) {
    if (!text) continue;
    const occupiedSpans: Array<[number, number]> = [];

    for (const [alias, entry] of aliasCandidates) {
      const caseSensitive =
        (entry.disambiguation === 'strict_c' ||
          entry.disambiguation === 'strict_go' ||
          entry.disambiguation === 'strict_upper') &&
        (alias === 'C' || alias === 'Go' || alias === 'RAG' || alias === 'IAM');

      const pattern = buildBoundaryRegex(alias, caseSensitive);
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        if (occupiedSpans.some(([s, e]) => !(end <= s || start >= e))) {
          continue;
        }
        if (!passesDisambiguation(entry, alias, text, start, end, sectionType)) {
          continue;
        }

        occupiedSpans.push([start, end]);
        if (!(entry.canonical_key in detected)) {
          detected[entry.canonical_key] = {
            canonical_key: entry.canonical_key,
            display_name: entry.display_name,
            category: entry.category,
            matched_alias: text.slice(start, end),
            section: sectionType,
            snippet: extractSnippet(text, start, end),
            start,
            end,
          };
        }
      }
    }
  }

  return detected;
}
