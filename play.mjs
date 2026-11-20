// Google Play top charts (US). Prints JSON to stdout; each chart fails on its own.
import gplay from "google-play-scraper";

const out = {};
for (const [key, col] of [["free", gplay.collection.TOP_FREE], ["grossing", gplay.collection.GROSSING]]) {
  try {
    const apps = await gplay.list({ collection: col, category: gplay.category.APPLICATION, num: 25, country: "us" });
    out[key] = apps.map(a => ({ name: a.title, dev: a.developer, icon: a.icon, url: a.url }));
  } catch (e) {
    console.error("play", key, "failed:", e.message);
  }
}
console.log(JSON.stringify(out));
