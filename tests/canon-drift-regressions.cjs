const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const milestones = fs.readFileSync(path.join(root, 'relationship-milestones.js'), 'utf8');
const build = fs.readFileSync(path.join(root, 'build-version.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('canon authority prevents assistant hallucinations from becoming canon', () => {
  assert.match(app, /Assistant-authored prose is NOT self-verifying canon/);
  assert.match(app, /MAJOR EVENT EVIDENCE:/);
  assert.match(app, /ROLE LABELS ARE NOT PRONOUNS/);
  assert.match(app, /Do not invent expertise from isolated behavior/);
});

test('final continuity guard re-anchors persona appearance and major events', () => {
  assert.match(app, /function continuityGuardPrompt\(\)/);
  assert.match(app, /Highest-priority protagonist appearance/);
  assert.match(app, /Do not state that sex, orgasm, a bite\/mark, mate bond/);
  assert.match(app, /third-person self-titling/);
  assert.match(app, /ACTIVE PERSONA IS LOCKED CANON/);
  assert.match(app, /Never substitute a different skin tone\/complexion/);
  assert.match(app, /NO REPETITION:/);
  assert.match(app, /X is listening\. X is waiting\. X is yours/);
  assert.match(app, /content:continuityGuardPrompt\(\)/);
});

test('milestone scanner rejects assistant-only permanent-event inventions', () => {
  assert.match(milestones, /CHARACTER\/assistant narration is not self-verifying evidence/);
  assert.match(milestones, /do NOT archive it as a completed milestone/);
  assert.match(milestones, /Possessive language and labels/);
  assert.match(milestones, /const VERSION = '1\.3\.5'/);
});

test('build and cache bust are 0.17.4', () => {
  assert.match(build, /CURRENT_BUILD = "0\.17\.4"/);
  assert.match(build, /relationship-milestones\.js\?v=1\.3\.5/);
  assert.match(index, /app\.js\?v=0\.17\.4/);
  assert.doesNotMatch(index, /v=0\.17\.3/);
});
