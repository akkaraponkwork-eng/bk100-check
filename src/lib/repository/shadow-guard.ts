import { AppError, ConfigurationError } from '../utils/errors';

/**
 * ShadowGuard — Defense in Depth for Production Shadow Mode.
 * When DATA_MODE=shadow, all write operations (create, update, delete) are blocked
 * at the Repository level, regardless of what happens in the UI or Service layer.
 */
export class ShadowGuard {
  static get isEnabled() { return process.env.DATA_MODE === 'shadow'; }
  static get appEnv() { return process.env.APP_ENV || 'development'; }
  static get allowWrite() { return process.env.ALLOW_PRODUCTION_WRITE === 'true'; }
  private static initialized = false;

  static checkStartupGuard(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (this.appEnv === 'production' && process.env.DATA_MODE === 'write' && !this.allowWrite) {
      console.error('\n❌ [FATAL ERROR] Production Write is blocked. Set ALLOW_PRODUCTION_WRITE=true to enable.');
      throw new Error('STARTUP BLOCKED: Production write is disabled for safety.');
    }

    const dataMode = (process.env.DATA_MODE || 'write').toUpperCase();
    const writeStatus = this.isEnabled ? 'DISABLED' : 'ENABLED';

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║       BK100 Production SHADOW        ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║ Environment : ${this.appEnv.padEnd(22)} ║`);
    console.log(`║ Data Mode   : ${dataMode.padEnd(22)} ║`);
    console.log(`║ Write       : ${writeStatus.padEnd(22)} ║`);
    console.log('╚══════════════════════════════════════╝\n');
  }

  static assertStorageConfig(docType: any): void {
    if (!docType.storage) {
      throw new ConfigurationError(`[CONFIGURATION ERROR] DocType '${docType.name}' is missing 'storage' configuration.`);
    }
    if (!docType.storage.sheetName) {
      throw new ConfigurationError(`[CONFIGURATION ERROR] DocType '${docType.name}' is missing 'storage.sheetName'. Fallbacks are strictly prohibited.`);
    }
    if (docType.storage.mode === 'framework' && !docType.storage.sheetName.startsWith('BKFW_')) {
      throw new ConfigurationError(`[CONFIGURATION ERROR] DocType '${docType.name}' is in 'framework' mode but sheetName '${docType.storage.sheetName}' does not start with 'BKFW_'.`);
    }
  }

  /**
   * Call this before any write operation in the Repository.
   * Throws a ReadOnlyError if Shadow Mode is active or if trying to write to a legacy sheet.
   */
  static assertWritable(operation: 'create' | 'update' | 'delete', docType: any): void {
    this.assertStorageConfig(docType);

    // 1. LEGACY GUARD
    if (docType.storage.mode === 'legacy-readonly') {
      throw new ReadOnlyError(
        `[LEGACY GUARD] Writes to legacy sheet '${docType.storage.sheetName}' are strictly prohibited. Framework can only write to 'BKFW_*' sheets.`
      );
    }

    // 2. SHADOW MODE GUARD
    if (this.isEnabled) {
      const methodMap = { create: 'POST', update: 'PATCH', delete: 'DELETE' };
      throw new ReadOnlyError(
        `[SHADOW MODE] ${methodMap[operation]} is DISABLED. The system is in read-only shadow mode (DATA_MODE=shadow). No writes are permitted.`
      );
    }
  }
}

export class ReadOnlyError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'LegacyGuardError';
  }
}
