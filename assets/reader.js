const SCROLL_KEY = `scroll-${location.pathname}`;
const LAST_CHAPTER_KEY = "lastChapter";

function getNovelKey() {
  const match = location.pathname.match(/novels\/([^\/]+)/);
  return match ? match[1] : null;
}

function getChapterSlug() {
  return location.pathname.split("/").pop();
}

function getFavoriteNovelKey() {
  const novel = getNovelKey();
  return novel ? `favoriteNovel-${novel}` : null;
}

function getFavoriteNovelTitleKey() {
  const novel = getNovelKey();
  return novel ? `favoriteNovelTitle-${novel}` : null;
}

function getFavoriteNovelTitle(novelSlug) {
  if (!novelSlug) return "";
  const saved = localStorage.getItem(`favoriteNovelTitle-${novelSlug}`);
  if (saved) return saved;

  const navTitle = document.getElementById("bookmark-chapter-nav-btn")?.getAttribute("data-novel-title") || document.querySelector(".nav-left .nav-current")?.innerText?.trim();
  if (navTitle && navTitle !== "") {
    return navTitle;
  }

  return slugToFriendlyName(novelSlug);
}

function getFavoriteChapterTitleKey(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return null;
  return `favoriteChapterTitle-${novelSlug}|${chapterSlug}`;
}

function getFavoriteCurrentChapterTitleKey() {
  const novel = getNovelKey();
  const chapter = getChapterSlug();
  return getFavoriteChapterTitleKey(novel, chapter);
}

function getFavoriteChapterTitle(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return "";
  const key = getFavoriteChapterTitleKey(novelSlug, chapterSlug);
  if (key) {
    const val = localStorage.getItem(key);
    if (val) return val;
  }
  return slugToFriendlyName(chapterSlug);
}

function getFavoriteChapterKey() {
  const novel = getNovelKey();
  const chapter = getChapterSlug();
  if (!novel || !chapter) return null;
  return `favoriteChapter-${encodeURIComponent(novel)}|${encodeURIComponent(chapter)}`;
}

function getLegacyFavoriteChapterKey() {
  const novel = getNovelKey();
  const chapter = getChapterSlug();
  return novel && chapter ? `favoriteChapter-${novel}-${chapter}` : null;
}

function slugToFriendlyName(slug) {
  if (!slug) return "";
  return decodeURIComponent(slug)
    .replace(/\.html$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseFavoriteChapterKey(key) {
  const raw = key.replace(/^favoriteChapter-/, "");
  if (raw.includes("|")) {
    const [novelEnc, chapterEnc] = raw.split("|");
    return {
      novel: decodeURIComponent(novelEnc),
      chapter: decodeURIComponent(chapterEnc)
    };
  }

  // Legacy: robust parsing of old hyphen-separated format.
  // Format may be: [novelSlug]-chapter-[slug], or [novelSlug]-[chapterSlug].
  const legacyRaw = raw;

  const chapterMarker = "-chapter-";
  const markerIndex = legacyRaw.lastIndexOf(chapterMarker);

  if (markerIndex !== -1) {
    const novel = legacyRaw.substring(0, markerIndex);
    const chapter = legacyRaw.substring(markerIndex + 1); // keep 'chapter-...' part
    return {
      novel,
      chapter
    };
  }

  const lastHyphen = legacyRaw.lastIndexOf("-");
  if (lastHyphen !== -1) {
    const novel = legacyRaw.substring(0, lastHyphen);
    const chapter = legacyRaw.substring(lastHyphen + 1);
    return { novel, chapter };
  }

  return { novel: legacyRaw, chapter: "" };
}

function getLastChapterStorageKey() {
  const novel = getNovelKey();
  return novel ? `${LAST_CHAPTER_KEY}-${novel}` : LAST_CHAPTER_KEY;
}

let fontSize = parseInt(localStorage.getItem("fontSize"), 10);
if (!Number.isFinite(fontSize)) fontSize = 18;

let isImmersive = localStorage.getItem("isImmersive") === "true";
let isNovelFavorited = false;
let isChapterFavorited = false;
let commentsVisible = false;
let undoTimeoutId = null;
let lastRemovedFavorites = null;

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

function updateCommentsVisibility() {
  const comments = document.querySelector(".comments-section");
  if (!comments) return;

  if (isImmersive) {
    comments.classList.add("hidden");
    commentsVisible = false;
    const toggle = document.getElementById("comments-toggle-btn");
    if (toggle) toggle.classList.remove("active");
    if (toggle) toggle.textContent = "Show comments";
    return;
  }

  const shouldShow = commentsVisible;
  comments.classList.toggle("hidden", !shouldShow);

  const toggle = document.getElementById("comments-toggle-btn");
  if (toggle) {
    toggle.textContent = shouldShow ? "Hide comments" : "Show comments";
    toggle.classList.toggle("active", shouldShow);
  }
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
  const immersiveBtn = document.getElementById("immersive-btn");
  const novelBookmarkBtn = document.getElementById("bookmark-novel-btn");
  const chapterBookmarkBtn = document.getElementById("bookmark-chapter-btn");

  if (immersiveBtn) {
    immersiveBtn.classList.toggle("active", isImmersive);
  }
  if (reader) {
    reader.style.fontSize = `${fontSize}px`;
  }

  if (novelBookmarkBtn) {
    novelBookmarkBtn.classList.toggle("active", isNovelFavorited);
    novelBookmarkBtn.textContent = isNovelFavorited ? "★" : "☆";
  }

  if (chapterBookmarkBtn) {
    chapterBookmarkBtn.classList.toggle("active", isChapterFavorited);
    chapterBookmarkBtn.textContent = isChapterFavorited ? "Unbookmark chapter" : "Bookmark chapter";
  }

  const chapterNavBtn = document.getElementById("bookmark-chapter-nav-btn");
  if (chapterNavBtn) {
    chapterNavBtn.classList.toggle("active", isChapterFavorited);
    chapterNavBtn.textContent = isChapterFavorited ? "★" : "☆";
  }

  document.body.classList.toggle("immersive", isImmersive);

  const indicator = document.getElementById("font-indicator");
  if (indicator) indicator.textContent = `${fontSize}px`;
}

function showUndoToast(message, removedKeys) {
  if (undoTimeoutId) {
    clearTimeout(undoTimeoutId);
    undoTimeoutId = null;
  }

  lastRemovedFavorites = removedKeys.slice();

  let toast = document.getElementById("undo-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "undo-toast";
    toast.style.cssText = "position:fixed;bottom:18px;left:18px;padding:10px 14px;background:rgba(12,12,14,0.92);border:1px solid #888;border-radius:8px;color:#eee;z-index:1100;display:flex;align-items:center;gap:10px;";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>${message}</span><button id='undo-toast-btn' style='border:1px solid #666;background:transparent;color:#ffd700;border-radius:4px;padding:2px 8px;cursor:pointer;'>Undo</button>`;

  const undoBtn = document.getElementById("undo-toast-btn");
  if (undoBtn) {
    undoBtn.onclick = () => {
      if (!lastRemovedFavorites || !lastRemovedFavorites.length) return;
      lastRemovedFavorites.forEach(key => {
        localStorage.setItem(key, "true");
      });
      lastRemovedFavorites = null;
      applySettings();
      renderFavoritesPanel();
      toast.remove();
      clearTimeout(undoTimeoutId);
      undoTimeoutId = null;
    };
  }

  undoTimeoutId = setTimeout(() => {
    lastRemovedFavorites = null;
    toast.remove();
    undoTimeoutId = null;
  }, 3000);
}

function changeFont(delta) {
  const MIN = 14;
  const MAX = 28;

  fontSize = Math.min(MAX, Math.max(MIN, fontSize + delta));
  localStorage.setItem("fontSize", fontSize);
  applySettings();
}

function toggleImmersive() {
  isImmersive = !isImmersive;
  localStorage.setItem("isImmersive", isImmersive);
  applySettings();
}

function toggleBookmarkNovel() {
  const key = getFavoriteNovelKey();
  const titleKey = getFavoriteNovelTitleKey();
  if (!key) return;

  const novelTitle = document.getElementById("bookmark-novel-btn")?.getAttribute("data-novel-title") || slugToFriendlyName(getNovelKey());

  isNovelFavorited = !isNovelFavorited;
  if (isNovelFavorited) {
    localStorage.setItem(key, "true");
    if (titleKey) localStorage.setItem(titleKey, novelTitle);
  } else {
    localStorage.removeItem(key);
    if (titleKey) localStorage.removeItem(titleKey);
  }

  applySettings();
}

function toggleBookmarkChapter() {
  const key = getFavoriteChapterKey();
  const legacyKey = getLegacyFavoriteChapterKey();
  const titleKey = getFavoriteCurrentChapterTitleKey();
  const novelTitleKey = getFavoriteNovelTitleKey();
  if (!key) return;

  const bNav = document.getElementById("bookmark-chapter-nav-btn");
  const bSettings = document.getElementById("bookmark-chapter-btn");

  const dataChapterTitle = bSettings?.getAttribute("data-chapter-title") || bNav?.getAttribute("data-chapter-title") || document.querySelector("#reader h1")?.innerText?.trim() || slugToFriendlyName(getChapterSlug());
  const dataNovelTitle = bNav?.getAttribute("data-novel-title") || bSettings?.getAttribute("data-novel-title") || document.querySelector(".nav-left a.nav-btn:nth-child(2)")?.innerText?.trim() || slugToFriendlyName(getNovelKey());

  isChapterFavorited = !isChapterFavorited;

  if (isChapterFavorited) {
    // persist canonical encoded key and remove legacy variant to prevent duplicate entries
    localStorage.setItem(key, "true");
    if (legacyKey) localStorage.removeItem(legacyKey);
    if (titleKey) localStorage.setItem(titleKey, dataChapterTitle);
    if (novelTitleKey) localStorage.setItem(novelTitleKey, dataNovelTitle);
  } else {
    localStorage.removeItem(key);
    if (legacyKey) localStorage.removeItem(legacyKey);
    if (titleKey) localStorage.removeItem(titleKey);
    if (novelTitleKey) localStorage.removeItem(novelTitleKey);
  }

  isChapterFavorited = isChapterFavoriteStored();
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
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent global click listener from hiding panel immediately
      const panel = document.getElementById("settings-panel");
      if (panel) panel.classList.toggle("hidden");
    });
  }

  const favoritesToggle = document.getElementById("favorites-toggle-btn");
  if (favoritesToggle) {
    favoritesToggle.addEventListener("click", () => {
      const panel = document.getElementById("favorites-panel");
      if (!panel) return;
      panel.classList.toggle("hidden");
      renderFavoritesPanel();
    });
  }

  const favoritesPanel = document.getElementById("favorites-panel");
  if (favoritesPanel) {
    favoritesPanel.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".favorite-remove-btn");
      if (!removeBtn) return;
      const key = removeBtn.getAttribute("data-key");
      if (key) removeFavorite(key);
    });
  }

  const changeFontButtons = document.querySelectorAll("[data-change-font]");
  changeFontButtons.forEach((button) => {
    const delta = Number(button.getAttribute("data-change-font"));
    if (Number.isFinite(delta)) {
      button.addEventListener("click", () => changeFont(delta));
    }
  });

  const novelBookmarkBtn = document.getElementById("bookmark-novel-btn");
  if (novelBookmarkBtn) {
    novelBookmarkBtn.addEventListener("click", toggleBookmarkNovel);
  }

  const chapterNavBtn = document.getElementById("bookmark-chapter-nav-btn");
  if (chapterNavBtn) {
    chapterNavBtn.addEventListener("click", toggleBookmarkChapter);
  }

  const commentsToggleBtn = document.getElementById("comments-toggle-btn");
  if (commentsToggleBtn) {
    commentsToggleBtn.addEventListener("click", () => {
      commentsVisible = !commentsVisible;
      updateCommentsVisibility();
    });
  }

  const immersiveBtn = document.getElementById("immersive-btn");
  if (immersiveBtn) {
    immersiveBtn.addEventListener("click", toggleImmersive);
  }

  const chapterBookmarkBtn = document.getElementById("bookmark-chapter-btn");
  if (chapterBookmarkBtn) {
    chapterBookmarkBtn.addEventListener("click", toggleBookmarkChapter);
  }

  // Keep compatibility with inline onclick handlers for existing markup
  window.changeFont = changeFont;
  window.toggleImmersive = toggleImmersive;
  window.toggleBookmarkNovel = toggleBookmarkNovel;
  window.toggleBookmarkChapter = toggleBookmarkChapter;
}

window.addEventListener("scroll", () => {
  updateProgressBar();
  saveScrollPosition();
});

window.addEventListener("load", () => {
  restoreScrollPosition();
  updateProgressBar();
  setupBookmarks();
  applySettings();
  estimateReadingTime();
  setupKeyboardNav();
  setupUI();
  preloadNextChapter();
  updateCommentsVisibility();

  const currentKey = getLastChapterStorageKey();
  if (document.getElementById("reader") && currentKey) {
    localStorage.setItem(currentKey, window.location.href);
  }
});

function removeFavorite(key) {
  if (!key) return;

  const removedKeys = [key];

  if (key.startsWith("favoriteNovel-")) {
    const novelSlug = key.replace("favoriteNovel-", "");
    const titleKey = `favoriteNovelTitle-${novelSlug}`;
    removedKeys.push(titleKey);

    const encodedNovel = encodeURIComponent(novelSlug);

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`favoriteChapter-${encodedNovel}|`) || k.startsWith(`favoriteChapter-${novelSlug}-`)) {
        removedKeys.push(k);
      }
      if (k.startsWith(`favoriteChapterTitle-${encodedNovel}|`) || k.startsWith(`favoriteChapterTitle-${novelSlug}|`)) {
        removedKeys.push(k);
      }
    });
  }

  if (key.startsWith("favoriteChapter-")) {
    const parsed = parseFavoriteChapterKey(key);
    if (parsed?.novel && parsed?.chapter) {
      const canonical = `favoriteChapter-${encodeURIComponent(parsed.novel)}|${encodeURIComponent(parsed.chapter)}`;
      const legacy = `favoriteChapter-${parsed.novel}-${parsed.chapter}`;
      removedKeys.push(canonical);
      removedKeys.push(legacy);

      const canonicalTitle = `favoriteChapterTitle-${encodeURIComponent(parsed.novel)}|${encodeURIComponent(parsed.chapter)}`;
      const legacyTitle = `favoriteChapterTitle-${parsed.novel}|${parsed.chapter}`;
      removedKeys.push(canonicalTitle);
      removedKeys.push(legacyTitle);
    }
  }

  removedKeys.forEach(k => localStorage.removeItem(k));

  if (key === getFavoriteNovelKey()) {
    isNovelFavorited = false;
  }
  if (key === getFavoriteChapterKey() || key === getLegacyFavoriteChapterKey()) {
    isChapterFavorited = false;
  }

  applySettings();
  renderFavoritesPanel();
  showUndoToast("Bookmark removed", removedKeys);
}

function isChapterFavoriteStored() {
  const chapterKey = getFavoriteChapterKey();
  const legacyChapterKey = getLegacyFavoriteChapterKey();

  if (!chapterKey) return false;
  if (localStorage.getItem(chapterKey) === "true") return true;
  if (legacyChapterKey && localStorage.getItem(legacyChapterKey) === "true") return true;
  return false;
}

function setupBookmarks() {
  const novelKey = getFavoriteNovelKey();
  if (novelKey) {
    isNovelFavorited = localStorage.getItem(novelKey) === "true";
  }

  isChapterFavorited = isChapterFavoriteStored();

  const panel = document.getElementById("favorites-panel");
  if (panel) {
    panel.classList.add("hidden");
    renderFavoritesPanel();
  }
}

function renderFavoritesPanel() {
  const panel = document.getElementById("favorites-panel");
  if (!panel) return;

  const keys = Object.keys(localStorage);
  const novelEntries = keys.filter(k => k.startsWith("favoriteNovel-") && localStorage.getItem(k) === "true");

  const chapterMap = new Map();
  keys.forEach(k => {
    if (!k.startsWith("favoriteChapter-")) return;
    if (localStorage.getItem(k) !== "true") return;

    const { novel, chapter } = parseFavoriteChapterKey(k);
    if (!novel || !chapter) return;

    const id = `${novel}|${chapter}`;
    const existing = chapterMap.get(id);
    const isCanonical = k.includes("|");

    // Prefer canonical encoded key over legacy format when both exist
    if (!existing || (isCanonical && !existing.key.includes("|"))) {
      chapterMap.set(id, { key: k, novel, chapter });
    }

    // On load, normalize to canonical storage (remove legacy leftover)
    if (isCanonical) {
      const legacyKey = `favoriteChapter-${novel}-${chapter}`;
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
      }
    }
  });

  const chapterEntries = Array.from(chapterMap.values());

  let html = "<h3>Favorites</h3>";

  if (novelEntries.length === 0 && chapterEntries.length === 0) {
    html += '<div class="no-favorites">No bookmarks yet.</div>';
    panel.innerHTML = html;
    return;
  }

  if (novelEntries.length > 0) {
    html += "<div><strong>Novels</strong></div>";
    novelEntries.forEach(key => {
      const novelSlug = key.replace("favoriteNovel-", "");
      const displayNovel = getFavoriteNovelTitle(novelSlug);
      html += `
      <div class="favorite-entry">
        <a href="novels/${novelSlug}/">${displayNovel}</a>
        <button class="favorite-remove-btn" data-key="${key}" aria-label="Remove novel from favorites">✕</button>
      </div>`;
    });
  }

  if (chapterEntries.length > 0) {
    html += "<div style='margin-top:8px;'><strong>Chapters</strong></div>";
    chapterEntries.forEach(entry => {
      const { key, novel, chapter } = entry;
      const displayNovel = getFavoriteNovelTitle(novel) || slugToFriendlyName(novel);
      const displayChapter = getFavoriteChapterTitle(novel, chapter);
      const link = chapter ? `novels/${novel}/${chapter}` : `novels/${novel}/`;
      html += `
      <div class="favorite-entry">
        <a href="${link}">${displayNovel} / ${displayChapter}</a>
        <button class="favorite-remove-btn" data-key="${key}" aria-label="Remove chapter from favorites">✕</button>
      </div>`;
    });
  }

  panel.innerHTML = html;
}



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