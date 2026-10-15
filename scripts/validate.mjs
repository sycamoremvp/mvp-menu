// Checks menu.json, seasonal.json, drinks.json, and hours.json for mistakes before they reach the app.
// Run with: node scripts/validate.mjs
// Uses only built-in Node features so there is nothing to install.

import { readFileSync } from 'node:fs';

const MENU_FILES = [
  { path: 'menu.json', allowEmpty: false, priceRequired: true },
  // Seasonal may be empty between seasonal menus.
  { path: 'seasonal.json', allowEmpty: true, priceRequired: true },
  // Drinks are display only, and most drinks don't list a price.
  { path: 'drinks.json', allowEmpty: false, priceRequired: false },
];
const HOURS_FILE = 'hours.json';

const SCHEMA_VERSION = 1;
const MAX_PRICE = 500;

const FILE_FIELDS = ['schemaVersion', 'menuName', 'updated', 'sections', 'footnotes'];
const SECTION_FIELDS = ['id', 'title', 'shortTitle', 'subtitle', 'note', 'items'];
const ITEM_FIELDS = ['group', 'name', 'price', 'sizes', 'options', 'description', 'details', 'featured', 'new', 'addOns'];
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

function checkItem(item, where, errors, priceRequired) {
  if (typeof item !== 'object' || item === null) {
    errors.push(`${where}: each item must have at least a name and a price.`);
    return;
  }
  const at = `${where} > ${item.name ?? '(item with no name)'}`;
  checkFields(item, ITEM_FIELDS, at, errors);
  checkText(item.name, at, 'name', errors, { required: true });
  checkText(item.description, at, 'description', errors, { required: false });
  checkText(item.details, at, 'details', errors, { required: false });
  checkText(item.group, at, 'group', errors, { required: false });

  const hasPrice = item.price !== undefined;
  const hasSizes = item.sizes !== undefined;
  if (hasPrice && hasSizes) {
    errors.push(`${at}: has both "price" and "sizes". Use one or the other.`);
  } else if (!hasPrice && !hasSizes) {
    if (priceRequired) errors.push(`${at}: needs a "price" (or "sizes" if it comes in more than one size).`);
  } else if (hasPrice) {
    checkPrice(item.price, at, errors);
  } else {
    checkOptions(item.sizes, at, 'sizes', errors);
  }

  for (const flag of ['featured', 'new']) {
    if (item[flag] !== undefined && typeof item[flag] !== 'boolean') {
      errors.push(`${at}: "${flag}" must be true or false (no quotes).`);
    }
  }
  if (item.addOns !== undefined) checkOptions(item.addOns, at, 'addOns', errors);
  if (item.options !== undefined) {
    if (!Array.isArray(item.options) || item.options.length === 0) {
      errors.push(`${at}: "options" must be a list of text, like ["Peach", "Lemon"].`);
    } else {
      item.options.forEach((o, i) => checkText(o, at, `options #${i + 1}`, errors, { required: true }));
    }
  }
}

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    errors.push(`${path}: the file can't be read. Usually this is a missing comma, quote, or bracket. Details: ${err.message}`);
    return null;
  }
}

function checkCommon(data, path, errors) {
  if (data.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`${path}: "schemaVersion" must be ${SCHEMA_VERSION}. Changing it requires an app update first.`);
  }
  if (typeof data.updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) {
    errors.push(`${path}: "updated" must be a date like 2026-10-15.`);
  }
}

function checkMenuFile({ path, allowEmpty, priceRequired }) {
  const errors = [];
  const data = readJson(path, errors);
  if (!data) return errors;

  checkFields(data, FILE_FIELDS, path, errors);
  checkCommon(data, path, errors);
  checkText(data.menuName, path, 'menuName', errors, { required: true });
  if (data.footnotes !== undefined) {
    if (!Array.isArray(data.footnotes)) {
      errors.push(`${path}: "footnotes" must be a list of text.`);
    } else {
      data.footnotes.forEach((f, i) => checkText(f, path, `footnotes #${i + 1}`, errors, { required: true }));
    }
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
      checkItem(item, at, errors, priceRequired);
      const key = typeof item?.name === 'string' ? item.name.trim().toLowerCase() : null;
      if (key && seenNames.has(key)) errors.push(`${at}: "${item.name}" appears more than once.`);
      if (key) seenNames.add(key);
    });
  });

  return errors;
}

const HOURS_FIELDS = ['schemaVersion', 'seasonName', 'updated', 'timeZone', 'areas'];
const AREA_FIELDS = ['id', 'name', 'season', 'note', 'hours'];
const SLOT_FIELDS = ['days', 'open', 'close', 'label'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function checkTime(value, where, field, errors) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    errors.push(`${where}: "${field}" must be a 24-hour time like "11:00" or "21:30" (midnight is "00:00").`);
  }
}

function checkHoursFile(path) {
  const errors = [];
  const data = readJson(path, errors);
  if (!data) return errors;

  checkFields(data, HOURS_FIELDS, path, errors);
  checkCommon(data, path, errors);
  checkText(data.seasonName, path, 'seasonName', errors, { required: true });
  if (data.timeZone !== 'America/Chicago') {
    errors.push(`${path}: "timeZone" must be "America/Chicago".`);
  }
  if (!Array.isArray(data.areas) || data.areas.length === 0) {
    errors.push(`${path}: "areas" must be a list with at least one area (like the Sports Bar).`);
    return errors;
  }

  const seenIds = new Set();
  data.areas.forEach((area, i) => {
    if (typeof area !== 'object' || area === null) {
      errors.push(`${path} > area #${i + 1}: must have an id, a name, and hours.`);
      return;
    }
    const at = `${path} > ${area.name ?? `area #${i + 1}`}`;
    checkFields(area, AREA_FIELDS, at, errors);
    checkText(area.name, at, 'name', errors, { required: true });
    checkText(area.note, at, 'note', errors, { required: false });
    if (area.season !== undefined) {
      const { start, end, ...extra } = area.season ?? {};
      const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
      if (Object.keys(extra).length > 0 || !isDate(start) || !isDate(end)) {
        errors.push(`${at}: "season" must be like { "start": "2026-05-25", "end": "2026-10-31" }.`);
      } else if (start > end) {
        errors.push(`${at}: season starts (${start}) after it ends (${end}).`);
      }
    }
    if (typeof area.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(area.id)) {
      errors.push(`${at}: "id" must be lowercase letters, numbers, and dashes, like "rooftop".`);
    } else if (seenIds.has(area.id)) {
      errors.push(`${at}: id "${area.id}" is used by more than one area.`);
    } else {
      seenIds.add(area.id);
    }

    if (!Array.isArray(area.hours)) {
      errors.push(`${at}: "hours" must be a list (it can be empty if the area is closed, with a "note" saying why).`);
      return;
    }
    if (area.hours.length === 0 && area.note === undefined) {
      errors.push(`${at}: has no hours. If it's closed for the season, add a "note" like "Closed for the season".`);
    }
    const seenDays = new Set();
    area.hours.forEach((slot, j) => {
      const sat = `${at} > hours #${j + 1}`;
      if (typeof slot !== 'object' || slot === null) {
        errors.push(`${sat}: must list days and an opening time or label.`);
        return;
      }
      checkFields(slot, SLOT_FIELDS, sat, errors);
      if (!Array.isArray(slot.days) || slot.days.length === 0) {
        errors.push(`${sat}: "days" must be a list like ["mon", "tue"].`);
      } else {
        for (const d of slot.days) {
          if (!DAYS.includes(d)) {
            errors.push(`${sat}: "${d}" isn't a day. Use: ${DAYS.join(', ')}.`);
          } else if (seenDays.has(d)) {
            errors.push(`${sat}: "${d}" is listed more than once for ${area.name}.`);
          } else {
            seenDays.add(d);
          }
        }
      }
      if (slot.open === undefined && slot.label === undefined) {
        errors.push(`${sat}: needs an "open" time or a "label" (like "Open all day").`);
      }
      if (slot.open !== undefined) checkTime(slot.open, sat, 'open', errors);
      if (slot.close !== undefined) {
        checkTime(slot.close, sat, 'close', errors);
        if (slot.open === undefined) errors.push(`${sat}: has a "close" time but no "open" time.`);
      }
      checkText(slot.label, sat, 'label', errors, { required: false });
    });
  });

  return errors;
}

function report(path, errors) {
  if (errors.length === 0) {
    console.log(`OK   ${path}`);
    return true;
  }
  console.log(`FAIL ${path} (${errors.length} problem${errors.length === 1 ? '' : 's'})`);
  for (const e of errors) console.log(`  - ${e}`);
  return false;
}

let failed = false;
for (const file of MENU_FILES) {
  if (!report(file.path, checkMenuFile(file))) failed = true;
}
if (!report(HOURS_FILE, checkHoursFile(HOURS_FILE))) failed = true;
process.exit(failed ? 1 : 0);
