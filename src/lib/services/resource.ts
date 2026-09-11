import { DocType } from '../doctypes/schema';
import { DocTypeRegistry } from '../doctypes/registry';
import { DocTypeValidator } from '../doctypes/validator';
import { ComputedEngine } from '../computed/engine';
import { PolicyEngine, UserContext } from '../policies/engine';
import { IRepository, QueryOptions, RecordId, RecordData } from '../repository/interface';
import { StateMachineEngine } from '../statemachine/engine';
import { HookRegistry } from '../hooks/registry';
import { ResourceQueryService } from './query';
import { ShadowGuard } from '../repository/shadow-guard';

// Initialize hooks implementations
import '../hooks/impl/index';

/**
 * ResourceService orchestrates the execution flow:
 * Policy -> Validator -> Computed Fields -> Repository
 */
export class ResourceService {
  private repository: IRepository;
  private queryService: ResourceQueryService;

  constructor(repository: IRepository) {
    this.repository = repository;
    this.queryService = new ResourceQueryService(repository);
  }

  async get(docTypeName: string, id: RecordId, user: UserContext): Promise<RecordData | null> {
    const docType = DocTypeRegistry.get(docTypeName);
    PolicyEngine.authorize(docType, 'read', user);
    
    // Check cache logic here if using a caching abstraction layer
    return await this.repository.get(docType, id);
  }

  async list(docTypeName: string, user: UserContext, options?: QueryOptions): Promise<RecordData[]> {
    const docType = DocTypeRegistry.get(docTypeName);
    PolicyEngine.authorize(docType, 'read', user);

    return await this.repository.list(docType, options);
  }

  async create(docTypeName: string, payload: Record<string, any>, user: UserContext): Promise<RecordData> {
    const docType = DocTypeRegistry.get(docTypeName);
    PolicyEngine.authorize(docType, 'create', user);

    // Enforce initial state (e.g. pending) ignoring client payload before validation
    StateMachineEngine.enforceInitialState(docType, payload);

    // Validate and clean input payload (strips out readOnly, computed, system fields)
    const validData = DocTypeValidator.validate(docType, payload, false);

    // Guard against unauthorized writes to Legacy sheets or in Shadow Mode (after basic validation)
    ShadowGuard.assertWritable('create', docType);

    // Run beforeInsert hooks (Business Rules & Quota Checks)
    const hook = HookRegistry.get(docType.name);
    if (hook && hook.beforeInsert) {
      await hook.beforeInsert(docType, validData, user, this.queryService);
    }

    // Apply Computed Fields (Backend is the Source of Truth)
    ComputedEngine.applyComputedFields(docType, validData);

    // Final insert logic
    const executeInsert = async () => {
      // 3. Persist to storage
      return await this.repository.create(docType, validData);
    };

    // If aroundInsert is provided, let the hook wrap the execution (e.g. for Locks)
    if (hook && hook.aroundInsert) {
      return await hook.aroundInsert(docType, validData, user, this.queryService, executeInsert);
    }

    return await executeInsert();
  }

  async update(docTypeName: string, id: RecordId, payload: Record<string, any>, user: UserContext, currentVersion?: any): Promise<RecordData> {
    const docType = DocTypeRegistry.get(docTypeName);
    PolicyEngine.authorize(docType, 'update', user);

    // Validate and clean input payload
    const validData = DocTypeValidator.validate(docType, payload, true);

    // Guard against unauthorized writes to Legacy sheets or in Shadow Mode
    ShadowGuard.assertWritable('update', docType);

    // Fetch existing record to merge for accurate Computed Fields & State Machine
    const existingRecord = await this.repository.get(docType, id);
    if (!existingRecord) {
      throw new Error(`Record with ID '${id}' not found.`);
    }

    // Enforce State Transition & Role Rules
    StateMachineEngine.validateTransition(docType, existingRecord, validData, user);

    // Merge data
    const mergedData = { ...existingRecord, ...validData };

    // Run beforeUpdate hooks (Business Rules, Quota Checks, etc.)
    const hook = HookRegistry.get(docType.name);
    if (hook && hook.beforeUpdate) {
      await hook.beforeUpdate(docType, existingRecord, validData, user, this.queryService);
    }

    // Apply Computed Fields on the merged data
    ComputedEngine.applyComputedFields(docType, mergedData);

    const executeUpdate = async () => {
      // Extract only the keys that were in the original payload, mapped to merged values
      const finalUpdateData: Record<string, any> = {};
      Object.keys(validData).forEach(key => {
        finalUpdateData[key] = mergedData[key];
      });

      // Also include any fields modified by hooks (like computed or days)
      Object.keys(mergedData).forEach(key => {
        if (mergedData[key] !== existingRecord[key]) {
          finalUpdateData[key] = mergedData[key];
        }
      });

      // Update in storage (throws 409 if version mismatch)
      const updatedRecord = await this.repository.update(docType, id, finalUpdateData, currentVersion);

      // Run afterUpdate hooks
      if (hook && hook.afterUpdate) {
        await hook.afterUpdate(docType, existingRecord, updatedRecord, user, this.queryService);
      }
      
      return updatedRecord;
    };

    if (hook && hook.aroundUpdate) {
      return await hook.aroundUpdate(docType, existingRecord, validData, user, this.queryService, executeUpdate);
    }

    return await executeUpdate();
  }

  async delete(docTypeName: string, id: RecordId, user: UserContext): Promise<boolean> {
    const docType = DocTypeRegistry.get(docTypeName);
    PolicyEngine.authorize(docType, 'delete', user);

    // Guard against unauthorized writes to Legacy sheets or in Shadow Mode
    ShadowGuard.assertWritable('delete', docType);

    const success = await this.repository.delete(docType, id);

    // Cache invalidation would happen here

    return success;
  }
}
