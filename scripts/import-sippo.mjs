// Rebuilds drinks.json from the public Sippo drink menu.
// Run with: node scripts/import-sippo.mjs
// Prints a plain-English list of changes. Writes drinks.json only if something changed.
// Optional: --summary <file> also writes the change list (Markdown) to that file.
// Uses only built-in Node features so there is nothing to install.

import { readFileSync, writeFileSync } from 'node:fs';

const SIPPO_URL = 'https://app.sippo.io/m/8xPbVv';
const DRINKS_FILE = 'drinks.json';

// Sections that aren't in Sippo and are kept from the current drinks.json as-is.
const KEEP_SECTIONS = ['soft-drinks'];

// Sippo cuts option names off at 30 characters. Approved full names, by cut-off name.
const NAME_FIXES = {
  'Ketel One Botanical Peach & Or': 'Ketel One Botanical Peach & Orange Blossom',
  'Ketel One Botanical Cucumber &': 'Ketel One Botanical Cucumber & Mint',
  'Ketel One Botanical Grapefruit': 'Ketel One Botanical Grapefruit & Rose',
};

// Producer names that just mean "made here" and aren't worth showing.
const HOUSE_PRODUCERS = ['MVP Sports Bar'];

// If an import would remove more than this share of drinks, something is probably
// wrong with the Sippo page rather than the drink list. The sync then stops for review.
const MAX_REMOVED_SHARE = 0.3;

function decode(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();
}

function first(html, pattern) {
  const m = html.match(pattern);
  return m ? decode(m[1]) : undefined;
}

function slug(text) {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function parseSippo(html) {
  const sections = [];
  // Each category starts with a heading; split on category blocks.
  const blocks = html.split(/<div class="category[ "]/).slice(1);
  for (const block of blocks) {
    const title = first(block, /category__heading-title">([\s\S]*?)<\/h3>/);
    if (!title) continue;
    const subtitle = first(block, /category__heading-description">([\s\S]*?)<\/p>/);
    const section = { id: slug(title), title };
    if (subtitle && subtitle !== title) section.subtitle = subtitle;
    section.items = [];

    for (const raw of block.split(/<div class="menu-item searchable/).slice(1)) {
      const field = (cls) => first(raw, new RegExp(`class="menu-item__${cls}">([\\s\\S]*?)</(?:span|h4)>`));
      const name = field('name');
      if (!name) continue;
      const item = { name };

      const producer = field('producer');
      const details = [
        producer && producer !== name && !HOUSE_PRODUCERS.includes(producer) ? producer : undefined,
        field('style'),
        field('abv'),
      ].filter(Boolean);
      if (details.length) item.details = details.join(' · ');

      const description = field('description');
      if (description) item.description = description;

      // Drinks show no prices, so only the option names are kept.
      const options = [...raw.matchAll(/option-size">([\s\S]*?)<\/span>/g)]
        .map((m) => decode(m[1]))
        .filter(Boolean)
        .map((o) => NAME_FIXES[o] ?? o);
      if (options.length) item.options = options;

      section.items.push(item);
    }
    if (section.items.length) sections.push(section);
  }
  return sections;
}

// Plain-English list of what changed, section by section.
export function describeChanges(oldSections, newSections) {
  const lines = [];
  const byId = (list) => new Map(list.map((s) => [s.id, s]));
  const oldMap = byId(oldSections);
  const newMap = byId(newSections);
  const itemKey = (i) => JSON.stringify(i);

  for (const s of newSections) {
    if (!oldMap.has(s.id)) lines.push(`- New section **${s.title}** (${s.items.length} drinks)`);
  }
  for (const s of oldSections) {
    if (!newMap.has(s.id)) lines.push(`- Removed section **${s.title}** (${s.items.length} drinks)`);
  }
  for (const s of newSections) {
    const before = oldMap.get(s.id);
    if (!before) continue;
    const oldItems = new Map(before.items.map((i) => [i.name, i]));
    const newItems = new Map(s.items.map((i) => [i.name, i]));
    const added = s.items.filter((i) => !oldItems.has(i.name)).map((i) => i.name);
    const removed = before.items.filter((i) => !newItems.has(i.name)).map((i) => i.name);
    const edited = s.items
      .filter((i) => oldItems.has(i.name) && itemKey(oldItems.get(i.name)) !== itemKey(i))
      .map((i) => i.name);
    if (added.length) lines.push(`- **${s.title}**: added ${added.join(', ')}`);
    if (removed.length) lines.push(`- **${s.title}**: removed ${removed.join(', ')}`);
    if (edited.length) lines.push(`- **${s.title}**: updated details for ${edited.join(', ')}`);
    const oldOrder = before.items.map((i) => i.name).filter((n) => newItems.has(n)).join('|');
    const newOrder = s.items.map((i) => i.name).filter((n) => oldItems.has(n)).join('|');
    if (oldOrder !== newOrder) lines.push(`- **${s.title}**: drinks reordered`);
    if (before.title !== s.title || before.subtitle !== s.subtitle) lines.push(`- **${s.title}**: section heading changed`);
  }
  const oldIds = oldSections.map((s) => s.id).filter((id) => newMap.has(id)).join('|');
  const newIds = newSections.map((s) => s.id).filter((id) => oldMap.has(id)).join('|');
  if (oldIds !== newIds) lines.push('- Sections reordered');
  return lines;
}

function countItems(sections) {
  return sections.reduce((n, s) => n + s.items.length, 0);
}

async function main() {
  const summaryIndex = process.argv.indexOf('--summary');
  const summaryFile = summaryIndex > -1 ? process.argv[summaryIndex + 1] : undefined;

  const response = await fetch(SIPPO_URL);
  if (!response.ok) throw new Error(`Couldn't load the Sippo page (status ${response.status}).`);
  const sippoSections = parseSippo(await response.text());
  if (sippoSections.length === 0) throw new Error('The Sippo page loaded but no drinks were found. Its layout may have changed.');

  const current = JSON.parse(readFileSync(DRINKS_FILE, 'utf8'));
  const kept = current.sections.filter((s) => KEEP_SECTIONS.includes(s.id));
  const sections = [...sippoSections, ...kept];

  const changes = describeChanges(current.sections, sections);
  if (changes.length === 0) {
    console.log('No changes. drinks.json already matches Sippo.');
    return;
  }

  const before = countItems(current.sections);
  const removedCount = current.sections
    .flatMap((s) => s.items.map((i) => `${s.id}/${i.name}`))
    .filter((k) => !sections.some((s) => s.items.some((i) => `${s.id}/${i.name}` === k))).length;
  const needsReview = before > 0 && removedCount / before > MAX_REMOVED_SHARE;

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const updated = { ...current, updated: today, sections };
  writeFileSync(DRINKS_FILE, JSON.stringify(updated, null, 2) + '\n');

  const summary = [
    `Drinks updated from Sippo (${countItems(sections)} drinks, was ${before}).`,
    '',
    ...changes,
    ...(needsReview
      ? ['', `**Needs review:** this would remove ${removedCount} of ${before} drinks, which is unusual. Please check Sippo before merging.`]
      : []),
  ].join('\n');
  console.log(summary);
  if (summaryFile) writeFileSync(summaryFile, summary + '\n');
  if (needsReview) process.exitCode = 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
