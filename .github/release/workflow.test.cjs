const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { validate } = require('./release.cjs');
const workflow = readFileSync(join(__dirname, '../workflows/release-branch.yml'), 'utf8');
const validation = workflow.split('        run: |\n')[1].split('      - uses:')[0]
  .split('\n').map(line => line.replace(/^          /, '')).join('\n');

test('workflow entry validation agrees with runner and rejects malformed events before checkout', () => {
  const base = { EVENT: 'push', REF_TYPE: 'branch', REF_NAME: 'release/1.2', WORKFLOW_SHA: 'a'.repeat(40) };
  for (const extra of [{}, { REF_TYPE: 'tag', REF_NAME: 'v1.2.3' }, { REF_NAME: 'release/next' },
    { REF_NAME: 'release/01.2' }, { REF_NAME: 'release/1.2.3' }, { REF_NAME: 'release/1.2\n' },
    { REF_TYPE: 'tag', REF_NAME: 'v1.2.3-rc.1' }, { REF_TYPE: 'tag', REF_NAME: 'v01.2.3' },
    { REF_TYPE: 'tag', REF_NAME: 'v1.2' }, { REF_TYPE: 'invalid' }, { EVENT: 'workflow_dispatch' },
    { WORKFLOW_SHA: 'main' }, { REF_NAME: 'release/1.2; touch /tmp/unexpected' }]) {
    const env = { ...base, ...extra };
    let valid = true;
    try { validate(env); } catch { valid = false; }
    const r = spawnSync('bash', ['-euo', 'pipefail', '-c', validation], { env, encoding: 'utf8' });
    assert.equal(r.status === 0, valid, JSON.stringify(extra));
  }
});

test('workflow fetches full caller history and pinned implementation, with minimal bot scope', () => {
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}\n\s+fetch-depth: 0/);
  assert.match(workflow, /repository: tilr-dev\/\.github\n\s+ref: \$\{\{ inputs.workflow-sha \}\}/);
  assert.equal((workflow.match(/persist-credentials: false/g) || []).length, 2);
  assert.match(workflow, /permission-contents: write/);
  assert.doesNotMatch(workflow, /permission-(pull-requests|issues)|release_created|package-path|npm/);
  assert.match(workflow, /run: node ..\/shared\/\.github\/release\/release.cjs/);
  assert.match(workflow, /queue: max/);
  assert.match(workflow, /group: shared-release-\$\{\{ github.repository \}\}\n\s+cancel-in-progress: false/);
  for (const key of ['tag', 'version', 'is_rc']) {
    assert.match(workflow, new RegExp(`value: \\$\\{\\{ jobs.release.outputs.${key} \\}\\}`));
    assert.match(workflow, new RegExp(`${key}: \\$\\{\\{ steps.release.outputs.${key} \\}\\}`));
  }
});

test('queue compatibility filter is restricted to its exact diagnostic and release workflow', () => {
  const config = readFileSync(join(__dirname, '../actionlint.yaml'), 'utf8');
  const entries = config.split('\n').filter(line => /^\s+- '/.test(line));
  assert.equal(entries.length, 1);
  const pattern = new RegExp(entries[0].trim().slice(3, -1));
  assert.ok(pattern.test('unexpected key "queue" for "concurrency" section. expected one of "cancel-in-progress", "group"'));
  for (const message of ['unexpected key "typo" for "concurrency" section. expected one of "cancel-in-progress", "group"',
    'unexpected key "queue" for "steps" section. expected one of "run", "uses"', 'invalid expression']) assert.ok(!pattern.test(message));
  assert.deepEqual(config.split('\n').filter(line => /^  \S.*:$/.test(line)), ['  .github/workflows/release-branch.yml:']);
});
