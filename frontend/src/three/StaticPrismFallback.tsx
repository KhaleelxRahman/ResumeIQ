export function StaticPrismFallback() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5">
      <div className="flex items-center justify-between font-mono-tabular text-[11px] text-[var(--text-secondary)]">
        <span>Calibration Prism · Static SVG</span>
        <span className="text-[var(--accent-secondary-ink)]">Zero GPU cost</span>
      </div>
      <svg
        className="mx-auto my-2 h-64 w-full max-w-[380px]"
        viewBox="0 0 420 280"
        role="img"
        aria-label="Static geometric resume layers aligning along a diagnostic calibration axis"
      >
        <defs>
          <linearGradient id="resumePlaneGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EFECE5" />
          </linearGradient>
        </defs>
        <line x1="40" y1="242" x2="380" y2="242" stroke="#CFCAC0" strokeWidth="1" />
        <line
          x1="210"
          y1="20"
          x2="210"
          y2="255"
          stroke="#A7B49A"
          strokeDasharray="4 4"
          strokeWidth="1.2"
        />
        <polygon
          points="105,65 265,35 305,175 145,205"
          fill="url(#resumePlaneGrad)"
          stroke="#CFCAC0"
          strokeWidth="1.2"
        />
        <polygon
          points="120,82 280,52 320,192 160,222"
          fill="#F7F6F2"
          stroke="#A7B49A"
          strokeWidth="1.4"
        />
        <polygon
          points="135,98 295,68 335,208 175,238"
          fill="#FFFFFF"
          stroke="#E45B42"
          strokeWidth="1.6"
        />
        <line x1="168" y1="116" x2="270" y2="97" stroke="#252622" strokeWidth="3" strokeLinecap="round" />
        <line x1="175" y1="138" x2="255" y2="123" stroke="#73746D" strokeWidth="2" strokeLinecap="round" />
        <line x1="181" y1="158" x2="275" y2="140" stroke="#2A7B4C" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="298" cy="145" r="14" fill="#FFFFFF" stroke="#E45B42" strokeWidth="1.5" />
        <text x="298" y="149" textAnchor="middle" fill="#252622" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="600">
          IQ
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 border-t border-[var(--border-hairline)] pt-3 font-mono-tabular text-[11px] text-[var(--text-secondary)]">
        <span>Budget: &le; 6,000 tris</span>
        <span>Draw calls: &le; 12</span>
        <span>Mobile (&lt;768px): Static SVG</span>
      </div>
    </div>
  );
}
