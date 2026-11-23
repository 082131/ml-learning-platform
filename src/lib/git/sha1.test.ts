import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { hashTree } from './objects';
import { hasGit } from './realGit';
import { hashBlob, sha1, utf8 } from './sha1';

describe('sha1', () => {
  it('matches the FIPS 180 test vectors', () => {
    expect(sha1(utf8('abc'))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(sha1(utf8(''))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(sha1(utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe('84983e441c3bd26ebaae4aa1f95129e5e54670f1');
  });
  it('hashes blobs and the empty tree as Git does', () => {
    expect(hashBlob('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    expect(hashBlob('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(hashTree({})).toBe('4b825dc642cb6eb9a060e54bf8d69288fbee4904');
  });
});

describe.skipIf(!hasGit())('against git hash-object', () => {
  it('blob ids for UTF-8 and multi-block content', () => {
    for (const text of ['lr = 0.01\n', 'naïve café ✓\n', 'x'.repeat(200) + '\n'])
      expect(hashBlob(text)).toBe(execFileSync('git', ['hash-object', '--stdin'], { input: text, encoding: 'utf8' }).trim());
  });
});
