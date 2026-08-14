// Audio, paint splats, coin effects, and visual feedback helpers.

  // =========================================================
  // SOUND
  // =========================================================

  const splatSoundSrc = "sounds/splat.mp3";

  function playSplatSound() {
    try {
      const sound = new Audio(splatSoundSrc);
      sound.volume = 0.7;
      sound.play().catch(() => {
        // browser blocked autoplay until the user interacts with the page — safe to ignore
      });
    } catch (e) {
      // audio unsupported — fail silently
    }
  }


  const clickAudio = new Audio("sounds/click.wav");
  clickAudio.preload = "auto";

  function playClickSound() {
    try {
      clickAudio.currentTime = 0;
      clickAudio.play().catch(() => {});
    } catch (e) {}
  }

  const mixAudio = new Audio("sounds/fart.wav");
  mixAudio.preload = "auto";

  function playMixSound() {
    try {
      mixAudio.currentTime = 0;
      mixAudio.play().catch(() => {});
    } catch (e) {
      // Audio may be blocked in some browser states; ignore gracefully.
    }
  }

  const sellChingAudio = new Audio("sounds/ching.wav");
  sellChingAudio.preload = "auto";

  function playSellSound() {
    try {
      sellChingAudio.currentTime = 0;
      sellChingAudio.play().catch(() => {});
    } catch (e) {
      // Audio may be blocked in some browser states; ignore gracefully.
    }
  }


  // =========================================================
  // PAINT SPLAT EFFECT
  // =========================================================

  function createSinglePaintSplat(color) {
    const game = document.querySelector("#game");
    const splatColor = paintSplatColors[color] || "#999";

    const wrap = document.createElement("div");
    wrap.className = "paintSplatWrap";
    wrap.style.left = randomBetween(15, 85) + "%";
    wrap.style.top = randomBetween(18, 82) + "%";
    wrap.style.setProperty("--r0", randomBetween(-35, -8) + "deg");
    wrap.style.setProperty("--r1", randomBetween(4, 22) + "deg");
    wrap.style.setProperty("--r2", randomBetween(-12, 12) + "deg");

    const lifeMs = randomBetween(1700, 4200);
    wrap.style.setProperty("--life", (lifeMs / 1000) + "s");

    const baseSize = randomBetween(110, 220);

    const main = document.createElement("div");
    main.className = "paintSplatMain";
    main.style.width = baseSize + "px";
    main.style.height = randomBetween(baseSize * .7, baseSize * 1.05) + "px";
    main.style.background = splatColor;
    main.style.borderRadius =
      `${randomBetween(35,60)}% ${randomBetween(35,60)}% ${randomBetween(35,60)}% ${randomBetween(35,60)}% / ` +
      `${randomBetween(35,60)}% ${randomBetween(35,60)}% ${randomBetween(35,60)}% ${randomBetween(35,60)}%`;
    wrap.appendChild(main);

    const dropCount = Math.floor(randomBetween(6, 12));
    for (let i = 0; i < dropCount; i++) {
      const drop = document.createElement("div");
      drop.className = "paintDrop";
      const size = randomBetween(10, 42);
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(baseSize * .45, baseSize * 1.25);
      drop.style.width = size + "px";
      drop.style.height = randomBetween(size * .75, size * 1.2) + "px";
      drop.style.left = (Math.cos(angle) * distance) + "px";
      drop.style.top = (Math.sin(angle) * distance) + "px";
      drop.style.background = splatColor;
      wrap.appendChild(drop);
    }

    const farDropCount = Math.floor(randomBetween(1, 4));
    for (let i = 0; i < farDropCount; i++) {
      const drop = document.createElement("div");
      drop.className = "paintDrop";
      const size = randomBetween(5, 14);
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(baseSize * 1.15, baseSize * 2.05);
      drop.style.width = size + "px";
      drop.style.height = size + "px";
      drop.style.left = (Math.cos(angle) * distance) + "px";
      drop.style.top = (Math.sin(angle) * distance) + "px";
      drop.style.background = splatColor;
      wrap.appendChild(drop);
    }

    game.appendChild(wrap);
    setTimeout(() => wrap.remove(), lifeMs + 200);
  }

  

  // Track rapid paint gathering per bucket.
  // Faster repeated taps make a temporarily messier splatter.
  const bucketSplatActivity = new WeakMap();

  function getBucketMessLevel(source) {
    const now = performance.now();
    const previous = bucketSplatActivity.get(source) || {
      lastTap: 0,
      mess: 0
    };

    const gap = now - previous.lastTap;

    // Build mess quickly when the player is tapping rapidly.
    if (gap < 180) {
      previous.mess = Math.min(4, previous.mess + 1.15);
    } else if (gap < 320) {
      previous.mess = Math.min(4, previous.mess + 0.75);
    } else if (gap < 520) {
      previous.mess = Math.min(4, previous.mess + 0.35);
    } else {
      // Slow tapping lets the mess level cool down.
      previous.mess = Math.max(0, previous.mess - Math.min(2.2, gap / 700));
    }

    previous.lastTap = now;
    bucketSplatActivity.set(source, previous);
    return previous.mess;
  }

  function weightedTapSplatDistance(size, messLevel) {
    const roll = Math.random();

    // At normal speed:
    // ~68% close, ~24% medium, ~8% far.
    //
    // Rapid clicking shifts more probability into medium/far spray.
    const farChance = Math.min(.20, .08 + messLevel * .03);
    const mediumChance = Math.min(.34, .24 + messLevel * .025);

    if (roll < farChance) {
      return randomBetween(size * 1.25, size * (1.85 + messLevel * .16));
    }

    if (roll < farChance + mediumChance) {
      return randomBetween(size * .82, size * (1.35 + messLevel * .10));
    }

    return randomBetween(size * .42, size * .92);
  }

  function createCanvasTapSplat(source, color) {
    const game = document.querySelector("#game");
    if (!game || !source) return;

    const sourceRect = source.getBoundingClientRect();
    const gameRect = game.getBoundingClientRect();
    const messLevel = getBucketMessLevel(source);

    const wrap = document.createElement("div");
    wrap.className = "canvasTapSplat";

    const centerX = sourceRect.left - gameRect.left + sourceRect.width / 2;
    const centerY = sourceRect.top - gameRect.top + sourceRect.height / 2;

    // Start just outside the bucket edge so the paint reads as hitting the canvas.
    const angle = randomBetween(0, Math.PI * 2);
    const edgeDistance = randomBetween(
      sourceRect.width * .62,
      sourceRect.width * (1.18 + messLevel * .08)
    );
    const offsetX = Math.cos(angle) * edgeDistance;
    const offsetY = Math.sin(angle) * edgeDistance;

    wrap.style.left = `${centerX + offsetX}px`;
    wrap.style.top = `${centerY + offsetY}px`;

    const splatColor = paintSplatColors[color] || "#999";
    const size = randomBetween(26, 48);

    const main = document.createElement("div");
    main.className = "canvasTapSplatMain";
    main.style.width = `${size}px`;
    main.style.height = `${randomBetween(size * .65, size)}px`;
    main.style.background = splatColor;
    main.style.borderRadius =
      `${randomBetween(38,58)}% ${randomBetween(38,58)}% ${randomBetween(38,58)}% ${randomBetween(38,58)}% / ` +
      `${randomBetween(38,58)}% ${randomBetween(38,58)}% ${randomBetween(38,58)}% ${randomBetween(38,58)}%`;

    wrap.appendChild(main);

    // Faster tapping = more droplets, but individual droplet sizes stay unchanged.
    const drops = Math.floor(randomBetween(2, 5) + messLevel * randomBetween(1.0, 2.0));
    for (let i = 0; i < drops; i++) {
      const drop = document.createElement("div");
      drop.className = "canvasTapDrop";

      const dropSize = randomBetween(3, 9);
      const angle = randomBetween(0, Math.PI * 2);
      const distance = weightedTapSplatDistance(size, messLevel);

      drop.style.width = `${dropSize}px`;
      drop.style.height = `${dropSize}px`;
      drop.style.left = `${Math.cos(angle) * distance}px`;
      drop.style.top = `${Math.sin(angle) * distance}px`;
      drop.style.background = splatColor;

      wrap.appendChild(drop);
    }

    const lifeMs = randomBetween(7000, 12000);
    wrap.style.setProperty("--tapLife", `${lifeMs / 1000}s`);

    game.appendChild(wrap);

    setTimeout(() => wrap.remove(), lifeMs + 300);
  }

function paintSplatBurst(color) {
    const splatCount = Math.floor(randomBetween(1, 6));
    for (let i = 0; i < splatCount; i++) {
      const delay = randomBetween(0, 250);
      setTimeout(() => createSinglePaintSplat(color), delay);
    }
  }



  // =========================================================
  // MAJOR NOTIFICATIONS
  // Persistent, queued notices for meaningful progression events.
  // =========================================================

  const majorNoticeQueue = [];
  let majorNoticeShowing = false;
  let currentMajorNotice = null;

  const majorNoticeDefaults = {
    unlock:    { icon: "🔓", title: "New Unlock!" },
    level:     { icon: "⭐", title: "Studio Level Up!" },
    discovery: { icon: "🎨", title: "New Discovery!" },
    reward:    { icon: "🎁", title: "Reward!" },
    warning:   { icon: "⚠️", title: "Important" }
  };

  function showMajorNotice(type, text, options = {}) {
    majorNoticeQueue.push({
      type: majorNoticeDefaults[type] ? type : "unlock",
      text,
      title: options.title,
      icon: options.icon
    });
    displayNextMajorNotice();
  }

  function displayNextMajorNotice() {
    if (majorNoticeShowing || majorNoticeQueue.length === 0) return;

    const notice = majorNoticeQueue.shift();
    currentMajorNotice = notice;
    const defaults = majorNoticeDefaults[notice.type];

    const overlay = document.querySelector("#majorNoticeOverlay");
    const card = document.querySelector("#majorNoticeCard");
    const icon = document.querySelector("#majorNoticeIcon");
    const title = document.querySelector("#majorNoticeTitle");
    const text = document.querySelector("#majorNoticeText");

    if (!overlay || !card || !icon || !title || !text) {
      currentMajorNotice = null;
      return;
    }

    majorNoticeShowing = true;
    card.className = `majorNoticeCard notice-${notice.type}`;
    icon.textContent = notice.icon || defaults.icon;
    title.textContent = notice.title || defaults.title;
    text.textContent = notice.text;
    overlay.classList.add("open");
  }

  function closeMajorNotice() {
    if (!majorNoticeShowing) return;

    const overlay = document.querySelector("#majorNoticeOverlay");
    majorNoticeShowing = false;
    currentMajorNotice = null;
    overlay?.classList.remove("open");

    // Queue advances only after the current card is fully dismissed.
    setTimeout(() => {
      if (!majorNoticeShowing) displayNextMajorNotice();
    }, 120);
  }

  // Delegated listener is resilient to re-rendering and guarantees one close path.
  document.addEventListener("click", event => {
    const okBtn = event.target.closest("#majorNoticeOkBtn");
    if (!okBtn) return;
    event.preventDefault();
    event.stopPropagation();
    closeMajorNotice();
  });
