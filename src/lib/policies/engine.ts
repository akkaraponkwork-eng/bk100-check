import { DocType } from '../doctypes/schema';
import { ForbiddenError } from '../utils/errors';

export type UserContext = {
  id: string;
  roles: string[];
};

export type ActionType = 'read' | 'create' | 'update' | 'delete';

/**
 * PolicyEngine is responsible for authorizing actions based on DocType metadata
 * and the current UserContext.
 */
export class PolicyEngine {
  /**
   * Check if the user has permission to perform the action on the given DocType.
   * Throws an Error if unauthorized.
   */
  static authorize(docType: DocType, action: ActionType, user: UserContext): void {
    if (!docType.permissions) {
      // If no permissions defined, default to closed
      throw new Error(`Forbidden: No permissions defined for DocType '${docType.name}'`);
    }

    const allowedRoles = docType.permissions[action];
    
    if (!allowedRoles || allowedRoles.length === 0) {
      throw new Error(`Forbidden: Action '${action}' is not permitted on '${docType.name}'`);
    }

    // Admin role usually overrides everything, but let's stick to explicit roles for now
    const hasPermission = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasPermission) {
      throw new ForbiddenError(`Access Denied: You do not have permission to ${action} on resource '${docType.name}'.`);
    }
  }

  /**
   * Evaluates if a user can perform an action without throwing an error (returns boolean).
   */
  static can(docType: DocType, action: ActionType, user: UserContext): boolean {
    try {
      this.authorize(docType, action, user);
      return true;
    } catch {
      return false;
    }
  }
}
