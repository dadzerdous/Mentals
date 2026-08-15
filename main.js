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
    playClickSound();
    optionsOverlay?.classList.add("open");
  });

  optionsCloseBtn?.addEventListener("click", () => {
    playClickSound();
    optionsOverlay?.classList.remove("open");
  });

  optionsOverlay?.addEventListener("click", event => {
    if (event.target === optionsOverlay) {
      optionsOverlay.classList.remove("open");
    }
  });


  // =========================================================
  // BACKGROUND MUSIC
  // =========================================================
  const bgMusic = new Audio("sounds/bgmusic.mp3");
  bgMusic.loop = true;
  bgMusic.preload = "auto";

  let musicEnabled = true;
  let musicVolume = 0.25;
  let musicStarted = false;

  try {
    const savedMusicEnabled = localStorage.getItem("colorGatherMusicEnabled");
    const savedMusicVolume = localStorage.getItem("colorGatherMusicVolume");
    if (savedMusicEnabled !== null) musicEnabled = savedMusicEnabled === "true";
    if (savedMusicVolume !== null) {
      const parsedVolume = Number(savedMusicVolume);
      if (Number.isFinite(parsedVolume)) musicVolume = Math.max(0, Math.min(1, parsedVolume));
    }
  } catch (e) {}

  bgMusic.volume = musicVolume;

  function syncMusicControls() {
    const enabledInput = document.querySelector("#musicEnabled");
    const volumeInput = document.querySelector("#musicVolume");
    const volumeValue = document.querySelector("#musicVolumeValue");

    if (enabledInput) enabledInput.checked = musicEnabled;
    if (volumeInput) volumeInput.value = String(Math.round(musicVolume * 100));
    if (volumeValue) volumeValue.textContent = `${Math.round(musicVolume * 100)}%`;
  }

  function saveMusicSettings() {
    try {
      localStorage.setItem("colorGatherMusicEnabled", String(musicEnabled));
      localStorage.setItem("colorGatherMusicVolume", String(musicVolume));
    } catch (e) {}
  }

  function startBackgroundMusic() {
    if (!musicEnabled || musicStarted) return;
    bgMusic.volume = musicVolume;
    bgMusic.play()
      .then(() => { musicStarted = true; })
      .catch(() => {
        // Mobile browsers may require another user interaction.
      });
  }

  function applyMusicState() {
    bgMusic.volume = musicVolume;

    if (!musicEnabled) {
      bgMusic.pause();
      musicStarted = false;
      return;
    }

    startBackgroundMusic();
  }

  // Browsers, especially mobile Safari/Chrome, require audio to begin from
  // a user gesture. Keep listening until playback successfully starts.
  function tryStartMusicFromInteraction() {
    startBackgroundMusic();
    if (musicStarted || !musicEnabled) {
      document.removeEventListener("pointerdown", tryStartMusicFromInteraction);
      document.removeEventListener("keydown", tryStartMusicFromInteraction);
    }
  }

  document.addEventListener("pointerdown", tryStartMusicFromInteraction);
  document.addEventListener("keydown", tryStartMusicFromInteraction);

  const musicEnabledInput = document.querySelector("#musicEnabled");
  const musicVolumeInput = document.querySelector("#musicVolume");

  musicEnabledInput?.addEventListener("change", event => {
    musicEnabled = !!event.currentTarget.checked;
    saveMusicSettings();
    applyMusicState();
    syncMusicControls();
  });

  musicVolumeInput?.addEventListener("input", event => {
    musicVolume = Math.max(0, Math.min(1, Number(event.currentTarget.value) / 100));
    bgMusic.volume = musicVolume;
    saveMusicSettings();
    syncMusicControls();
  });

  syncMusicControls();
