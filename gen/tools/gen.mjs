// Runs codex exec image generation for every manifest entry missing in gen/raw. Concurrency via CONC env.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
const root = process.env.ROOT;
const { images } = await import(pathToFileURL(root + '/gen/manifest.mjs').href + '?' + Date.now());
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const queue = images.filter(im => (!only || only.includes(im.file)) && !fs.existsSync(rawPath(im)));
const CONC = +(process.env.CONC || 5);
const log = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); fs.appendFileSync(root + '/gen/raw/log.txt', l + '\n'); };
function rawPath(im) { return path.join(root, 'gen/raw', im.file.replace(/\.jpg$/, '.png')); }
function run(im) {
  return new Promise((resolve) => {
    const out = rawPath(im);
    const dir = path.dirname(out);
    fs.mkdirSync(dir, { recursive: true });
    const name = path.basename(out);
    const prompt = `Use your image generation tool to create exactly ONE image (size ${im.size}) and save it in the current working directory as ${name} (copy it from wherever the tool stores it; do not create any other files). Brief: ${im.prompt} When finished reply only with the saved path.`;
    const t0 = Date.now();
    const refs = (im.refs || []).flatMap((r) => ['-i', '"' + path.join(root, r) + '"']);
    const p = spawn('codex', ['exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', '"' + dir + '"', ...refs, '-'], { shell: true, cwd: dir });
    p.stdin.write(prompt); p.stdin.end();
    let tail = '';
    p.stdout.on('data', d => { tail = (tail + d).slice(-600); });
    p.stderr.on('data', d => { tail = (tail + d).slice(-600); });
    p.on('close', (code) => {
      const ok = fs.existsSync(out);
      log(`${ok ? 'OK  ' : 'FAIL'} ${im.file} (${Math.round((Date.now() - t0) / 1000)}s, code ${code})${ok ? '' : ' :: ' + tail.replace(/\s+/g, ' ').slice(-300)}`);
      resolve(ok);
    });
  });
}
log(`queue ${queue.length}, conc ${CONC}`);
let idx = 0;
async function worker() { while (idx < queue.length) { const im = queue[idx++]; let ok = await run(im); if (!ok) { log('retry ' + im.file); await run(im); } } }
await Promise.all(Array.from({ length: CONC }, worker));
log('ALL DONE');
