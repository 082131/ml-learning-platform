import { describe, expect, it } from 'vitest';
import { starterCode } from '../../../content/tracks/ml/deep/project-neural-net/code';
import starter from './fixtures/project_nn/starter.py?raw';

describe('project-neural-net starter', () => {
  it('shows exactly the starter.py that was run to record its output', () => {
    expect(starterCode.source).toBe(starter.trimEnd());
  });
});
