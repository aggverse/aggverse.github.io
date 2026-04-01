const SCROLL_KEY = `scroll-${location.pathname}`;
const LAST_CHAPTER_KEY = "lastChapter";

let fontSize = parseInt(localStorage.getItem("fontSize"), 10);
if (!Number.isFinite(fontSize)) fontSize = 18;

let isWide = localStorage.getItem("isWide") === "true";
let isImmersive = localStorage.getItem("isImmersive") === "true";

function updateProgressBar() {
  const progress = document.getElementById("progress-bar");
  if (!progress) return;

  const scrollTop = document.documentElement.scrollTop || window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;
  const height = Math.max(scrollHeight - clientHeight, 1);
  const percent = (scrollTop / height) * 100;

  progress.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function saveScrollPosition() {
  localStorage.setItem(SCROLL_KEY, window.scrollY);
}

function restoreScrollPosition() {
  const saved = parseInt(localStorage.getItem(SCROLL_KEY), 10);
  if (Number.isFinite(saved)) {
    window.scrollTo(0, saved);
  }
}

function estimateReadingTime() {
  const reader = document.getElementById("reader");
  if (!reader) return;

  const text = reader.innerText.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));

  const el = document.getElementById("reading-time");
  if (el) el.innerText = `~${minutes} min read`;
}

function applySettings() {
  const reader = document.getElementById("reader");
  const widthBtn = document.getElementById("width-btn");
  const immersiveBtn = document.getElementById("immersive-btn");

  if (widthBtn) {
    widthBtn.classList.toggle("active", isWide);
  }

  if (immersiveBtn) {
    immersiveBtn.classList.toggle("active", isImmersive);
  }
  if (reader) {
    reader.style.fontSize = `${fontSize}px`;
    reader.classList.toggle("wide", isWide);
  }

  document.body.classList.toggle("immersive", isImmersive);

  const indicator = document.getElementById("font-indicator");
  if (indicator) indicator.textContent = `${fontSize}px`;
}

function changeFont(delta) {
  const MIN = 14;
  const MAX = 28;

  fontSize = Math.min(MAX, Math.max(MIN, fontSize + delta));
  localStorage.setItem("fontSize", fontSize);
  applySettings();
}

function toggleWidth() {
  isWide = !isWide;
  localStorage.setItem("isWide", isWide);
  applySettings();
}

function toggleImmersive() {
  isImmersive = !isImmersive;
  localStorage.setItem("isImmersive", isImmersive);
  applySettings();
}

function setupKeyboardNav() {
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
}

function preloadNextChapter() {
  const nextLink = document.querySelector(".chapter-nav a:last-child");
  if (nextLink && nextLink.href) {
    fetch(nextLink.href).catch(() => {
      // Ignore preload errors; not critical
    });
  }
}

function setupUI() {
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      const panel = document.getElementById("settings-panel");
      if (panel) panel.classList.toggle("hidden");
    });
  }

  const changeFontButtons = document.querySelectorAll("[data-change-font]");
  changeFontButtons.forEach((button) => {
    const delta = Number(button.getAttribute("data-change-font"));
    if (Number.isFinite(delta)) {
      button.addEventListener("click", () => changeFont(delta));
    }
  });

  // Keep compatibility with inline onclick handlers for existing markup
  window.changeFont = changeFont;
  window.toggleWidth = toggleWidth;
  window.toggleImmersive = toggleImmersive;
}

window.addEventListener("scroll", () => {
  updateProgressBar();
  saveScrollPosition();
});

window.addEventListener("load", () => {
  restoreScrollPosition();
  updateProgressBar();
  applySettings();
  estimateReadingTime();
  setupKeyboardNav();
  preloadNextChapter();

  localStorage.setItem(LAST_CHAPTER_KEY, window.location.href);
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("settings-btn");
  const panel = document.getElementById("settings-panel");

  if (btn && panel) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent outside click interference
      panel.classList.toggle("hidden");
    });
  }
});

let uiVisible = false;

document.addEventListener("click", (e) => {
  const panel = document.getElementById("settings-panel");
  const btn = document.getElementById("settings-btn");

  if (!panel || !btn) return;

  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.add("hidden");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isImmersive) {
    isImmersive = false;
    localStorage.setItem("isImmersive", isImmersive);
    applySettings();
  }
});

let hideTimer;

function showUI() {
  const navbar = document.querySelector(".navbar");
  navbar.classList.remove("hidden");

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (isImmersive) navbar.classList.add("hidden");
  }, 3000);
}

let startY = 0;

document.addEventListener("touchstart", e => {
  startY = e.touches[0].clientY;
});

document.addEventListener("touchend", e => {
  let endY = e.changedTouches[0].clientY;

  if (isImmersive && endY - startY > 100) {
    toggleImmersive();
  }
});

const exitBtn = document.getElementById("exit-immersive");

if (exitBtn) {
  exitBtn.onclick = () => {
    isImmersive = false;
    localStorage.setItem("isImmersive", isImmersive);
    applySettings();
  };
}