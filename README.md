# MVP Menu

Food menu, drink list, and hours for the MVP Sports Bar app. The app downloads these files when it opens, so menu changes go live without releasing a new app version.

## Updating the menu

**Easiest way:** give Claude the new menu PDF (or a photo) in a session with this repo and say "update the menu." Claude will:

1. Update the file to match.
2. Show you a plain-English list of what changed (new items, removed items, price changes).
3. Submit the change for your review as a pull request.

You then open the pull request link, check it over, and click **Merge pull request**. The app shows the new menu within a few minutes.

**By hand:** open `menu.json` (food), `seasonal.json` (seasonal features), `drinks.json` (drinks), or `hours.json` (hours) on GitHub, click the pencil icon, make your change, and choose "Create a new branch and start a pull request." An automatic check will tell you in plain English if anything is wrong, such as a missing price or a typo in the file.

## Drinks come from Sippo

Update drinks in Sippo as usual. Every day at 11am Central, the app's drink list is updated from Sippo automatically.

For a late change that can't wait, open this repo on GitHub, go to **Actions**, choose **Sync drinks from Sippo**, and click **Run workflow**. Or ask Claude to "update the drinks from Sippo."

If the sync ever needs your attention (for example, if a lot of drinks would suddenly disappear), GitHub emails you and leaves the change waiting for you to merge.

## Remember

The POS (SkyTab) is the source of truth. Every seasonal change should update all four places: the POS, the menu PDF, the website, and this repo.

## Files

- `menu.json`: regular food menu
- `seasonal.json`: seasonal features menu
- `drinks.json`: drink list
- `hours.json`: opening hours (seasonal)
- `CLAUDE.md`: rules and file format details
