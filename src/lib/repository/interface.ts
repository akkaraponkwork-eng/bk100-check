import { DocType } from '../doctypes/schema';

export type RecordId = string;
export type RecordData = Record<string, any>;

export interface QueryOptions {
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

/**
 * The standard Repository contract.
 * Any storage adapter (Google Sheets, Postgres, etc.) must implement this interface.
 */
export interface IRepository {
  /**
   * Initialize or verify the underlying storage schema (e.g., Schema Compatibility Check).
   */
  initialize(docType: DocType): Promise<void>;

  /**
   * Find a single record by its primary key.
   */
  get(docType: DocType, id: RecordId): Promise<RecordData | null>;

  /**
   * Find multiple records based on query options.
   */
  list(docType: DocType, options?: QueryOptions): Promise<RecordData[]>;

  /**
   * Create a new record. 
   * The repository is responsible for generating the ID if not provided,
   * evaluating computed fields, and setting system fields (e.g., updatedAt).
   */
  create(docType: DocType, data: RecordData): Promise<RecordData>;

  /**
   * Update an existing record.
   * Includes Optimistic Concurrency Control: Should throw 409 Conflict if version/updatedAt mismatches.
   */
  update(docType: DocType, id: RecordId, data: RecordData, currentVersion?: any): Promise<RecordData>;

  /**
   * Delete a record by its primary key.
   */
  delete(docType: DocType, id: RecordId): Promise<boolean>;

  /**
   * Count total records matching the filters.
   */
  count(docType: DocType, filters?: Record<string, any>): Promise<number>;
}
