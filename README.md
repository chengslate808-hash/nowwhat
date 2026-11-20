# nowwhat.today — the world on one page

```
                         ┌── every 30 s ──────────────────────────────────────────────┐
Visitors' pages ── poll ─┤  /api/live  →  worker.js  →  "Live" Durable Object          │
  (every 30 s,           │                               refreshes every 30 s:        │
   only while the        │                               11 news feeds, prediction    │
   tab is visible)       │                               markets, BTC/ETH, and the    │
                         │                               AI headline (on new top story)│
                         └────────────────────────────────────────────────────────────┘
                         ┌── every hour ──────────────────────────────────────────────┐
                    ─────┤  data.json (static)  ←  GitHub Actions: update.py          │
                         │  market map, app charts, Wikipedia + fallback copies       │
                         └────────────────────────────────────────────────────────────┘
Daily: check_health.py → if a source is dead → Claude finds + tests a replacement → pull request for you
```

The page updates content in place. It never reloads, so ads aren't re-requested (AdSense-safe).

## Files
| File | What it does |
|---|---|
| `public/` | The website: `index.html`, `config.js` (ad IDs), `privacy.html`, `ads.txt` |
| `worker.js` | 30-second live layer (Cloudflare Worker + Durable Object) |
| `update.py` | Hourly layer: market map, apps, Wikipedia; fallback copies of live data |
| `play.mjs` | Google Play top charts (called by update.py) |
| `check_health.py` | Decides whether a source has been broken long enough to need fixing |
| `.github/workflows/update.yml` | Hourly: fetch data, deploy site + worker to Cloudflare |
| `.github/workflows/repair.yml` | Daily: issue + repair pull request if a source is dead |
| `wrangler.jsonc` | Cloudflare config |

## Setup (~30 min)
1. **GitHub:** create a *public* repo and upload everything here, including the hidden `.github` folder (Mac: Cmd+Shift+. shows hidden files).
2. **Cloudflare:** sign up and upgrade to **Workers Paid ($5/month)**. The free plan caps each run at 10 ms of CPU, which parsing 11 feeds can exceed. Then *My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"*. Copy the token and your Account ID.
3. **Anthropic API key:** console.anthropic.com → API keys. Add $5 of credit and set a monthly spend limit.
4. **Repo → Settings → Secrets and variables → Actions**
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`
   - Variables: `CONTACT_EMAIL`. Add `SITE_URL` after step 6.
5. **Settings → Actions → General:** tick *"Allow GitHub Actions to create and approve pull requests"*.
6. **Actions → hourly-update → Run workflow.** The log shows your `https://nowwhat.<you>.workers.dev` address. Save it as `SITE_URL`.
7. **Check:** open the site, then `/api/live`. After ~30 s it should show headlines; `_health` shows any failing feeds.
8. **Domain:** add `nowwhat.today` to Cloudflare, point its nameservers there, then *Workers → nowwhat → Domains & Routes → Add custom domain*. Update `SITE_URL`.
9. **Analytics:** Cloudflare → Web Analytics → add site.

## Costs (yearly)
| Item | Cost |
|---|---|
| Domain | ~$26 ($2.57 first year) |
| Cloudflare Workers Paid | $60 ($5/mo; includes 10M requests/mo ≈ 83k visitor-hours) |
| Traffic beyond that | $0.30 per million requests ≈ $0.30 per 8,000 visitor-hours |
| AI headline (Claude Haiku, ≤ 6×/hour) | ~$1–5 |
| GitHub, static hosting, repair checks | $0 (repairs ≤ $2 each, only when something breaks) |

## Turning on ads
1. Fill in `[DATE]` and `[CONTACT EMAIL]` in `public/privacy.html`.
2. Apply at AdSense. When approved, put your `ca-pub-…` ID and two display ad unit IDs in `public/config.js`, the AdSense line in `public/ads.txt`, and publish the EEA/UK consent message under *Privacy & messaging*.
3. **Before ads go live, replace the market data source** (`market_yahoo` uses Yahoo Finance, whose terms only allow personal use).

## Tuning
- Refresh speed: `REFRESH_MS` in `worker.js` and `setInterval(loadLive,3e4)` in `index.html`.
- AI headline frequency: `SUMMARY_MIN_GAP_MS` / `SUMMARY_MAX_AGE_MS` in `worker.js`.
- The live layer pauses after 10 minutes with no visitors and restarts on the next visit.
