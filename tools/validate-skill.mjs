// SPDX-License-Identifier: Apache-2.0
/* Validate the skill and the plugin manifests against the Agent Skills rules, so a release never ships
   a skill that an agent or claude.ai would reject. Run: npm run validate:skill */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = join(root, 'skills/isometric-illustrations');
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

/* exactly one SKILL.md inside the skill folder */
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : walk(p)) : [p]; });
const files = walk(skillDir);
const skillMds = files.filter((f) => f.endsWith('/SKILL.md'));
if (skillMds.length !== 1) err(`expected exactly one SKILL.md, found ${skillMds.length}`);

/* frontmatter: a small YAML subset (key: value, one nested map) */
const md = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
const m = /^---\n([\s\S]*?)\n---\n/.exec(md);
if (!m) err('SKILL.md has no frontmatter');
const fm = {};
let nested = null;
for (const line of (m ? m[1] : '').split('\n')) {
  if (/^\s+\S/.test(line) && nested) { const [k, ...v] = line.trim().split(':'); fm[nested][k.trim()] = v.join(':').trim().replace(/^"|"$/g, ''); continue; }
  const i = line.indexOf(':');
  if (i < 0) continue;
  const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
  if (v === '') { fm[k] = {}; nested = k; } else { fm[k] = v; nested = null; }
}
const allowed = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
for (const k of Object.keys(fm)) if (!allowed.has(k)) err(`unexpected frontmatter key: ${k}`);
if (!fm.name) err('missing name');
else {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) err(`name "${fm.name}" must be kebab-case`);
  if (fm.name.length > 64) err('name longer than 64 characters');
  if (fm.name !== 'isometric-illustrations') err('name must match the folder name');
}
if (!fm.description) err('missing description');
else {
  if (fm.description.length > 1024) err(`description is ${fm.description.length} characters (max 1024)`);
  if (/[<>]/.test(fm.description)) err('description cannot contain angle brackets');
}
if (fm.compatibility && fm.compatibility.length > 500) err('compatibility longer than 500 characters');
if (fm.license && !existsSync(join(skillDir, 'LICENSE.txt'))) err('license declared but LICENSE.txt is missing');

/* body: keep it short; every bundled path it mentions must exist */
const body = md.slice(m ? m[0].length : 0);
if (body.split('\n').length > 500) warn('SKILL.md body is over 500 lines');
for (const ref of new Set(body.match(/(?:references|assets|scripts)\/[\w.\-/]+\.\w+/g) || [])) {
  if (!existsSync(join(skillDir, ref))) err(`SKILL.md mentions ${ref}, which does not exist`);
}
for (const extra of ['README.md', 'CHANGELOG.md', 'INSTALL.md']) if (existsSync(join(skillDir, extra))) warn(`${extra} inside the skill folder is not needed by agents`);

/* the bundled engine is the built one */
const dist = join(root, 'dist/iso.js'), copy = join(skillDir, 'assets/iso.js');
if (existsSync(dist) && readFileSync(dist, 'utf8') !== readFileSync(copy, 'utf8')) err('assets/iso.js differs from dist/iso.js (run npm run build)');

/* plugin manifests agree with each other and with package.json */
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
const market = JSON.parse(readFileSync(join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const entry = (market.plugins || []).find((p) => p.name === plugin.name);
if (!entry) err('marketplace.json has no entry named like plugin.json');
for (const [label, v] of [['plugin.json', plugin.version], ['marketplace entry', entry && entry.version], ['SKILL.md metadata', fm.metadata && fm.metadata.version]]) {
  if (v && v !== pkg.version) err(`${label} version ${v} does not match package.json ${pkg.version}`);
}
if (plugin.license !== pkg.license) err('plugin.json license differs from package.json');

for (const w of warnings) console.log('warning: ' + w);
if (errors.length) { for (const e of errors) console.error('error: ' + e); process.exit(1); }
console.log(`skill ok · ${relative(root, skillDir)} · ${files.length} files · description ${fm.description.length} chars`);
