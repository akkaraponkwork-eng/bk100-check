import { IRepository, QueryOptions, RecordId, RecordData } from '../interface';
import { DocType } from '../../doctypes/schema';
import { GoogleSheetsClient } from './client';
import { SheetMapper } from './mapper';
import { ShadowGuard } from '../shadow-guard';
import crypto from 'crypto';

export class GoogleSheetsRepository implements IRepository {
  /**
   * Initialize or verify the schema of the Google Sheet.
   * Fetches the first row and resolves headers via SheetMapper.
   */
  async initialize(docType: DocType): Promise<void> {
    ShadowGuard.checkStartupGuard();
    const { sheets, sheetId } = GoogleSheetsClient.getInstance();
    
    ShadowGuard.assertStorageConfig(docType);
    const sheetName = docType.storage.sheetName;

    // Fetch just the first row (headers)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!1:1`,
    });

    const headerRow = res.data.values?.[0] || [];
    const mapper = new SheetMapper(docType);
    
    // Will throw SchemaCompatibilityError if headers are missing/duplicate
    mapper.resolveHeaders(headerRow);
  }

  /**
   * Internal helper to load the mapper and fetch all rows
   */
  private async loadSheet(docType: DocType) {
    ShadowGuard.checkStartupGuard();
    const { sheets, sheetId } = GoogleSheetsClient.getInstance();
    ShadowGuard.assertStorageConfig(docType);
    const sheetName = docType.storage.sheetName;
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      throw new Error(`Sheet '${sheetName}' is completely empty.`);
    }

    const mapper = new SheetMapper(docType);
    mapper.resolveHeaders(rows[0]);

    return { sheets, sheetId, mapper, dataRows: rows.slice(1), fullRows: rows };
  }

  async get(docType: DocType, id: RecordId): Promise<RecordData | null> {
    const { mapper, dataRows } = await this.loadSheet(docType);
    
    for (const row of dataRows) {
      const record = mapper.rowToRecord(row);
      if (record[docType.primaryKey] === id) {
        return record;
      }
    }
    
    return null;
  }

  async list(docType: DocType, options?: QueryOptions): Promise<RecordData[]> {
    const { mapper, dataRows } = await this.loadSheet(docType);
    
    let records = dataRows.map(row => mapper.rowToRecord(row));

    // Basic filtering (mock implementation for PoC)
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        records = records.filter(r => r[key] === value);
      }
    }

    // Basic sorting
    if (options?.orderBy) {
      const { field, direction } = options.orderBy;
      records.sort((a, b) => {
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    if (options?.offset) records = records.slice(options.offset);
    if (options?.limit) records = records.slice(0, options.limit);

    return records;
  }

  async create(docType: DocType, data: RecordData): Promise<RecordData> {
    ShadowGuard.assertWritable('create', docType);
    const { sheets, sheetId, mapper } = await this.loadSheet(docType);

    // Generate primary key if missing
    if (!data[docType.primaryKey]) {
      data[docType.primaryKey] = crypto.randomUUID();
    }

    // Handle system fields
    if (docType.concurrency?.versionField) {
      data[docType.concurrency.versionField] = new Date().toISOString();
    }

    const newRow = mapper.recordToRow(data);

    const sheetName = docType.storage.sheetName;
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:A`, // Append to bottom
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [newRow] },
    });

    return data;
  }

  async update(docType: DocType, id: RecordId, data: RecordData, currentVersion?: any): Promise<RecordData> {
    ShadowGuard.assertWritable('update', docType);
    const { sheets, sheetId, mapper, fullRows } = await this.loadSheet(docType);
    
    const pkField = docType.primaryKey;
    const versionField = docType.concurrency?.versionField;
    
    // Find row index (dataRows starts at index 1, fullRows starts at 0)
    let rowIndex = -1;
    let existingRecord: RecordData | null = null;
    
    for (let i = 1; i < fullRows.length; i++) {
      const record = mapper.rowToRecord(fullRows[i]);
      if (record[pkField] === id) {
        rowIndex = i;
        existingRecord = record;
        break;
      }
    }

    if (rowIndex === -1 || !existingRecord) {
      throw new Error(`Record with ID '${id}' not found.`);
    }

    // Optimistic Concurrency Control
    if (versionField && currentVersion) {
      const dbVersion = existingRecord[versionField];
      if (dbVersion && dbVersion !== currentVersion) {
        // Must throw an error containing '409' so the API route can catch it and return 409 Conflict
        const error = new Error(`409 Conflict: Record has been modified by someone else.`);
        error.name = 'ConflictError';
        throw error;
      }
    }

    // Merge data and update version
    const updatedData = { ...existingRecord, ...data };
    if (versionField) {
      updatedData[versionField] = new Date().toISOString();
    }

    const updatedRow = mapper.recordToRow(updatedData);
    
    const sheetName = docType.storage.sheetName;
    const rowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A${rowNumber}`, // Starts updating from col A for that row
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });

    return updatedData;
  }

  async delete(docType: DocType, id: RecordId): Promise<boolean> {
    ShadowGuard.assertWritable('delete', docType);
    const { sheets, sheetId, mapper, fullRows } = await this.loadSheet(docType);
    const pkField = docType.primaryKey;
    
    let rowIndex = -1;
    for (let i = 1; i < fullRows.length; i++) {
      const record = mapper.rowToRecord(fullRows[i]);
      if (record[pkField] === id) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return false;
    }

    const sheetName = docType.storage.sheetName;
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheet = sheetMeta.data.sheets?.find(s => s.properties?.title === sheetName);
    const gridId = sheet?.properties?.sheetId;

    if (gridId === undefined) {
      throw new Error('Could not find internal sheet ID for deletion.');
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: gridId,
                dimension: 'ROWS',
                startIndex: rowIndex, // 0-indexed API
                endIndex: rowIndex + 1,
              }
            }
          }
        ]
      }
    });

    return true;
  }

  async count(docType: DocType, filters?: Record<string, any>): Promise<number> {
    const records = await this.list(docType, { filters });
    return records.length;
  }
}
