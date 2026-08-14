// Store overlay event wiring.

  // =========================================================
  // STORE OVERLAY
  // =========================================================

  const storeOverlay = document.querySelector("#storeOverlay");

  document.querySelector("#storeBtn").addEventListener("click", () => {
    storeOverlay.classList.add("open");
    renderStore();
  });

  document.querySelector("#storeCloseBtn").addEventListener("click", () => {
    storeOverlay.classList.remove("open");
  });

  document.addEventListener("click", event => {
    const btn = event.target.closest(".storeSectionBtn");
    if (!btn) return;
    activeStoreSection = btn.dataset.section || "equipment";
    renderStore();
    saveState();
  });
