#!/usr/bin/env node
// Merge fb-posts-raw + fb-posts-meta + fb-posts-full -> src/content/news/<slug>.md
// Top-priority posts (with fullText) get the full body; others use og:description truncated snippet.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url);
const RAW = new URL("./data/fb-posts-raw.json", import.meta.url);
const META = new URL("./data/fb-posts-meta.json", import.meta.url);
const FULL = new URL("./data/fb-posts-full.json", import.meta.url);

const OUT_DIR = new URL("../src/content/news/", import.meta.url);
const PAGE = "WKSWIERZBICEOFFICIAL";

const TAG_LABELS = {
  wynik: "wynik",
  "zawodnik-meczu": "zawodnik meczu",
  zapowiedz: "zapowiedź",
  turniej: "turniej",
  seniorzy: "seniorzy",
  juniorzy: "juniorzy",
  trampkarze: "trampkarze",
  mlodzicy: "młodzicy",
  mlodziez: "młodzież",
  orliki: "orliki",
  zaki: "żaki",
  kibice: "kibice",
  zyczenia: "życzenia",
  klub: "klub",
};

function facebookUrlFor(post) {
  if (post.pfbid) return `https://www.facebook.com/${PAGE}/posts/${post.pfbid}`;
  if (post.photoFbid) {
    const set = post.albumSet ? `&set=${post.albumSet}` : "";
    return `https://www.facebook.com/photo/?fbid=${post.photoFbid}${set}`;
  }
  return null;
}

function firstNonEmptyLine(text) {
  if (!text) return "";
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 0) || "";
}

// Emoji-safe trim preserving Polish characters. Trims aggressive trailing punctuation.
function smartTitle(line, maxLen = 90) {
  const cleaned = line.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned.replace(/[!.]{2,}$/, "!");
  const cut = cleaned.slice(0, maxLen);
  const idx = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("—"));
  return (idx > 30 ? cut.slice(0, idx) : cut).trim() + "…";
}

function buildExcerpt(text, maxLen = 180) {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;:]*$/, "") + "…";
}

function buildBodyFromOg(og, truncated, fbUrl) {
  const base = og.replace(/\n{3,}/g, "\n\n").trim();
  if (!truncated) return base;
  const cleanedBase = base.replace(/\s*\.{3,}\s*$/u, "").trim();
  const cta = fbUrl ? `\n\n_Pełny wpis dostępny na [fanpage’u klubu na Facebooku](${fbUrl})._` : "";
  return `${cleanedBase}…${cta}`;
}

function yamlEscape(s) {
  if (s == null) return "";
  if (!/["'\n:#]/.test(s) && !/^[\s-]/.test(s)) return s;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function frontmatter(data) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((x) => yamlEscape(x)).join(", ")}]`);
    } else if (typeof v === "boolean") {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${yamlEscape(String(v))}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

async function clearExistingNews() {
  const entries = await fs.readdir(OUT_DIR).catch(() => []);
  for (const entry of entries) {
    if (entry.endsWith(".md")) {
      await fs.unlink(new URL(entry, OUT_DIR));
    }
  }
}

async function main() {
  const [raw, meta, full] = await Promise.all([
    fs.readFile(RAW, "utf8").then(JSON.parse),
    fs.readFile(META, "utf8").then(JSON.parse),
    fs.readFile(FULL, "utf8").then(JSON.parse),
  ]);

  const metaByIdx = new Map(meta.posts.map((p) => [p.index, p]));
  const fullByIdx = full.posts;

  // Skip rules
  const SKIP = new Set([2]); // idx 2 is a video with no usable ID/text

  await fs.mkdir(OUT_DIR, { recursive: true });
  await clearExistingNews();

  const summary = [];

  for (const post of raw.posts) {
    if (SKIP.has(post.index)) continue;

    const m = metaByIdx.get(post.index) || {};
    const f = fullByIdx[String(post.index)];
    const fbUrl = facebookUrlFor(post);

    let ogDesc = m.ogDescription || "";
    // Facebook returns a generic page placeholder (localised in DE) for certain gallery posts –
    // ignore it in favour of the feed firstLine.
    const isFbPagePlaceholder = /Gefällt\s+\d/i.test(ogDesc) || /sprechen darüber/i.test(ogDesc);
    if (isFbPagePlaceholder) ogDesc = "";
    const isTrunc = ogDesc.trim().endsWith("...") || ogDesc.trim().endsWith("…");

    let bodyText;
    if (f?.fullText) bodyText = f.fullText;
    else if (ogDesc) bodyText = buildBodyFromOg(ogDesc, isTrunc, fbUrl);
    else bodyText = post.firstLine
      ? `${post.firstLine}\n\n_Pełny wpis dostępny na [fanpage’u klubu na Facebooku](${fbUrl || `https://www.facebook.com/${PAGE}`})._`
      : "";
    const wasTruncated = !f && (isTrunc || !ogDesc);

    const titleLine = firstNonEmptyLine(bodyText) || post.firstLine || post.slug;
    const title = smartTitle(titleLine, 90);

    const excerptSource = f?.fullText || ogDesc || post.firstLine || "";
    const excerpt = buildExcerpt(excerptSource, 180);

    const dateIso = post.dateHint && /^\d{4}-\d{2}-\d{2}$/.test(post.dateHint)
      ? `${post.dateHint}T12:00:00+02:00`
      : post.dateHint || "2026-04-01T12:00:00+02:00";

    const fmData = {
      title,
      date: dateIso,
      excerpt,
      cover: "/herb-wks.jpg",
      coverAlt: `Herb WKS Wierzbice – wpis „${title}” z fanpage'a klubu`,
      tags: Array.isArray(post.tags) && post.tags.length ? post.tags.map((t) => TAG_LABELS[t] || t) : ["klub"],
      author: "Redakcja klubu",
      facebookUrl: fbUrl || undefined,
      truncated: wasTruncated,
    };

    const fm = frontmatter(fmData);
    const body = bodyText.trim();
    const md = `${fm}\n\n${body}\n`;
    const filename = new URL(`${post.slug}.md`, OUT_DIR);
    await fs.writeFile(filename, md, "utf8");

    summary.push({
      index: post.index,
      slug: post.slug,
      title,
      date: dateIso.slice(0, 10),
      fullText: Boolean(f?.fullText),
      truncated: wasTruncated,
      tags: fmData.tags,
    });
  }

  console.log(`\nGenerated ${summary.length} markdown files in src/content/news/`);
  console.log(`full-text=${summary.filter((s) => s.fullText).length}`);
  console.log(`og-full=${summary.filter((s) => !s.fullText && !s.truncated).length}`);
  console.log(`og-truncated=${summary.filter((s) => s.truncated).length}`);
  console.log("\nList:");
  for (const s of summary) {
    console.log(`  [${s.index}] ${s.date} (${s.fullText ? "F" : s.truncated ? "T" : "o"}) ${s.title}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
