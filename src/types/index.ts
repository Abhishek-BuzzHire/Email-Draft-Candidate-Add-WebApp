export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  salary: number | null;
  expected_ctc: number | null;
  notice: number | null;
  totalExperienceYears: number | null;
  location: string;
  cvUrl: string;
  currentCompanyName: string;
  skills: string[];
  education: string;
  jobTitle: string;
  customFields?: Record<string, string>;
  source: '';
  createdAt?: string;
}

export interface VisibilityToggle {
  client: boolean;
  internal: boolean;
  superiors: boolean;
}

export interface FieldVisibility {
  [key: string]: VisibilityToggle;
}

export interface RecipientSelections {
  candidateId: string;
  fieldVisibility: FieldVisibility;
  fieldOrder: string[];
}

export interface EmailContent {
  recipientType: 'client' | 'internal' | 'superiors';
  recipientEmail: string;
  subject?: string;
  content?: string;
}

export interface EmailDraft {
  candidateId: string;
  emailContent: Record<string, EmailContent>;
  createdAt: string;
  updatedAt: string;
}

export type RecipientType = 'client' | 'internal' | 'superiors';