# MVP Menu

Food and drink menu data for the MVP Sports Bar app. The app downloads these files when it opens, so menu changes go live without releasing a new app version.

## Updating the menu

**Easiest way:** give Claude the new menu PDF (or a photo) in a session with this repo and say "update the menu." Claude will:

1. Update the file to match.
2. Show you a plain-English list of what changed (new items, removed items, price changes).
3. Submit the change for your review as a pull request.

You then open the pull request link, check it over, and click **Merge pull request**. The app shows the new menu within a few minutes.

**By hand:** open `menu.json` (food) or `drinks.json` (drinks) on GitHub, click the pencil icon, make your change, and choose "Create a new branch and start a pull request." An automatic check will tell you in plain English if anything is wrong, such as a missing price or a typo in the file.

## Remember

The POS (SkyTab) is the source of truth. Every seasonal change should update all four places: the POS, the menu PDF, the website, and this repo.

## Files

- `menu.json`: food menu
- `drinks.json`: drink list
- `CLAUDE.md`: rules and file format details
