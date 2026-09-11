import { DocType } from '../../doctypes/schema';

export class SchemaCompatibilityError extends Error {
  constructor(message: string) {
    super(`Schema Compatibility Error: ${message}`);
    this.name = 'SchemaCompatibilityError';
  }
}

export class SheetMapper {
  private docType: DocType;
  private headerMap: Record<string, number> = {};
  private columnCount: number = 0;

  constructor(docType: DocType) {
    this.docType = docType;
  }

  /**
   * Resolves the header row from the sheet and validates it against the DocType schema.
   * Creates an internal map of fieldname -> column index.
   */
  resolveHeaders(headerRow: string[]) {
    this.headerMap = {};
    this.columnCount = headerRow.length;

    // 1. Check for duplicate headers in the sheet
    const seenHeaders = new Set<string>();
    for (const header of headerRow) {
      const trimmed = header.trim();
      if (trimmed && seenHeaders.has(trimmed)) {
        throw new SchemaCompatibilityError(`Duplicate header found in sheet: '${trimmed}'. Please remove or rename duplicate columns.`);
      }
      seenHeaders.add(trimmed);
    }

    // 2. Map DocType fields to Column Indexes
    const missingHeaders: string[] = [];
    for (const field of this.docType.fields) {
      if (!field.sheetHeader) continue; // Skip fields not stored in the sheet

      const index = headerRow.findIndex(h => h.trim() === field.sheetHeader);
      
      if (index === -1) {
        missingHeaders.push(field.sheetHeader);
      } else {
        this.headerMap[field.fieldname] = index;
      }
    }

    // 3. Fail fast if required headers are missing
    if (missingHeaders.length > 0) {
      throw new SchemaCompatibilityError(
        `Missing required headers in sheet '${this.docType.sheetName}': ${missingHeaders.join(', ')}. ` +
        `Please add these columns to the first row of the sheet.`
      );
    }
  }

  /**
   * Converts a Google Sheets row array into a RecordData object based on the resolved header map.
   */
  rowToRecord(row: any[]): Record<string, any> {
    const record: Record<string, any> = {};

    for (const field of this.docType.fields) {
      if (!field.sheetHeader) continue;
      
      const colIndex = this.headerMap[field.fieldname];
      if (colIndex !== undefined && colIndex < row.length) {
        record[field.fieldname] = this.parseValue(field.type, row[colIndex]);
      } else {
        record[field.fieldname] = null; // Value is empty in sheet
      }
    }

    return record;
  }

  /**
   * Converts a RecordData object into a Google Sheets row array.
   */
  recordToRow(record: Record<string, any>): any[] {
    const row = new Array(Math.max(this.columnCount, Object.values(this.headerMap).length)).fill('');

    for (const field of this.docType.fields) {
      if (!field.sheetHeader) continue;
      
      const colIndex = this.headerMap[field.fieldname];
      if (colIndex !== undefined) {
        let val = record[field.fieldname];
        // Ensure null/undefined are stored as empty strings
        if (val === null || val === undefined) {
          val = '';
        }
        row[colIndex] = val;
      }
    }

    return row;
  }

  /**
   * Internal helper to parse string values from sheets into their correct type
   */
  private parseValue(type: string, value: any): any {
    if (value === null || value === undefined || value === '') return null;

    switch (type) {
      case 'Number':
        const num = Number(value);
        return isNaN(num) ? null : num;
      case 'Boolean':
        return String(value).toLowerCase() === 'true';
      case 'Date':
        return value; // Assume it's already an ISO string for now
      default:
        return String(value);
    }
  }
}
