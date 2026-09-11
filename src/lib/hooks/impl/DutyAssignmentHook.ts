import { DocTypeHook } from '../registry';
import { DocType } from '../../doctypes/schema';
import { UserContext } from '../../policies/engine';
import { DutyPolicy } from '../../services/duty';
import { ResourceQueryService } from '../../services/query';
import { ConcurrencyGuard } from '../../concurrency/guard';
import { ValidationError, ConflictError } from '../../utils/errors';

export const DutyAssignmentHook: DocTypeHook = {
  async aroundInsert(docType: DocType, payload: Record<string, any>, user: UserContext, queryService: ResourceQueryService, execute: () => Promise<any>) {
    const personnelId = payload.personnelId;
    const dutyDate = payload.dutyDate;
    const dutyType = payload.dutyType;

    const lockKey = `duty:${personnelId}:${dutyDate}:${dutyType}`;

    // Apply the lock for the whole validation & insert phase
    return await ConcurrencyGuard.withLock(lockKey, async () => {
      // Rule 2: Personnel Inactive?
      const isActive = await DutyPolicy.isPersonnelActive(queryService, personnelId);
      if (!isActive) {
        throw new ValidationError(`Cannot assign duty: Personnel '${personnelId}' is inactive.`);
      }

      // Rule 1: Active Leave?
      const onLeave = await DutyPolicy.hasActiveLeave(queryService, personnelId, dutyDate);
      if (onLeave) {
        throw new ConflictError(`Cannot assign duty: Personnel '${personnelId}' is on leave on ${dutyDate}.`);
      }

      // Rule 3: Duplicate Duty?
      const isDuplicate = await DutyPolicy.hasDuplicateDuty(queryService, personnelId, dutyDate, dutyType);
      if (isDuplicate) {
        throw new ConflictError(`Duplicate duty: Personnel '${personnelId}' already has a '${dutyType}' duty on ${dutyDate}.`);
      }

      // Execute actual insert while holding the lock
      return await execute();
    });
  },

  async aroundUpdate(docType: DocType, existingRecord: Record<string, any>, payload: Record<string, any>, user: UserContext, queryService: ResourceQueryService, execute: () => Promise<any>) {
    // Determine the effective values after update
    const personnelId = payload.personnelId ?? existingRecord.personnelId;
    const dutyDate = payload.dutyDate ?? existingRecord.dutyDate;
    const dutyType = payload.dutyType ?? existingRecord.dutyType;
    const status = payload.status ?? existingRecord.status;

    // If changing to cancelled, we don't need strict conflict checks
    if (status === 'cancelled') {
      return await execute();
    }

    const lockKey = `duty:${personnelId}:${dutyDate}:${dutyType}`;

    return await ConcurrencyGuard.withLock(lockKey, async () => {
      // Re-validate if core fields changed
      const isCoreChanged = payload.personnelId || payload.dutyDate || payload.dutyType;
      
      if (isCoreChanged || (existingRecord.status === 'cancelled' && status !== 'cancelled')) {
        // Rule 2
        const isActive = await DutyPolicy.isPersonnelActive(queryService, personnelId);
        if (!isActive) {
          throw new ValidationError(`Cannot assign duty: Personnel '${personnelId}' is inactive.`);
        }

        // Rule 1
        const onLeave = await DutyPolicy.hasActiveLeave(queryService, personnelId, dutyDate);
        if (onLeave) {
          throw new ConflictError(`Cannot assign duty: Personnel '${personnelId}' is on leave on ${dutyDate}.`);
        }

        // Rule 3 (Exclude self)
        const isDuplicate = await DutyPolicy.hasDuplicateDuty(queryService, personnelId, dutyDate, dutyType, existingRecord.id);
        if (isDuplicate) {
          throw new ConflictError(`Duplicate duty: Personnel '${personnelId}' already has a '${dutyType}' duty on ${dutyDate}.`);
        }
      }

      return await execute();
    });
  }
};
