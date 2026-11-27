export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  nlp_ready: boolean;
  hf_mode: 'enabled' | 'disabled';
  version: string;
  engine_version: string;
}

export interface WorkspaceSessionResponse {
  workspace_id: string;
  token: string;
  expires_at: string;
}

export interface WorkspaceStatusResponse {
  workspace_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface RoleSkillItem {
  skill_name: string;
  canonical_key: string;
  category: string;
  requirement_level: 'mandatory' | 'preferred';
  weight: number;
  learning_priority: number;
}

export interface JobRoleSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_core_mandatory: boolean;
  description: string;
  mandatory_count: number;
  preferred_count: number;
}

export interface JobRoleDetail extends JobRoleSummary {
  skills: RoleSkillItem[];
}

export interface SampleResumeSummary {
  id: string;
  title: string;
  candidate_label: string | null;
  template_slug: string;
  word_count: number;
  active_version_id: string;
  sections_count: number;
}

export interface ParseWarning {
  code: string;
  severity: 'info' | 'warning' | 'error' | string;
  message: string;
}

export interface ResumeSection {
  id?: string | null;
  section_type: string;
  raw_heading: string;
  content_text: string;
  confidence: number;
  order_index: number;
}

export interface BuilderContact {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  portfolio: string;
}

export interface ResumeStructuredPayload {
  candidate_label?: string | null;
  summary?: string | null;
  education?: string[];
  skills?: string[];
  projects?: string[];
  experience?: string[];
  internships?: string[];
  certifications?: string[];
  achievements?: string[];
  languages?: string[];
  page_count?: number;
  user_edited?: boolean;
  edited_at?: string;
  builder_contact?: Partial<BuilderContact>;
}

export interface ResumeVersionSummary {
  version_id: string;
  version_number: number;
  template_slug: string;
  word_count: number;
  created_at: string;
}

export interface ResumeVersionDetail {
  version_id: string;
  version_number: number;
  file_name: string | null;
  file_size_bytes: number | null;
  template_slug: string;
  candidate_label: string | null;
  contact_flags: Record<string, boolean>;
  masked_contact: Record<string, string | null>;
  structured_payload: ResumeStructuredPayload;
  raw_text: string;
  word_count: number;
  extraction_confidence: number;
  parse_warnings: ParseWarning[];
  sections: ResumeSection[];
  created_at: string;
}

export interface ResumeDetail {
  id: string;
  title: string;
  source_type: string;
  is_sample: boolean;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
  version: ResumeVersionDetail;
  versions?: ResumeVersionSummary[];
}

export interface ResumeListItem {
  id: string;
  title: string;
  source_type: string;
  is_sample: boolean;
  active_version_id: string | null;
  candidate_label: string | null;
  word_count: number;
  extraction_confidence: number;
  warnings_count: number;
  created_at: string;
}

export interface EditableSectionInput {
  section_type: string;
  raw_heading: string;
  content_text: string;
}

export type BuilderTemplateSlug = 'swiss-technical' | 'academic-editorial';

export type BuilderSectionType =
  | 'summary'
  | 'education'
  | 'skills'
  | 'projects'
  | 'internships'
  | 'experience'
  | 'certifications'
  | 'achievements'
  | 'languages'
  | 'other';

export interface BuilderSectionInput {
  section_type: BuilderSectionType;
  raw_heading: string;
  content_text: string;
}

export interface CreateBuilderResumeRequest {
  title: string;
  template_slug: BuilderTemplateSlug;
  contact: BuilderContact;
  sections: BuilderSectionInput[];
}

export interface SaveBuilderVersionRequest {
  title?: string;
  template_slug: BuilderTemplateSlug;
  contact: BuilderContact;
  sections: BuilderSectionInput[];
}

export interface UpdateParsedVersionRequest {
  title?: string;
  candidate_label?: string | null;
  template_slug?: BuilderTemplateSlug;
  contact?: BuilderContact;
  sections?: EditableSectionInput[];
}

