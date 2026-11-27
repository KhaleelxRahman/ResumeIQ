import type { SegmentedSection } from '../types.js';

const SECTION_PATTERNS: Array<[string, RegExp]> = [
  ['summary', /^(?:professional\s+summary|career\s+summary|summary|profile|career\s+objective|objective|about\s+me)$/i],
  ['education', /^(?:education|academic\s+background|academic\s+details|qualifications|academics)$/i],
  ['skills', /^(?:technical\s+skills|core\s+competencies|skills|key\s+skills|tech\s+stack|technologies|tools\s*(?:&|and)\s*technologies)$/i],
  ['projects', /^(?:academic\s+projects|personal\s+projects|technical\s+projects|key\s+projects|projects)$/i],
  ['internships', /^(?:internships?|industrial\s+training|internship\s+experience|summer\s+training)$/i],
  ['experience', /^(?:work\s+experience|professional\s+experience|experience|employment\s+history|work\s+history)$/i],
  ['certifications', /^(?:certifications?|licenses?\s*(?:&|and)\s*certifications?|courses?\s*(?:&|and)\s*certifications?|certificates?)$/i],
  ['achievements', /^(?:achievements?|awards?|honors?|accomplishments?|extracurriculars?|leadership)$/i],
  ['languages', /^(?:languages?|spoken\s+languages?)$/i],
];

const LEADING_NUM_RE = /^(?:\d{1,2}[.)]\s*)/;

function matchHeading(line: string): [string, string] | null {
  const candidate = line.trim().replace(LEADING_NUM_RE, '').replace(/:+$/, '').trim();
  if (!candidate || candidate.length > 55 || candidate.split(/\s+/).length > 5) {
    return null;
  }
  for (const [secType, pattern] of SECTION_PATTERNS) {
    if (pattern.test(candidate)) {
      return [secType, line.trim().replace(/:+$/, '').trim()];
    }
  }
  return null;
}

export function segmentResumeSections(rawText: string): SegmentedSection[] {
  const lines = rawText.split('\n');
  const sections: SegmentedSection[] = [];

  let currentType = 'header_contact';
  let currentHeading = 'HEADER';
  let buffer: string[] = [];
  let order = 0;

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (!text) return;
    const conf = currentType !== 'other' ? 0.95 : 0.7;
    sections.push({
      section_type: currentType,
      raw_heading: currentHeading,
      content_text: text,
      confidence: conf,
      order_index: order,
    });
    order += 1;
  };

  for (const line of lines) {
    const headingHit = matchHeading(line);
    if (headingHit) {
      flush();
      buffer = [];
      [currentType, currentHeading] = headingHit;
    } else {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}
