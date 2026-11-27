import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { clearStoredWorkspaceToken } from '../services/apiClient';
import type { ResumeDetail } from '../types/api';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearStoredWorkspaceToken();
});

function makeParsedResume(overrides: Partial<ResumeDetail> = {}): ResumeDetail {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Parsed Student Resume',
    source_type: 'upload_pdf',
    is_sample: false,
    active_version_id: '22222222-2222-2222-2222-222222222222',
    created_at: '2026-11-27T09:00:00Z',
    updated_at: '2026-11-27T09:00:00Z',
    version: {
      version_id: '22222222-2222-2222-2222-222222222222',
      version_number: 1,
      file_name: 'student_cv.pdf',
      file_size_bytes: 2048,
      template_slug: 'swiss-technical',
      candidate_label: 'Rohan Nair',
      contact_flags: { has_email: true, has_github: true },
      masked_contact: { email: 'r***@example.edu', github: 'github.com/r***' },
      structured_payload: {
        builder_contact: {
          full_name: 'Rohan Nair',
          email: 'rohan@example.edu',
          phone: '+91-90000-11111',
          location: 'Bengaluru',
          github: 'github.com/rohan-nair',
          linkedin: 'linkedin.com/in/rohan-nair',
          portfolio: '',
        },
        skills: ['Python', 'React'],
      },
      raw_text: 'Rohan Nair\nrohan@example.edu',
      word_count: 55,
      extraction_confidence: 0.92,
      parse_warnings: [],
      sections: [
        {
          id: 'sec-1',
          section_type: 'summary',
          raw_heading: 'PROFESSIONAL SUMMARY',
          content_text: 'Computer science undergraduate focused on accessible web tools.',
          confidence: 0.95,
          order_index: 1,
        },
        {
          id: 'sec-2',
          section_type: 'education',
          raw_heading: 'EDUCATION',
          content_text: 'B.Tech in Computer Science | NIT Bengaluru (2023 - 2027) | CGPA: 8.8/10',
          confidence: 0.95,
          order_index: 2,
        },
        {
          id: 'sec-3',
          section_type: 'skills',
          raw_heading: 'TECHNICAL SKILLS',
          content_text: 'Python, React',
          confidence: 0.95,
          order_index: 3,
        },
        {
          id: 'sec-4',
          section_type: 'projects',
          raw_heading: 'PROJECTS',
          content_text: 'Campus Bus Map | React, Flask\n- Built live route lookup UI.',
          confidence: 0.95,
          order_index: 4,
        },
      ],
      created_at: '2026-11-27T09:00:00Z',
    },
    versions: [
      {
        version_id: '22222222-2222-2222-2222-222222222222',
        version_number: 1,
        template_slug: 'swiss-technical',
        word_count: 55,
        created_at: '2026-11-27T09:00:00Z',
      },
    ],
    ...overrides,
  };
}

function stubBuilderFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response> | null) {
  window.localStorage.setItem('resumeiq_server_workspace_token', 'server-token-valid-12345678901234567890');
  return vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const custom = await handler(url, init);
      if (custom) return custom;

      if (url.endsWith('/workspaces/current')) {
        return new Response(
          JSON.stringify({
            workspace_id: '00000000-0000-0000-0000-0000000000aa',
            created_at: '2026-11-27T00:00:00Z',
            last_seen_at: '2026-11-27T00:00:00Z',
            expires_at: '2026-12-27T00:00:00Z',
          }),
          { status: 200 },
        );
      }
      if (url.includes('/resumes?')) {
        return new Response(JSON.stringify({ resumes: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }),
  );
}

describe('Phase 6 Student Resume Builder', () => {
  it('opens an existing parsed resume, supports editing sections, deduplicates skills, reorders, switches templates without content loss, and saves versions', async () => {
    let currentResume = makeParsedResume();
    const patchBodies: Array<Record<string, unknown>> = [];
    const versionBodies: Array<Record<string, unknown>> = [];

    stubBuilderFetch((url, init) => {
      if (url.includes('/resumes?')) {
        return new Response(
          JSON.stringify({
            resumes: [
              {
                id: currentResume.id,
                title: currentResume.title,
                source_type: currentResume.source_type,
                is_sample: false,
                active_version_id: currentResume.active_version_id,
                candidate_label: currentResume.version.candidate_label,
                word_count: currentResume.version.word_count,
                extraction_confidence: 0.92,
                warnings_count: 0,
                created_at: currentResume.created_at,
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith(`/resumes/${currentResume.id}`) && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify(currentResume), { status: 200 });
      }
      if (url.includes('/versions/') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        patchBodies.push(body);
        const updated = structuredClone(currentResume);
        updated.title = String(body.title ?? updated.title);
        updated.version.template_slug = String(body.template_slug ?? 'swiss-technical');
        updated.version.structured_payload.builder_contact = body.contact as ResumeDetail['version']['structured_payload']['builder_contact'];
        updated.version.sections = (body.sections as Array<{ section_type: string; raw_heading: string; content_text: string }>).map(
          (s, idx) => ({
            ...s,
            confidence: 1.0,
            order_index: idx + 1,
          }),
        );
        currentResume = updated;
        return new Response(JSON.stringify(updated), { status: 200 });
      }
      if (url.endsWith(`/resumes/${currentResume.id}/versions`) && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        versionBodies.push(body);
        const nextVer = structuredClone(currentResume);
        nextVer.version.version_id = '33333333-3333-3333-3333-333333333333';
        nextVer.version.version_number = 2;
        nextVer.active_version_id = '33333333-3333-3333-3333-333333333333';
        nextVer.versions = [
          ...(currentResume.versions ?? []),
          {
            version_id: '33333333-3333-3333-3333-333333333333',
            version_number: 2,
            template_slug: String(body.template_slug ?? 'academic-editorial'),
            word_count: 72,
            created_at: '2026-11-27T10:00:00Z',
          },
        ];
        currentResume = nextVer;
        return new Response(JSON.stringify(nextVer), { status: 201 });
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={[`/builder?resumeId=${currentResume.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const fullNameInput = await screen.findByLabelText(/Full Name/i);
    await waitFor(() => expect(fullNameInput).toHaveValue('Rohan Nair'));

    // Live paper preview initially reflects Swiss Technical + parsed candidate info
    const preview = screen.getByTestId('resume-paper-preview');
    expect(preview).toHaveAttribute('data-template', 'swiss-technical');
    expect(preview).toHaveTextContent('Rohan Nair');
    expect(preview).toHaveTextContent('Campus Bus Map');

    // Edit personal info & observe immediate preview update
    fireEvent.change(fullNameInput, { target: { value: 'Rohan K. Nair' } });
    expect(preview).toHaveTextContent('Rohan K. Nair');
    expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();

    // Open Skills section, add deduplicated skills, and remove one
    fireEvent.click(screen.getByRole('button', { name: 'TECHNICAL SKILLS' }));
    const skillInput = screen.getByLabelText(/Add Skills/i);
    fireEvent.change(skillInput, { target: { value: 'python, TypeScript, SQL' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add Skill$/i }));
    expect(preview).toHaveTextContent('Python, React, TypeScript, SQL');

    fireEvent.click(screen.getByRole('button', { name: 'Remove skill React' }));
    expect(preview).toHaveTextContent('Python, TypeScript, SQL');

    // Reorder TECHNICAL SKILLS up above EDUCATION
    fireEvent.click(screen.getByRole('button', { name: 'Move TECHNICAL SKILLS up' }));

    // Add optional Work Experience section and add an entry
    const addSelect = screen.getByLabelText(/Add Optional Section/i);
    fireEvent.change(addSelect, { target: { value: 'experience' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add Section$/i }));
    fireEvent.change(screen.getByLabelText('Role Title'), { target: { value: 'Teaching Assistant' } });
    fireEvent.change(screen.getByLabelText('Organization / Company'), { target: { value: 'CS Department' } });
    expect(preview).toHaveTextContent('Teaching Assistant | CS Department');

    // Switch template to academic-editorial and confirm content remains intact
    fireEvent.change(screen.getByLabelText(/ATS Template/i), {
      target: { value: 'academic-editorial' },
    });
    expect(preview).toHaveAttribute('data-template', 'academic-editorial');
    expect(preview).toHaveTextContent('Rohan K. Nair');
    expect(preview).toHaveTextContent('Teaching Assistant | CS Department');

    // Save Draft -> PATCH called
    fireEvent.click(screen.getByRole('button', { name: /^Save Draft$/i }));
    expect(await screen.findByText(/Draft saved cleanly/i)).toBeInTheDocument();
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0].template_slug).toBe('academic-editorial');

    // Save New Version -> POST /versions called and v2 becomes active
    fireEvent.click(screen.getByRole('button', { name: /^Save New Version$/i }));
    expect(await screen.findByText(/Created new saved snapshot v2/i)).toBeInTheDocument();
    expect(versionBodies).toHaveLength(1);
  });

  it('creates a new blank resume draft, validates required fields, and triggers PDF export download', async () => {
    const createdResume = makeParsedResume({
      id: '99999999-9999-9999-9999-999999999999',
      title: 'Fresh Internship Resume',
      source_type: 'builder',
    });
    let exportCalls = 0;

    stubBuilderFetch((url, init) => {
      if (url.endsWith('/resumes/builder') && init?.method === 'POST') {
        return new Response(JSON.stringify(createdResume), { status: 201 });
      }
      if (url.includes('/export?format=pdf')) {
        exportCalls += 1;
        return new Response(new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' }), {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="Fresh_Internship_Resume_v1.pdf"' },
        });
      }
      return null;
    });

    // JSDOM stub for object URL download
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/builder']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const fullNameInput = await screen.findByLabelText(/Full Name/i);
    expect(fullNameInput).toHaveValue('');

    // Trying to save empty blank form triggers accessible validation error
    fireEvent.click(screen.getByRole('button', { name: /^Save Draft$/i }));
    expect(
      (await screen.findAllByText(/Enter your full name before saving or exporting/i)).length,
    ).toBeGreaterThanOrEqual(1);

    // Fill valid fields & email error check
    fireEvent.change(screen.getByLabelText(/^Resume Title$/i), {
      target: { value: 'Fresh Internship Resume' },
    });
    fireEvent.change(fullNameInput, { target: { value: 'Rohan Nair' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save Draft$/i }));
    expect(
      (await screen.findAllByText(/Enter a valid email address/i)).length,
    ).toBeGreaterThanOrEqual(1);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'rohan@example.edu' } });
    fireEvent.click(screen.getByRole('button', { name: 'PROFESSIONAL SUMMARY' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Professional Summary/i }), {
      target: { value: 'Building web systems.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Save Draft$/i }));
    expect(await screen.findByText(/Draft saved cleanly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Export PDF$/i }));
    expect(await screen.findByText(/PDF exported \(Fresh_Internship_Resume_v1\.pdf\)/i)).toBeInTheDocument();
    expect(exportCalls).toBe(1);
  });

  it('requires confirmation before deleting a resume and shows friendly recovery copy on save failure', async () => {
    const resume = makeParsedResume();
    let deleteCount = 0;

    stubBuilderFetch((url, init) => {
      if (url.endsWith(`/resumes/${resume.id}`) && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify(resume), { status: 200 });
      }
      if (url.includes('/versions/') && init?.method === 'PATCH') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Traceback (most recent call last): internal DB detail',
            },
          }),
          { status: 500 },
        );
      }
      if (url.endsWith(`/resumes/${resume.id}`) && init?.method === 'DELETE') {
        deleteCount += 1;
        return new Response(null, { status: 204 });
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={[`/builder?resumeId=${resume.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Rohan Nair'));

    // Simulate save error -> friendly error copy without exposing raw Traceback
    fireEvent.click(screen.getByRole('button', { name: /^Save Draft$/i }));
    expect(await screen.findByText(/Your changes could not be saved\. Please retry\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Traceback/i)).not.toBeInTheDocument();

    // Delete requires confirmation
    fireEvent.click(screen.getByRole('button', { name: /^Delete Resume$/i }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/Delete Resume Permanently/i);
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(deleteCount).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /^Delete Resume$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm Delete Resume$/i }));
    expect(await screen.findByText(/Resume deleted from this workspace\./i)).toBeInTheDocument();
    expect(deleteCount).toBe(1);
  });
});
