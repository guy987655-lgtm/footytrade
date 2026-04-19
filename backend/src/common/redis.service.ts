import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * In-memory Redis mock that provides all methods used by the application.
 * Supports: get, set, del, zadd, zrangebyscore, zrem, publish, subscribe, on, quit.
 * No external Redis server required.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private sortedSets = new Map<string, Map<string, number>>();
  private emitter = new EventEmitter();

  constructor() {
    this.logger.log('Using in-memory Redis mock (no external Redis needed)');
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    let ttlMs: number | undefined;
    let nx = false;

    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'EX' && args[i + 1] != null) {
        ttlMs = Number(args[i + 1]) * 1000;
        i++;
      } else if (arg === 'PX' && args[i + 1] != null) {
        ttlMs = Number(args[i + 1]);
        i++;
      } else if (arg === 'NX') {
        nx = true;
      }
    }

    if (nx) {
      const existing = await this.get(key);
      if (existing !== null) return null;
    }

    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    let ss = this.sortedSets.get(key);
    if (!ss) {
      ss = new Map();
      this.sortedSets.set(key, ss);
    }
    const isNew = !ss.has(member);
    ss.set(member, score);
    return isNew ? 1 : 0;
  }

  async zrem(key: string, member: string): Promise<number> {
    const ss = this.sortedSets.get(key);
    if (!ss) return 0;
    return ss.delete(member) ? 1 : 0;
  }

  async zrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
    ...args: any[]
  ): Promise<string[]> {
    const ss = this.sortedSets.get(key);
    if (!ss) return [];

    const minVal = min === '-inf' ? -Infinity : Number(min);
    const maxVal = max === '+inf' ? Infinity : Number(max);

    let entries = Array.from(ss.entries())
      .filter(([, s]) => s >= minVal && s <= maxVal)
      .sort((a, b) => a[1] - b[1]);

    const withScores = args.some(
      (a) => typeof a === 'string' && a.toUpperCase() === 'WITHSCORES',
    );

    const limitIdx = args.findIndex(
      (a) => typeof a === 'string' && a.toUpperCase() === 'LIMIT',
    );
    if (limitIdx !== -1) {
      const offset = Number(args[limitIdx + 1]) || 0;
      const count = Number(args[limitIdx + 2]) || entries.length;
      entries = entries.slice(offset, offset + count);
    }

    if (withScores) {
      const result: string[] = [];
      for (const [member, score] of entries) {
        result.push(member, String(score));
      }
      return result;
    }

    return entries.map(([member]) => member);
  }

  async zrevrangebyscore(
    key: string,
    max: string | number,
    min: string | number,
    ...args: any[]
  ): Promise<string[]> {
    const result = await this.zrangebyscore(key, min, max, ...args);
    const withScores = args.some(
      (a) => typeof a === 'string' && a.toUpperCase() === 'WITHSCORES',
    );
    if (withScores) {
      const pairs: [string, string][] = [];
      for (let i = 0; i < result.length; i += 2) {
        pairs.push([result[i], result[i + 1]]);
      }
      pairs.reverse();
      return pairs.flat();
    }
    return result.reverse();
  }

  async publish(channel: string, message: string): Promise<number> {
    this.emitter.emit('message', channel, message);
    return 1;
  }

  async subscribe(channel: string, callback?: (err: Error | null) => void): Promise<void> {
    if (callback) callback(null);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  async onModuleDestroy() {
    this.store.clear();
    this.sortedSets.clear();
    this.emitter.removeAllListeners();
  }
}
