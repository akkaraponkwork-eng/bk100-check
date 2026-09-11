import { HookRegistry } from '../registry';
import { LeaveRequestHook } from './LeaveRequestHook';
import { DutyAssignmentHook } from './DutyAssignmentHook';

// Register all DocType hooks here
HookRegistry.register('LeaveRequest', LeaveRequestHook);
HookRegistry.register('DutyAssignment', DutyAssignmentHook);
