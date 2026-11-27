export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type TemplateSlug = 'swiss-technical' | 'academic-editorial';

export interface ParseWarning {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface ResumeSectionRecord {
  id: string;
  section_type: string;
  raw_heading: string;
  content_text: string;
  confidence: number;
  order_index: number;
}

export interface ResumeVersionRecord {
  version_id: string;
  version_number: number;
  file_name: string | null;
  file_size_bytes: number | null;
  template_slug: TemplateSlug;
  candidate_label: string | null;
  contact_flags: Record<string, boolean>;
  masked_contact: Record<string, string | null>;
  structured_payload: Record<string, unknown>;
  raw_text: string;
  word_count: number;
  extraction_confidence: number;
  parse_warnings: ParseWarning[];
  sections: ResumeSectionRecord[];
  created_at: string;
}

export interface ResumeRecord {
  id: string;
  workspace_id: string;
  title: string;
  source_type: string;
  active_version_id: string | null;
  created_at: string;
  updated_at: string;
  versions: ResumeVersionRecord[];
}

export interface WorkspaceRecord {
  id: string;
  token_hash: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface RoleSkillRecord {
  skill_name: string;
  canonical_key: string;
  category: string;
  requirement_level: 'mandatory' | 'preferred';
  weight: number;
  learning_priority: number;
}

export interface JobRoleRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_core_mandatory: boolean;
  description: string;
  skills: RoleSkillRecord[];
}

export interface SegmentedSection {
  section_type: string;
  raw_heading: string;
  content_text: string;
  confidence: number;
  order_index: number;
}

export interface ParsedDocumentResult {
  raw_text: string;
  page_count: number;
  file_type: 'pdf' | 'docx';
  warnings: ParseWarning[];
  layout_penalty: number;
  table_ratio: number;
}

export interface BuilderContactInput {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  portfolio: string;
}
