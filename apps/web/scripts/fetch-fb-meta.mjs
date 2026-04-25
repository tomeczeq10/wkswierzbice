#!/usr/bin/env node
// Phase 2a: batch-pulls OG metadata + photo fbids from mbasic for every post in fb-posts-raw.json.
// Pure curl-level via fetch(), no Browser MCP, no binary download.

import fs from "node:fs/promises";
import { decode } from "html-entities";

const RAW = new URL("./data/fb-posts-raw.json", import.meta.url);
const OUT = new URL("./data/fb-posts-meta.json", import.meta.url);

const PAGE = "WKSWIERZBICEOFFICIAL";
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function metaAll(html, key) {
  const out = [];
  const rx = new RegExp(`<meta\\s+property="${key}"\\s+content="([^"]*)"`, "g");
  let m;
  while ((m = rx.exec(html))) out.push(decode(m[1]));
  return out;
}

function meta(html, key) {
  return metaAll(html, key)[0] || null;
}

function metaByName(html, key) {
  const m = html.match(new RegExp(`<meta\\s+name="${key}"\\s+content="([^"]*)"`));
  return m ? decode(m[1]) : null;
}

function photoAnchors(html) {
  const out = new Set();
  for (const m of html.matchAll(/\/photo\.php\?fbid=(\d+)/g)) out.add(m[1]);
  return [...out];
}

function canonical(html) {
  const m = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  return m ? decode(m[1]) : null;
}

async function enrichPost(post) {
  const base = `https://mbasic.facebook.com`;
  const urls = [];
  if (post.pfbid) urls.push(`${base}/${PAGE}/posts/${post.pfbid}`);
  if (post.photoFbid) {
    const set = post.albumSet ? `&set=${post.albumSet}` : "";
    urls.push(`${base}/photo.php?fbid=${post.photoFbid}${set}`);
  }
  if (!urls.length) return { index: post.index, slug: post.slug, error: "no-url" };

  let html = "";
  let sourceUrl = null;
  for (const url of urls) {
    try {
      html = await get(url);
      sourceUrl = url;
      if (html.length > 5000) break;
    } catch (e) {
      html = "";
    }
  }
  if (!html) return { index: post.index, slug: post.slug, error: "fetch-failed" };

  const ogTitle = meta(html, "og:title");
  const ogDescription = meta(html, "og:description") || metaByName(html, "description");
  const ogImage = meta(html, "og:image");
  const ogUrl = meta(html, "og:url");
  const photos = photoAnchors(html);

  return {
    index: post.index,
    slug: post.slug,
    sourceUrl,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    canonical: canonical(html),
    photoFbids: photos,
  };
}

async function main() {
  const raw = JSON.parse(await fs.readFile(RAW, "utf8"));
  const results = [];
  for (const post of raw.posts) {
    process.stdout.write(`[${post.index}] ${post.slug} ... `);
    try {
      const meta = await enrichPost(post);
      results.push(meta);
      const textLen = meta.ogDescription?.length ?? 0;
      const trunc = meta.ogDescription?.endsWith("...") ? " [TRUNC]" : "";
      console.log(`ok (desc=${textLen}${trunc}, photos=${meta.photoFbids?.length ?? 0})`);
    } catch (e) {
      results.push({ index: post.index, slug: post.slug, error: String(e) });
      console.log(`FAIL ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  await fs.writeFile(
    OUT,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), source: "mbasic.facebook.com via Googlebot UA", posts: results },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${results.length} entries to ${OUT.pathname}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
