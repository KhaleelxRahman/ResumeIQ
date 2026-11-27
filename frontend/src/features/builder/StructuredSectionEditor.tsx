import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import {
  createEmptyCertificationEntry,
  createEmptyEducationEntry,
  createEmptyExperienceEntry,
  createEmptyProjectEntry,
  deduplicateSkills,
  parseSkillInputTokens,
  type BuilderSectionState,
  type BuilderValidationErrors,
} from './builderModel';

interface StructuredSectionEditorProps {
  section: BuilderSectionState;
  errors: BuilderValidationErrors;
  readOnly: boolean;
  onChange: (updated: BuilderSectionState) => void;
}

function reorderArray<T>(items: T[], idx: number, offset: -1 | 1): T[] {
  const target = idx + offset;
  if (idx < 0 || idx >= items.length || target < 0 || target >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(idx, 1);
  copy.splice(target, 0, item);
  return copy;
}

export function StructuredSectionEditor({
  section,
  errors,
  readOnly,
  onChange,
}: StructuredSectionEditorProps) {
  const [skillDraft, setSkillDraft] = useState('');

  const handleAddSkills = () => {
    const tokens = parseSkillInputTokens(skillDraft);
    if (tokens.length === 0) return;
    onChange({
      ...section,
      skillItems: deduplicateSkills(section.skillItems, tokens),
    });
    setSkillDraft('');
  };

  return (
    <section
      aria-labelledby={`section-editor-heading-${section.id}`}
      className="space-y-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor={`section-heading-input-${section.id}`}
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            Section Heading
          </label>
          <input
            id={`section-heading-input-${section.id}`}
            type="text"
            disabled={readOnly}
            value={section.heading}
            onChange={(e) => onChange({ ...section, heading: e.target.value })}
            className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>
        <h2 id={`section-editor-heading-${section.id}`} className="sr-only">
          {section.heading}
        </h2>
      </div>

      {/* Summary */}
      {section.type === 'summary' && (
        <div>
          <label
            htmlFor={`summary-text-${section.id}`}
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            Professional Summary (2–4 concise sentences about your studies, projects, and goals)
          </label>
          <textarea
            id={`summary-text-${section.id}`}
            rows={4}
            disabled={readOnly}
            value={section.summaryText}
            onChange={(e) => onChange({ ...section, summaryText: e.target.value })}
            placeholder="Describe your degree focus, core technical strengths, and the type of internship or role you are preparing for."
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] disabled:opacity-60"
          />
          <p className="mt-1.5 font-mono-tabular text-xs text-[var(--text-secondary)]">
            {section.summaryText.trim() ? section.summaryText.trim().split(/\s+/).length : 0} words
          </p>
        </div>
      )}

      {/* Technical Skills */}
      {section.type === 'skills' && (
        <div className="space-y-4">
          {!readOnly && (
            <div>
              <label
                htmlFor={`skill-add-input-${section.id}`}
                className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
              >
                Add Skills (comma-separated or press Enter — duplicates are merged automatically)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={`skill-add-input-${section.id}`}
                  type="text"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkills();
                    }
                  }}
                  placeholder="e.g., Python, TypeScript, PostgreSQL"
                  className="min-h-[42px] min-w-[200px] flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddSkills}
                  className="inline-flex min-h-[42px] items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[var(--accent-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Add Skill</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 font-mono-tabular text-xs text-[var(--text-secondary)]">
              Listed Skills ({section.skillItems.length})
            </div>
            {section.skillItems.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Added technical skills">
                {section.skillItems.map((skill, idx) => (
                  <li
                    key={`${skill}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]"
                  >
                    <span>{skill}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={`Remove skill ${skill}`}
                        onClick={() =>
                          onChange({
                            ...section,
                            skillItems: section.skillItems.filter((_, i) => i !== idx),
                          })
                        }
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[#fda4af]"
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4 text-xs text-[var(--text-secondary)]">
                No skills added yet. Enter only technologies and tools you have genuinely used.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Education */}
      {section.type === 'education' && (
        <div className="space-y-4">
          {section.educationEntries.map((edu, idx) => {
            const dateError = errors.dateIssues[edu.id];
            return (
              <div
                key={edu.id}
                className="space-y-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-secondary)]">
                    Education #{idx + 1}
                  </span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        aria-label={`Move education entry ${idx + 1} up`}
                        onClick={() =>
                          onChange({
                            ...section,
                            educationEntries: reorderArray(section.educationEntries, idx, -1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowUp size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === section.educationEntries.length - 1}
                        aria-label={`Move education entry ${idx + 1} down`}
                        onClick={() =>
                          onChange({
                            ...section,
                            educationEntries: reorderArray(section.educationEntries, idx, 1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowDown size={13} aria-hidden="true" />
                      </button>
                      {section.educationEntries.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete education entry ${idx + 1}`}
                          onClick={() =>
                            onChange({
                              ...section,
                              educationEntries: section.educationEntries.filter((e) => e.id !== edu.id),
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--status-danger)] hover:text-[#fda4af]"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={`edu-inst-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Institution / University
                    </label>
                    <input
                      id={`edu-inst-${edu.id}`}
                      type="text"
                      disabled={readOnly}
                      value={edu.institution}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, institution: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="e.g., National Institute of Technology"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`edu-deg-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Degree / Program
                    </label>
                    <input
                      id={`edu-deg-${edu.id}`}
                      type="text"
                      disabled={readOnly}
                      value={edu.degree}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, degree: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="e.g., B.Tech"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`edu-field-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Field of Study
                    </label>
                    <input
                      id={`edu-field-${edu.id}`}
                      type="text"
                      disabled={readOnly}
                      value={edu.fieldOfStudy}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, fieldOfStudy: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="e.g., Computer Science"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`edu-start-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Start Year / Date
                    </label>
                    <input
                      id={`edu-start-${edu.id}`}
                      type="text"
                      disabled={readOnly}
                      value={edu.startDate}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, startDate: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="2023"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`edu-end-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      End / Expected Year
                    </label>
                    <input
                      id={`edu-end-${edu.id}`}
                      type="text"
                      disabled={readOnly || edu.isCurrent}
                      value={edu.isCurrent ? 'Present' : edu.endDate}
                      aria-invalid={Boolean(dateError)}
                      aria-describedby={dateError ? `edu-date-err-${edu.id}` : undefined}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, endDate: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="2027"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id={`edu-curr-${edu.id}`}
                      type="checkbox"
                      disabled={readOnly}
                      checked={edu.isCurrent}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, isCurrent: e.target.checked };
                        onChange({ ...section, educationEntries: next });
                      }}
                      className="h-4 w-4 accent-[var(--accent-primary)]"
                    />
                    <label htmlFor={`edu-curr-${edu.id}`} className="text-xs text-[var(--text-secondary)]">
                      Currently enrolled
                    </label>
                  </div>

                  <div>
                    <label htmlFor={`edu-gpa-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      GPA / CGPA (optional)
                    </label>
                    <input
                      id={`edu-gpa-${edu.id}`}
                      type="text"
                      disabled={readOnly}
                      value={edu.gpa}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, gpa: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="8.7/10"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor={`edu-notes-${edu.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Relevant Coursework / Honors (optional, one item per line)
                    </label>
                    <textarea
                      id={`edu-notes-${edu.id}`}
                      rows={2}
                      disabled={readOnly}
                      value={edu.highlights}
                      onChange={(e) => {
                        const next = [...section.educationEntries];
                        next[idx] = { ...edu, highlights: e.target.value };
                        onChange({ ...section, educationEntries: next });
                      }}
                      placeholder="Relevant Coursework: Algorithms, Database Systems, Computer Networks"
                      className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {dateError && (
                  <p id={`edu-date-err-${edu.id}`} role="alert" className="text-xs text-[#fda4af]">
                    {dateError}
                  </p>
                )}
              </div>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  educationEntries: [...section.educationEntries, createEmptyEducationEntry()],
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Education Entry</span>
            </button>
          )}
        </div>
      )}

      {/* Experience & Internships */}
      {(section.type === 'experience' || section.type === 'internships') && (
        <div className="space-y-4">
          {section.experienceEntries.map((exp, idx) => {
            const dateError = errors.dateIssues[exp.id];
            const label = section.type === 'internships' ? 'Internship' : 'Experience';
            return (
              <div
                key={exp.id}
                className="space-y-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-secondary)]">
                    {label} #{idx + 1}
                  </span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        aria-label={`Move ${label} entry ${idx + 1} up`}
                        onClick={() =>
                          onChange({
                            ...section,
                            experienceEntries: reorderArray(section.experienceEntries, idx, -1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowUp size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === section.experienceEntries.length - 1}
                        aria-label={`Move ${label} entry ${idx + 1} down`}
                        onClick={() =>
                          onChange({
                            ...section,
                            experienceEntries: reorderArray(section.experienceEntries, idx, 1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowDown size={13} aria-hidden="true" />
                      </button>
                      {section.experienceEntries.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete ${label} entry ${idx + 1}`}
                          onClick={() =>
                            onChange({
                              ...section,
                              experienceEntries: section.experienceEntries.filter((e) => e.id !== exp.id),
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--status-danger)] hover:text-[#fda4af]"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`exp-role-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Role Title
                    </label>
                    <input
                      id={`exp-role-${exp.id}`}
                      type="text"
                      disabled={readOnly}
                      value={exp.role}
                      onChange={(e) => {
                        const next = [...section.experienceEntries];
                        next[idx] = { ...exp, role: e.target.value };
                        onChange({ ...section, experienceEntries: next });
                      }}
                      placeholder="e.g., Software Engineering Intern"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`exp-org-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Organization / Company
                    </label>
                    <input
                      id={`exp-org-${exp.id}`}
                      type="text"
                      disabled={readOnly}
                      value={exp.organization}
                      onChange={(e) => {
                        const next = [...section.experienceEntries];
                        next[idx] = { ...exp, organization: e.target.value };
                        onChange({ ...section, experienceEntries: next });
                      }}
                      placeholder="e.g., Campus Innovation Lab"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`exp-loc-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Location (optional)
                    </label>
                    <input
                      id={`exp-loc-${exp.id}`}
                      type="text"
                      disabled={readOnly}
                      value={exp.location}
                      onChange={(e) => {
                        const next = [...section.experienceEntries];
                        next[idx] = { ...exp, location: e.target.value };
                        onChange({ ...section, experienceEntries: next });
                      }}
                      placeholder="Remote or City"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`exp-start-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                        Start Date
                      </label>
                      <input
                        id={`exp-start-${exp.id}`}
                        type="text"
                        disabled={readOnly}
                        value={exp.startDate}
                        onChange={(e) => {
                          const next = [...section.experienceEntries];
                          next[idx] = { ...exp, startDate: e.target.value };
                          onChange({ ...section, experienceEntries: next });
                        }}
                        placeholder="May 2025"
                        className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label htmlFor={`exp-end-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                        End Date
                      </label>
                      <input
                        id={`exp-end-${exp.id}`}
                        type="text"
                        disabled={readOnly || exp.isCurrent}
                        value={exp.isCurrent ? 'Present' : exp.endDate}
                        aria-invalid={Boolean(dateError)}
                        aria-describedby={dateError ? `exp-date-err-${exp.id}` : undefined}
                        onChange={(e) => {
                          const next = [...section.experienceEntries];
                          next[idx] = { ...exp, endDate: e.target.value };
                          onChange({ ...section, experienceEntries: next });
                        }}
                        placeholder="Aug 2025"
                        className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      id={`exp-curr-${exp.id}`}
                      type="checkbox"
                      disabled={readOnly}
                      checked={exp.isCurrent}
                      onChange={(e) => {
                        const next = [...section.experienceEntries];
                        next[idx] = { ...exp, isCurrent: e.target.checked };
                        onChange({ ...section, experienceEntries: next });
                      }}
                      className="h-4 w-4 accent-[var(--accent-primary)]"
                    />
                    <label htmlFor={`exp-curr-${exp.id}`} className="text-xs text-[var(--text-secondary)]">
                      I currently work here
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor={`exp-bullets-${exp.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Key Contributions &amp; Impact (one bullet per line)
                    </label>
                    <textarea
                      id={`exp-bullets-${exp.id}`}
                      rows={3}
                      disabled={readOnly}
                      value={exp.bullets}
                      onChange={(e) => {
                        const next = [...section.experienceEntries];
                        next[idx] = { ...exp, bullets: e.target.value };
                        onChange({ ...section, experienceEntries: next });
                      }}
                      placeholder="- Built REST API endpoints with automated input validation."
                      className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {dateError && (
                  <p id={`exp-date-err-${exp.id}`} role="alert" className="text-xs text-[#fda4af]">
                    {dateError}
                  </p>
                )}
              </div>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  experienceEntries: [...section.experienceEntries, createEmptyExperienceEntry()],
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add {section.type === 'internships' ? 'Internship' : 'Experience'} Entry</span>
            </button>
          )}
        </div>
      )}

      {/* Projects */}
      {section.type === 'projects' && (
        <div className="space-y-4">
          {section.projectEntries.map((prj, idx) => {
            const dateError = errors.dateIssues[prj.id];
            const urlError = errors.urlIssues[prj.id];
            return (
              <div
                key={prj.id}
                className="space-y-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-secondary)]">
                    Project #{idx + 1}
                  </span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        aria-label={`Move project ${idx + 1} up`}
                        onClick={() =>
                          onChange({
                            ...section,
                            projectEntries: reorderArray(section.projectEntries, idx, -1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowUp size={13} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === section.projectEntries.length - 1}
                        aria-label={`Move project ${idx + 1} down`}
                        onClick={() =>
                          onChange({
                            ...section,
                            projectEntries: reorderArray(section.projectEntries, idx, 1),
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        <ArrowDown size={13} aria-hidden="true" />
                      </button>
                      {section.projectEntries.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete project ${idx + 1}`}
                          onClick={() =>
                            onChange({
                              ...section,
                              projectEntries: section.projectEntries.filter((p) => p.id !== prj.id),
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--status-danger)] hover:text-[#fda4af]"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`prj-name-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Project Title
                    </label>
                    <input
                      id={`prj-name-${prj.id}`}
                      type="text"
                      disabled={readOnly}
                      value={prj.name}
                      onChange={(e) => {
                        const next = [...section.projectEntries];
                        next[idx] = { ...prj, name: e.target.value };
                        onChange({ ...section, projectEntries: next });
                      }}
                      placeholder="e.g., Campus Shuttle Tracker"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`prj-tech-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Technologies Used
                    </label>
                    <input
                      id={`prj-tech-${prj.id}`}
                      type="text"
                      disabled={readOnly}
                      value={prj.technologies}
                      onChange={(e) => {
                        const next = [...section.projectEntries];
                        next[idx] = { ...prj, technologies: e.target.value };
                        onChange({ ...section, projectEntries: next });
                      }}
                      placeholder="Python, React, PostgreSQL"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`prj-url-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Repository or Demo URL (optional)
                    </label>
                    <input
                      id={`prj-url-${prj.id}`}
                      type="url"
                      disabled={readOnly}
                      value={prj.url}
                      aria-invalid={Boolean(urlError)}
                      aria-describedby={urlError ? `prj-url-err-${prj.id}` : undefined}
                      onChange={(e) => {
                        const next = [...section.projectEntries];
                        next[idx] = { ...prj, url: e.target.value };
                        onChange({ ...section, projectEntries: next });
                      }}
                      placeholder="github.com/username/project"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`prj-start-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                        Start (optional)
                      </label>
                      <input
                        id={`prj-start-${prj.id}`}
                        type="text"
                        disabled={readOnly}
                        value={prj.startDate}
                        onChange={(e) => {
                          const next = [...section.projectEntries];
                          next[idx] = { ...prj, startDate: e.target.value };
                          onChange({ ...section, projectEntries: next });
                        }}
                        placeholder="Jan 2026"
                        className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label htmlFor={`prj-end-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                        End (optional)
                      </label>
                      <input
                        id={`prj-end-${prj.id}`}
                        type="text"
                        disabled={readOnly}
                        value={prj.endDate}
                        aria-invalid={Boolean(dateError)}
                        aria-describedby={dateError ? `prj-date-err-${prj.id}` : undefined}
                        onChange={(e) => {
                          const next = [...section.projectEntries];
                          next[idx] = { ...prj, endDate: e.target.value };
                          onChange({ ...section, projectEntries: next });
                        }}
                        placeholder="Apr 2026"
                        className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor={`prj-bullets-${prj.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Project Summary &amp; Results (one bullet per line)
                    </label>
                    <textarea
                      id={`prj-bullets-${prj.id}`}
                      rows={3}
                      disabled={readOnly}
                      value={prj.bullets}
                      onChange={(e) => {
                        const next = [...section.projectEntries];
                        next[idx] = { ...prj, bullets: e.target.value };
                        onChange({ ...section, projectEntries: next });
                      }}
                      placeholder="- Built accessible route lookup UI and automated API integration tests."
                      className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {urlError && (
                  <p id={`prj-url-err-${prj.id}`} role="alert" className="text-xs text-[#fda4af]">
                    {urlError}
                  </p>
                )}
                {dateError && (
                  <p id={`prj-date-err-${prj.id}`} role="alert" className="text-xs text-[#fda4af]">
                    {dateError}
                  </p>
                )}
              </div>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  projectEntries: [...section.projectEntries, createEmptyProjectEntry()],
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Project</span>
            </button>
          )}
        </div>
      )}

      {/* Certifications */}
      {section.type === 'certifications' && (
        <div className="space-y-4">
          {section.certificationEntries.map((cert, idx) => {
            const urlError = errors.urlIssues[cert.id];
            return (
              <div
                key={cert.id}
                className="space-y-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--accent-secondary)]">
                    Certification #{idx + 1}
                  </span>
                  {!readOnly && section.certificationEntries.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Delete certification ${idx + 1}`}
                      onClick={() =>
                        onChange({
                          ...section,
                          certificationEntries: section.certificationEntries.filter((c) => c.id !== cert.id),
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--status-danger)] hover:text-[#fda4af]"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`cert-name-${cert.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Certification Name
                    </label>
                    <input
                      id={`cert-name-${cert.id}`}
                      type="text"
                      disabled={readOnly}
                      value={cert.name}
                      onChange={(e) => {
                        const next = [...section.certificationEntries];
                        next[idx] = { ...cert, name: e.target.value };
                        onChange({ ...section, certificationEntries: next });
                      }}
                      placeholder="e.g., AWS Cloud Practitioner"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`cert-issuer-${cert.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Issuing Organization
                    </label>
                    <input
                      id={`cert-issuer-${cert.id}`}
                      type="text"
                      disabled={readOnly}
                      value={cert.issuer}
                      onChange={(e) => {
                        const next = [...section.certificationEntries];
                        next[idx] = { ...cert, issuer: e.target.value };
                        onChange({ ...section, certificationEntries: next });
                      }}
                      placeholder="e.g., Amazon Web Services"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`cert-date-${cert.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Issue Date (optional)
                    </label>
                    <input
                      id={`cert-date-${cert.id}`}
                      type="text"
                      disabled={readOnly}
                      value={cert.date}
                      onChange={(e) => {
                        const next = [...section.certificationEntries];
                        next[idx] = { ...cert, date: e.target.value };
                        onChange({ ...section, certificationEntries: next });
                      }}
                      placeholder="2025"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor={`cert-url-${cert.id}`} className="mb-1 block text-xs text-[var(--text-secondary)]">
                      Credential URL (optional)
                    </label>
                    <input
                      id={`cert-url-${cert.id}`}
                      type="url"
                      disabled={readOnly}
                      value={cert.credentialUrl}
                      aria-invalid={Boolean(urlError)}
                      aria-describedby={urlError ? `cert-url-err-${cert.id}` : undefined}
                      onChange={(e) => {
                        const next = [...section.certificationEntries];
                        next[idx] = { ...cert, credentialUrl: e.target.value };
                        onChange({ ...section, certificationEntries: next });
                      }}
                      placeholder="https://verify.example.org/id"
                      className="min-h-[40px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] disabled:opacity-60"
                    />
                  </div>
                </div>

                {urlError && (
                  <p id={`cert-url-err-${cert.id}`} role="alert" className="text-xs text-[#fda4af]">
                    {urlError}
                  </p>
                )}
              </div>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...section,
                  certificationEntries: [...section.certificationEntries, createEmptyCertificationEntry()],
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Certification</span>
            </button>
          )}
        </div>
      )}

      {/* Achievements / Languages / Leadership & Custom Sections */}
      {(section.type === 'achievements' || section.type === 'languages' || section.type === 'other') && (
        <div>
          <label
            htmlFor={`body-text-${section.id}`}
            className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
          >
            {section.type === 'languages'
              ? 'Languages & Proficiency (e.g., English (Fluent), Hindi (Native))'
              : 'Items or Bullet Points (prefix lines with "- " for clean bullet formatting)'}
          </label>
          <textarea
            id={`body-text-${section.id}`}
            rows={5}
            disabled={readOnly}
            value={section.bodyText}
            onChange={(e) => onChange({ ...section, bodyText: e.target.value })}
            placeholder={
              section.type === 'languages'
                ? 'English (Fluent), Hindi (Native)'
                : '- Finalist at Smart Campus Hackathon 2025\n- Coordinated weekly coding study sessions for 40 peers'
            }
            className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>
      )}
    </section>
  );
}
