'use strict';
// Deterministic asynchronous UI tests. Executes the actual photo functions with a
// minimal DOM, without browser/network/model access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const photoCode = src.slice(src.indexOf('let photoSel ='), src.indexOf('function photoResultHtml('));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function setup() {
  const elements = {};
  const calls = [];
  const context = vm.createContext({
    STATIC: false, lang: 'en', console,
    $: (s) => elements[s] || (elements[s] = { innerHTML: '', hidden: false, disabled: false }),
    document: { querySelectorAll: () => [] },
    t: (s) => s, esc: String, icon: () => '',
    photoResultHtml: (j) => j.title,
    fetch: (url, options) => { const d = deferred(); calls.push({ url, options, ...d }); return d.promise; },
  });
  vm.runInContext(photoCode, context);
  const run = (code) => vm.runInContext(code, context);
  run("photoSel = { sample: null, photos: [{ data: 'MENU' }] }");
  return { context, elements, calls, run };
}
const answer = (title) => ({ ok: true, json: async () => ({ available: true, title }) });
async function testStaleSuccess() {
  const h = setup();
  const old = h.run('explainPhoto()');
  h.run("photoSamples = [{ id: 'dish', files: ['dish.jpg'], results: { en: {title:'DISH'} } }]; pickSample('dish')");
  h.calls[0].resolve(answer('OLD MENU'));
  await old;
  assert.equal(h.elements['#phout'].innerHTML, 'DISH');
  assert.equal(h.run('photoSel.sample'), 'dish');
}
async function testStaleErrorAndFinally() {
  for (const reject of [true, false]) {
    const h = setup();
    const old = h.run('explainPhoto()');
    h.run("invalidatePhoto(); photoSel = { photos: [{data:'DISH'}] }");
    const newer = h.run('explainPhoto()');
    if (reject) h.calls[0].reject(new Error('old failure'));
    else h.calls[0].resolve({ ok: false, json: async () => ({ error: 'old failure' }) });
    await old;
    assert.equal(h.elements['#phgo'].disabled, true, 'stale finally enabled an active request');
    assert.ok(h.elements['#phout'].innerHTML.includes('spinner'));
    h.calls[1].resolve(answer('NEW DISH'));
    await newer;
    assert.equal(h.elements['#phout'].innerHTML, 'NEW DISH');
    assert.equal(h.elements['#phgo'].disabled, false);
  }
}
async function testSnapshotAndPreflightInvalidation() {
  for (const invalidate of [true, false]) {
    const h = setup();
    const d = deferred(); h.context.readPhoto = () => d.promise;
    h.run("asDataUrl = readPhoto; photoSel = { photos: [{src:'menu.jpg',data:null}] }");
    const pending = h.run('explainPhoto()');
    h.run("photoSel = { photos: [{data:'DISH'}] }; lang = 'ja'");
    if (invalidate) h.run('invalidatePhoto()');
    d.resolve('MENU');
    await new Promise((r) => setImmediate(r));
    if (invalidate) assert.equal(h.calls.length, 0, 'invalidated selection was uploaded');
    else {
      assert.deepEqual(JSON.parse(h.calls[0].options.body), {images:['MENU'],lang:'en'});
      h.calls[0].resolve(answer('MENU'));
    }
    await pending;
  }
}
async function testUploadCompletionRace() {
  const h = setup(); const d = deferred();
  h.context.resizePhoto = () => d.promise;
  h.run('resized = resizePhoto');
  const pending = h.run("onPhoto({target:{files:['file'],value:'file'}})");
  h.run("photoSamples = [{id:'dish',files:['dish.jpg'],results:{en:{title:'DISH'}}}]; pickSample('dish')");
  d.resolve('OLD UPLOAD'); await pending;
  assert.equal(h.run('photoSel.sample'), 'dish');
  assert.equal(h.elements['#phout'].innerHTML, 'DISH');
}
(async () => {
  await testStaleSuccess();
  await testStaleErrorAndFinally();
  await testSnapshotAndPreflightInvalidation();
  await testUploadCompletionRace();
  console.log('photo race tests ok: stale responses, failures, finally, selection snapshots, uploads');
})().catch((e) => { console.error(e); process.exitCode = 1; });
