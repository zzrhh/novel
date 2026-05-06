import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const booksRoot = path.join(root, "books");
const manifestPath = path.join(root, "manifest.json");

const books = await collectBooks();

await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      books,
    },
    null,
    2,
  )}\n`,
);

console.log(`Built manifest.json with ${books.length} book(s).`);

async function collectBooks() {
  const bookDirs = await safeReadDir(booksRoot);
  const found = [];

  for (const entry of bookDirs) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }

    const bookPath = path.join(booksRoot, entry.name);
    const chaptersPath = path.join(bookPath, "章节");
    const chapterEntries = await safeReadDir(chaptersPath);
    const chapters = [];

    for (const chapterEntry of chapterEntries) {
      if (!chapterEntry.isFile() || !chapterEntry.name.endsWith(".md")) {
        continue;
      }

      const absolutePath = path.join(chaptersPath, chapterEntry.name);
      const markdown = await readFile(absolutePath, "utf8");
      const fileStat = await stat(absolutePath);
      const number = Number.parseInt(chapterEntry.name, 10);
      const title = extractTitle(markdown) || `第${Number.isFinite(number) ? number : chapters.length + 1}章`;

      chapters.push({
        number: Number.isFinite(number) ? number : chapters.length + 1,
        title,
        path: toWebPath(absolutePath),
        characters: countCharacters(markdown),
        updatedAt: fileStat.mtime.toISOString(),
      });
    }

    chapters.sort((a, b) => a.number - b.number || a.title.localeCompare(b.title, "zh-CN"));

    found.push({
      title: entry.name,
      slug: slugify(entry.name),
      path: toWebPath(bookPath),
      description: readDescription(bookPath),
      chapters,
    });
  }

  found.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
  return found;
}

async function safeReadDir(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function countCharacters(markdown) {
  return markdown.replace(/\s/g, "").length;
}

function toWebPath(absolutePath) {
  return `./${path.relative(root, absolutePath).split(path.sep).join("/")}`;
}

function slugify(value) {
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return ascii || encodeURIComponent(value);
}

function readDescription() {
  return "以残剑破万法，一路杀回九州之巅。";
}
