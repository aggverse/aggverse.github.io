const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const writingDir = "writing";
const outputDir = "novels";
const targetNovel = process.argv[2]; // optional command-line argument e.g. node build.js novel-1

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

  const allFiles = fs.readdirSync(novelPath);
  const files = allFiles.filter(f => f.endsWith(".md"));
  if (files.length === 0) {
    console.error(`No markdown files found in ${novelName}. Skipping build for this novel.`);
    return;
  }

  // validate file ordering based on numeric sequence in filenames, e.g. chapter-1.md, chapter-2.md
  const fileNumbers = files.map(f => {
    const m = f.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  });
  if (fileNumbers.some(n => n === null)) {
    console.warn(`Some files in ${novelName} do not follow numeric naming and may be ordered unexpectedly.`);
  } else {
    const sortedNums = [...new Set(fileNumbers)].sort((a, b) => a - b);
    for (let i = 0; i < sortedNums.length; i++) {
      if (sortedNums[i] !== i + 1) {
        console.warn(`Non-sequential chapter numbers in ${novelName}: expected ${i + 1}, found ${sortedNums[i]}.`);
        break;
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

let chapters = [];

files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

// 🧠 FIRST PASS — collect chapter data
files.forEach(file => {
  const md = fs.readFileSync(path.join(novelPath, file), "utf-8");

  // 📊 WORD COUNT
  const wordCount = md.trim().split(/\s+/).length;
  console.log(`${file}: ${wordCount} words`);

  // 📖 TITLE FROM MARKDOWN (# Chapter Title)
  const titleMatch = md.match(/^#\s+(.*)/);
  const cleanName = file
    .replace(".md", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  const title = titleMatch ? titleMatch[1] : cleanName;

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

  <button id="width-btn" onclick="toggleWidth()">Width</button>
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
<h1>${meta.title}</h1>
<p>${meta.genre}</p>
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

const last = localStorage.getItem("lastChapter");

if (last) {
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
      <h2>${meta.title}</h2>
      <p>${meta.genre}</p>
      <small>${meta.status}</small>
    </a>
    `;
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
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