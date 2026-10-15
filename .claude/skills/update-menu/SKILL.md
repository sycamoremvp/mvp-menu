---
name: update-menu
description: Update menu.json, seasonal.json, drinks.json, or hours.json from a menu PDF, photo, screenshot, or written instructions (for example, a seasonal menu change or a price update). Use whenever Chris hands over a menu file or asks to change menu items, prices, or drinks.
---

# Update the menu

Follow these steps in order. Chris is not a programmer, so every question and summary must be in plain English.

## 1. Confirm what's being updated

- Which file: regular food (`menu.json`), seasonal features (`seasonal.json`), drinks (`drinks.json`), hours (`hours.json`), or more than one?
- Is this a full replacement (a new seasonal menu) or a small change (a few prices)?
- What should `menuName` be (for example "Spring & Summer 2027")? Ask if the PDF doesn't say.

If any of these is obvious from Chris's message, don't ask again.

## 2. Read the source carefully

- For drinks, the source may be the Sippo page (https://app.sippo.io/m/8xPbVv). Its page text contains every drink; read it directly rather than from screenshots.

- Read every page of the PDF or image. Capture section titles, subtitles, notes, item names, descriptions, prices, sizes, and add-ons.
- Keep the restaurant's wording and punctuation as printed. Don't "fix" style.
- Do fix obvious spelling mistakes (Chris approved this), and list every fix for Chris.
- **Never guess.** If a price or word is unreadable, cut off, or ambiguous, list it and ask Chris.
- Customer notices like the raw-food advisory or the large-group gratuity go in `footnotes`. Other things that aren't menu items (logos, QR codes, social links, loyalty promos) don't go in the file. Mention anything you skipped.

## 3. Make the change

- Start a new branch from the latest `main`, named like `menu-spring-2027` or `menu-price-update-2027-03`.
- Edit the file to match the source exactly, following the format in CLAUDE.md.
- Keep existing section `id`s for sections that still exist, even if their title changes. New sections get new ids.
- A new seasonal features menu replaces `seasonal.json` entirely: set its `menuName` (like "Spring / Summer Features"), one section per heading on the PDF. Use `"new": true` for items marked NEW.
- Write item names in Title Case even if the PDF prints them in all caps. Keep descriptions as printed.
- Set `updated` to today's date.
- Run `node scripts/validate.mjs` and fix anything it reports.

## 4. Show Chris what changed, in plain English

Compare the old file to the new one and list:

- **New items** (with price)
- **Removed items**
- **Price changes** (old → new)
- **Renamed items or wording changes**
- **New or removed sections**
- **Anything you weren't sure about** (always last, always called out)

Remind Chris that the POS is the source of truth, and ask him to confirm the prices match SkyTab.

## 5. Submit for review

- Commit and push the branch, then open a pull request with the plain-English change list as its description.
- Tell Chris how to approve: open the link, check "Files changed," then click **Merge pull request** once the automatic check shows a green checkmark.
- The app shows the new menu within a few minutes of merging.
