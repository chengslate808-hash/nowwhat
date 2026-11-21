// Server-rendered pages for search engines and AI answer engines (they mostly don't run JavaScript).
// Home pages: /, /zh/, /es/, /hi/, /ar/  ·  Archive: /day/, /day/YYYY-MM-DD (+ language prefixes)
// Also: /sitemap.xml and /feed.xml (RSS of daily summaries).

export const LANGS = ["en", "zh", "es", "hi", "ar"];
export const BASE = "https://nowwhat.today";
const LOCALE = { en: "en-US", zh: "zh-CN", es: "es", hi: "hi-IN", ar: "ar" };
const OG_LOCALE = { en: "en_US", zh: "zh_CN", es: "es_ES", hi: "hi_IN", ar: "ar_AR" };
const LANG_NAME = { en: "English", zh: "中文", es: "Español", hi: "हिन्दी", ar: "العربية" };

export const pre = (l) => (l === "en" ? "" : "/" + l);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pick = (lang, tr, en) => (lang !== "en" && tr && tr[lang]) || en;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const alternates = (path) =>
  LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}${pre(l)}${path}">`).join("") +
  `<link rel="alternate" hreflang="x-default" href="${BASE}${path}">`;
const fmtDate = (lang, d) => new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const fmtTime = (lang, iso) => new Intl.DateTimeFormat(LOCALE[lang], { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso)) + " UTC";

const ORG = { "@type": "Organization", "@id": BASE + "/#org", name: "nowwhat", url: BASE + "/",
  logo: { "@type": "ImageObject", url: BASE + "/icon-512.png", width: 512, height: 512 }, email: "hello@nowwhat.today" };
const SITE = { "@type": "WebSite", "@id": BASE + "/#website", name: "nowwhat", alternateName: "nowwhat.today", url: BASE + "/",
  inLanguage: LANGS, publisher: { "@id": BASE + "/#org" } };

// ---------- shared: translations live in index.html (one source for browser + server) ----------
let I18N = null;
export async function getTemplate(env) {
  const html = await (await env.ASSETS.fetch(new Request(BASE + "/"))).text();
  if (!I18N) I18N = JSON.parse(html.match(/<script type="application\/json" id="i18n">([\s\S]*?)<\/script>/)[1].replace(/<\\\//g, "</"));
  return html;
}
const tt = (lang) => (k) => (I18N?.[k] && (I18N[k][lang] || I18N[k].en)) || k;

// ---------- home page ----------
export async function renderHome(env, lang, live, data) {
  const html = await getTemplate(env);
  const t = tt(lang);
  const url = BASE + pre(lang) + "/";
  const heads = live.headlines || data.headlines || [];
  const sum = [live.summary, data.summary].filter((x) => x?.text).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  const sumText = sum ? pick(lang, sum.tr, sum.text) : "";
  const updated = live.updated || data.updated || new Date().toISOString();
  const a = (u, txt, st = "") => `<a href="${esc(u)}" target="_blank" rel="noopener" dir="auto"${st}>${esc(txt)}</a>`;

  const news = heads.map((h) => `<li><div>${a(h.url, pick(lang, h.tr, h.title))}<div class="mut">${esc(h.source)}${h.also?.length ? " · " + esc(t("also")) + " " + h.also.map(esc).join(", ") : ""}</div></div></li>`).join("");
  const bets = (live.bets || data.bets || []).map((b) => `<li>${a(b.url, b.q, ' style="flex:1"')}<span class="r"><b style="color:var(--tx)">${b.yes}%</b> ${esc(b.outcome === "Yes" ? t("Yes") : b.outcome)}</span></li>`).join("");
  const tr = data.trending || [], mx = Math.max(1, ...tr.map((w) => w.views));
  const wiki = tr.map((w) => `<li><div style="flex:1;min-width:0">${a(w.url, w.title, ' style="display:block"')}<div class="bar"><i style="width:${(w.views / mx) * 100}%"></i></div></div><span class="r">${Math.round(w.views / 1e3)}k</span></li>`).join("");
  const apps = ((data.apps || {}).grossing || []).slice(0, 10).map((x, i) => `<li><span class="mut">${i + 1}</span><img src="${esc(x.icon)}" alt="" loading="lazy" width="28" height="28">${a(x.on?.ios || x.on?.android, x.name)}<span class="r"></span></li>`).join("");

  const graph = { "@context": "https://schema.org", "@graph": [ORG, SITE, {
    "@type": "WebPage", "@id": url, url, name: t("title"), description: t("desc"), inLanguage: lang,
    isPartOf: { "@id": BASE + "/#website" }, dateModified: updated, ...(sumText ? { abstract: sumText } : {}),
    primaryImageOfPage: { "@type": "ImageObject", url: BASE + "/og.png" },
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["#sum", "#news"] },
    mainEntity: { "@type": "ItemList", name: t("top5"), itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: heads.length,
      itemListElement: heads.map((h, i) => ({ "@type": "ListItem", position: i + 1, name: pick(lang, h.tr, h.title), url: h.url })) },
  }] };

  const head = `<link rel="canonical" href="${url}">${alternates("/")}
<meta property="og:url" content="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="nowwhat">
<meta property="og:locale" content="${OG_LOCALE[lang]}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:title" content="${esc(t("title"))}"><meta name="twitter:description" content="${esc(sumText || t("desc"))}"><meta name="twitter:image" content="${BASE}/og.png">
<link rel="alternate" type="application/rss+xml" title="nowwhat" href="${BASE}${pre(lang)}/feed.xml">
${ld(graph)}<script>window.__LANG__=${JSON.stringify(lang)}</script>`;

  const rw = new HTMLRewriter()
    .on("html", { element: (e) => { e.setAttribute("lang", lang); e.setAttribute("dir", lang === "ar" ? "rtl" : "ltr"); } })
    .on("title", { element: (e) => e.setInnerContent(t("title")) })
    .on('meta[name="description"]', { element: (e) => e.setAttribute("content", t("desc")) })
    .on('meta[property="og:title"]', { element: (e) => e.setAttribute("content", t("title")) })
    .on('meta[property="og:description"]', { element: (e) => e.setAttribute("content", sumText || t("desc")) })
    .on("head", { element: (e) => e.append(head, { html: true }) })
    .on("[data-t]", { element: (e) => { const k = e.getAttribute("data-t"); if (I18N?.[k]) e.setInnerContent(t(k)); } })
    .on("#hero", { element: (e) => { if (sumText) e.removeAttribute("hidden"); } })
    .on("#sum", { element: (e) => e.setInnerContent(sumText) })
    .on("#sumat", { element: (e) => sum && e.setInnerContent(t("updated") + " " + fmtTime(lang, sum.at)) })
    .on("#upd", { element: (e) => e.setInnerContent(fmtTime(lang, updated)) })
    .on("#news", { element: (e) => e.setInnerContent(news, { html: true }) })
    .on("#bets", { element: (e) => e.setInnerContent(bets, { html: true }) })
    .on("#wiki", { element: (e) => e.setInnerContent(wiki, { html: true }) })
    .on("#apps", { element: (e) => e.setInnerContent(apps, { html: true }) })
    .on("#archlink", { element: (e) => e.setAttribute("href", pre(lang) + "/day/") })
    .on("#langs", { element: (e) => e.setInnerContent(LANGS.map((l) => `<a class="${l === lang ? "on" : ""}" lang="${l}" hreflang="${l}" href="${pre(l)}/">${LANG_NAME[l]}</a>`).join(""), { html: true }) });
  return rw.transform(new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=30" } }));
}

// ---------- archive pages ----------
const PAGE_CSS = `:root{--bg:#0e1014;--card:#171a21;--line:#262a33;--tx:#e6e8eb;--mut:#8a919e;--acc:#ffd23f}*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:820px;margin:auto;padding:20px 16px}
a{color:inherit}header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:20px}.logo{font-weight:800;font-size:24px;letter-spacing:-1px;text-decoration:none}.logo b{color:var(--acc)}
.langs{margin-inline-start:auto;display:flex;gap:4px;flex-wrap:wrap;font-size:13px}.langs a{color:var(--mut);text-decoration:none;padding:2px 6px;border-radius:6px}.langs a.on{color:var(--tx);background:var(--card)}
h1{font-size:clamp(24px,4vw,34px);line-height:1.2;letter-spacing:-.02em;margin-bottom:16px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:28px 0 10px}
.lead{background:var(--card);border:1px solid var(--line);border-inline-start:4px solid var(--acc);border-radius:8px;padding:16px 18px;font-size:19px;font-weight:600;line-height:1.45}
ol,ul{list-style:none}li{padding:10px 0;border-top:1px solid var(--line)}li:first-child{border:0}.mut{color:var(--mut);font-size:13px}.st a{font-weight:600;text-decoration:none}.st a:hover{text-decoration:underline}
nav.pn{display:flex;justify-content:space-between;gap:12px;margin-top:28px;font-size:14px}footer{margin-top:32px;color:var(--mut);font-size:13px}`;

function shell(lang, { title, desc, path, body, graph }) {
  const t = tt(lang);
  return `<!doctype html><html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${BASE}${pre(lang)}${path}">${alternates(path)}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${BASE}${pre(lang)}${path}">
<meta property="og:type" content="article"><meta property="og:site_name" content="nowwhat"><meta property="og:locale" content="${OG_LOCALE[lang]}"><meta property="og:image" content="${BASE}/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0e1014"><link rel="apple-touch-icon" href="/icon-180.png">
<link rel="icon" href="/icon-180.png"><link rel="alternate" type="application/rss+xml" title="nowwhat" href="${BASE}${pre(lang)}/feed.xml">
<style>${PAGE_CSS}</style>${ld(graph)}</head><body>
<header><a class="logo" dir="ltr" href="${pre(lang)}/">now<b>what?</b></a><span class="mut"><a href="${pre(lang)}/">${esc(t("live"))} →</a></span>
<nav class="langs">${LANGS.map((l) => `<a class="${l === lang ? "on" : ""}" lang="${l}" hreflang="${l}" href="${pre(l)}${path}">${LANG_NAME[l]}</a>`).join("")}</nav></header>
${body}
<footer><a href="${pre(lang)}/day/">${esc(t("archive"))}</a> · <a href="/about">${esc(t("about"))}</a> · <a href="/privacy">${esc(t("privacy"))}</a></footer></body></html>`;
}

export function renderDay(lang, rec, days) {
  const t = tt(lang);
  const date = fmtDate(lang, rec.date);
  const title = t("dayTitle").replace("{date}", date);
  const path = `/day/${rec.date}`;
  const last = rec.summaries[rec.summaries.length - 1];
  const lead = last ? pick(lang, last.tr, last.text) : "";
  const stories = Object.entries(rec.stories || {}).map(([url, s]) => ({ url, ...s }))
    .sort((a, b) => b.cov - a.cov || a.first.localeCompare(b.first)).slice(0, 25);
  const idx = days.findIndex((d) => d.d === rec.date);
  const prev = idx > 0 ? days[idx - 1].d : null, next = idx >= 0 && idx < days.length - 1 ? days[idx + 1].d : null;
  const body = `<main><h1>${esc(title)}</h1>
${lead ? `<h2>${esc(t("dayLead"))}</h2><p class="lead" id="lead">${esc(lead)}</p>` : ""}
<h2>${esc(t("dayStories"))}</h2><ol class="st">${stories.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" dir="auto">${esc(pick(lang, s.tr, s.t))}</a><div class="mut">${esc(s.src)} · ${s.cov} ${esc(t("outlets"))} · ${esc(fmtTime(lang, s.first))}</div></li>`).join("")}</ol>
${rec.summaries.length > 1 ? `<h2>${esc(t("dayThrough"))}</h2><ul>${rec.summaries.slice(0, -1).map((x) => `<li><div class="mut">${esc(fmtTime(lang, x.at))}</div>${esc(pick(lang, x.tr, x.text))}</li>`).join("")}</ul>` : ""}
<nav class="pn"><span>${prev ? `<a href="${pre(lang)}/day/${prev}">← ${esc(t("prev"))}</a>` : ""}</span><span>${next ? `<a href="${pre(lang)}/day/${next}">${esc(t("next"))} →</a>` : ""}</span></nav></main>`;
  const graph = { "@context": "https://schema.org", "@graph": [ORG, SITE, {
    "@type": "Article", "@id": BASE + pre(lang) + path, headline: title, description: lead || t("archiveDesc"), inLanguage: lang,
    datePublished: rec.summaries[0]?.at || rec.date + "T00:00:00Z", dateModified: last?.at || rec.date + "T23:59:59Z",
    author: { "@id": BASE + "/#org" }, publisher: { "@id": BASE + "/#org" }, image: BASE + "/og.png",
    mainEntityOfPage: BASE + pre(lang) + path, isPartOf: { "@id": BASE + "/#website" },
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "#lead"] },
    citation: stories.slice(0, 10).map((s) => ({ "@type": "NewsArticle", headline: s.t, url: s.url, publisher: { "@type": "Organization", name: s.src } })),
  }, { "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "nowwhat", item: BASE + pre(lang) + "/" },
    { "@type": "ListItem", position: 2, name: t("archive"), item: BASE + pre(lang) + "/day/" },
    { "@type": "ListItem", position: 3, name: date, item: BASE + pre(lang) + path }] }] };
  return shell(lang, { title: `${title} · nowwhat`, desc: lead || t("archiveDesc"), path, body, graph });
}

export function renderDayIndex(lang, days) {
  const t = tt(lang);
  const list = [...days].reverse();
  const body = `<main><h1>${esc(t("archive"))}</h1><p class="mut" style="margin-bottom:12px">${esc(t("archiveDesc"))}</p>
<ul class="st">${list.map((d) => `<li><a href="${pre(lang)}/day/${d.d}">${esc(t("dayTitle").replace("{date}", fmtDate(lang, d.d)))}</a>${d.s ? `<div class="mut" dir="auto">${esc(pick(lang, d.s.tr, d.s.text))}</div>` : ""}</li>`).join("")}</ul></main>`;
  const graph = { "@context": "https://schema.org", "@graph": [ORG, SITE, { "@type": "CollectionPage", "@id": BASE + pre(lang) + "/day/",
    name: t("archive"), description: t("archiveDesc"), inLanguage: lang, isPartOf: { "@id": BASE + "/#website" },
    mainEntity: { "@type": "ItemList", itemListElement: list.slice(0, 100).map((d, i) => ({ "@type": "ListItem", position: i + 1, url: BASE + pre(lang) + "/day/" + d.d })) } }] };
  return shell(lang, { title: `${t("archive")} · nowwhat`, desc: t("archiveDesc"), path: "/day/", body, graph });
}

export function renderNotFound(lang) {
  const t = tt(lang);
  return shell(lang, { title: "nowwhat", desc: t("desc"), path: "/day/", body: `<main><h1>${esc(t("notFound"))}</h1><p><a href="${pre(lang)}/day/">${esc(t("archive"))}</a></p></main>`,
    graph: { "@context": "https://schema.org", "@graph": [ORG, SITE] } });
}

// ---------- sitemap + RSS ----------
export function renderSitemap(days) {
  const urls = [];
  const add = (path, lastmod, freq, prio) => urls.push(`<url><loc>${BASE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${freq}</changefreq><priority>${prio}</priority>` +
    LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE}${pre(l)}${path.replace(/^\/(zh|es|hi|ar)(?=\/)/, "")}"/>`).join("") + `</url>`);
  const now = new Date().toISOString();
  for (const l of LANGS) add(pre(l) + "/", now, "always", "1.0");
  for (const l of LANGS) add(pre(l) + "/day/", now, "hourly", "0.7");
  for (const d of [...days].reverse()) for (const l of LANGS) add(`${pre(l)}/day/${d.d}`, d.at || d.d, "daily", "0.6");
  urls.push(`<url><loc>${BASE}/about</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>`;
}

export function renderFeed(lang, days) {
  const t = tt(lang);
  const items = [...days].reverse().slice(0, 30).filter((d) => d.s).map((d) => {
    const link = `${BASE}${pre(lang)}/day/${d.d}`;
    return `<item><title>${esc(t("dayTitle").replace("{date}", fmtDate(lang, d.d)))}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>` +
      `<pubDate>${new Date(d.at || d.d + "T23:59:00Z").toUTCString()}</pubDate><description>${esc(pick(lang, d.s.tr, d.s.text))}</description></item>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>nowwhat — ${esc(t("archive"))}</title><link>${BASE}${pre(lang)}/</link>` +
    `<description>${esc(t("archiveDesc"))}</description><language>${lang}</language>${items}</channel></rss>`;
}
