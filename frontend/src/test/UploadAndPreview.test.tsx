import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { clearStoredWorkspaceToken, getStoredWorkspaceToken } from '../services/apiClient';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearStoredWorkspaceToken();
});

function stubBaseSessionAndStudioFetch(extraHandler?: (url: string, init?: RequestInit) => Response | null) {
  window.localStorage.setItem('resumeiq_server_workspace_token', 'server-token-valid-12345678901234567890');

  return vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (extraHandler) {
        const custom = extraHandler(url, init);
        if (custom) return Promise.resolve(custom);
      }
      if (url.endsWith('/health')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'ok',
              db: 'ok',
              nlp_ready: true,
              hf_mode: 'disabled',
              version: '0.2.0-phase4',
              engine_version: '1.0.0-deterministic',
            }),
            { status: 200 },
          ),
        );
      }
      if (url.endsWith('/workspaces/current')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              workspace_id: '00000000-0000-0000-0000-0000000000aa',
              created_at: '2026-11-26T00:00:00Z',
              last_seen_at: '2026-11-26T00:00:00Z',
              expires_at: '2026-12-26T00:00:00Z',
            }),
            { status: 200 },
          ),
        );
      }
      if (url.endsWith('/job-roles')) {
        return Promise.resolve(new Response(JSON.stringify({ roles: [] }), { status: 200 }));
      }
      if (url.endsWith('/resumes') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({ resumes: [] }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    }),
  );
}

describe('Phase 5 Resume Upload & Editable Parse Preview', () => {
  it('rejects unsupported file extensions and oversized (>5MB) files client-side', async () => {
    stubBaseSessionAndStudioFetch();

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const fileInput = await screen.findByLabelText(/Drop PDF or DOCX resume here/i);
    const inputEl = fileInput.querySelector('input[type="file"]') as HTMLInputElement;

    const txtFile = new File(['plain text'], 'resume.txt', { type: 'text/plain' });
    fireEvent.change(inputEl, { target: { files: [txtFile] } });
    expect(await screen.findByText(/Unsupported File Format/i)).toBeInTheDocument();

    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 100)], 'huge.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(inputEl, { target: { files: [bigFile] } });
    expect(await screen.findByText(/File Exceeds 5 MB Limit/i)).toBeInTheDocument();
  });

  it('displays clear SCANNED_PDF_DETECTED guidance when server rejects image-only PDFs', async () => {
    stubBaseSessionAndStudioFetch((url) => {
      if (url.endsWith('/resumes/upload')) {
        return new Response(
          JSON.stringify({
            error: {
              code: 'SCANNED_PDF_DETECTED',
              message: 'No selectable text layer was detected.',
              details: { page_count: 1, extracted_chars: 0 },
            },
          }),
          { status: 422 },
        );
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const dropzone = await screen.findByLabelText(/Drop PDF or DOCX resume here/i);
    const inputEl = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['%PDF-1.7'], 'scan.pdf', { type: 'application/pdf' });
    fireEvent.change(inputEl, { target: { files: [pdfFile] } });

    expect(await screen.findByText(/Scanned \/ Image-Only PDF Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/\[SCANNED_PDF_DETECTED\]/i)).toBeInTheDocument();
  });

  it('uploads PDF, displays warnings & skills, and saves edited sections while preserving raw_text', async () => {
    const uploadedResume = {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'rohan_resume',
      source_type: 'upload_pdf',
      active_version_id: '22222222-2222-2222-2222-222222222222',
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
      version: {
        version_id: '22222222-2222-2222-2222-222222222222',
        version_number: 1,
        file_name: 'rohan_resume.pdf',
        file_size_bytes: 2048,
        template_slug: 'swiss-technical',
        candidate_label: 'Rohan Synthetic',
        contact_flags: { has_email: true, has_phone: true, has_github: true, has_linkedin: false },
        masked_contact: { email: 'r***@example.edu', phone: '***-***-2233' },
        structured_payload: { skills: ['Python', 'React'], user_edited: false },
        raw_text: 'Rohan Synthetic\nSKILLS\nPython, React',
        word_count: 42,
        extraction_confidence: 0.88,
        parse_warnings: [
          {
            code: 'MULTI_COLUMN_LAYOUT',
            severity: 'warning',
            message: 'Multi-column PDF layout detected.',
          },
        ],
        sections: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            section_type: 'skills',
            raw_heading: 'SKILLS',
            content_text: 'Python, React',
            confidence: 0.95,
            order_index: 0,
          },
        ],
        created_at: '2026-11-26T00:00:00Z',
      },
    };

    stubBaseSessionAndStudioFetch((url, init) => {
      if (url.endsWith('/resumes/upload')) {
        return new Response(JSON.stringify(uploadedResume), { status: 201 });
      }
      if (url.includes('/versions/') && init?.method === 'PATCH') {
        const edited = structuredClone(uploadedResume);
        edited.version.structured_payload.user_edited = true;
        edited.version.sections[0].raw_heading = 'TECHNICAL SKILLS';
        return new Response(JSON.stringify(edited), { status: 200 });
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const dropzone = await screen.findByLabelText(/Drop PDF or DOCX resume here/i);
    const inputEl = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(inputEl, {
      target: { files: [new File(['%PDF-1.7'], 'rohan_resume.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText('88%')).toBeInTheDocument();
    expect(screen.getByText(/MULTI_COLUMN_LAYOUT/i)).toBeInTheDocument();
    expect(screen.getByText(/r\*\*\*@example\.edu/i)).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();

    const headingInput = screen.getByLabelText('Section 1 heading');
    fireEvent.change(headingInput, { target: { value: 'TECHNICAL SKILLS' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Verified Sections/i }));
    expect(await screen.findByText(/VERIFIED BY USER/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Inspect Original Extracted Text/i }));
    expect(screen.getByText(/PRESERVED IMMUTABLE EXTRACTION SOURCE/i)).toBeInTheDocument();
  });

  it('removes nested dropzone tab stops and activates file chooser via keyboard Enter', async () => {
    stubBaseSessionAndStudioFetch();

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    const dropzone = await screen.findByLabelText(/Drop PDF or DOCX resume here/i);
    await vi.waitFor(() => expect(dropzone).toHaveAttribute('tabindex', '0'));

    const inputEl = dropzone.querySelector('input[type="file"]') as HTMLInputElement;
    expect(inputEl).toHaveAttribute('tabindex', '-1');
    expect(inputEl).toHaveAttribute('aria-hidden', 'true');

    const focusableDescendants = dropzone.querySelectorAll('[tabindex]:not([tabindex="-1"])');
    expect(focusableDescendants).toHaveLength(0);

    const clickSpy = vi.spyOn(inputEl, 'click').mockImplementation(() => {});
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('requires confirmation before deleting a resume or purging workspace session', async () => {
    const ownedResume = {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Owned Resume Draft',
      source_type: 'upload_pdf',
      active_version_id: '55555555-5555-5555-5555-555555555555',
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
      version: {
        version_id: '55555555-5555-5555-5555-555555555555',
        version_number: 1,
        file_name: 'draft.pdf',
        file_size_bytes: 1024,
        template_slug: 'swiss-technical',
        candidate_label: 'Aarav Test',
        contact_flags: {
          has_email: true,
          has_phone: true,
          has_github: true,
          has_linkedin: true,
          has_portfolio: true,
        },
        masked_contact: {
          email: 'a***@example.edu',
          phone: '***-***-1234',
          github: 'github.com/a***',
          linkedin: 'linkedin.com/in/a***',
          portfolio: 'p***.a***.dev/***',
        },
        structured_payload: { skills: ['Python', 'JavaScript', 'React'], user_edited: false },
        raw_text: 'Aarav Test\nSKILLS\nPython, JavaScript, React',
        word_count: 10,
        extraction_confidence: 0.92,
        parse_warnings: [],
        sections: [
          {
            id: '66666666-6666-6666-6666-666666666666',
            section_type: 'skills',
            raw_heading: 'SKILLS',
            content_text: 'Python, JavaScript, React',
            confidence: 0.95,
            order_index: 0,
          },
        ],
        created_at: '2026-11-26T00:00:00Z',
      },
    };

    const deleteCalls: string[] = [];
    const fetchMock = vi.fn();
    stubBaseSessionAndStudioFetch((url, init) => {
      fetchMock(url, init?.method ?? 'GET');
      if (url.endsWith('/resumes') && (!init?.method || init.method === 'GET') && deleteCalls.length === 0) {
        return new Response(
          JSON.stringify({
            resumes: [
              {
                id: ownedResume.id,
                title: ownedResume.title,
                source_type: ownedResume.source_type,
                active_version_id: ownedResume.active_version_id,
                candidate_label: 'Aarav Test',
                word_count: 10,
                extraction_confidence: 0.92,
                warnings_count: 0,
                created_at: '2026-11-26T00:00:00Z',
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.endsWith(`/resumes/${ownedResume.id}`) && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify(ownedResume), { status: 200 });
      }
      if (url.endsWith(`/resumes/${ownedResume.id}`) && init?.method === 'DELETE') {
        deleteCalls.push('resume');
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/workspaces/current') && init?.method === 'DELETE') {
        deleteCalls.push('workspace');
        return new Response(null, { status: 204 });
      }
      if (url.endsWith('/workspaces/session') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            workspace_id: '00000000-0000-0000-0000-0000000000bb',
            token: 'fresh-server-token-1234567890123456789012',
            expires_at: '2026-12-26T00:00:00Z',
          }),
          { status: 201 },
        );
      }
      return null;
    });

    render(
      <MemoryRouter initialEntries={['/analyze']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    // Sample/resume preview displays canonical skills & masked URLs
    expect(await screen.findByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText(/github\.com\/a\*\*\*/i)).toBeInTheDocument();
    expect(screen.getByText(/linkedin\.com\/in\/a\*\*\*/i)).toBeInTheDocument();
    expect(screen.getByText(/p\*\*\*\.a\*\*\*\.dev\/\*\*\*/i)).toBeInTheDocument();

    // 1. Delete Resume requires confirmation; Cancel & Escape must abort DELETE
    fireEvent.click(screen.getByRole('button', { name: /^Delete Resume$/i }));
    const deleteDialog = screen.getByRole('alertdialog');
    expect(deleteDialog).toHaveTextContent(/Delete Resume Permanently/i);
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toHaveFocus();
    expect(deleteCalls).toHaveLength(0);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleteCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /^Delete Resume$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm Delete Resume$/i }));
    expect(await screen.findByText(/No resumes available yet\./i)).toBeInTheDocument();
    expect(deleteCalls).toContain('resume');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // 2. Purge Workspace requires confirmation; Cancel aborts, Confirm executes
    fireEvent.click(screen.getByRole('button', { name: /^Purge Workspace$/i }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/Purge Entire Workspace Session/i);
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(deleteCalls).not.toContain('workspace');

    fireEvent.click(screen.getByRole('button', { name: /^Purge Workspace$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Confirm Purge Workspace$/i }));
    expect(await screen.findByText(/Workspace purged on server/i)).toBeInTheDocument();
    expect(deleteCalls).toContain('workspace');
    expect(getStoredWorkspaceToken()).toBe('fresh-server-token-1234567890123456789012');
    expect(fetchMock).toHaveBeenCalled();
  });
});
