import { DocType } from '../doctypes/schema';
import { UserContext } from '../policies/engine';

export interface DocTypeHook {
  aroundInsert?: (docType: DocType, payload: Record<string, any>, user: UserContext, queryService: any, execute: () => Promise<any>) => Promise<any>;
  aroundUpdate?: (docType: DocType, existingRecord: Record<string, any>, payload: Record<string, any>, user: UserContext, queryService: any, execute: () => Promise<any>) => Promise<any>;
  beforeInsert?: (docType: DocType, payload: Record<string, any>, user: UserContext, queryService?: any) => Promise<void>;
  beforeUpdate?: (docType: DocType, existingRecord: Record<string, any>, payload: Record<string, any>, user: UserContext, queryService?: any) => Promise<void>;
  afterUpdate?: (docType: DocType, oldData: Record<string, any>, newData: Record<string, any>, user: UserContext, queryService?: any) => Promise<void>;
}

export class HookRegistry {
  private static hooks: Map<string, DocTypeHook> = new Map();

  static register(docTypeName: string, hook: DocTypeHook) {
    this.hooks.set(docTypeName, hook);
  }

  static get(docTypeName: string): DocTypeHook | undefined {
    return this.hooks.get(docTypeName);
  }
}
