import type { BuilderContact } from '../../types/api';
import type { BuilderValidationErrors } from './builderModel';

interface PersonalInfoFormProps {
  contact: BuilderContact;
  errors: BuilderValidationErrors;
  readOnly: boolean;
  onChange: (next: BuilderContact) => void;
}

export function PersonalInfoForm({
  contact,
  errors,
  readOnly,
  onChange,
}: PersonalInfoFormProps) {
  const updateField = (field: keyof BuilderContact, value: string) => {
    onChange({ ...contact, [field]: value });
  };

  return (
    <section
      aria-labelledby="personal-info-heading"
      className="space-y-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5"
    >
      <div className="border-b border-[var(--border-hairline)] pb-3">
        <h2 id="personal-info-heading" className="text-base font-semibold">
          Personal &amp; Contact Information
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Only fields you enter appear on your resume header and exported PDF.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="contact-full-name" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Full Name <span className="text-[#fda4af]">*</span>
          </label>
          <input
            id="contact-full-name"
            type="text"
            disabled={readOnly}
            value={contact.full_name}
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={errors.full_name ? 'contact-full-name-error' : undefined}
            onChange={(e) => updateField('full_name', e.target.value)}
            placeholder="e.g., Aarav Sharma"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {errors.full_name && (
            <p id="contact-full-name-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {errors.full_name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            disabled={readOnly}
            value={contact.email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="student@university.edu"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {errors.email && (
            <p id="contact-email-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-phone" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Phone Number
          </label>
          <input
            id="contact-phone"
            type="tel"
            disabled={readOnly}
            value={contact.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+91-98000-00000"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="contact-location" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            City / Location
          </label>
          <input
            id="contact-location"
            type="text"
            disabled={readOnly}
            value={contact.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Bengaluru, IN"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="contact-linkedin" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            LinkedIn URL
          </label>
          <input
            id="contact-linkedin"
            type="url"
            disabled={readOnly}
            value={contact.linkedin}
            aria-invalid={Boolean(errors.linkedin)}
            aria-describedby={errors.linkedin ? 'contact-linkedin-error' : undefined}
            onChange={(e) => updateField('linkedin', e.target.value)}
            placeholder="linkedin.com/in/your-handle"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {errors.linkedin && (
            <p id="contact-linkedin-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {errors.linkedin}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-github" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            GitHub URL
          </label>
          <input
            id="contact-github"
            type="url"
            disabled={readOnly}
            value={contact.github}
            aria-invalid={Boolean(errors.github)}
            aria-describedby={errors.github ? 'contact-github-error' : undefined}
            onChange={(e) => updateField('github', e.target.value)}
            placeholder="github.com/your-handle"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {errors.github && (
            <p id="contact-github-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {errors.github}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-portfolio" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Portfolio / Website
          </label>
          <input
            id="contact-portfolio"
            type="url"
            disabled={readOnly}
            value={contact.portfolio}
            aria-invalid={Boolean(errors.portfolio)}
            aria-describedby={errors.portfolio ? 'contact-portfolio-error' : undefined}
            onChange={(e) => updateField('portfolio', e.target.value)}
            placeholder="https://yourportfolio.dev"
            className="min-h-[42px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          {errors.portfolio && (
            <p id="contact-portfolio-error" role="alert" className="mt-1 text-xs text-[#fda4af]">
              {errors.portfolio}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
