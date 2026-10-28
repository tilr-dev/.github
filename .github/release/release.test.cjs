const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { validate } = require('./release.cjs');

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'release-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'caller'), bin = join(root, 'bin');
  mkdirSync(repo); mkdirSync(bin);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Release Test'); git('config', 'user.email', 'release@example.test');
  git('config', 'commit.gpgsign', 'false'); git('config', 'tag.gpgsign', 'false');
  const commit = () => { git('commit', '--allow-empty', '-m', 'Another ordinary commit'); return git('rev-parse', 'HEAD'); };
  commit();
  const calls = join(root, 'calls'), state = join(root, 'releases');
  writeFileSync(state, '[]');
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
const releases = JSON.parse(fs.readFileSync(process.env.RELEASES, 'utf8'));
if (args[0] === 'api') {
  if (process.env.API_FAILURE) { console.log('HTTP/2.0 500 Server Error'); process.exit(1); }
  const tag = args.at(-1).split('/').at(-1);
  if (releases.includes(tag)) { console.log('HTTP/2.0 200 OK\\n{}'); }
  else { console.log('HTTP/2.0 404 Not Found\\n{}'); process.exit(1); }
} else if (args[0] === 'release' && args[1] === 'create') {
  releases.push(args[2]); fs.writeFileSync(process.env.RELEASES, JSON.stringify(releases));
  const child = require('node:child_process');
  const i = args.indexOf('--target');
  if (i >= 0) {
    const found = child.spawnSync('git', ['rev-parse', '--verify', 'refs/tags/' + args[2]], { stdio: 'ignore' });
    if (found.status !== 0) child.execFileSync('git', ['tag', args[2], args[i + 1]]);
  }
} else { process.exit(2); }
`, { mode: 0o755 });
  const run = (ref = 'release/1.2', type = 'branch', extra = {}) => {
    const output = join(root, 'output'); writeFileSync(output, ''); writeFileSync(calls, '');
    const result = spawnSync(process.execPath, [join(__dirname, 'release.cjs')], {
      cwd: repo, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`,
        EVENT: 'push', REF_NAME: ref, REF_TYPE: type, WORKFLOW_SHA: 'a'.repeat(40),
        GH_REPO: 'example/caller', SHA: git('rev-parse', 'HEAD'), GITHUB_OUTPUT: output,
        CALLS: calls, RELEASES: state, ...extra },
    });
    return { status: result.status, error: result.stderr, output: readFileSync(output, 'utf8'),
      calls: readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) };
  };
  const line = (name = '1.2') => git('update-ref', `refs/remotes/origin/release/${name}`, 'HEAD');
  return { git, commit, run, line, state };
}
function ok(result, tag, rc) {
  assert.equal(result.status, 0, result.error);
  assert.equal(result.output, `tag=${tag}\nversion=${tag.slice(1)}\nis_rc=${rc}\n`);
}
const creates = result => result.calls.filter(a => a[0] === 'release');

test('first line starts at patch zero, next commit advances N and rerun reuses tag/release', t => {
  const f = fixture(t);
  const first = f.run(); ok(first, 'v1.2.0-rc.1', true);
  assert.ok(creates(first)[0].includes('--prerelease'));
  assert.equal(f.git('rev-parse', 'v1.2.0-rc.1'), f.git('rev-parse', 'HEAD'));
  f.commit(); ok(f.run(), 'v1.2.0-rc.2', true);
  const rerun = f.run(); ok(rerun, 'v1.2.0-rc.2', true); assert.deepEqual(creates(rerun), []);
});
test('patch and candidate numbers sort numerically and ignore other lines and malformed tags', t => {
  const f = fixture(t);
  for (const tag of ['v1.2.2', 'v1.2.10', 'v1.20.99', 'v1.2.11-rc.9', 'v1.2.11-rc.10', 'v1.2.99-invalid']) f.git('tag', tag);
  f.commit(); ok(f.run(), 'v1.2.11-rc.11', true);
});
test('a candidate rerun remains the same even after a newer stable tag', t => {
  const f = fixture(t); const sha = f.git('rev-parse', 'HEAD');
  ok(f.run(), 'v1.2.0-rc.1', true);
  f.commit(); f.git('tag', '-a', 'v1.2.0', '-m', 'Stable');
  ok(f.run('release/1.2', 'branch', { SHA: sha }), 'v1.2.0-rc.1', true);
});
for (const annotated of [false, true]) {
  test(`stable branch rerun produces no candidate (${annotated ? 'annotated' : 'lightweight'})`, t => {
    const f = fixture(t);
    if (annotated) f.git('tag', '-a', 'v1.2.0', '-m', 'Stable'); else f.git('tag', 'v1.2.0');
    const r = f.run(); assert.equal(r.status, 0, r.error);
    assert.equal(r.output, 'tag=\nversion=\nis_rc=false\n'); assert.deepEqual(r.calls, []);
  });
  test(`stable tag publishes generated notes and reruns reuse release (${annotated ? 'annotated' : 'lightweight'})`, t => {
    const f = fixture(t); f.git('tag', 'v1.2.9'); f.commit();
    if (annotated) f.git('tag', '-a', 'v1.2.10', '-m', 'Stable'); else f.git('tag', 'v1.2.10');
    const tagged = f.git('rev-parse', 'HEAD'); f.commit(); f.line();
    const r = f.run('v1.2.10', 'tag', { SHA: tagged }); ok(r, 'v1.2.10', false);
    assert.deepEqual(creates(r), [['release', 'create', 'v1.2.10', '--title', 'v1.2.10', '--verify-tag', '--generate-notes', '--notes-start-tag', 'v1.2.9']]);
    const again = f.run('v1.2.10', 'tag', { SHA: tagged }); ok(again, 'v1.2.10', false); assert.deepEqual(creates(again), []);
  });
}
test('stable notes fall back to the highest previous stable overall', t => {
  const f = fixture(t); for (const tag of ['v0.9.2', 'v0.10.0', 'v0.10.1-rc.1', 'v2.0.0']) f.git('tag', tag);
  f.commit(); f.git('tag', 'v1.2.0'); f.line();
  const r = f.run('v1.2.0', 'tag'); ok(r, 'v1.2.0', false);
  assert.equal(creates(r)[0].at(-1), 'v0.10.0');
});
test('first stable release needs no notes start tag', t => {
  const f = fixture(t); f.git('tag', 'v1.2.0'); f.line(); const r = f.run('v1.2.0', 'tag');
  ok(r, 'v1.2.0', false); assert.ok(!creates(r)[0].includes('--notes-start-tag'));
});
test('stable notes prefer the same line over a higher tag on another line', t => {
  const f = fixture(t); f.git('tag', 'v1.2.0'); f.git('tag', 'v1.3.0'); f.commit(); f.git('tag', 'v1.2.1'); f.line();
  const r = f.run('v1.2.1', 'tag'); ok(r, 'v1.2.1', false); assert.equal(creates(r)[0].at(-1), 'v1.2.0');
});
for (const mode of ['missing', 'different-line', 'diverged', 'mismatched-sha']) {
  test(`stable validation rejects ${mode} before GitHub calls`, t => {
    const f = fixture(t); const root = f.git('rev-parse', 'HEAD'); f.commit(); f.git('tag', 'v1.2.0');
    if (mode === 'different-line') f.line('1.3');
    if (mode === 'diverged') f.git('update-ref', 'refs/remotes/origin/release/1.2', root);
    if (mode === 'mismatched-sha') f.line();
    const r = f.run('v1.2.0', 'tag', mode === 'mismatched-sha' ? { SHA: root } : {});
    assert.notEqual(r.status, 0); assert.equal(r.output, ''); assert.deepEqual(r.calls, []);
  });
}
test('missing prerelease on an existing annotated RC tag is repaired', t => {
  const f = fixture(t); f.git('tag', '-a', 'v1.2.0-rc.3', '-m', 'Candidate');
  const r = f.run(); ok(r, 'v1.2.0-rc.3', true); assert.equal(creates(r).length, 1);
});
test('service errors fail without attempting a release mutation', t => {
  const f = fixture(t); const r = f.run('release/1.2', 'branch', { API_FAILURE: 'true' });
  assert.notEqual(r.status, 0); assert.equal(r.output, ''); assert.deepEqual(creates(r), []);
});
test('invalid refs, events and implementation pins are rejected', () => {
  const base = { EVENT: 'push', REF_TYPE: 'branch', REF_NAME: 'release/1.2', WORKFLOW_SHA: 'a'.repeat(40) };
  for (const extra of [{ REF_NAME: 'release/next' }, { REF_NAME: 'release/01.2' }, { REF_NAME: 'release/1.2.3' },
    { REF_TYPE: 'tag', REF_NAME: 'v1.2.3-rc.1' }, { REF_TYPE: 'tag', REF_NAME: 'v1.2' },
    { EVENT: 'workflow_dispatch' }, { WORKFLOW_SHA: 'main' }]) assert.throws(() => validate({ ...base, ...extra }));
  validate(base); validate({ ...base, REF_TYPE: 'tag', REF_NAME: 'v1.2.3' });
});
