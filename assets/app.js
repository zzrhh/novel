const state = {
  manifest: null,
  bookIndex: 0,
  chapterIndex: 0,
};

const els = {
  body: document.body,
  siteTitle: document.querySelector("#site-title"),
  siteSubtitle: document.querySelector("#site-subtitle"),
  bookSelect: document.querySelector("#book-select"),
  chapterList: document.querySelector("#chapter-list"),
  chapterCount: document.querySelector("#chapter-count"),
  updatedAt: document.querySelector("#updated-at"),
  bookKicker: document.querySelector("#book-kicker"),
  chapterContent: document.querySelector("#chapter-content"),
  menuToggle: document.querySelector("#menu-toggle"),
  readProgress: document.querySelector("#read-progress"),
  prevChapter: document.querySelector("#prev-chapter"),
  nextChapter: document.querySelector("#next-chapter"),
};

init().catch((error) => {
  els.chapterContent.innerHTML = `
    <h1>章节清单载入失败</h1>
    <p>${escapeHtml(error.message)}</p>
    <p>请先在项目根目录运行 <code>npm run build</code>，再用本地服务器或 GitHub Pages 打开。</p>
  `;
});

async function init() {
  const response = await fetch("./manifest.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取 manifest.json：${response.status}`);
  }

  state.manifest = await response.json();
  const params = new URLSearchParams(location.search);
  const bookSlug = params.get("book");
  const chapterNo = Number(params.get("chapter"));

  state.bookIndex = Math.max(0, state.manifest.books.findIndex((book) => book.slug === bookSlug));
  if (state.bookIndex === -1) {
    state.bookIndex = 0;
  }

  const book = currentBook();
  const chapterFromUrl = book.chapters.findIndex((chapter) => chapter.number === chapterNo);
  state.chapterIndex = chapterFromUrl >= 0 ? chapterFromUrl : 0;

  renderBookPicker();
  renderChapterList();
  bindEvents();
  await loadChapter();
}

function bindEvents() {
  els.bookSelect.addEventListener("change", async (event) => {
    state.bookIndex = Number(event.target.value);
    state.chapterIndex = 0;
    renderChapterList();
    await loadChapter();
  });

  els.menuToggle.addEventListener("click", () => {
    const isOpen = els.body.classList.toggle("shelf-open");
    els.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  els.prevChapter.addEventListener("click", () => moveChapter(-1));
  els.nextChapter.addEventListener("click", () => moveChapter(1));

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      moveChapter(-1);
    }
    if (event.key === "ArrowRight") {
      moveChapter(1);
    }
  });

  window.addEventListener("scroll", updateProgress, { passive: true });
}

function renderBookPicker() {
  els.bookSelect.innerHTML = state.manifest.books
    .map((book, index) => `<option value="${index}">${escapeHtml(book.title)}</option>`)
    .join("");
  els.bookSelect.value = String(state.bookIndex);
}

function renderChapterList() {
  const book = currentBook();
  els.siteTitle.textContent = book.title || "我的小说书架";
  els.siteSubtitle.textContent = book.description || "自动同步 Markdown 章节，手机上直接读。";
  els.chapterCount.textContent = `${book.chapters.length} 章`;
  els.updatedAt.textContent = state.manifest.generatedAt
    ? `更新于 ${new Date(state.manifest.generatedAt).toLocaleString("zh-CN")}`
    : "";

  els.chapterList.innerHTML = book.chapters
    .map((chapter, index) => {
      const active = index === state.chapterIndex ? " active" : "";
      return `
        <button class="chapter-link${active}" type="button" data-index="${index}">
          ${escapeHtml(chapter.title)}
          <small>${chapter.characters.toLocaleString("zh-CN")} 字符</small>
        </button>
      `;
    })
    .join("");

  els.chapterList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      state.chapterIndex = Number(button.dataset.index);
      els.body.classList.remove("shelf-open");
      els.menuToggle.setAttribute("aria-expanded", "false");
      await loadChapter();
    });
  });
}

async function loadChapter() {
  const book = currentBook();
  const chapter = currentChapter();
  if (!chapter) {
    els.chapterContent.innerHTML = "<h1>还没有章节</h1><p>生成新章节后运行构建脚本即可显示在这里。</p>";
    return;
  }

  els.bookKicker.textContent = `${book.title} / 第 ${chapter.number} 章`;
  els.chapterContent.innerHTML = "<h1>正在翻页</h1>";

  const response = await fetch(encodeURI(chapter.path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取章节：${chapter.path}`);
  }

  const markdown = await response.text();
  els.chapterContent.innerHTML = renderMarkdown(markdown);
  document.title = `${chapter.title} - ${book.title}`;
  updateUrl(book, chapter);
  updateNav();
  renderChapterList();
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateProgress();
}

async function moveChapter(step) {
  const nextIndex = state.chapterIndex + step;
  if (nextIndex < 0 || nextIndex >= currentBook().chapters.length) {
    return;
  }
  state.chapterIndex = nextIndex;
  await loadChapter();
}

function updateNav() {
  const total = currentBook().chapters.length;
  els.prevChapter.disabled = state.chapterIndex <= 0;
  els.nextChapter.disabled = state.chapterIndex >= total - 1;
}

function updateUrl(book, chapter) {
  const url = new URL(location.href);
  url.searchParams.set("book", book.slug);
  url.searchParams.set("chapter", String(chapter.number));
  history.replaceState(null, "", url);
}

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  els.readProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

function currentBook() {
  return state.manifest.books[state.bookIndex];
}

function currentChapter() {
  return currentBook().chapters[state.chapterIndex];
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushQuote = () => {
    if (quote.length) {
      html.push(`<blockquote>${quote.map((line) => `<p>${formatInline(line)}</p>`).join("")}</blockquote>`);
      quote = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushQuote();
      continue;
    }

    if (line === "---" || line === "***") {
      flushParagraph();
      flushQuote();
      html.push("<hr />");
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    flushQuote();

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushQuote();
  return html.join("\n");
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
