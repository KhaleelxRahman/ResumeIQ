const BULLET_PREFIX_RE = /^[\u2022\u25aa\u25cf\u2023\u25e6\u2043\u2219*\u2013\u2014]\s*/;
const HYPHEN_WRAP_RE = /([A-Za-z]{2,})-\n([a-z]{2,})/g;
const MULTI_SPACE_RE = /[ \t]{2,}/g;

export function normalizeExtractedText(raw: string): string {
  if (!raw) return '';

  let text = raw.normalize('NFKC');
  text = text.replace(/\x00/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/\u2018|\u2019/g, "'");
  text = text.replace(/\u201c|\u201d/g, '"');
  text = text.replace(HYPHEN_WRAP_RE, '$1$2');

  const cleanedLines: string[] = [];
  let blankStreak = 0;

  for (const line of text.split('\n')) {
    let stripped = line.trim();
    if (!stripped) {
      blankStreak += 1;
      if (blankStreak <= 1 && cleanedLines.length > 0) {
        cleanedLines.push('');
      }
      continue;
    }

    blankStreak = 0;
    stripped = stripped.replace(BULLET_PREFIX_RE, '- ');
    stripped = stripped.replace(MULTI_SPACE_RE, ' ');
    cleanedLines.push(stripped);
  }

  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] === '') {
    cleanedLines.pop();
  }

  return cleanedLines.join('\n');
}
