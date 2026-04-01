const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const writingDir = "writing";
const outputDir = "novels";
const targetNovel = process.argv[2]; // optional command-line argument e.g. node build.js novel-1

function toTitleCase(str) {
  return str
    .replace(/[-_]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function extractChapterTitle(markdown, fallback) {
  const heading = markdown.match(/^\s*#\s+(.+)/m);
  if (heading && heading[1]) {
    return heading[1].trim();
  }
  return fallback;
}

function sortChapterFiles(files) {
  return files.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function buildNovel(novelName) {
  const novelPath = path.join(writingDir, novelName);
  const outPath = path.join(outputDir, novelName);

  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });

  const metaPath = path.join(novelPath, "meta.json");

  if (!fs.existsSync(metaPath)) {
    console.error(`Missing meta.json in ${novelName}. Skipping build for this novel.`);
    return;
  }

  const meta = JSON.parse(fs.readFileSync(metaPath));

  // Copy cover image to output folder so index and cards can reference it
  if (meta.cover) {
    const coverSource = path.join(novelPath, meta.cover);
    const coverDestination = path.join(outPath, path.basename(meta.cover));
    if (fs.existsSync(coverSource)) {
      fs.copyFileSync(coverSource, coverDestination);
    } else {
      console.warn(`Cover file '${meta.cover}' not found in ${novelPath}.`);
    }
  }

  const allFiles = fs.readdirSync(novelPath);
  const files = allFiles.filter(f => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`No markdown files found in ${novelName}. Skipping build for this novel.`);
    return;
  }

  const orderedFiles = sortChapterFiles(files);

  // warn if numeric sequence looks broken, but still build
  const numericIds = orderedFiles
    .map(f => {
      const m = f.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter(n => n !== null);

  if (numericIds.length > 0 && Math.max(...numericIds) !== numericIds.length) {
    console.warn(`Possible nonsequential chapter numbering in ${novelName}.`);
  }

  const chapters = [];

  // 🧠 FIRST PASS — collect chapter data
  orderedFiles.forEach(file => {
  const md = fs.readFileSync(path.join(novelPath, file), "utf-8");

  // 📊 WORD COUNT
  const wordCount = md.trim().split(/\s+/).filter(Boolean).length;
  console.log(`${file}: ${wordCount} words`);

  // 📖 TITLE FROM MARKDOWN (# Chapter Title)
  const fallbackTitle = toTitleCase(file.replace(/\.md$/, ""));
  const title = extractChapterTitle(md, fallbackTitle);

  const htmlContent = marked(md);

  chapters.push({
    file: file.replace(".md", ".html"),
    title,
    content: htmlContent,
    wordCount
  });
});


// 🧠 SECOND PASS — build with navigation
chapters.forEach((ch, i) => {
  const prev = chapters[i - 1];
  const next = chapters[i + 1];

  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="../../assets/style.css">
<script src="../../assets/reader.js" defer></script>
</head>
<body>

<div id="progress-bar"></div>

<button id="exit-immersive">Exit</button>

<nav class="navbar">

  <div class="nav-left">
    <a href="../../index.html" class="nav-btn">Home</a>
    <a href="index.html" class="nav-btn">${meta.title}</a>
    <span class="nav-current">${ch.title}</span>
  </div>

  <div class="nav-right">
    <button id="settings-btn" class="icon-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
      </svg>
    </button>
  </div>

</nav>

<div id="settings-panel" class="hidden">

  <div class="setting-row">
    <button onclick="changeFont(1)">A+</button>
    <button onclick="changeFont(-1)">A-</button>
    <span id="font-indicator">18px</span>
  </div>

  <button id="immersive-btn" onclick="toggleImmersive()">Immersive</button>

</div>

<main id="reader" class="reader">

<p class="word-count">${ch.wordCount} words</p>

${ch.content}

<div class="chapter-nav">
  ${prev ? `<a href="${prev.file}">← Previous</a>` : "<span></span>"}
  ${next ? `<a href="${next.file}">Next →</a>` : ""}
</div>

</main>

</body>
</html>
`;

  fs.writeFileSync(path.join(outPath, ch.file), fullHTML);
});

  // chapters.json
  fs.writeFileSync(
    path.join(outPath, "chapters.json"),
    JSON.stringify(chapters, null, 2)
  );

  // novel index
  const indexHTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="../../assets/style.css">
</head>
<body>

<nav class="navbar">

  <div class="nav-left">
    <a href="../../index.html" class="nav-btn">Home</a>
    <span class="nav-current">${meta.title}</span>
  </div>

</nav>

<main class="container">
${meta.cover ? `<img class="novel-cover" src="${meta.cover}" alt="${meta.title} cover" />` : ""}
<h1>${meta.title}</h1>
<p><strong>Genre:</strong> ${meta.genre}</p>
<p><strong>Description:</strong> ${meta.description || "No description yet."}</p>
<div id="continue-reading"></div>
<div id="chapters"></div>
</main>

<script>
fetch("chapters.json")
.then(r => r.json())
.then(data => {
  const el = document.getElementById("chapters");
  data.forEach(c => {
     const a = document.createElement("a");
    a.href = c.file;
    a.className = "chapter-card";
  
    a.innerHTML = '<div class="chapter-title">' + c.title + '</div>';
    el.appendChild(a);
  });
});

const currentNovel = "${novelName}";
const last = localStorage.getItem("lastChapter-" + currentNovel) || localStorage.getItem("lastChapter");

if (last && last.includes("novels/" + currentNovel + "/")) {
  const btn = document.createElement("a");
  btn.href = last;
  btn.textContent = "Continue Reading";
  btn.className = "chapter-card";
  
  document.getElementById("continue-reading").appendChild(btn);
}
</script>

</body>
</html>
`;

  fs.writeFileSync(path.join(outPath, "index.html"), indexHTML);
}

function buildHomepage() {
  if (!fs.existsSync(writingDir)) {
    console.error(`Writing directory '${writingDir}' does not exist.`);
    return;
  }

  const novels = fs.readdirSync("writing");
  if (novels.length === 0) {
    console.error("No novels found in writing directory.");
    return;
  }

  let cards = "";

  novels.forEach(novel => {
    const metaPath = path.join(writingDir, novel, "meta.json");
    if (!fs.existsSync(metaPath)) {
      console.warn(`Skipping ${novel}: missing meta.json in writing/${novel}/meta.json`);
      return;
    }

    const meta = JSON.parse(fs.readFileSync(metaPath));

    cards += `
    <a href="novels/${novel}/" class="novel-card">
      ${meta.cover ? `<img class="novel-card-cover" src="novels/${novel}/${meta.cover}" alt="${meta.title} cover" />` : ""}
      <h2>${meta.title}</h2>
      <p><strong>Genre:</strong> ${meta.genre}</p>
      <p>${meta.description || "No description yet."}</p>
      <small>${meta.status}</small>
    </a>
    `;
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<nav class="navbar">
<div class="logo">Agglair</div>
</nav>

<main class="container">
<h1 class="title">Library</h1>
${cards}
</main>

</body>
</html>
`;

  fs.writeFileSync("index.html", html);
}

// RUN
if (!fs.existsSync(writingDir)) {
  console.error(`Writing directory '${writingDir}' does not exist. Aborting build.`);
  process.exit(1);
}

const novels = fs.readdirSync(writingDir);
if (novels.length === 0) {
  console.error("No novels found in writing directory. Aborting build.");
  process.exit(1);
}

if (targetNovel) {
  if (!fs.existsSync(path.join(writingDir, targetNovel))) {
    console.error(`Target novel '${targetNovel}' not found in '${writingDir}'.`);
    process.exit(1);
  }
  console.log(`Building targeted novel: ${targetNovel}`);
  buildNovel(targetNovel);
} else {
  novels.forEach(buildNovel);
}

buildHomepage();
console.log("Build complete.");