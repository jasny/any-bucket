import * as vercelBlob from '@vercel/blob';
import { Bucket } from './types';

export default class VercelBucket implements Bucket {
  private readonly prefix: string;
  private readonly options: { token?: string };

  constructor(prefix: string = '', token?: string) {
    this.prefix = prefix ? prefix.replace(/\/$/, '') + '/' : '';
    this.options = token ? { token } : {};
  }

  private path(key: string): string {
    return this.prefix + key;
  }

  async list(folder?: string): Promise<string[]> {
    const prefix = this.path(folder ? `${folder}/` : '');
    const result = await vercelBlob.list({ ...this.options, prefix, mode: 'folded' });

    return [
      ...result.blobs.map((b) => b.pathname.slice(this.prefix.length)),
      ...result.folders.map((f) => f.slice(this.prefix.length).replace(/\/$/, '')),
    ];
  }

  async has(key: string): Promise<boolean> {
    try {
      await vercelBlob.head(this.path(key), this.options);
      return true;
    } catch (e) {
      if (e instanceof vercelBlob.BlobNotFoundError) return false;
      throw e;
    }
  }

  async get(key: string, encoding?: null): Promise<Buffer>;
  async get(key: string, encoding: BufferEncoding): Promise<string>;
  async get(key: string, encoding?: null | BufferEncoding): Promise<Buffer | string> {
    const blob = await vercelBlob.head(this.path(key), this.options);
    const response = await fetch(blob.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    return encoding ? buffer.toString(encoding) : buffer;
  }

  async put(key: string, content: string | Uint8Array): Promise<void> {
    const body = typeof content === 'string' ? content : Buffer.from(content);
    await vercelBlob.put(this.path(key), body, { ...this.options, access: 'public', allowOverwrite: true });
  }

  async delete(key: string): Promise<void> {
    await vercelBlob.del(this.path(key), this.options);
  }
}
