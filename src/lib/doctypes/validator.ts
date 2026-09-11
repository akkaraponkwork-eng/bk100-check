import { DocType, FieldType } from './schema';
import { ValidationError } from '../utils/errors';

export class DocTypeValidator {
  /**
   * Validate raw data against the DocType schema.
   * Throws a ValidationError if validation fails.
   * Also strips out systemManaged, readOnly, and computed fields so clients cannot overwrite them.
   */
  static validate(docType: DocType, payload: Record<string, any>, isUpdate: boolean = false): Record<string, any> {
    const validatedData: Record<string, any> = {};

    for (const field of docType.fields) {
      // 1. Skip systemManaged, readOnly, and computed fields entirely for user input
      // They are calculated/handled by the backend
      if (field.systemManaged || field.readOnly || field.computed) {
        continue;
      }

      const value = payload[field.fieldname];

      // 2. Check required fields
      if (value === undefined || value === null || value === '') {
        if (field.required && !isUpdate) {
          throw new ValidationError(`Field '${field.fieldname}' is required.`);
        }
        continue; // Skip if not required or if updating and field not provided
      }

      // 3. Type casting and validation
      validatedData[field.fieldname] = this.validateType(field.fieldname, field.type, value, field);
    }

    return validatedData;
  }

  private static validateType(fieldname: string, type: FieldType, value: any, fieldSchema: any): any {
    switch (type) {
      case 'String':
      case 'Link':
        if (typeof value !== 'string') {
          throw new ValidationError(`Field '${fieldname}' must be a string.`);
        }
        return value.trim();

      case 'Number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new ValidationError(`Field '${fieldname}' must be a number.`);
        }
        if (fieldSchema.min !== undefined && num < fieldSchema.min) {
          throw new ValidationError(`Field '${fieldname}' must be >= ${fieldSchema.min}.`);
        }
        if (fieldSchema.max !== undefined && num > fieldSchema.max) {
          throw new ValidationError(`Field '${fieldname}' must be <= ${fieldSchema.max}.`);
        }
        return num;

      case 'Boolean':
        return Boolean(value);

      case 'Date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new ValidationError(`Field '${fieldname}' must be a valid date.`);
        }
        return date.toISOString();

      case 'Select':
        if (fieldSchema.options) {
        const validValues = fieldSchema.options.map((opt: any) => typeof opt === 'string' ? opt : opt.value);
        if (!validValues.includes(value)) {
          throw new ValidationError(`Field '${fieldname}' value must be one of: ${validValues.join(', ')}.`);
        }
      }  return String(value);

      default:
        return value;
    }
  }
}
