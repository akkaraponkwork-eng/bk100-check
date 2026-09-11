export interface IConcurrencyGuard {
  acquire(key: string): Promise<boolean>;
  release(key: string): Promise<void>;
  withLock<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * In-memory concurrency guard for single-node deployments.
 * Proof-of-concept for C3. For multi-node production, this should be backed by Redis.
 */
export class InMemoryConcurrencyGuard implements IConcurrencyGuard {
  private locks = new Map<string, boolean>();

  async acquire(key: string): Promise<boolean> {
    if (this.locks.has(key)) {
      return false; // Lock is already held
    }
    this.locks.set(key, true);
    return true;
  }

  async release(key: string): Promise<void> {
    this.locks.delete(key);
  }

  /**
   * Executes a function with an exclusive lock on the given key.
   * Throws a 409 Conflict error if the lock cannot be acquired immediately.
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const acquired = await this.acquire(key);
    if (!acquired) {
      // 409 Conflict Error
      const error = new Error(`Concurrent modification detected. Lock for '${key}' is held by another process.`);
      (error as any).status = 409;
      throw error;
    }

    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }
}

// Export a singleton instance
export const ConcurrencyGuard = new InMemoryConcurrencyGuard();
