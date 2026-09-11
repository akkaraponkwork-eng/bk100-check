import { DocTypeHook } from '../registry';
import { DocType } from '../../doctypes/schema';
import { UserContext } from '../../policies/engine';
import { LeavePolicy } from '../../services/leave';
import { DutyPolicy } from '../../services/duty';
import { ResourceQueryService } from '../../services/query';
import { ValidationError, ConflictError } from '../../utils/errors';

export const LeaveRequestHook: DocTypeHook = {
  async beforeInsert(docType: DocType, payload: Record<string, any>, user: UserContext) {
    // 1. Calculate days securely on backend
    const days = LeavePolicy.calculateDays(payload.startDate, payload.endDate);
    payload.days = days; // Override whatever client sent

    // 2. Quota Check & Reservation Logic
    const remaining = await LeavePolicy.getRemainingDays(payload.personnelId, payload.leaveType);
    if (days > remaining) {
      throw new ValidationError(`Quota exceeded: You requested ${days} days, but only have ${remaining} days remaining.`);
    }

    // 3. (Optional) Concurrency / Lock reservation can be done here.
    // In C2, Google Sheets lacks strict ACID transactions, so we rely on business checks.
  },

  async beforeUpdate(docType: DocType, existingRecord: Record<string, any>, payload: Record<string, any>, user: UserContext, queryService?: ResourceQueryService) {
    if (!queryService) throw new Error('QueryService is required for LeaveRequestHook');
    
    // 1. If dates changed, recalculate days
    let days = existingRecord.days;
    const isDateChanged = payload.startDate !== undefined || payload.endDate !== undefined;
    
    if (isDateChanged) {
      const newStartDate = payload.startDate ?? existingRecord.startDate;
      const newEndDate = payload.endDate ?? existingRecord.endDate;
      days = LeavePolicy.calculateDays(newStartDate, newEndDate);
      payload.days = days;
    }

    // 2. Re-check quota if they changed dates while still pending
    if (existingRecord.status === 'pending' && isDateChanged) {
      const remaining = await LeavePolicy.getRemainingDays(existingRecord.personnelId, payload.leaveType ?? existingRecord.leaveType);
      if (days > remaining) {
        throw new ValidationError(`Quota exceeded after update: You requested ${days} days, but only have ${remaining} days remaining.`);
      }
    }

    // 3. Option B / Rule 8: If Commander is approving, check for overlapping Duty
    if (existingRecord.status === 'pending' && payload.status === 'approved') {
      const startDate = payload.startDate ?? existingRecord.startDate;
      const endDate = payload.endDate ?? existingRecord.endDate;
      const personnelId = payload.personnelId ?? existingRecord.personnelId;

      const hasDuty = await DutyPolicy.hasDutyInRange(queryService, personnelId, startDate, endDate);
      if (hasDuty) {
        throw new ValidationError(`Cannot approve leave: Personnel '${personnelId}' has scheduled duty between ${startDate} and ${endDate}. Please cancel or swap their duty first.`);
      }
    }
  }
};
