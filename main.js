/*
 * ================================================================
 * COLOR GATHER DEVELOPMENT ROADMAP
 * ================================================================
 * See PROJECT_NOTES.md in the project root before making major
 * gameplay/refactor changes. It records current systems, agreed UX
 * rules, planned Studio/Color XP progression, Flexible Buckets,
 * White/Black milestones, Painting plans, and deferred ideas.
 * ================================================================
 */

// Initialization sequence and splash-screen startup.

  // =========================================================
  // START
  // =========================================================

  let hasExistingSave = false;
  try { hasExistingSave = !!localStorage.getItem(SAVE_KEY); } catch (e) { /* ignore */ }

  initTubes();
  initVials();
  loadState();
  initSourcePositions();
  applySourcePositions();

  for (let i = 0; i < minionCount; i++) spawnMinion();

  renderAll();

  if (!hasExistingSave) {
    document.querySelector("#splashOverlay").classList.add("open");
  }



  const splashStartBtn = document.querySelector("#splashStartBtn");
  if (splashStartBtn) {
    splashStartBtn.addEventListener("click", () => {
      document.querySelector("#splashOverlay")?.classList.remove("open");
    });
  }
document.querySelector("#godModeBtn")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    coins += 100;
    renderAll();
    saveState();
    e.currentTarget.classList.remove("godPulse");
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add("godPulse");
    say("✦");
  });

  renderFlexibleBuckets();


  // =========================================================
  // OPTIONS
  // =========================================================
  const optionsOverlay = document.querySelector("#optionsOverlay");
  const optionsBtn = document.querySelector("#optionsBtn");
  const optionsCloseBtn = document.querySelector("#optionsCloseBtn");

  optionsBtn?.addEventListener("click", () => {
    playButtonClick?.();
    optionsOverlay?.classList.add("open");
  });

  optionsCloseBtn?.addEventListener("click", () => {
    playButtonClick?.();
    optionsOverlay?.classList.remove("open");
  });

  optionsOverlay?.addEventListener("click", event => {
    if (event.target === optionsOverlay) {
      optionsOverlay.classList.remove("open");
    }
  });
