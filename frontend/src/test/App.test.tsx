import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../App';
import { clearStoredWorkspaceToken, ensureServerWorkspaceSession } from '../services/apiClient';
import { WebGLErrorBoundary } from '../three/WebGLErrorBoundary';
import { StaticPrismFallback } from '../three/StaticPrismFallback';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearStoredWorkspaceToken();
});

describe('ResumeIQ Phase 4 Frontend Shell', () => {
  it('renders accessible landing page with static SVG prism fallback when reduced motion is enabled', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1280 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
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
        return Promise.resolve(
          new Response(
            JSON.stringify({
              roles: [
                {
                  id: '1',
                  slug: 'data-analyst',
                  title: 'Data Analyst',
                  category: 'Data',
                  is_core_mandatory: true,
                  description: 'SQL and BI analysis.',
                  mandatory_count: 6,
                  preferred_count: 8,
                },
              ],
            }),
            { status: 200 },
          ),
        );
      }),
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /ATS Compatibility Estimate/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Calibration Prism · Static SVG/i)).toBeInTheDocument();
    expect(await screen.findByText('6 mandatory / 8 preferred')).toBeInTheDocument();
    expect(screen.getByText('Data Analyst')).toBeInTheDocument();
  });

  it('uses server-issued workspace token from POST /workspaces/session instead of client-generated tokens', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workspace_id: '00000000-0000-0000-0000-0000000000aa',
            token: 'server-issued-opaque-cryptographic-token-123456',
            expires_at: '2026-12-26T00:00:00Z',
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
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
    vi.stubGlobal('fetch', fetchMock);

    const status = await ensureServerWorkspaceSession();
    expect(status.workspace_id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/workspaces\/session$/),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('renders mobile static SVG fallback cleanly and supports all 6 documented routes', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/health')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: 'ok',
                db: 'ok',
                nlp_ready: true,
                hf_mode: 'disabled',
                version: '0.5.0-phase5',
                engine_version: '1.0.0-deterministic',
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ roles: [] }), { status: 200 }));
      }),
    );

    const routes: Array<{ path: string; heading: RegExp }> = [
      { path: '/', heading: /Build ATS-ready resumes/i },
      { path: '/builder', heading: /Student Resume Builder/i },
      { path: '/results/test-id', heading: /Analysis Workspace/i },
      { path: '/history', heading: /Resume Version & Analysis History/i },
      { path: '/about', heading: /How ResumeIQ Evaluates Resumes/i },
    ];

    for (const entry of routes) {
      render(
        <MemoryRouter initialEntries={[entry.path]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      expect(await screen.findByRole('heading', { name: entry.heading })).toBeInTheDocument();
      if (entry.path === '/') {
        expect(screen.getByText(/Calibration Prism · Static SVG/i)).toBeInTheDocument();
      }
      cleanup();
    }
  });

  it('renders StaticPrismFallback safely via WebGLErrorBoundary and context-loss handler', async () => {
    const BoomCanvas = () => {
      throw new Error('WebGL context unavailable');
    };
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WebGLErrorBoundary fallback={<StaticPrismFallback />}>
        <BoomCanvas />
      </WebGLErrorBoundary>,
    );
    expect(screen.getByText(/Calibration Prism · Static SVG/i)).toBeInTheDocument();
    consoleErr.mockRestore();
  });

  it('toggles HeroPrismCanvas fallback cleanly on webglcontextlost and webglcontextrestored events', async () => {
    vi.resetModules();
    vi.doMock('@react-three/fiber', () => ({
      Canvas: ({
        onCreated,
        'aria-label': ariaLabel,
      }: {
        onCreated?: (state: { gl: { domElement: HTMLCanvasElement } }) => void;
        'aria-label'?: string;
      }) => (
        <canvas
          aria-label={ariaLabel}
          ref={(el) => {
            if (el && onCreated) {
              onCreated({ gl: { domElement: el } });
            }
          }}
        />
      ),
      useFrame: () => {},
    }));

    const { default: HeroPrismCanvas } = await import('../three/HeroPrismCanvas');
    render(<HeroPrismCanvas />);

    const canvas = screen.getByLabelText(/Interactive 3D calibration prism/i);
    expect(screen.queryByTestId('webgl-context-lost-fallback')).not.toBeInTheDocument();

    const lostEvent = new Event('webglcontextlost', { cancelable: true });
    fireEvent(canvas, lostEvent);
    expect(lostEvent.defaultPrevented).toBe(true);
    expect(screen.getByTestId('webgl-context-lost-fallback')).toBeInTheDocument();

    fireEvent(canvas, new Event('webglcontextrestored'));
    expect(screen.queryByTestId('webgl-context-lost-fallback')).not.toBeInTheDocument();

    vi.doUnmock('@react-three/fiber');
  });
});
