// Checks menu.json and drinks.json for mistakes before they reach the app.
// Run with: node scripts/validate.mjs
// Uses only built-in Node features so there is nothing to install.

import { readFileSync } from 'node:fs';

const FILES = [
  { path: 'menu.json', allowEmpty: false },
  // Drinks may be empty until the first drink list is added.
  { path: 'drinks.json', allowEmpty: true },
];

const SCHEMA_VERSION = 1;
const MAX_PRICE = 500;

const FILE_FIELDS = ['schemaVersion', 'menuName', 'updated', 'sections'];
const SECTION_FIELDS = ['id', 'title', 'shortTitle', 'subtitle', 'note', 'items'];
const ITEM_FIELDS = ['name', 'price', 'sizes', 'description', 'details', 'featured', 'addOns'];
const OPTION_FIELDS = ['name', 'price'];

function checkFields(obj, allowed, where, errors) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      errors.push(`${where}: unknown field "${key}" (allowed: ${allowed.join(', ')}). Check for a typo.`);
    }
  }
}

function checkText(value, where, field, errors, { required }) {
  if (value === undefined) {
    if (required) errors.push(`${where}: "${field}" is missing.`);
    return;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${where}: "${field}" must be text and can't be blank.`);
  }
}

function checkPrice(value, where, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${where}: price must be a plain number like 12 or 12.50 (no $ sign, no quotes).`);
    return;
  }
  if (value < 0 || value > MAX_PRICE) {
    errors.push(`${where}: price ${value} looks wrong (expected between 0 and ${MAX_PRICE}).`);
  }
  if (Math.round(value * 100) !== value * 100) {
    errors.push(`${where}: price ${value} has more than 2 decimal places.`);
  }
}

function checkOptions(list, where, field, errors) {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${where}: "${field}" must be a list with at least one entry.`);
    return;
  }
  list.forEach((opt, i) => {
    const at = `${where} > ${field} #${i + 1}`;
    if (typeof opt !== 'object' || opt === null) {
      errors.push(`${at}: must have a name and a price.`);
      return;
    }
    checkFields(opt, OPTION_FIELDS, at, errors);
    checkText(opt.name, at, 'name', errors, { required: true });
    checkPrice(opt.price, `${at} (${opt.name ?? 'no name'})`, errors);
  });
}

function checkItem(item, where, errors) {
  if (typeof item !== 'object' || item === null) {
    errors.push(`${where}: each item must have at least a name and a price.`);
    return;
  }
  const at = `${where} > ${item.name ?? '(item with no name)'}`;
  checkFields(item, ITEM_FIELDS, at, errors);
  checkText(item.name, at, 'name', errors, { required: true });
  checkText(item.description, at, 'description', errors, { required: false });
  checkText(item.details, at, 'details', errors, { required: false });

  const hasPrice = item.price !== undefined;
  const hasSizes = item.sizes !== undefined;
  if (hasPrice && hasSizes) {
    errors.push(`${at}: has both "price" and "sizes". Use one or the other.`);
  } else if (!hasPrice && !hasSizes) {
    errors.push(`${at}: needs a "price" (or "sizes" if it comes in more than one size).`);
  } else if (hasPrice) {
    checkPrice(item.price, at, errors);
  } else {
    checkOptions(item.sizes, at, 'sizes', errors);
  }

  if (item.featured !== undefined && typeof item.featured !== 'boolean') {
    errors.push(`${at}: "featured" must be true or false (no quotes).`);
  }
  if (item.addOns !== undefined) checkOptions(item.addOns, at, 'addOns', errors);
}

function checkFile({ path, allowEmpty }) {
  const errors = [];
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return [`${path}: the file can't be read. Usually this is a missing comma, quote, or bracket. Details: ${err.message}`];
  }

  checkFields(data, FILE_FIELDS, path, errors);
  if (data.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`${path}: "schemaVersion" must be ${SCHEMA_VERSION}. Changing it requires an app update first.`);
  }
  checkText(data.menuName, path, 'menuName', errors, { required: true });
  if (typeof data.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    errors.push(`${path}: "updated" must be a date like 2026-10-15.`);
  }

  if (!Array.isArray(data.sections)) {
    errors.push(`${path}: "sections" must be a list.`);
    return errors;
  }
  if (data.sections.length === 0 && !allowEmpty) {
    errors.push(`${path}: there are no menu sections.`);
  }

  const seenIds = new Set();
  data.sections.forEach((section, i) => {
    if (typeof section !== 'object' || section === null) {
      errors.push(`${path} > section #${i + 1}: must have an id, a title, and items.`);
      return;
    }
    const at = `${path} > ${section.title ?? `section #${i + 1}`}`;
    checkFields(section, SECTION_FIELDS, at, errors);
    checkText(section.title, at, 'title', errors, { required: true });
    checkText(section.shortTitle, at, 'shortTitle', errors, { required: false });
    checkText(section.subtitle, at, 'subtitle', errors, { required: false });
    checkText(section.note, at, 'note', errors, { required: false });

    if (typeof section.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(section.id)) {
      errors.push(`${at}: "id" must be lowercase letters, numbers, and dashes, like "hall-of-fame".`);
    } else if (seenIds.has(section.id)) {
      errors.push(`${at}: id "${section.id}" is used by more than one section.`);
    } else {
      seenIds.add(section.id);
    }

    if (!Array.isArray(section.items) || section.items.length === 0) {
      errors.push(`${at}: has no items.`);
      return;
    }
    const seenNames = new Set();
    section.items.forEach((item) => {
      checkItem(item, at, errors);
      const key = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : null;
      if (key && seenNames.has(key)) errors.push(`${at}: "${item.name}" appears more than once.`);
      if (key) seenNames.add(key);
    });
  });

  return errors;
}

let failed = false;
for (const file of FILES) {
  const errors = checkFile(file);
  if (errors.length === 0) {
    console.log(`OK   ${file.path}`);
  } else {
    failed = true;
    console.log(`FAIL ${file.path} (${errors.length} problem${errors.length === 1 ? '' : 's'})`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}
process.exit(failed ? 1 : 0);
