import { expect } from 'chai';
import MemoryBucket from '../src/memory';

describe('MemoryBucket', () => {
  let bucket: MemoryBucket;

  beforeEach(() => {
    bucket = new MemoryBucket({
      'file1.txt': 'content 1',
      'file2.txt': 'content 2',
      'folder/file3.txt': 'content 3',
      'folder/sub/file4.txt': 'content 4',
    });
  });

  describe('list', () => {
    it('should list top-level files and folders', async () => {
      const files = await bucket.list();
      expect(files).to.have.members(['file1.txt', 'file2.txt', 'folder']);
    });

    it('should list files in a folder', async () => {
      const files = await bucket.list('folder');
      expect(files).to.have.members(['folder/file3.txt', 'folder/sub']);
    });

    it('should return an empty array for an empty folder', async () => {
      const files = await bucket.list('nonexistent');
      expect(files).to.deep.equal([]);
    });
  });

  describe('has', () => {
    it('should return true if the key exists', async () => {
      expect(await bucket.has('file1.txt')).to.be.true;
    });

    it('should return false if the key does not exist', async () => {
      expect(await bucket.has('nonexistent.txt')).to.be.false;
    });
  });

  describe('get', () => {
    it('should return the file content as a Buffer', async () => {
      const content = await bucket.get('file1.txt');
      expect(content).to.be.an.instanceOf(Buffer);
      expect(content.toString()).to.equal('content 1');
    });

    it('should return the file content as a string with the specified encoding', async () => {
      const content = await bucket.get('file1.txt', 'utf-8');
      expect(content).to.be.a('string');
      expect(content).to.equal('content 1');
    });

    it('should throw if the key does not exist', async () => {
      try {
        await bucket.get('nonexistent.txt');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('Key not found: nonexistent.txt');
      }
    });
  });

  describe('put', () => {
    it('should store a string value', async () => {
      await bucket.put('new.txt', 'new content');
      expect(await bucket.get('new.txt', 'utf-8')).to.equal('new content');
    });

    it('should store a binary value', async () => {
      const data = Buffer.from([0x01, 0x02, 0x03]);
      await bucket.put('binary.bin', data);
      const result = await bucket.get('binary.bin');
      expect(result).to.deep.equal(data);
    });

    it('should throw an error if the key is empty', async () => {
      try {
        await bucket.put('', 'value');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('key is empty');
      }
    });
  });

  describe('delete', () => {
    it('should remove an existing key', async () => {
      await bucket.delete('file1.txt');
      expect(await bucket.has('file1.txt')).to.be.false;
    });

    it('should throw an error if the key is empty', async () => {
      try {
        await bucket.delete('');
        expect.fail('Expected an error to be thrown');
      } catch (error) {
        expect(error.message).to.equal('key is empty');
      }
    });
  });
});
