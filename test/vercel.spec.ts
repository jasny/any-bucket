import { expect } from 'chai';
import { stub, SinonStub } from 'sinon';
import * as vercelBlob from '@vercel/blob';
import VercelBucket from '../src/vercel';

describe('VercelBucket', () => {
  let bucket: VercelBucket;
  let bucketSub: VercelBucket;

  let listStub: SinonStub;
  let headStub: SinonStub;
  let putStub: SinonStub;
  let delStub: SinonStub;
  let fetchStub: SinonStub;

  beforeEach(() => {
    bucket = new VercelBucket();
    bucketSub = new VercelBucket('sub');

    listStub = stub(vercelBlob, 'list');
    headStub = stub(vercelBlob, 'head');
    putStub = stub(vercelBlob, 'put');
    delStub = stub(vercelBlob, 'del');
    fetchStub = stub(globalThis, 'fetch');
  });

  afterEach(() => {
    listStub.restore();
    headStub.restore();
    putStub.restore();
    delStub.restore();
    fetchStub.restore();
  });

  describe('list', () => {
    beforeEach(() => {
      listStub.resolves({
        blobs: [{ pathname: 'file1.txt' }, { pathname: 'file2.txt' }],
        folders: ['folder/'],
        hasMore: false,
        cursor: undefined,
      });
    });

    it('should list files and folders', async () => {
      const files = await bucket.list();

      expect(files).to.have.members(['file1.txt', 'file2.txt', 'folder']);
      expect(listStub.calledOnce).to.be.true;
      expect(listStub.firstCall.args[0]).to.deep.include({ prefix: '', mode: 'folded' });
    });

    it('should list files in a folder', async () => {
      await bucket.list('folder');

      expect(listStub.firstCall.args[0]).to.deep.include({ prefix: 'folder/', mode: 'folded' });
    });

    describe('with prefix', () => {
      it('should list files in the sub folder', async () => {
        listStub.resolves({
          blobs: [{ pathname: 'sub/file1.txt' }],
          folders: ['sub/folder/'],
          hasMore: false,
          cursor: undefined,
        });

        const files = await bucketSub.list();

        expect(files).to.have.members(['file1.txt', 'folder']);
        expect(listStub.firstCall.args[0]).to.deep.include({ prefix: 'sub/', mode: 'folded' });
      });

      it('should list files in a sub folder', async () => {
        listStub.resolves({ blobs: [], folders: [], hasMore: false });

        await bucketSub.list('folder');

        expect(listStub.firstCall.args[0]).to.deep.include({ prefix: 'sub/folder/', mode: 'folded' });
      });
    });
  });

  describe('has', () => {
    it('should return true if the blob exists', async () => {
      headStub.resolves({ pathname: 'file1.txt', url: 'https://example.com/file1.txt' });

      expect(await bucket.has('file1.txt')).to.be.true;
      expect(headStub.firstCall.args[0]).to.equal('file1.txt');
    });

    it('should return false if the blob does not exist', async () => {
      headStub.rejects(new vercelBlob.BlobNotFoundError());

      expect(await bucket.has('nonexistent.txt')).to.be.false;
    });

    describe('with prefix', () => {
      it('should return true if the blob exists', async () => {
        headStub.resolves({ pathname: 'sub/file1.txt', url: 'https://example.com/sub/file1.txt' });

        await bucketSub.has('file1.txt');

        expect(headStub.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });

  describe('get', () => {
    beforeEach(() => {
      headStub.resolves({ pathname: 'file1.txt', url: 'https://example.com/file1.txt' });
      const buf = Buffer.from('content 1');
      fetchStub.resolves({
        arrayBuffer: () => Promise.resolve(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
      });
    });

    it('should return the file content as a Buffer', async () => {
      const content = await bucket.get('file1.txt');

      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.toString()).to.equal('content 1');
      expect(headStub.firstCall.args[0]).to.equal('file1.txt');
      expect(fetchStub.firstCall.args[0]).to.equal('https://example.com/file1.txt');
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const content = await bucket.get('file1.txt', 'utf-8');

      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');
    });

    describe('with prefix', () => {
      it('should return the file content as a Buffer', async () => {
        await bucketSub.get('file1.txt');

        expect(headStub.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });

  describe('put', () => {
    beforeEach(() => {
      putStub.resolves({ url: 'https://example.com/file1.txt', pathname: 'file1.txt' });
    });

    it('should put an object with the specified key and value', async () => {
      await bucket.put('file1.txt', 'content 1');

      expect(putStub.calledOnce).to.be.true;
      expect(putStub.firstCall.args[0]).to.equal('file1.txt');
      expect(putStub.firstCall.args[1]).to.equal('content 1');
      expect(putStub.firstCall.args[2]).to.deep.include({ access: 'public', allowOverwrite: true });
    });

    describe('with prefix', () => {
      it('should put an object with the specified key and value', async () => {
        await bucketSub.put('file1.txt', 'content 1');

        expect(putStub.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      delStub.resolves();
    });

    it('should delete a blob', async () => {
      await bucket.delete('file1.txt');

      expect(delStub.calledOnce).to.be.true;
      expect(delStub.firstCall.args[0]).to.equal('file1.txt');
    });

    describe('with prefix', () => {
      it('should delete a blob with the prefix', async () => {
        await bucketSub.delete('file1.txt');

        expect(delStub.firstCall.args[0]).to.equal('sub/file1.txt');
      });
    });
  });
});
