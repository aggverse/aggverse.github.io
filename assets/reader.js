// PROGRESS BAR
window.addEventListener("scroll", () => {
  const winScroll = document.documentElement.scrollTop;
  const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

  const scrolled = (winScroll / height) * 100;
  document.getElementById("progress-bar").style.width = scrolled + "%";

  localStorage.setItem(location.pathname, winScroll);
});

// LOAD SCROLL POSITION
window.onload = () => {
  const saved = localStorage.getItem(location.pathname);
  if (saved) window.scrollTo(0, saved);

  estimateReadingTime();
};

// READING TIME
function estimateReadingTime() {
  const text = document.getElementById("content").innerText;
  const words = text.split(" ").length;
  const time = Math.ceil(words / 200);
  document.getElementById("reading-time").innerText =
    `~${time} min read`;
}

// SETTINGS PANEL
document.getElementById("settings-btn").onclick = () => {
  document.getElementById("settings-panel").classList.toggle("hidden");
};

// FONT SIZE
let fontSize = 1.05;
function changeFont(val) {
  fontSize += val * 0.1;
  document.getElementById("reader").style.fontSize = fontSize + "rem";
}

// WIDTH TOGGLE
let wide = false;
function toggleWidth() {
  wide = !wide;
  document.getElementById("reader").style.maxWidth =
    wide ? "900px" : "700px";
}

// IMMERSIVE MODE
function toggleImmersive() {
  document.querySelector(".navbar").classList.toggle("hidden");
}

// Save current chapter
localStorage.setItem("lastChapter", window.location.href);

// Save scroll position
window.addEventListener("scroll", () => {
  localStorage.setItem("scroll-" + location.pathname, window.scrollY);
});

// Restore scroll position
window.addEventListener("load", () => {
  const saved = localStorage.getItem("scroll-" + location.pathname);
  if (saved) window.scrollTo(0, saved);
});

// Preload next chapter
const nextLink = document.querySelector(".chapter-nav a:last-child");

if (nextLink) {
  fetch(nextLink.href);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    const next = document.querySelector(".chapter-nav a:last-child");
    if (next) window.location.href = next.href;
  }

  if (e.key === "ArrowLeft") {
    const prev = document.querySelector(".chapter-nav a:first-child");
    if (prev) window.location.href = prev.href;
  }
});