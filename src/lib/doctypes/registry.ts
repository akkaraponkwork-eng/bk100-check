import { DocType } from './schema';
import arsenalDocType from '../../doctypes/Arsenal.json';
import vehicleDocType from '../../doctypes/Vehicle.json';
import personnelDocType from '../../doctypes/Personnel.json';
import leaveRequestDocType from '../../doctypes/LeaveRequest.json';
import dutyAssignmentDocType from '../../doctypes/DutyAssignment.json';
import ncoAssignmentDocType from '../../doctypes/NCOAssignment.json';
import rolesDocType from '../../doctypes/Roles.json';
import permissionsDocType from '../../doctypes/Permissions.json';
import rolePermissionsDocType from '../../doctypes/RolePermissions.json';
import dutyPolicyDocType from '../../doctypes/DutyPolicy.json';
import legacyPersonnelTestDocType from '../../doctypes/LegacyPersonnelTest.json';
import noSheetNameTestDocType from '../../doctypes/NoSheetNameTest.json';

// In a real implementation, this could dynamically import JSON files
// or load them from a secure remote config. For now, it's a static registry.
const docTypeMap: Record<string, DocType> = {
  Arsenal: arsenalDocType as DocType,
  Vehicle: vehicleDocType as DocType,
  Personnel: personnelDocType as DocType,
  LeaveRequest: leaveRequestDocType as DocType,
  DutyAssignment: dutyAssignmentDocType as DocType,
  NCOAssignment: ncoAssignmentDocType as DocType,
  Roles: rolesDocType as DocType,
  Permissions: permissionsDocType as DocType,
  RolePermissions: rolePermissionsDocType as DocType,
  DutyPolicy: dutyPolicyDocType as DocType,
  LegacyPersonnelTest: legacyPersonnelTestDocType as DocType,
  NoSheetNameTest: noSheetNameTestDocType as DocType,
  // More DocTypes will be added here
};

export class DocTypeRegistry {
  /**
   * Get a DocType schema by its name.
   * Throws an error if the DocType does not exist.
   */
  static get(name: string): DocType {
    const schema = docTypeMap[name];
    if (!schema) {
      throw new Error(`DocType '${name}' not found in registry.`);
    }
    return schema;
  }

  /**
   * Check if a DocType exists in the registry.
   */
  static exists(name: string): boolean {
    return !!docTypeMap[name];
  }

  /**
   * Get all registered DocType names.
   */
  static getAllNames(): string[] {
    return Object.keys(docTypeMap);
  }

  /**
   * Register a new DocType (useful for testing)
   */
  static register(docType: DocType): void {
    docTypeMap[docType.name] = docType;
  }
}
