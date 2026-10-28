const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} = require('node:fs');
const path = require('node:path');
const {tmpdir} = require('node:os');

function candidate(t, tags, branch='release/0.3') {
  const dir=mkdtempSync(path.join(tmpdir(),'candidate-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(path.join(dir,'bin'));
  writeFileSync(path.join(dir,'bin/gh'),`#!/bin/sh
set -eu
case "$1" in
api)
  [ "$2" = "repos/fixture/repo/git/matching-refs/tags/v0.3." ] || exit 98
  [ "$3" = --paginate ] && [ "$4" = --jq ] || exit 97
  printf '%s' "$TAGS";;
release) printf '%s|' "$@" >> "$GH_LOG";;
*) exit 99;;
esac
`,{mode:0o755});
  const output=path.join(dir,'output'), log=path.join(dir,'log');
  writeFileSync(output,'');writeFileSync(log,'');
  const r=spawnSync('bash',[path.join(__dirname,'candidate.sh')],{encoding:'utf8',env:{...process.env,
    PATH:`${dir}/bin:${process.env.PATH}`,GITHUB_OUTPUT:output,GH_LOG:log,GH_REPO:'fixture/repo',BRANCH:branch,SHA:'c0ffee',TAGS:tags}});
  return {...r,output:readFileSync(output,'utf8'),created:readFileSync(log,'utf8')};
}

test('candidate selection uses the next patch and numeric candidate sequence', t=>{
  for(const [tags,tag] of [
    ['', 'v0.3.0-rc.1'],
    ['v0.2.1 aaa\nv0.30.0 bbb\nv0.3.0-rc.x ccc\nv0.3.0-beta ddd\n','v0.3.0-rc.1'],
    ['v0.3.0-rc.1 aaa\nv0.3.0-rc.2 bbb\n','v0.3.0-rc.3'],
    ['v0.3.0-rc.2 aaa\nv0.3.0-rc.10 bbb\n','v0.3.0-rc.11'],
    ['v0.3.0 aaa\nv0.3.1 bbb\nv0.3.2-rc.1 ccc\n','v0.3.2-rc.2'],
    ['v0.3.0-rc.1 aaa\nv0.3.0 bbb\n','v0.3.1-rc.1'],
  ]) {
    const r=candidate(t,tags);assert.equal(r.status,0,r.stderr);
    assert.equal(r.output,`tag_name=${tag}\n`);
    assert.equal(r.created,`release|create|${tag}|--prerelease|--target|c0ffee|--title|${tag}|--notes|Release candidate ${tag} from release/0.3 at c0ffee.|`);
  }
});
test('reruns reuse a candidate even after a later stable release',t=>{
  for(const tags of ['v0.3.0-rc.2 c0ffee\nv0.3.0-rc.3 bbb\n','v0.3.0-rc.2 c0ffee\nv0.3.0 bbb\n']) {
    const r=candidate(t,tags);assert.equal(r.status,0,r.stderr);assert.equal(r.output,'tag_name=v0.3.0-rc.2\n');assert.equal(r.created,'');
  }
});
test('a stable commit is never retagged as a candidate',t=>{
  const r=candidate(t,'v0.3.0-rc.1 c0ffee\nv0.3.0 c0ffee\n');assert.equal(r.status,0,r.stderr);assert.equal(r.output,'');assert.equal(r.created,'');
});
test('invalid branches fail before any GitHub write',t=>{
  for(const branch of ['main','release/next','release/0.3.1','release/0.3-hotfix','release/00.3']) {
    const r=candidate(t,'',branch);assert.equal(r.status,1);assert.match(r.stdout,/release branches are named release\/X.Y/);assert.equal(r.output,'');assert.equal(r.created,'');
  }
});
