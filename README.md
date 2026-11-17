# Recipe Box

A small recipe site: browse recipes, search by name or ingredient, and open one to cook from it.

No build step. Open `index.html`, or serve the folder:

```sh
npx serve .
```

Recipes live in `recipes.json`.

Tap the heart on a recipe to save it as a favourite; the **Favourites** button next to the search shows only those. Favourites are kept in the browser's `localStorage`, so they stay on that device and browser.
