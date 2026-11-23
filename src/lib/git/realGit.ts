// Test helper (Node only): replays a sandbox script in real Git with the sandbox's identity and clock, then reads
// back refs, files and the index so sim.test.ts can compare them with the simulator.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { T0, type Files } from './objects';
import { ADA, GRACE, REMOTE_URL, tokenize } from './sim';

export function hasGit(): boolean {
  return spawnSync('git', ['--version']).status === 0;
}

export interface RealState {
  refs: Record<string, string>;
  head: string;
  work: Files;
  /** path to blob id, stage 0 only */
  index: Record<string, string>;
  outputs: { command: string; output: string; ok: boolean }[];
}

function readWork(dir: string, prefix = ''): Files {
  const out: Files = {};
  for (const name of readdirSync(join(dir, prefix))) {
    if (!prefix && name === '.git') continue;
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(join(dir, rel)).isDirectory()) Object.assign(out, readWork(dir, rel));
    else out[rel] = readFileSync(join(dir, rel), 'utf8');
  }
  return out;
}

export function replayInGit(lines: string[]): RealState {
  const root = mkdtempSync(join(tmpdir(), 'gitsim-'));
  const cfg = join(root, 'gitconfig');
  const origin = join(root, 'origin.git');
  writeFileSync(
    cfg,
    `[init]\n\tdefaultBranch = main\n[commit]\n\tgpgsign = false\n[tag]\n\tgpgsign = false\n[advice]\n\tdetachedHead = false\n[url "${origin}"]\n\tinsteadOf = ${REMOTE_URL}\n[core]\n\thooksPath = /dev/null\n[log]\n\tdecorate = short\n`,
  );
  const work = join(root, 'work');
  mkdirSync(work);
  const baseEnv = { ...process.env, GIT_CONFIG_GLOBAL: cfg, GIT_CONFIG_NOSYSTEM: '1', LANG: 'C', LC_ALL: 'C' };
  const env = (i: number, who = ADA) => ({
    ...baseEnv,
    GIT_AUTHOR_NAME: who.name,
    GIT_AUTHOR_EMAIL: who.email,
    GIT_COMMITTER_NAME: who.name,
    GIT_COMMITTER_EMAIL: who.email,
    GIT_AUTHOR_DATE: `${T0 + 60 * i} +0000`,
    GIT_COMMITTER_DATE: `${T0 + 60 * i} +0000`,
  });
  const g = (cwd: string, args: string[], i: number, who = ADA) =>
    spawnSync('git', args, { cwd, env: env(i, who), encoding: 'utf8' });
  g(work, ['init', '-q'], 0);
  const outputs: RealState['outputs'] = [];
  lines.forEach((line, i) => {
    const t = tokenize(line);
    if (t[0] === 'remote-init') {
      g(root, ['init', '-q', '--bare', origin], i);
      g(work, ['remote', 'add', 'origin', REMOTE_URL], i);
      g(work, ['push', '-q', '-u', 'origin', '--all'], i);
      outputs.push({ command: line, output: '', ok: true });
      return;
    }
    if (t[0] === 'teammate-push') {
      const [, path, text, message, branch = 'main'] = t;
      const mate = join(root, `mate-${i}`);
      g(root, ['clone', '-q', '-b', branch!, REMOTE_URL, mate], i, GRACE);
      const file = join(mate, path!);
      let old = '';
      try {
        old = readFileSync(file, 'utf8');
      } catch {
        /* new file */
      }
      writeFileSync(file, `${old}${text}\n`);
      g(mate, ['add', path!], i, GRACE);
      g(mate, ['commit', '-q', '-m', message!], i, GRACE);
      g(mate, ['push', '-q', 'origin', branch!], i, GRACE);
      outputs.push({ command: line, output: '', ok: true });
      return;
    }
    if (t[0] === 'git') {
      const res = g(work, t.slice(1), i);
      outputs.push({ command: line, output: (res.stdout + res.stderr).trim(), ok: res.status === 0 });
      return;
    }
    // echo, cat, rm, ls: run in a shell with the same quoting.
    // The sandbox creates folders for `echo ... > dir/file`; a real shell needs mkdir -p first.
    const target = /^echo .*>>? (\S+)$/.exec(line)?.[1];
    const dir = target?.includes('/') ? `mkdir -p ${target.slice(0, target.lastIndexOf('/'))} && ` : '';
    const res = spawnSync('bash', ['-c', dir + line], { cwd: work, env: env(i), encoding: 'utf8' });
    outputs.push({ command: line, output: (res.stdout + res.stderr).trim(), ok: res.status === 0 });
  });
  const refsRaw = execFileSync('git', ['for-each-ref', '--format=%(refname) %(objectname)'], { cwd: work, env: baseEnv, encoding: 'utf8' });
  const refs: Record<string, string> = {};
  for (const l of refsRaw.trim().split('\n').filter(Boolean)) {
    const [name, id] = l.split(' ');
    refs[name!] = id!;
  }
  const headRes = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: work, env: baseEnv, encoding: 'utf8' });
  const indexRaw = execFileSync('git', ['ls-files', '-s'], { cwd: work, env: baseEnv, encoding: 'utf8' });
  const index: Record<string, string> = {};
  for (const l of indexRaw.trim().split('\n').filter(Boolean)) {
    const m = /^\d+ ([0-9a-f]+) (\d)\t(.*)$/.exec(l)!;
    if (m[2] === '0') index[m[3]!] = m[1]!;
  }
  return { refs, head: headRes.status === 0 ? headRes.stdout.trim() : '', work: readWork(work), index, outputs };
}
