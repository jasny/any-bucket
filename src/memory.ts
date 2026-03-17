import { Bucket } from './types';

export default class MemoryBucket implements Bucket {
  private readonly store: Map<string, Buffer>;

  constructor(initial: Record<string, string | Uint8Array> = {}) {
    this.store = new Map(Object.entries(initial).map(([k, v]) => [k, Buffer.from(v)]));
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = folder ? `${folder}/` : '';
    const results = new Set<string>();

    for (const key of this.store.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf('/');
      results.add(slash === -1 ? key : prefix + rest.slice(0, slash));
    }

    return [...results];
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const data = this.store.get(key);
    if (data === undefined) throw new Error(`Key not found: ${key}`);
    return encoding ? data.toString(encoding) : Buffer.from(data);
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    if (key === '') throw new Error('key is empty');
    this.store.set(key, Buffer.from(content));
  }

  async delete(key: string): Promise<void> {
    if (key === '') throw new Error('key is empty');
    this.store.delete(key);
  }
}
