const SCROLL_KEY = `scroll-${location.pathname}`;
const LAST_CHAPTER_KEY = "lastChapter";
const STORAGE_TRUE = "true";
const FAVORITE_NOVEL_PREFIX = "favoriteNovel-";
const FAVORITE_NOVEL_TITLE_PREFIX = "favoriteNovelTitle-";
const FAVORITE_CHAPTER_PREFIX = "favoriteChapter-";
const FAVORITE_CHAPTER_TITLE_PREFIX = "favoriteChapterTitle-";

function toFavoriteNovelKey(novelSlug) {
  return novelSlug ? `${FAVORITE_NOVEL_PREFIX}${novelSlug}` : null;
}

function toFavoriteNovelTitleKey(novelSlug) {
  return novelSlug ? `${FAVORITE_NOVEL_TITLE_PREFIX}${novelSlug}` : null;
}

function toFavoriteChapterKey(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return null;
  return `${FAVORITE_CHAPTER_PREFIX}${encodeURIComponent(novelSlug)}|${encodeURIComponent(chapterSlug)}`;
}

function toLegacyFavoriteChapterKey(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return null;
  return `${FAVORITE_CHAPTER_PREFIX}${novelSlug}-${chapterSlug}`;
}

function toCanonicalFavoriteChapterTitleKey(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return null;
  return `${FAVORITE_CHAPTER_TITLE_PREFIX}${encodeURIComponent(novelSlug)}|${encodeURIComponent(chapterSlug)}`;
}

function toLegacyFavoriteChapterTitleKey(novelSlug, chapterSlug) {
  if (!novelSlug || !chapterSlug) return null;
  return `${FAVORITE_CHAPTER_TITLE_PREFIX}${novelSlug}|${chapterSlug}`;
}

function getNovelKey() {
  const match = location.pathname.match(/novels\/([^\/]+)/);
  return match ? match[1] : null;
}

function getChapterSlug() {
  return location.pathname.split("/").pop();
}

function getFavoriteNovelKey() {
  const novel = getNovelKey();
  return toFavoriteNovelKey(novel);
}

function getFavoriteNovelTitleKey() {
  const novel = getNovelKey();
  return toFavoriteNovelTitleKey(novel);
}

function getFavoriteNovelTitle(novelSlug) {
  if (!novelSlug) return "";
  const saved = localStorage.getItem(toFavoriteNovelTitleKey(novelSlug));
  if (saved) return saved;

  const navTitle = document.getElementById("bookmark-chapter-nav-btn")?.getAttribute("data-novel-title") || document.querySelector(".nav-left .nav-current")?.innerText?.trim();
  if (navTitle && navTitle !== "") {
    return navTitle;
  }

  return slugToFriendlyName(novelSlug);
}

function getFavoriteChapterTitleKey(novelSlug, chapterSlug) {
  return toLegacyFavoriteChapterTitleKey(novelSlug, chapterSlug);
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
  return toFavoriteChapterKey(novel, chapter);
}

function getLegacyFavoriteChapterKey() {
  const novel = getNovelKey();
  const chapter = getChapterSlug();
  return toLegacyFavoriteChapterKey(novel, chapter);
}

function slugToFriendlyName(slug) {
  if (!slug) return "";
  return decodeURIComponent(slug)
    .replace(/\.html$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseFavoriteChapterKey(key) {
  const raw = key.slice(FAVORITE_CHAPTER_PREFIX.length);
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

let isImmersive = localStorage.getItem("isImmersive") === STORAGE_TRUE;
let isNovelFavorited = false;
let isChapterFavorited = false;
let commentsVisible = false;
let undoTimeoutId = null;
let lastRemovedFavorites = null;
const docEl = document.documentElement;
const progressBar = document.getElementById("progress-bar");

function updateProgressBar() {
  if (!progressBar) return;

  const scrollTop = docEl.scrollTop || window.scrollY;
  const scrollHeight = docEl.scrollHeight;
  const clientHeight = docEl.clientHeight;
  const height = Math.max(scrollHeight - clientHeight, 1);
  const percent = (scrollTop / height) * 100;

  progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

window.updateScrollProgress = updateProgressBar;

function updateCommentsVisibility() {
  const comments = document.querySelector(".comments-section");
  const toggle = document.getElementById("comments-toggle-btn");
  if (!comments) return;

  if (isImmersive) {
    comments.classList.add("hidden");
    commentsVisible = false;
    if (toggle) toggle.classList.remove("active");
    return;
  }

  comments.classList.toggle("hidden", !commentsVisible);
  if (toggle) toggle.classList.toggle("active", commentsVisible);
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
  const isReaderPage = Boolean(reader);
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

  document.body.classList.toggle("immersive", isReaderPage && isImmersive);

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
    localStorage.setItem(key, STORAGE_TRUE);
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
    localStorage.setItem(key, STORAGE_TRUE);
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
    const chapterNav = getChapterNavLinks();

    if (e.key === "ArrowRight") {
      if (chapterNav.next) window.location.href = chapterNav.next.href;
    }

    if (e.key === "ArrowLeft") {
      if (chapterNav.prev) window.location.href = chapterNav.prev.href;
    }
  });
}

function preloadNextChapter() {
  const { next: nextLink } = getChapterNavLinks();
  if (nextLink && nextLink.href) {
    fetch(nextLink.href).catch(() => {
      // Ignore preload errors; not critical
    });
  }
}

function getChapterNavLinks() {
  return {
    prev: document.querySelector(".chapter-nav a:first-child"),
    next: document.querySelector(".chapter-nav a:last-child")
  };
}

function getSettingsControls() {
  return {
    panel: document.getElementById("settings-panel"),
    btn: document.getElementById("settings-btn")
  };
}

function getUIElements() {
  return {
    settingsBtn: document.getElementById("settings-btn"),
    settingsPanel: document.getElementById("settings-panel"),
    favoritesToggle: document.getElementById("favorites-toggle-btn"),
    favoritesPanel: document.getElementById("favorites-panel"),
    novelBookmarkBtn: document.getElementById("bookmark-novel-btn"),
    chapterNavBtn: document.getElementById("bookmark-chapter-nav-btn"),
    commentsToggleBtn: document.getElementById("comments-toggle-btn"),
    immersiveBtn: document.getElementById("immersive-btn"),
    chapterBookmarkBtn: document.getElementById("bookmark-chapter-btn"),
    changeFontButtons: document.querySelectorAll("[data-change-font]")
  };
}

function setupUI() {
  const ui = getUIElements();

  if (ui.settingsBtn) {
    ui.settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent global click listener from hiding panel immediately
      if (ui.settingsPanel) ui.settingsPanel.classList.toggle("hidden");
    });
  }

  if (ui.favoritesToggle) {
    ui.favoritesToggle.addEventListener("click", () => {
      if (!ui.favoritesPanel) return;
      ui.favoritesPanel.classList.toggle("hidden");
      renderFavoritesPanel();
    });
  }

  if (ui.favoritesPanel) {
    ui.favoritesPanel.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".favorite-remove-btn");
      if (!removeBtn) return;
      const key = removeBtn.getAttribute("data-key");
      if (key) removeFavorite(key);
    });
  }

  ui.changeFontButtons.forEach((button) => {
    const delta = Number(button.getAttribute("data-change-font"));
    if (Number.isFinite(delta)) {
      button.addEventListener("click", () => changeFont(delta));
    }
  });

  if (ui.novelBookmarkBtn) {
    ui.novelBookmarkBtn.addEventListener("click", toggleBookmarkNovel);
  }

  if (ui.chapterNavBtn) {
    ui.chapterNavBtn.addEventListener("click", toggleBookmarkChapter);
  }

  if (ui.commentsToggleBtn) {
    ui.commentsToggleBtn.addEventListener("click", () => {
      commentsVisible = !commentsVisible;
      updateCommentsVisibility();
    });
  }

  if (ui.immersiveBtn) {
    ui.immersiveBtn.addEventListener("click", toggleImmersive);
  }

  if (ui.chapterBookmarkBtn) {
    ui.chapterBookmarkBtn.addEventListener("click", toggleBookmarkChapter);
  }

  // Keep compatibility with inline onclick handlers for existing markup
  window.changeFont = changeFont;
  window.toggleImmersive = toggleImmersive;
  window.toggleBookmarkNovel = toggleBookmarkNovel;
  window.toggleBookmarkChapter = toggleBookmarkChapter;
}

function handleWindowScroll() {
  updateProgressBar();
  saveScrollPosition();
}

window.addEventListener("scroll", handleWindowScroll, { passive: true });

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

  if (key.startsWith(FAVORITE_NOVEL_PREFIX)) {
    const novelSlug = key.slice(FAVORITE_NOVEL_PREFIX.length);
    const titleKey = toFavoriteNovelTitleKey(novelSlug);
    if (titleKey) removedKeys.push(titleKey);

    const encodedNovel = encodeURIComponent(novelSlug);

    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(`${FAVORITE_CHAPTER_PREFIX}${encodedNovel}|`) || k.startsWith(`${FAVORITE_CHAPTER_PREFIX}${novelSlug}-`)) {
        removedKeys.push(k);
      }
      if (k.startsWith(`${FAVORITE_CHAPTER_TITLE_PREFIX}${encodedNovel}|`) || k.startsWith(`${FAVORITE_CHAPTER_TITLE_PREFIX}${novelSlug}|`)) {
        removedKeys.push(k);
      }
    });
  }

  if (key.startsWith(FAVORITE_CHAPTER_PREFIX)) {
    const parsed = parseFavoriteChapterKey(key);
    if (parsed?.novel && parsed?.chapter) {
      const canonical = toFavoriteChapterKey(parsed.novel, parsed.chapter);
      const legacy = toLegacyFavoriteChapterKey(parsed.novel, parsed.chapter);
      removedKeys.push(canonical);
      removedKeys.push(legacy);

      const canonicalTitle = toCanonicalFavoriteChapterTitleKey(parsed.novel, parsed.chapter);
      const legacyTitle = toLegacyFavoriteChapterTitleKey(parsed.novel, parsed.chapter);
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
  if (localStorage.getItem(chapterKey) === STORAGE_TRUE) return true;
  if (legacyChapterKey && localStorage.getItem(legacyChapterKey) === STORAGE_TRUE) return true;
  return false;
}

function setupBookmarks() {
  const novelKey = getFavoriteNovelKey();
  if (novelKey) {
    isNovelFavorited = localStorage.getItem(novelKey) === STORAGE_TRUE;
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
  const novelEntries = keys.filter(k => k.startsWith(FAVORITE_NOVEL_PREFIX) && localStorage.getItem(k) === STORAGE_TRUE);

  const chapterMap = new Map();
  keys.forEach(k => {
    if (!k.startsWith(FAVORITE_CHAPTER_PREFIX)) return;
    if (localStorage.getItem(k) !== STORAGE_TRUE) return;

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
      const legacyKey = toLegacyFavoriteChapterKey(novel, chapter);
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
      const novelSlug = key.slice(FAVORITE_NOVEL_PREFIX.length);
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

document.addEventListener("click", (e) => {
  const { panel, btn } = getSettingsControls();

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