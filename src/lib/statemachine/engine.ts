import { DocType, DocTypeStateMachine } from '../doctypes/schema';
import { UserContext } from '../policies/engine';
import { ValidationError, ForbiddenError } from '../utils/errors';

export class StateMachineEngine {
  /**
   * Enforces the initial state on creation.
   * Modifies the payload to force the initial state and drops any state forgery.
   */
  static enforceInitialState(docType: DocType, payload: Record<string, any>) {
    if (!docType.states) return;
    const { field, initial } = docType.states;
    // Force the initial state, ignore client input
    payload[field] = initial;
  }

  /**
   * Validates a state transition during an update.
   */
  static validateTransition(
    docType: DocType,
    existingRecord: Record<string, any>,
    payload: Record<string, any>,
    user: UserContext
  ) {
    if (!docType.states) return;

    const stateField = docType.states.field;
    const currentState = existingRecord[stateField];
    const targetState = payload[stateField];

    // If state is not being updated, no transition logic applies
    if (targetState === undefined || currentState === targetState) {
      return;
    }

    // Check if the transition exists and is allowed
    const transition = docType.states.transitions.find(
      (t) => t.from === currentState && t.to === targetState
    );

    if (!transition) {
      throw new ValidationError(
        `Invalid state transition: Cannot move from '${currentState}' to '${targetState}'.`
      );
    }

    // Role Validation
    if (transition.roles && transition.roles.length > 0) {
      const hasRole = transition.roles.some((r) => user.roles.includes(r));
      if (!hasRole) {
        throw new ForbiddenError(
          `Forbidden state transition: Your roles do not permit transitioning from '${currentState}' to '${targetState}'. Required roles: ${transition.roles.join(', ')}`
        );
      }
    }
  }
}
