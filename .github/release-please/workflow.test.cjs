const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {readFileSync,writeFileSync,mkdtempSync,rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const workflow=readFileSync(path.join(__dirname,'../workflows/release-branch.yml'),'utf8');
function script(step) {
  const section=step==='metadata' ? workflow.split('      - id: metadata\n')[1] : workflow.split('    steps:\n')[1].split('      - uses:')[0];
  return section.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
}
test('shared workflow rejects invalid branches before minting an App token',()=>{
  assert.ok(workflow.indexOf('Validate branch') < workflow.indexOf('- id: app'));
  for(const [branch,event,sha,success] of [
    ['release/0.3','push','a'.repeat(40),true],
    ['release/next','push','a'.repeat(40),false],
    ['main','push','a'.repeat(40),false],
    ['release/0.3','pull_request','a'.repeat(40),false],
    ['release/0.3','push','main',false],
  ]) {
    const r=spawnSync('bash',['-e','-c',script('validate')],{encoding:'utf8',env:{...process.env,BRANCH:branch,EVENT:event,WORKFLOW_SHA:sha}});
    assert.equal(r.status===0,success,r.stdout+r.stderr);
  }
});
test('metadata exposes stable, candidate and no-build results',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'release-metadata-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const output=path.join(dir,'output');
  for(const [release,rc,want] of [
    ['v0.3.0','','tag=v0.3.0\nversion=0.3.0\nis_rc=false\n'],
    ['','v0.3.1-rc.2','tag=v0.3.1-rc.2\nversion=0.3.1-rc.2\nis_rc=true\n'],
    ['','','tag=\nversion=\nis_rc=false\n'],
  ]) {
    writeFileSync(output,'');
    const r=spawnSync('bash',['-e','-c',script('metadata')],{encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:output,RELEASE_TAG:release,RC_TAG:rc}});
    assert.equal(r.status,0,r.stderr);assert.equal(readFileSync(output,'utf8'),want);
  }
});
test('shared workflow uses full caller history, explicit shared source and candidate gate',()=>{
  assert.match(workflow,/ref: \$\{\{ github.sha \}\}\n          fetch-depth: 0/);
  assert.match(workflow,/repository: tilr-dev\/\.github\n          ref: \$\{\{ inputs.workflow-sha \}\}/);
  assert.match(workflow,/working-directory: caller/);
  assert.match(workflow,/PACKAGE_PATH: \$\{\{ inputs.package-path \}\}/);
  assert.match(workflow,/if: steps.release.outputs.release_created != 'true'/);
  assert.match(workflow,/run: bash ..\/shared\/\.github\/release-please\/candidate.sh/);
  assert.match(workflow,/run: node ..\/shared\/\.github\/release-please\/run.cjs/);
});
