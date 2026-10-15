# MVP Menu

Food and drink menu data for the MVP Sports Bar mobile app (`sycamoremvp/mvp-mobile`).
The app downloads these files when it opens, so menu changes go live without a new app release.

**This repo is public.** Anything committed here can be seen by anyone. Never put passwords, keys, costs, vendor pricing, staff info, or anything non-public here.

## Who we're working with

- **Owner:** Chris. Not a programmer. Approves and merges every change.
- **Collaborator:** Eric Jones. Advisor and assistant. His review is welcome but never required.

## How to communicate

1. Never assume intent. If anything is unclear (a price that's hard to read, an item that might be renamed or might be new), ask.
2. Ask and explain in plain English. No programming vocabulary without an explanation in the same sentence.
3. Be honest about results. If something couldn't be read from a PDF, say so; never guess a price.
4. Writing style: US English, no em dashes.

## Files

- `menu.json`: the food menu.
- `drinks.json`: the drink list (beverages are never sold online; this is display only).
- `scripts/validate.mjs`: the automatic check. Run `node scripts/validate.mjs` before every pull request.
- `.claude/skills/update-menu/`: step-by-step process for updating the menu from a PDF, photo, or written instructions.

## The source of truth

The POS (Shift4 / SkyTab) is the source of truth for items and prices. These files must match it. If a PDF and the POS disagree, flag it to Chris; don't pick one.

## File format (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "menuName": "Fall & Winter 2026",
  "updated": "2026-10-15",
  "sections": [
    {
      "id": "hall-of-fame",              // lowercase-with-dashes, unique, never changes once set
      "title": "MVP Hall of Fame",
      "shortTitle": "Hall of Fame",      // optional, used for the section tabs
      "subtitle": "Our all time customer favorites",  // optional
      "note": "Served with fries",       // optional, shown under the section
      "items": [
        {
          "name": "The Boss",
          "price": 17,                     // plain number, no $ sign or quotes
          "description": "Choice of Protein, Bacon, ...",  // optional
          "details": "IPA · 6.5% ABV",     // optional short line, mainly for drinks
          "featured": true,                // optional, shows a "Fan Favorite" badge
          "addOns": [{ "name": "Guacamole", "price": 3 }]  // optional
        },
        {
          "name": "Domestic Draft",
          "sizes": [{ "name": "Pint", "price": 5 }, { "name": "Pitcher", "price": 14 }]
        }
      ]
    }
  ]
}
```

Each item has either `price` or `sizes`, never both. (Comments above are explanation only; real JSON files can't contain comments.)

## Rules that protect the live app

- Changing the file format can break the app on customers' phones. **Never rename or remove a field, or change `schemaVersion`,** unless the app has already been updated to handle it. Adding a new optional field is only safe if the validator is updated too.
- Never change an existing section `id`. The app may use it to remember a customer's place.
- Always update the `updated` date when content changes.
- The validator must pass before merging.

## How changes are made

- Never commit directly to `main`. Every change goes on a branch and is merged through a pull request.
- Chris approves by merging. Nothing waits on Eric.
- Every menu pull request description must include a plain-English list of changes: items added, items removed, price changes (old → new), and wording changes.
- Once merged, the app picks up the change within a few minutes (GitHub's file servers cache files briefly).
