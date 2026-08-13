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
document.querySelector("#godModeBtn")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();coins+=100;renderAll();saveState();e.currentTarget.textContent="+100";setTimeout(()=>e.currentTarget.textContent="✦",420);say("✦ +100 test coins");});


  // Global UI click feedback.
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    // These controls already have their own distinctive audio or are intentionally silent.
    const excludedIds = new Set([
      "sellBtn",
      "sellRawBtnRail",
      "sellMixedBtnRail",
      "sellEverythingBtnRail",
      "mixerToolBtn",
      "ordersFulfillBtn",
      "godModeBtn"
    ]);

    if (excludedIds.has(button.id)) return;
    if (button.disabled) return;

    playClickSound();
  });
