import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreateResumePayload,
  buildPatchDraftPayload,
  createBlankDocument,
  createStudentStarterDocument,
  deduplicateSkills,
  isDateRangeChronological,
  isValidOptionalUrl,
  moveSectionByOffset,
  resumeDetailToBuilderDocument,
  serializeSectionToContentText,
  validateBuilderDocument,
} from './builderModel.ts';
import type { ResumeDetail } from '../../types/api.ts';

describe('builderModel pure logic', () => {
  it('creates an empty blank document without inventing user data', () => {
    const doc = createBlankDocument('swiss-technical');
    assert.equal(doc.resumeId, null);
    assert.equal(doc.contact.full_name, '');
    assert.equal(doc.contact.email, '');
    assert.deepEqual(
      doc.sections.map((s) => s.type),
      ['summary', 'education', 'skills', 'projects'],
    );
    const validation = validateBuilderDocument(doc);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.full_name);
    assert.ok(validation.errors.sections);
  });

  it('deduplicates skills case-insensitively while preserving user spelling', () => {
    const first = deduplicateSkills(['Python', 'TypeScript'], ['python', 'React', 'TYPESCRIPT', 'PostgreSQL']);
    assert.deepEqual(first, ['Python', 'TypeScript', 'React', 'PostgreSQL']);
    const second = deduplicateSkills(first, ['  - Node.js  ', 'react', '']);
    assert.deepEqual(second, ['Python', 'TypeScript', 'React', 'PostgreSQL', 'Node.js']);
  });

  it('validates email, URLs, and chronological date ranges', () => {
    assert.equal(isValidOptionalUrl(''), true);
    assert.equal(isValidOptionalUrl('github.com/student-user'), true);
    assert.equal(isValidOptionalUrl('https://portfolio.example.edu/work'), true);
    assert.equal(isValidOptionalUrl('javascript:alert(1)'), false);
    assert.equal(isValidOptionalUrl('not a url with spaces'), false);

    assert.equal(isDateRangeChronological('2023', '2027', false), true);
    assert.equal(isDateRangeChronological('2026', '2024', false), false);
    assert.equal(isDateRangeChronological('2026', '2024', true), true);
    assert.equal(isDateRangeChronological('May 2024', 'Jan 2024', false), false);
    assert.equal(isDateRangeChronological('Jan 2024', 'May 2024', false), true);
  });

  it('round-trips a structured builder document cleanly without data loss across template switches', () => {
    const starter = createStudentStarterDocument('academic-editorial');
    starter.contact.full_name = 'Ananya Verma';
    starter.contact.email = 'ananya@example.edu';
    starter.contact.github = 'github.com/ananya-v';

    const validation = validateBuilderDocument(starter);
    assert.equal(validation.valid, true);

    const payload = buildCreateResumePayload(starter);
    assert.equal(payload.template_slug, 'academic-editorial');
    assert.equal(payload.contact.full_name, 'Ananya Verma');
    assert.ok(payload.sections.length >= 4);

    // Simulate backend ResumeDetail returned from server
    const serverDetail: ResumeDetail = {
      id: '11111111-1111-1111-1111-111111111111',
      title: payload.title,
      source_type: 'builder',
      is_sample: false,
      active_version_id: '22222222-2222-2222-2222-222222222222',
      created_at: '2026-11-27T10:00:00Z',
      updated_at: '2026-11-27T10:00:00Z',
      version: {
        version_id: '22222222-2222-2222-2222-222222222222',
        version_number: 1,
        file_name: null,
        file_size_bytes: null,
        template_slug: payload.template_slug,
        candidate_label: payload.contact.full_name,
        contact_flags: { has_email: true },
        masked_contact: {},
        structured_payload: {
          builder_contact: payload.contact,
          skills: ['Python', 'TypeScript', 'React', 'SQL', 'Git'],
        },
        raw_text: '',
        word_count: 85,
        extraction_confidence: 1.0,
        parse_warnings: [],
        sections: payload.sections.map((s, idx) => ({
          section_type: s.section_type,
          raw_heading: s.raw_heading,
          content_text: s.content_text,
          confidence: 1.0,
          order_index: idx + 1,
        })),
        created_at: '2026-11-27T10:00:00Z',
      },
    };

    const hydrated = resumeDetailToBuilderDocument(serverDetail);
    assert.equal(hydrated.contact.full_name, 'Ananya Verma');
    assert.equal(hydrated.contact.email, 'ananya@example.edu');
    assert.equal(hydrated.templateSlug, 'academic-editorial');
    assert.equal(hydrated.sections[1].educationEntries[0].institution, 'Your University or College');
    assert.deepEqual(hydrated.sections[2].skillItems, ['Python', 'TypeScript', 'React', 'SQL', 'Git']);
    assert.equal(hydrated.sections[3].projectEntries[0].name, 'Academic Capstone Project');
    assert.equal(hydrated.sections[4].certificationEntries[0].issuer, 'Issuing Organization');

    // Switch template -> content stays intact
    hydrated.templateSlug = 'swiss-technical';
    const patchPayload = buildPatchDraftPayload(hydrated);
    assert.equal(patchPayload.template_slug, 'swiss-technical');
    assert.equal(patchPayload.sections?.length, payload.sections.length);
  });

  it('parses uploaded PDF/sample resume sections cleanly and supports reordering', () => {
    const uploaded: ResumeDetail = {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Uploaded Student Resume',
      source_type: 'upload_pdf',
      is_sample: false,
      active_version_id: '44444444-4444-4444-4444-444444444444',
      created_at: '2026-11-27T10:00:00Z',
      updated_at: '2026-11-27T10:00:00Z',
      version: {
        version_id: '44444444-4444-4444-4444-444444444444',
        version_number: 1,
        file_name: 'aarav.pdf',
        file_size_bytes: 1200,
        template_slug: 'swiss-technical',
        candidate_label: 'Aarav Synthetic',
        contact_flags: { has_email: true, has_github: true },
        masked_contact: { email: 'a***@example.edu' },
        structured_payload: {},
        raw_text: 'Aarav Synthetic\nsynthetic.student@example.edu | github.com/aarav\n\nEDUCATION\nB.Tech in CS, NIT Example (2023 - 2027)',
        word_count: 40,
        extraction_confidence: 0.9,
        parse_warnings: [],
        sections: [
          {
            section_type: 'education',
            raw_heading: 'EDUCATION',
            content_text: 'B.Tech in Computer Science, NIT Example (2023 - 2027) | CGPA: 8.8/10',
            confidence: 0.95,
            order_index: 0,
          },
          {
            section_type: 'skills',
            raw_heading: 'TECHNICAL SKILLS',
            content_text: 'Languages: Python, SQL\nFrameworks: Flask, React',
            confidence: 0.95,
            order_index: 1,
          },
        ],
        created_at: '2026-11-27T10:00:00Z',
      },
    };

    const doc = resumeDetailToBuilderDocument(uploaded);
    assert.equal(doc.contact.full_name, 'Aarav Synthetic');
    assert.equal(doc.contact.email, 'synthetic.student@example.edu');
    assert.equal(doc.contact.github, 'github.com/aarav');
    assert.equal(doc.sections[0].educationEntries[0].degree, 'B.Tech');
    assert.equal(doc.sections[0].educationEntries[0].fieldOfStudy, 'Computer Science');
    assert.equal(doc.sections[0].educationEntries[0].institution, 'NIT Example');
    assert.equal(doc.sections[0].educationEntries[0].gpa, '8.8/10');
    assert.deepEqual(doc.sections[1].skillItems, ['Python', 'SQL', 'Flask', 'React']);

    const reordered = moveSectionByOffset(doc.sections, 1, -1);
    assert.equal(reordered[0].type, 'skills');
    assert.equal(reordered[1].type, 'education');
    assert.ok(serializeSectionToContentText(reordered[1]).includes('NIT Example'));
  });
});
