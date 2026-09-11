export type FieldType = 'String' | 'Number' | 'Date' | 'Boolean' | 'Select' | 'Link';

export type FieldOption = string | { label: string, value: string };

export interface DocTypeField {
  fieldname: string;
  type: FieldType;
  label?: string;
  
  // Storage mapping
  sheetHeader?: string;
  
  // Validation
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: FieldOption[]; // For Select type
  
  // UI & Behavior
  hidden?: boolean;
  readOnly?: boolean;
  systemManaged?: boolean;
  list?: boolean;
  form?: boolean;
  searchable?: boolean;
  
  // Computed fields
  computed?: boolean | 'business';
  formula?: string;
  dependsOn?: string[];
  
  // Relations
  target?: string; // Target DocType name for Link type
  displayField?: string; // Field to display from target DocType
  resolve?: 'eager' | 'lazy';
}

export interface DocTypePermissions {
  read?: string[];
  create?: string[];
  update?: string[];
  delete?: string[];
}

export interface DocTypeCache {
  tags?: string[];
  ttl?: number;
}

export interface DocTypeConcurrency {
  optimistic?: boolean;
  versionField?: string; // Usually 'updatedAt' or 'version'
}

export interface StateTransition {
  from: string;
  to: string;
  roles?: string[];
}

export interface DocTypeStateMachine {
  field: string;
  initial: string;
  transitions: StateTransition[];
}

export interface DocType {
  name: string;
  sheetName: string;
  primaryKey: string;
  storage: {
    provider: 'google-sheets';
    sheetName: string;
    mode: 'framework' | 'legacy-readonly';
  };
  permissions?: DocTypePermissions;
  states?: DocTypeStateMachine;
  cache?: DocTypeCache;
  concurrency?: DocTypeConcurrency;
  fields: DocTypeField[];
}
