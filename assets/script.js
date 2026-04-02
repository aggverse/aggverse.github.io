if (typeof window.updateScrollProgress === "function") {
  window.updateScrollProgress();
} else {
  const progressBar = document.getElementById("progress-bar");
  const docEl = document.documentElement;

  function updateScrollProgress() {
    if (!progressBar) return;

    const scrollTop = docEl.scrollTop;
    const scrollableHeight = docEl.scrollHeight - docEl.clientHeight;

    if (scrollableHeight <= 0) {
      progressBar.style.width = "0%";
      return;
    }

    const progress = Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100));
    progressBar.style.width = `${progress}%`;
  }

  window.updateScrollProgress = updateScrollProgress;
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  updateScrollProgress();
}