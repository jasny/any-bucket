import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';
import NetlifyBucket from '../src/netlify';

type Store = {
  list: SinonStub;
  getMetadata: SinonStub;
  get: SinonStub;
  set: SinonStub;
  delete: SinonStub;
};

describe('NetlifyBucket', () => {
  let store: Store;
  let bucket: NetlifyBucket;

  beforeEach(() => {
    store = {
      list: stub(),
      getMetadata: stub(),
      get: stub(),
      set: stub(),
      delete: stub(),
    };
    bucket = new NetlifyBucket(store as any);
  });

  describe('list', () => {
    beforeEach(() => {
      store.list.resolves({
        blobs: [{ key: 'file1.txt', etag: '1' }, { key: 'file2.txt', etag: '2' }],
        directories: ['folder/'],
      });
    });

    it('should list files and folders', async () => {
      const files = await bucket.list();

      expect(files).to.have.members(['file1.txt', 'file2.txt', 'folder']);
      expect(store.list.calledOnce).to.be.true;
      expect(store.list.firstCall.args[0]).to.deep.include({ directories: true });
      expect(store.list.firstCall.args[0].prefix).to.be.undefined;
    });

    it('should list files in a folder', async () => {
      store.list.resolves({
        blobs: [{ key: 'folder/file3.txt', etag: '3' }],
        directories: ['folder/sub/'],
      });

      const files = await bucket.list('folder');

      expect(files).to.have.members(['folder/file3.txt', 'folder/sub']);
      expect(store.list.firstCall.args[0]).to.deep.include({ prefix: 'folder/', directories: true });
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      store.getMetadata.resolves({ etag: '1', metadata: {} });

      expect(await bucket.has('file1.txt')).to.be.true;
      expect(store.getMetadata.firstCall.args[0]).to.equal('file1.txt');
    });

    it('should return false if the key does not exist', async () => {
      store.getMetadata.resolves(null);

      expect(await bucket.has('nonexistent.txt')).to.be.false;
    });
  });

  describe('get', () => {
    it('should return the file content as a Buffer', async () => {
      const buf = Buffer.from('content 1');
      store.get.resolves(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

      const content = await bucket.get('file1.txt');

      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.toString()).to.equal('content 1');
      expect(store.get.firstCall.args[0]).to.equal('file1.txt');
      expect(store.get.firstCall.args[1]).to.deep.equal({ type: 'arrayBuffer' });
    });

    it('should return the file content as a string with the specified encoding', async () => {
      store.get.resolves('content 1');

      const content = await bucket.get('file1.txt', 'utf-8');

      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');
      expect(store.get.firstCall.args[1]).to.deep.equal({ type: 'text' });
    });

    it('should throw if the key does not exist', async () => {
      store.get.resolves(null);

      try {
        await bucket.get('nonexistent.txt');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Key not found: nonexistent.txt');
      }
    });
  });

  describe('put', () => {
    beforeEach(() => {
      store.set.resolves({ etag: '1', modified: true });
    });

    it('should store a string value', async () => {
      await bucket.put('file1.txt', 'content 1');

      expect(store.set.calledOnce).to.be.true;
      expect(store.set.firstCall.args[0]).to.equal('file1.txt');
      expect(store.set.firstCall.args[1]).to.equal('content 1');
    });

    it('should store a binary value', async () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      await bucket.put('binary.bin', data);

      expect(store.set.firstCall.args[1]).to.deep.equal(data);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      store.delete.resolves();
    });

    it('should delete a key', async () => {
      await bucket.delete('file1.txt');

      expect(store.delete.calledOnce).to.be.true;
      expect(store.delete.firstCall.args[0]).to.equal('file1.txt');
    });
  });
});
