import { getStore } from '@netlify/blobs';
import { Bucket } from './types';

type Store = ReturnType<typeof getStore>;

export default class NetlifyBucket implements Bucket {
  constructor(private readonly store: Store) {}

  async list(folder?: string): Promise<string[]> {
    const prefix = folder ? `${folder}/` : undefined;
    const result = await this.store.list({ prefix, directories: true });

    return [
      ...result.blobs.map((b) => b.key),
      ...result.directories.map((d) => d.replace(/\/$/, '')),
    ];
  }

  async has(key: string): Promise<boolean> {
    return (await this.store.getMetadata(key)) !== null;
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    if (encoding) {
      const data = await this.store.get(key, { type: 'text' });
      if (data === null) throw new Error(`Key not found: ${key}`);
      return data;
    }

    const data = await this.store.get(key, { type: 'arrayBuffer' });
    if (data === null) throw new Error(`Key not found: ${key}`);
    return Buffer.from(data);
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    const data = content instanceof Uint8Array && !(content instanceof Buffer) ? Buffer.from(content) : content;
    await this.store.set(key, data as string | ArrayBuffer);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }
}
