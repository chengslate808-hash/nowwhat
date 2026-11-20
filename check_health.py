"""Reads data.json health and lists anything broken long enough to need a new source.
Usage: python check_health.py data.json  -> writes problems.md, prints `broken=true|false`."""
import json, sys, datetime as dt

SECTION_FAILS = 3     # whole section down 3 hourly runs in a row
BACKUP_RUNS = 24      # running on a backup provider for a full day
FEED_FAILS = 24       # one news feed down for a full day
PLATFORM_FAILS = 24   # iOS or Android chart down for a full day

d = json.load(open(sys.argv[1]))
h = d.get("_health", {})
problems = []
if len(sys.argv) > 2:  # live layer (worker.js): refreshes every 30s, so its counters run ~120x faster
    try:
        lh = json.load(open(sys.argv[2])).get("_health", {})
        for name, s in lh.items():
            if name.startswith("_") or not isinstance(s, dict):
                continue
            if s.get("fails", 0) >= 20:
                problems.append(f"- LIVE section `{name}` in worker.js failing for {s['fails']} refreshes (~{s['fails'] // 2} min). Last error: {s.get('error')}")
        for feed, n in lh.get("_feeds", {}).items():
            if n >= 2880:
                problems.append(f"- News feed `{feed}` in worker.js FEEDS has failed for a full day.")
    except Exception as ex:
        problems.append(f"- Could not read the live feed /api/live: {ex}")
for name, s in h.items():
    if name.startswith("_") or not isinstance(s, dict):
        continue
    if s.get("fails", 0) >= SECTION_FAILS:
        problems.append(f"- Section `{name}`: ALL providers failing for {s['fails']} runs. Last error: {s.get('error')}")
    elif s.get("backup_runs", 0) >= BACKUP_RUNS:
        problems.append(f"- Section `{name}`: primary provider down, running on backup `{s.get('provider')}` for {s['backup_runs']} runs.")
for feed, n in h.get("_feeds", {}).items():
    if n >= FEED_FAILS:
        problems.append(f"- News feed `{feed}` in FEEDS has failed {n} runs in a row.")
for plat, n in h.get("_platforms", {}).items():
    if n >= PLATFORM_FAILS:
        problems.append(f"- App chart for `{plat}` has returned nothing for {n} runs.")
upd = dt.datetime.fromisoformat(d["updated"])
if dt.datetime.now(dt.timezone.utc) - upd > dt.timedelta(hours=4):
    problems.append(f"- The whole updater has not published since {d['updated']} (check the hourly workflow log).")

open("problems.md", "w").write("\n".join(problems) or "none")
print("broken=" + ("true" if problems else "false"))
print("\n".join(problems), file=sys.stderr)
