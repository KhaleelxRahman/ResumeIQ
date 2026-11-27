import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, User } from 'lucide-react';
import { SECTION_CATALOG, type BuilderSectionState } from './builderModel';
import type { BuilderSectionType } from '../../types/api';

interface SectionSidebarProps {
  activeTarget: 'personal' | string;
  sections: BuilderSectionState[];
  readOnly: boolean;
  onSelectTarget: (target: 'personal' | string) => void;
  onMoveSection: (index: number, offset: -1 | 1) => void;
  onRemoveSection: (sectionId: string) => void;
  onAddSection: (type: BuilderSectionType, customHeading?: string) => void;
}

export function SectionSidebar({
  activeTarget,
  sections,
  readOnly,
  onSelectTarget,
  onMoveSection,
  onRemoveSection,
  onAddSection,
}: SectionSidebarProps) {
  const [addType, setAddType] = useState<BuilderSectionType>('internships');
  const [customHeading, setCustomHeading] = useState('');

  const existingTypes = new Set(sections.map((s) => s.type));

  const availableOptions = SECTION_CATALOG.filter(
    (meta) => meta.allowMultiple || !existingTypes.has(meta.type),
  );

  const handleAdd = () => {
    const selectedType = availableOptions.some((o) => o.type === addType)
      ? addType
      : (availableOptions[0]?.type ?? 'other');
    onAddSection(selectedType, selectedType === 'other' ? customHeading : undefined);
    setCustomHeading('');
  };

  return (
    <aside
      aria-label="Resume Sections Navigation"
      className="no-print space-y-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4"
    >
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Resume Sections
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Select a section to edit or reorder how sections appear on your resume.
        </p>
      </div>

      <nav aria-label="Section list" className="space-y-1.5">
        <button
          type="button"
          onClick={() => onSelectTarget('personal')}
          className={`flex min-h-[42px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
            activeTarget === 'personal'
              ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <User size={14} className="shrink-0 text-[var(--accent-secondary)]" aria-hidden="true" />
          <span>Personal &amp; Contact Info</span>
        </button>

        {sections.map((sec, idx) => {
          const isSelected = activeTarget === sec.id;
          return (
            <div
              key={sec.id}
              className={`flex items-center gap-1 rounded-lg border p-1 transition-colors ${
                isSelected
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTarget(sec.id)}
                className="min-h-[38px] min-w-0 flex-1 truncate px-2 text-left text-xs font-medium text-[var(--text-primary)]"
                title={sec.heading || sec.type}
              >
                {sec.heading || sec.type}
              </button>

              {!readOnly && (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={idx === 0}
                    aria-label={`Move ${sec.heading} up`}
                    onClick={() => onMoveSection(idx, -1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ArrowUp size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    aria-label={`Move ${sec.heading} down`}
                    onClick={() => onMoveSection(idx, 1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    <ArrowDown size={13} aria-hidden="true" />
                  </button>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove ${sec.heading} section`}
                      onClick={() => onRemoveSection(sec.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--status-danger)]/10 hover:text-[#fda4af]"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!readOnly && availableOptions.length > 0 && (
        <div className="space-y-2.5 border-t border-[var(--border-hairline)] pt-3">
          <label
            htmlFor="builder-add-section-type"
            className="block text-xs font-medium text-[var(--text-secondary)]"
          >
            Add Optional Section
          </label>
          <select
            id="builder-add-section-type"
            value={
              availableOptions.some((o) => o.type === addType)
                ? addType
                : availableOptions[0].type
            }
            onChange={(e) => setAddType(e.target.value as BuilderSectionType)}
            className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
          >
            {availableOptions.map((opt) => (
              <option key={opt.type} value={opt.type}>
                {opt.label}
              </option>
            ))}
          </select>

          {addType === 'other' && (
            <div>
              <label htmlFor="builder-custom-heading" className="mb-1 block text-[11px] text-[var(--text-secondary)]">
                Custom Section Heading
              </label>
              <input
                id="builder-custom-heading"
                type="text"
                value={customHeading}
                onChange={(e) => setCustomHeading(e.target.value)}
                placeholder="e.g., PUBLICATIONS or VOLUNTEERING"
                className="min-h-[38px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
          >
            <Plus size={14} aria-hidden="true" />
            <span>Add Section</span>
          </button>
        </div>
      )}
    </aside>
  );
}
