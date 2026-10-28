const { execFileSync } = require('node:child_process');
const { appendFileSync } = require('node:fs');

const numeric = '(0|[1-9][0-9]*)';
const stablePattern = new RegExp(`^v${numeric}\\.${numeric}\\.${numeric}$`);
const candidatePattern = new RegExp(`^v${numeric}\\.${numeric}\\.${numeric}-rc\\.${numeric}$`);
const branchPattern = new RegExp(`^release/${numeric}\\.${numeric}$`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const numbers = tag => tag.match(/\d+/g).map(BigInt);
function compare(a, b) {
  const aa = numbers(a), bb = numbers(b);
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  }
  return 0;
}
function validate(env) {
  if (env.EVENT !== 'push') throw new Error('release workflow requires a push event');
  if (env.REF_TYPE === 'branch') {
    if (!branchPattern.test(env.REF_NAME)) throw new Error('release branches are named release/X.Y');
  } else if (env.REF_TYPE !== 'tag' || !stablePattern.test(env.REF_NAME)) {
    throw new Error('stable tags are named vX.Y.Z');
  }
  if (!/^[0-9a-f]{40}$/.test(env.WORKFLOW_SHA)) throw new Error('workflow-sha must be an immutable commit');
}
function run(env) {
  validate(env);
  if (env.VALIDATE_ONLY === 'true') return;
  const sha = git('rev-parse', `${env.SHA}^{commit}`);
  const tags = git('tag', '--list').split('\n').filter(Boolean);
  const stable = tags.filter(t => stablePattern.test(t)).sort(compare);
  let tag, isRc, previous;
  if (env.REF_TYPE === 'tag') {
    tag = env.REF_NAME;
    const [major, minor] = numbers(tag);
    const line = `${major}.${minor}`;
    if (git('rev-parse', `refs/tags/${tag}^{commit}`) !== sha) throw new Error('stable tag does not point at the pushed commit');
    try {
      git('merge-base', '--is-ancestor', sha, `refs/remotes/origin/release/${line}`);
    } catch {
      throw new Error(`stable tag must belong to release/${line}`);
    }
    const preceding = stable.filter(t => compare(t, tag) < 0);
    previous = preceding.filter(t => t.startsWith(`v${line}.`)).at(-1) || preceding.at(-1);
    isRc = false;
  } else {
    const line = env.REF_NAME.slice('release/'.length);
    const lineStable = stable.filter(t => t.startsWith(`v${line}.`));
    // Peel annotated tags before comparing commits. Stable commits never become candidates.
    if (lineStable.some(t => git('rev-parse', `refs/tags/${t}^{commit}`) === sha)) {
      appendFileSync(env.GITHUB_OUTPUT, 'tag=\nversion=\nis_rc=false\n');
      return;
    }
    const candidates = tags.filter(t => candidatePattern.test(t) && t.startsWith(`v${line}.`)).sort(compare);
    tag = candidates.find(t => git('rev-parse', `refs/tags/${t}^{commit}`) === sha);
    if (!tag) {
      const patch = lineStable.length ? numbers(lineStable.at(-1))[2] + 1n : 0n;
      const prefix = `v${line}.${patch}-rc.`;
      const sameVersion = candidates.filter(t => t.startsWith(prefix));
      const next = sameVersion.length ? numbers(sameVersion.at(-1))[3] + 1n : 1n;
      tag = `${prefix}${next}`;
    }
    isRc = true;
  }
  // Only a 404 means absent: authentication and service failures must not create releases.
  let exists;
  try {
    const response = gh('api', '--include', `repos/${env.GH_REPO}/releases/tags/${tag}`);
    if (!/^HTTP\/\S+ 200\b/m.test(response)) throw new Error('unexpected release lookup response');
    exists = true;
  } catch (error) {
    if (!/^HTTP\/\S+ 404\b/m.test(String(error.stdout))) throw error;
    exists = false;
  }
  if (!exists) {
    const args = ['release', 'create', tag, '--title', tag];
    if (isRc) {
      args.push('--prerelease', '--target', sha, '--notes', `Release candidate ${tag} from ${env.REF_NAME} at ${sha}.`);
    } else {
      args.push('--verify-tag', '--generate-notes');
      if (previous) args.push('--notes-start-tag', previous);
    }
    gh(...args);
  }
  appendFileSync(env.GITHUB_OUTPUT, `tag=${tag}\nversion=${tag.slice(1)}\nis_rc=${isRc}\n`);
}

module.exports = { validate, compare };
if (require.main === module) {
  try { run(process.env); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
