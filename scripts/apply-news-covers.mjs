import fs from "node:fs/promises";
import path from "node:path";

const NEWS_DIR = new URL("../src/content/news/", import.meta.url);
const PUBLIC_DIR = new URL("../public/news/", import.meta.url);
const EXT_PRIORITY = [".jpg", ".jpeg", ".png", ".webp"];

async function listSlugs() {
  const files = await fs.readdir(NEWS_DIR);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, ""), file: f }));
}

async function findCoverForSlug(slug) {
  for (const ext of EXT_PRIORITY) {
    const candidate = new URL(`${slug}${ext}`, PUBLIC_DIR);
    try {
      await fs.access(candidate);
      return `/news/${slug}${ext}`;
    } catch {
      // ignore
    }
  }
  return null;
}

function replaceCover(markdown, newCover) {
  const re = /^cover:\s*.*$/m;
  if (!re.test(markdown)) return markdown;
  return markdown.replace(re, `cover: ${newCover}`);
}

function replaceCoverAlt(markdown, title) {
  const re = /^coverAlt:\s*.*$/m;
  const safeTitle = (title || "").replace(/"/g, '\\"');
  const newLine = `coverAlt: "Zdjęcie z wpisu: ${safeTitle} – fanpage WKS Wierzbice"`;
  if (!re.test(markdown)) return markdown;
  return markdown.replace(re, newLine);
}

function readFrontmatterTitle(md) {
  const m = md.match(/^title:\s*(.*)$/m);
  if (!m) return "";
  let t = m[1].trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }
  return t.replace(/\\"/g, '"');
}

async function main() {
  const slugs = await listSlugs();
  const updated = [];
  const skipped = [];

  for (const { slug, file } of slugs) {
    const coverPath = await findCoverForSlug(slug);
    const fullPath = new URL(file, NEWS_DIR);
    const md = await fs.readFile(fullPath, "utf8");

    if (coverPath) {
      const title = readFrontmatterTitle(md);
      let next = replaceCover(md, coverPath);
      next = replaceCoverAlt(next, title);
      if (next !== md) {
        await fs.writeFile(fullPath, next, "utf8");
        updated.push({ slug, coverPath });
      } else {
        skipped.push({ slug, reason: "no cover field" });
      }
    } else {
      skipped.push({ slug, reason: "no image file" });
    }
  }

  console.log(`\nUpdated covers: ${updated.length}`);
  for (const u of updated) console.log(`  ✓ ${u.slug} -> ${u.coverPath}`);

  const missing = skipped.filter((s) => s.reason === "no image file");
  console.log(`\nStill using /herb-wks.jpg (no image found): ${missing.length}`);
  for (const s of missing) console.log(`  - ${s.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
