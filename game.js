(() => {

  // =========================================================
  // STATE
  // =========================================================

  let coins = 0;

  let TUBE_COUNT = 1;
  let VIAL_COUNT = 1;

  // onboarding gates — teach one thing at a time before the full game opens up
  let primaryBucketSlots = 0;      // purchased extra primary buckets
  let primaryBucketColors = [];    // colors currently occupying those buckets
  let firstPrimaryChoice = null;   // "yellow" or "blue"
  let pendingPrimaryBucketPosition = null;
  let yellowUnlocked = false;
  let mixerUnlocked = false;
  let blueUnlocked = false;
  let ordersUnlocked = false;

  let tubes = [];   // [{ color: null|string, amount: number }, ...] length TUBE_COUNT
  let vials = [];   // [{ color: null|string, amount: number }, ...] length VIAL_COUNT
  let bagCapacityPerTube = 4;
  let storageCapacityPerVial = 4;

  // how many "parts" one item of a mixed color takes up in a vial —
  // secondary colors (2 raw ingredients) take 2 parts; raw colors are implicitly 1.
  // tertiary colors (3-ingredient mixes) would go here as 3 once those exist.
  const colorWeight = {
    purple: 2, orange: 2, green: 2, pink: 2, skyblue: 2, cream: 2
  };

  function weightOf(color) { return colorWeight[color] || 1; }

  let dropperArmed = false;
  let dropperIngredients = []; // [{ color, source: 'field'|'tube' }, ...] up to 2

  let whiteUnlocked = false;

  let minionCount = 0;
  let minionSpeedLevel = 0;
  let minionCarryLevel = 0;
  const minions = [];

  let totalGathered = 0;
  let totalSold = 0;
  let totalMixed = 0;
  let totalFulfilled = 0;
  let studioEarningsBonus = 0;

  let activeStoreTab = "store";
  let sellMode = false;
  let rearrangeUnlocked = false;

  const GRID = 30;

  const defaultPositionFractions = {
    red:    { x: 0.06, y: 0.04 },
    blue:   { x: 0.74, y: 0.20 },
    yellow: { x: 0.26, y: 0.55 },
    white:  { x: 0.60, y: 0.78 }
  };

  const sourcePositions = {};

  // =========================================================
  // COLOR DATA
  // =========================================================

  const colorInfo = {
    red:     { emoji: "🔴", label: "Red" },
    blue:    { emoji: "🔵", label: "Blue" },
    yellow:  { emoji: "🟡", label: "Yellow" },
    white:   { emoji: "⚪", label: "White" },
    purple:  { emoji: "🟣", label: "Purple" },
    orange:  { emoji: "🟠", label: "Orange" },
    green:   { emoji: "🟢", label: "Green" },
    pink:    { emoji: "🩷", label: "Pink" },
    skyblue: { emoji: "🩵", label: "Sky Blue" },
    cream:   { emoji: "🟤", label: "Cream" }
  };

  const paintSplatColors = {
    red: "#ff6b6b",
    blue: "#6fa8ff",
    yellow: "#ffd95f",
    white: "#f7f7f2",
    purple: "#8e5bd9",
    orange: "#ff9f43",
    green: "#55c96b",
    pink: "#ff8fc7",
    skyblue: "#7fcfff",
    cream: "#f3df9b"
  };

  // =========================================================
  // RECIPES
  // =========================================================

  const baseRecipes = [
    { a: "red", b: "blue", result: "purple" },
    { a: "red", b: "yellow", result: "orange" },
    { a: "blue", b: "yellow", result: "green" }
  ];

  const whiteRecipes = [
    { a: "red", b: "white", result: "pink" },
    { a: "blue", b: "white", result: "skyblue" },
    { a: "yellow", b: "white", result: "cream" }
  ];

  function activeRecipes() {
    return whiteUnlocked ? baseRecipes.concat(whiteRecipes) : baseRecipes;
  }

  function findRecipeForPair(colorA, colorB) {
    return activeRecipes().find(r =>
      (r.a === colorA && r.b === colorB) || (r.a === colorB && r.b === colorA)
    );
  }

  // =========================================================
  // ORDERS
  // =========================================================

  function activeOrderColors() {
    const colors = ["purple", "orange", "green"];
    if (whiteUnlocked) colors.push("pink", "skyblue", "cream");
    return colors;
  }

  function makeOrder(color) {
    const baseReward = { purple: 10, orange: 12, green: 12, pink: 14, skyblue: 14, cream: 14 };
    return { color, reward: baseReward[color] || 10 };
  }

  let currentOrder = makeOrder("purple");

  // =========================================================
  // JOURNAL / PROCESSES
  // =========================================================

  let currentProcessIndex = 0;
  let followedStepId = "gatherRed";
  let completedJournalSteps = {};
  let completedProcessRewards = {};
  let colorGuideUnlocked = false;
  let activeJournalTab = "processes";
  const discoveredColors = {};

  const processes = [
    {
      id: "firstPaint",
      title: "Process 1 — My First Paint",
      description: "Learn the basics of gathering and selling paint.",
      completionText: "Store unlocked!",
      steps: [
        { id: "gatherRed", desc: "Gather 4 Red paint", target: 4, progress: () => Math.min(totalGathered, 4) },
        { id: "sellRed", desc: "Sell 4 paint", target: 4, progress: () => Math.min(totalSold, 4) }
      ]
    },
    {
      id: "yellowBucket",
      title: "Process 2 — Add a Primary",
      description: "Expand storage, add an empty primary bucket, then choose a new paint color.",
      completionText: "Primary production expanded!",
      steps: [
        { id: "buyTube", desc: "Buy a new tube", target: 1, progress: () => TUBE_COUNT >= 2 ? 1 : 0 },
        { id: "buyPrimaryBucket", desc: "Buy a Primary Bucket", target: 1, progress: () => primaryBucketSlots >= 1 ? 1 : 0 },
        { id: "buyNewColor", desc: "Buy a new primary color", target: 1, progress: () => (yellowUnlocked || blueUnlocked) ? 1 : 0 }
      ]
    },
    {
      id: "experiment",
      title: "Process 3 — Experiment",
      description: "Set up the tools you need to begin mixing paint.",
      completionText: "Mixing production established!",
      steps: [
        { id: "buyMixer", desc: "Buy the Mixer", target: 1, progress: () => mixerUnlocked ? 1 : 0 },
        { id: "firstMix", desc: "Create your first mixed color", target: 1, progress: () => Math.min(totalMixed, 1) }
      ]
    },
    {
      id: "primaries",
      title: "Process 4 — Complete the Primaries",
      description: "Bring the third primary into the studio and begin working with customers.",
      completionText: "Orders unlocked!",
      steps: [
        { id: "buyPrimaryBucket2", desc: "Buy another Primary Bucket", target: 1, progress: () => primaryBucketSlots >= 2 ? 1 : 0 },
        { id: "buyRemainingPrimary", desc: "Buy the remaining primary color", target: 1, progress: () => (yellowUnlocked && blueUnlocked) ? 1 : 0 },
        { id: "buyOrders", desc: "Open Orders", target: 1, progress: () => ordersUnlocked ? 1 : 0 }
      ]
    },
    {
      id: "workingArtist",
      title: "Process 5 — Working Artist",
      description: "Put the studio to work.",
      completionText: "Studio earnings boosted!",
      steps: [
        { id: "fulfill3", desc: "Fulfill 3 orders", target: 3, progress: () => Math.min(totalFulfilled, 3) },
        { id: "collect20", desc: "Gather 20 paint total", target: 20, progress: () => Math.min(totalGathered, 20) }
      ]
    }
  ];

  function getCurrentProcess() {
    return processes[Math.min(currentProcessIndex, processes.length - 1)];
  }

  function findStepById(stepId) {
    for (const process of processes) {
      const step = process.steps.find(s => s.id === stepId);
      if (step) return { process, step };
    }
    return null;
  }

  function isStepComplete(step) {
    return !!completedJournalSteps[step.id];
  }

  function isProcessComplete(process) {
    return process.steps.every(isStepComplete);
  }

  function firstIncompleteStep(process) {
    return process.steps.find(step => !isStepComplete(step)) || process.steps[0];
  }

  function ensureFollowedStep() {
    const current = getCurrentProcess();
    const found = findStepById(followedStepId);

    if (!found || found.process.id !== current.id || isStepComplete(found.step)) {
      const next = firstIncompleteStep(current);
      followedStepId = next ? next.id : current.steps[0].id;
    }
  }

  function awardProcessCompletion(process) {
    if (!process || completedProcessRewards[process.id]) return;
    completedProcessRewards[process.id] = true;

    // Process rewards are progression rewards, not little coin payouts.
    if (process.id === "firstPaint") {
      // Completing Process 1 unlocks the Store.
      say("🎉 Process complete — Store unlocked!");
    } else if (process.id === "yellowBucket") {
      // Process reward is progression, not an automatic capacity increase.
      say("🎉 Process complete — Experimenting unlocked!");
    } else if (process.id === "experiment") {
      say("🎉 Process complete — Color Guide expanded!");
    } else if (process.id === "primaries") {
      say("🎉 Process complete — Customer work established!");
    } else if (process.id === "workingArtist") {
      // Simple earnings milestone for now: future order payouts get boosted.
      studioEarningsBonus += 1;
      say("🎉 Process complete — Studio earnings +1!");
    }

    saveState();
  }

  function advanceCompletedProcesses() {
    while (
      currentProcessIndex < processes.length - 1 &&
      isProcessComplete(processes[currentProcessIndex])
    ) {
      const completed = processes[currentProcessIndex];
      awardProcessCompletion(completed);
      currentProcessIndex++;
      followedStepId = firstIncompleteStep(getCurrentProcess()).id;
    }

    if (
      currentProcessIndex === processes.length - 1 &&
      isProcessComplete(processes[currentProcessIndex])
    ) {
      awardProcessCompletion(processes[currentProcessIndex]);
    }
  }

  function checkJournalSteps() {
    let changed = false;
    const current = getCurrentProcess();

    current.steps.forEach(step => {
      if (!isStepComplete(step) && step.progress() >= step.target) {
        completedJournalSteps[step.id] = true;
        changed = true;
        say("✅ Step complete!");
      }
    });

    advanceCompletedProcesses();
    ensureFollowedStep();

    if (changed) {
      renderAll();
    } else {
      renderJournalTeaser();
      if (document.querySelector("#journalOverlay")?.classList.contains("open")) {
        renderJournal();
      }
    }
  }

  function checkQuests() {
    checkJournalSteps();
  }

  function renderQuest() {
    renderJournalTeaser();
  }

  function renderJournalTeaser() {
    const questText = document.querySelector("#questText");
    const questProgress = document.querySelector("#questProgress");
    const current = getCurrentProcess();

    if (currentProcessIndex === processes.length - 1 && isProcessComplete(current)) {
      questText.textContent = "📖 Starter Processes complete!";
      questProgress.textContent = "Open Journal";
      return;
    }

    ensureFollowedStep();
    const found = findStepById(followedStepId);
    const step = found ? found.step : firstIncompleteStep(current);
    const progress = Math.min(step.progress(), step.target);

    questText.textContent = `📖 ${current.title}: ${step.desc}`;
    questProgress.textContent = `${progress} / ${step.target}`;
  }

  function selectJournalStep(stepId) {
    const found = findStepById(stepId);
    if (!found || found.process.id !== getCurrentProcess().id || isStepComplete(found.step)) return;

    followedStepId = stepId;
    renderJournalTeaser();
    renderJournal();
    saveState();
  }

  function isColorDiscovered(color) {
    if (color === "red") return true;
    if (color === "yellow") return yellowUnlocked;
    if (color === "blue") return blueUnlocked;
    if (color === "white") return whiteUnlocked;
    return !!discoveredColors[color];
  }

  function recordColorDiscovery(color) {
    if (isColorDiscovered(color)) return false;

    discoveredColors[color] = true;

    if (!colorGuideUnlocked) {
      colorGuideUnlocked = true;
      activeJournalTab = "guide";
      setTimeout(() => say("📖 Color Guide added to your Journal!"), 450);
    }

    saveState();
    return true;
  }

  function recipeTextForColor(color) {
    const recipe = baseRecipes.concat(whiteRecipes).find(r => r.result === color);
    if (!recipe) return "Primary paint";
    return `${colorInfo[recipe.a].emoji} + ${colorInfo[recipe.b].emoji}`;
  }

  function renderJournalProcesses() {
    const list = document.querySelector("#journalProcessList");
    list.innerHTML = "";

    processes.forEach((process, index) => {
      const card = document.createElement("div");
      card.className = "journalProcessCard";

      if (index < currentProcessIndex || isProcessComplete(process)) card.classList.add("complete");
      if (index > currentProcessIndex) card.classList.add("future");

      const title = document.createElement("div");
      title.className = "journalProcessTitle";
      title.textContent = `${index < currentProcessIndex || isProcessComplete(process) ? "✓ " : ""}${process.title}`;
      card.appendChild(title);

      const desc = document.createElement("div");
      desc.className = "journalProcessDesc";
      desc.textContent = process.description;
      card.appendChild(desc);

      if (index === currentProcessIndex) {
        process.steps.forEach(step => {
          const row = document.createElement("button");
          row.className = "journalStepBtn";

          const complete = isStepComplete(step);
          const following = followedStepId === step.id && !complete;

          if (complete) row.classList.add("complete");
          if (following) row.classList.add("following");

          const progress = Math.min(step.progress(), step.target);

          row.innerHTML = `
            <span class="journalStepMain">
              <span class="journalStepMark">${complete ? "✓" : following ? "▶" : "○"}</span>
              <span>${step.desc}</span>
            </span>
            <span class="journalStepProgress">${progress}/${step.target}</span>
          `;

          row.disabled = complete;
          row.addEventListener("click", () => selectJournalStep(step.id));
          card.appendChild(row);
        });

        const hint = document.createElement("div");
        hint.className = "journalFollowHint";
        hint.textContent = "Tap an unfinished step to follow it on the main screen.";
        card.appendChild(hint);
      }

      list.appendChild(card);
    });
  }

  function renderColorGuide() {
    const panel = document.querySelector("#colorGuidePanel");
    panel.innerHTML = "";

    const groups = [
      { title: "Primary", colors: ["red", "yellow", "blue"] },
      { title: "Secondary", colors: ["orange", "purple", "green"] },
      { title: "Light Mixes", colors: ["pink", "skyblue", "cream"] }
    ];

    groups.forEach(group => {
      const heading = document.createElement("div");
      heading.className = "guideGroupTitle";
      heading.textContent = group.title;
      panel.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "guideGrid";

      group.colors.forEach(color => {
        const discovered = isColorDiscovered(color);
        const card = document.createElement("div");
        card.className = "guideColorCard" + (discovered ? "" : " locked");

        if (discovered) {
          card.innerHTML = `
            <div class="guideColorEmoji">${colorInfo[color].emoji}</div>
            <div class="guideColorName">${colorInfo[color].label}</div>
            <div class="guideRecipe">${recipeTextForColor(color)}</div>
          `;
        } else {
          card.innerHTML = `
            <div class="guideColorEmoji">❔</div>
            <div class="guideColorName">???</div>
            <div class="guideRecipe">Undiscovered</div>
          `;
        }

        grid.appendChild(card);
      });

      panel.appendChild(grid);
    });
  }

  function setJournalTab(tab) {
    if (tab === "guide" && !colorGuideUnlocked) return;

    activeJournalTab = tab;

    document.querySelector("#journalProcessesTab").classList.toggle("active", tab === "processes");
    document.querySelector("#journalGuideTab").classList.toggle("active", tab === "guide");

    document.querySelector("#journalProcessList").style.display = tab === "processes" ? "block" : "none";
    document.querySelector("#colorGuidePanel").style.display = tab === "guide" ? "block" : "none";

    if (tab === "guide") renderColorGuide();
  }

  function renderJournal() {
    const guideTab = document.querySelector("#journalGuideTab");
    guideTab.style.display = colorGuideUnlocked ? "block" : "none";

    renderJournalProcesses();

    if (!colorGuideUnlocked && activeJournalTab === "guide") {
      activeJournalTab = "processes";
    }

    setJournalTab(activeJournalTab);
  }

  function emptyPrimaryBucketCount() {
    return Math.max(0, primaryBucketSlots - primaryBucketColors.length);
  }

  function primaryColorOwned(color) {
    return color === "yellow" ? yellowUnlocked : color === "blue" ? blueUnlocked : false;
  }

  function primaryColorPrice(color) {
    // First extra primary is cheap. The unchosen primary gets more expensive.
    if (!firstPrimaryChoice) return 5;
    if (firstPrimaryChoice === color) return 5;
    return 12;
  }

  function canPurchasePrimaryColor(color) {
    if (primaryColorOwned(color)) return false;
    return emptyPrimaryBucketCount() > 0;
  }

  function purchasePrimaryColor(color) {
    if (primaryColorOwned(color)) {
      say(`${colorInfo[color].label} is already in a bucket`);
      return false;
    }

    if (emptyPrimaryBucketCount() <= 0) {
      say(`🚫 No empty bucket for ${colorInfo[color].label}!`);
      return false;
    }

    const price = primaryColorPrice(color);
    if (coins < price) {
      say("Not enough coins");
      return false;
    }

    coins -= price;
    primaryBucketColors.push(color);

    if (!firstPrimaryChoice) firstPrimaryChoice = color;

    if (color === "yellow") {
      yellowUnlocked = true;
      const el = document.querySelector("#yellow");
      el.style.display = "grid";
      if (pendingPrimaryBucketPosition) {
        el.style.left = pendingPrimaryBucketPosition.left + "px";
        el.style.top = pendingPrimaryBucketPosition.top + "px";
        sourcePositions.yellow = { ...pendingPrimaryBucketPosition };
      }
    } else if (color === "blue") {
      blueUnlocked = true;
      const el = document.querySelector("#blue");
      el.style.display = "grid";
      if (pendingPrimaryBucketPosition) {
        el.style.left = pendingPrimaryBucketPosition.left + "px";
        el.style.top = pendingPrimaryBucketPosition.top + "px";
        sourcePositions.blue = { ...pendingPrimaryBucketPosition };
      }
    }

    const emptyBucketEl = document.querySelector("#emptyPrimaryBucket");
    if (emptyBucketEl) emptyBucketEl.dataset.placed = "false";
    pendingPrimaryBucketPosition = null;
    refreshPrimaryBucketVisual();
    say(`${colorInfo[color].emoji} ${colorInfo[color].label} added to your new bucket!`);
    renderAll();
    checkJournalSteps();
    saveState();
    return true;
  }

  function refreshPrimaryBucketVisual() {
    const emptyBucket = document.querySelector("#emptyPrimaryBucket");
    if (!emptyBucket) return;

    const hasEmpty = emptyPrimaryBucketCount() > 0;
    emptyBucket.style.display = hasEmpty ? "grid" : "none";

    if (!hasEmpty) return;

    // Keep its current position once placed so it doesn't jump around on every render.
    if (emptyBucket.dataset.placed === "true") return;

    const fieldRect = field.getBoundingClientRect();
    const bucketW = emptyBucket.offsetWidth || 78;
    const bucketH = emptyBucket.offsetHeight || 78;
    const padding = 10;

    const occupied = Array.from(document.querySelectorAll(".source[data-color]"))
      .filter(el => el.style.display !== "none")
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - fieldRect.left - padding,
          top: r.top - fieldRect.top - padding,
          right: r.right - fieldRect.left + padding,
          bottom: r.bottom - fieldRect.top + padding
        };
      });

    function overlapsAny(left, top) {
      const rect = {
        left,
        top,
        right: left + bucketW,
        bottom: top + bucketH
      };

      return occupied.some(o =>
        rect.left < o.right &&
        rect.right > o.left &&
        rect.top < o.bottom &&
        rect.bottom > o.top
      );
    }

    const maxLeft = Math.max(0, fieldRect.width - bucketW);
    const maxTop = Math.max(0, fieldRect.height - bucketH);

    let chosen = null;

    // Try a bunch of random positions until we find a clear one.
    for (let i = 0; i < 40; i++) {
      const left = Math.round(Math.random() * maxLeft);
      const top = Math.round(Math.random() * maxTop);

      if (!overlapsAny(left, top)) {
        chosen = { left, top };
        break;
      }
    }

    // Fallback: use a safe-ish corner if the field is crowded.
    if (!chosen) {
      const candidates = [
        { left: maxLeft, top: 0 },
        { left: 0, top: maxTop },
        { left: maxLeft, top: maxTop },
        { left: Math.round(maxLeft / 2), top: maxTop }
      ];

      chosen = candidates.find(p => !overlapsAny(p.left, p.top)) || { left: 0, top: 0 };
    }

    emptyBucket.style.left = chosen.left + "px";
    emptyBucket.style.top = chosen.top + "px";
    emptyBucket.dataset.placed = "true";
    pendingPrimaryBucketPosition = { left: chosen.left, top: chosen.top };
  }

  // =========================================================
  // STORE ITEMS (one-time / repeatable tool purchases)
  // =========================================================

  const storeItems = [
    {
      id: "buyPrimaryBucket",
      name: "Buy a Primary Bucket",
      level: 0,
      maxLevel: 2,
      baseCost: 10,
      growth: 2,
      visible: () => {
        if (currentProcessIndex < 1) return false;
        if (TUBE_COUNT < 2) return false;
        // First extra primary bucket is available in Process 2.
        if (primaryBucketSlots === 0) return true;
        // Second becomes available after the first mixed-color discovery / Process 4.
        return currentProcessIndex >= 3 && primaryBucketSlots < 2;
      },
      desc: function () {
        return primaryBucketSlots === 0
          ? "Adds one empty permanent primary bucket to your studio"
          : "Adds another empty permanent primary bucket to your studio";
      },
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () {
        primaryBucketSlots++;
        this.level++;
        const emptyBucketEl = document.querySelector("#emptyPrimaryBucket");
        if (emptyBucketEl) emptyBucketEl.dataset.placed = "false";
        refreshPrimaryBucketVisual();
      }
    },
    {
      id: "unlockYellow",
      name: "Yellow Paint",
      level: 0,
      maxLevel: 1,
      baseCost: 5,
      growth: 1,
      visible: () => currentProcessIndex >= 1 && !yellowUnlocked,
      desc: () => emptyPrimaryBucketCount() > 0
        ? `Fill an empty primary bucket with Yellow`
        : `No empty primary bucket available`,
      cost: function () { return primaryColorPrice("yellow"); },
      customBuy: () => purchasePrimaryColor("yellow"),
      buy: function () {}
    },
    {
      id: "unlockBlue",
      name: "Blue Paint",
      level: 0,
      maxLevel: 1,
      baseCost: 5,
      growth: 1,
      visible: () => currentProcessIndex >= 1 && !blueUnlocked,
      desc: () => emptyPrimaryBucketCount() > 0
        ? `Fill an empty primary bucket with Blue`
        : `No empty primary bucket available`,
      cost: function () { return primaryColorPrice("blue"); },
      customBuy: () => purchasePrimaryColor("blue"),
      buy: function () {}
    },
    {
      id: "mixer",
      name: "Buy the Mixer",
      level: 0,
      maxLevel: 1,
      baseCost: 20,
      growth: 1,
      visible: () => currentProcessIndex >= 2 && !mixerUnlocked,
      desc: () => "Unlocks paint mixing and the Paint Vials area",
      cost: function () { return this.baseCost; },
      buy: function () {
        mixerUnlocked = true;
        this.level = 1;
        document.querySelector("#warehouseRow").style.display = "block";
        const mixerToolBtnEl = document.querySelector("#mixerToolBtn");
        if (mixerToolBtnEl) mixerToolBtnEl.style.display = "flex";
      }
    },
    {
      id: "unlockOrders",
      name: "Unlock Orders",
      level: 0,
      maxLevel: 1,
      baseCost: 40,
      growth: 1,
      visible: () => yellowUnlocked && blueUnlocked && !ordersUnlocked,
      desc: () => "Customers start placing paint orders for coins",
      cost: function () { return this.baseCost; },
      buy: function () {
        ordersUnlocked = true;
        this.level = 1;
        document.querySelector("#order").style.display = "block";
        document.querySelector("#fulfillBtn").style.display = "block";
      }
    },
    {
      id: "tubeSlot",
      name: "Buy a Tube",
      level: 0,
      maxLevel: 1,
      baseCost: 8,
      growth: 1,
      visible: () => currentProcessIndex >= 1,
      desc: function () {
        return this.level >= 1
          ? "Starter tube purchased"
          : "Adds a second empty tube to your Paint Case";
      },
      cost: function () { return this.baseCost; },
      buy: function () {
        if (this.level >= 1) return;
        tubes.push({ color: null, amount: 0 });
        TUBE_COUNT++;
        this.level = 1;
      }
    },
    {
      id: "white",
      name: "Unlock White Source",
      level: 0,
      maxLevel: 1,
      baseCost: 50,
      growth: 1,
      visible: () => ordersUnlocked,
      desc: () => "Adds a 4th raw color + 3 new mixable colors (pink, sky blue, cream)",
      cost: function () { return this.baseCost; },
      buy: function () {
        whiteUnlocked = true;
        this.level = 1;
        document.querySelector("#white").style.display = "grid";
      }
    },
    {
      id: "minion",
      name: "Hire a Minion",
      level: 0,
      baseCost: 40,
      growth: 1.8,
      visible: () => ordersUnlocked,
      desc: function () { return `A minion that walks between sources and gathers on its own. Minions: ${minionCount} (only while the game is open — no offline progress yet)`; },
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { minionCount++; this.level++; spawnMinion(); }
    }
  ];

  // =========================================================
  // TOOL UPGRADES (level up things you already own)
  // =========================================================

  const toolUpgrades = [
    {
      id: "backpack",
      name: "Bigger Tubes",
      level: 0,
      baseCost: 20,
      growth: 1.6,
      visible: () => ordersUnlocked,
      desc: () => `Each color tube holds: ${bagCapacityPerTube} → ${bagCapacityPerTube + 4}`,
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { bagCapacityPerTube += 4; this.level++; }
    },
    {
      id: "storage",
      name: "Bigger Vials",
      level: 0,
      baseCost: 25,
      growth: 1.6,
      visible: () => ordersUnlocked,
      desc: () => `Each color vial holds: ${storageCapacityPerVial} → ${storageCapacityPerVial + 4}`,
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { storageCapacityPerVial += 4; this.level++; }
    },
    {
      id: "minionSpeed",
      name: "Faster Minions",
      level: 0,
      maxLevel: 5,
      baseCost: 30,
      growth: 1.7,
      visible: () => ordersUnlocked,
      requires: () => minionCount > 0,
      lockedNote: "Hire a minion in the Store tab first",
      desc: function () { return `Minions gather quicker. Speed level ${this.level} / ${this.maxLevel}`; },
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { minionSpeedLevel++; this.level++; }
    },
    {
      id: "minionCarry",
      name: "Bigger Scoops",
      level: 0,
      maxLevel: 3,
      baseCost: 35,
      growth: 1.8,
      visible: () => ordersUnlocked,
      requires: () => minionCount > 0,
      lockedNote: "Hire a minion in the Store tab first",
      desc: function () { return `Minions collect more per visit. Currently ${1 + this.level} at a time.`; },
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { minionCarryLevel++; this.level++; }
    }
  ];

  function minionTravelMs() { return Math.max(3000, 8000 - minionSpeedLevel * 900); }
  function minionPauseMs() { return Math.max(1000, 2600 - minionSpeedLevel * 250); }
  function minionCarryAmount() { return 1 + minionCarryLevel; }

  // =========================================================
  // STORE LOGIC
  // =========================================================

  function cheapestAffordableExists() {
    const affordable = list => list.some(item => {
      if (item.visible && !item.visible()) return false;
      if (item.maxLevel && item.level >= item.maxLevel) return false;
      if (item.requires && !item.requires()) return false;
      return coins >= item.cost();
    });
    return affordable(storeItems) || affordable(toolUpgrades);
  }

  function buyFromList(list, id) {
    const item = list.find(i => i.id === id);
    if (!item) return;
    if (item.maxLevel && item.level >= item.maxLevel) return;

    if (item.customBuy) {
      item.customBuy();
      return;
    }

    const cost = item.cost();
    if (coins < cost) { say("Not enough coins"); return; }
    coins -= cost;
    item.buy();
    say(`${item.name} purchased!`);
    renderAll();
    checkJournalSteps();
  }

  function renderUpgradeCard(item, list) {
    const maxed = item.maxLevel && item.level >= item.maxLevel;
    const locked = item.requires && !item.requires();
    const soldOut = maxed && (item.id === "tubeSlot" || item.id === "buyPrimaryBucket");
    const primaryPaintItem = item.id === "unlockYellow" || item.id === "unlockBlue";
    const primaryPaintPreBucketLocked = primaryPaintItem && primaryBucketSlots === 0;

    const card = document.createElement("div");
    card.className = "upgradeCard";
    if (soldOut) card.classList.add("soldOut");

    const info = document.createElement("div");
    info.className = "upgradeInfo";
    info.innerHTML = `
      <div class="upgradeName">${item.name}${maxed ? " (Maxed)" : ""}</div>
      <div class="upgradeDesc">${locked ? item.lockedNote : (typeof item.desc === "function" ? item.desc() : item.desc)}</div>
    `;

    const buyBtn = document.createElement("button");
    buyBtn.className = "upgradeBuyBtn";
    buyBtn.textContent = soldOut ? "SOLD OUT" : maxed ? "✓" : `🪙 ${item.cost()}`;
    const affordableNow = !maxed && !locked && !primaryPaintPreBucketLocked && coins >= item.cost();

    buyBtn.disabled = !affordableNow;
    if (primaryPaintPreBucketLocked) card.classList.add("storeItemLocked");
    if (affordableNow) {
      card.classList.add("affordable");
      buyBtn.classList.add("affordable");
    }
    buyBtn.addEventListener("click", () => buyFromList(list, item.id));

    card.appendChild(info);
    card.appendChild(buyBtn);
    return card;
  }

  function renderStore() {
    const list = document.querySelector("#upgradeList");
    list.innerHTML = "";

    const allItems = activeStoreTab === "store" ? storeItems : toolUpgrades;
    const items = allItems.filter(item => !item.visible || item.visible());

    if (items.length === 0) {
      const note = document.createElement("div");
      note.id = "emptyTabNote";
      note.textContent = activeStoreTab === "store"
        ? "Nothing new to buy yet — keep playing!"
        : "No tools owned yet — buy one in the Store tab to unlock its upgrades.";
      list.appendChild(note);
      return;
    }

    items.forEach(item => list.appendChild(renderUpgradeCard(item, allItems)));
  }

  function setStoreTab(tab) {
    activeStoreTab = tab;
    document.querySelector("#storeTabBtn").classList.toggle("active", tab === "store");
    document.querySelector("#upgradeTabBtn").classList.toggle("active", tab === "upgrades");
    renderStore();
  }

  // =========================================================
  // FIELD / SOURCE POSITIONS
  // =========================================================

  const field = document.querySelector("#field");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function initSourcePositions() {
    const fieldRect = field.getBoundingClientRect();
    Object.keys(defaultPositionFractions).forEach(color => {
      if (!sourcePositions[color]) {
        const frac = defaultPositionFractions[color];
        sourcePositions[color] = color === "red"
          ? {
              left: Math.round((fieldRect.width - 78) / 2),
              top: Math.round((fieldRect.height - 78) / 2)
            }
          : {
              left: Math.round(frac.x * fieldRect.width),
              top: Math.round(frac.y * fieldRect.height)
            };
      }
    });
  }

  function applySourcePositions() {
    Object.keys(sourcePositions).forEach(color => {
      const el = document.getElementById(color);
      if (!el) return;
      el.style.left = sourcePositions[color].left + "px";
      el.style.top = sourcePositions[color].top + "px";
    });
  }

  function getUnlockedSources() {
    return Array.from(document.querySelectorAll(".source[data-color]")).filter(el => el.style.display !== "none");
  }

  function beginDragSource(sourceEl, startEvent) {
    if (!rearrangeUnlocked) return;

    const color = sourceEl.dataset.color;
    const fieldRect = field.getBoundingClientRect();

    const startLeft = parseFloat(sourceEl.style.left) || 0;
    const startTop = parseFloat(sourceEl.style.top) || 0;
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;

    sourceEl.classList.add("jiggling");
    sourceEl.classList.add("dragging");
    sourceEl.style.transition = "none";

    if (navigator.vibrate) navigator.vibrate(20);

    function onDragMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = clamp(startLeft + dx, 0, fieldRect.width - sourceEl.offsetWidth);
      const newTop = clamp(startTop + dy, 0, fieldRect.height - sourceEl.offsetHeight);

      sourceEl.style.left = newLeft + "px";
      sourceEl.style.top = newTop + "px";
    }

    function onDragEnd() {
      window.removeEventListener("pointermove", onDragMove);
      window.removeEventListener("pointerup", onDragEnd);

      sourceEl.classList.remove("dragging");
      sourceEl.classList.remove("jiggling");
      sourceEl.style.transition = "";

      const rawLeft = parseFloat(sourceEl.style.left) || 0;
      const rawTop = parseFloat(sourceEl.style.top) || 0;

      const snappedLeft = Math.round(rawLeft / GRID) * GRID;
      const snappedTop = Math.round(rawTop / GRID) * GRID;

      sourceEl.style.left = snappedLeft + "px";
      sourceEl.style.top = snappedTop + "px";

      sourcePositions[color] = { left: snappedLeft, top: snappedTop };
      saveState();

      if (navigator.vibrate) navigator.vibrate(10);
    }

    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragEnd);
  }

  // =========================================================
  // MINIONS
  // =========================================================

  function positionMinionAt(element, sourceElement, instant) {
    const rect = sourceElement.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const left = rect.left - fieldRect.left + rect.width / 2 - 19;
    const top = rect.top - fieldRect.top + rect.height / 2 - 19;

    if (instant) {
      element.style.transition = "none";
      element.style.left = left + "px";
      element.style.top = top + "px";
      void element.offsetWidth;
      element.style.transition = "";
    } else {
      element.style.transitionDuration = `${minionTravelMs()}ms`;
      element.style.left = left + "px";
      element.style.top = top + "px";
    }
  }

  function scheduleMinionMove(minion) {
    const sources = getUnlockedSources().filter(el => {
      const color = el.dataset.color;
      return colorTotalInTubes(color) > 0 && canAddToSlots(tubes, color, 1, bagCapacityPerTube);
    });

    if (!sources.length) {
      minion.el.classList.add("asleep");
      minion.timer = setTimeout(() => scheduleMinionMove(minion), 1000);
      return;
    }

    minion.el.classList.remove("asleep");

    const nonRepeat = sources.filter(el => el.dataset.color !== minion.lastColor);
    const pool = nonRepeat.length ? nonRepeat : sources;

    const target = pool[Math.floor(Math.random() * pool.length)];
    minion.lastColor = target.dataset.color;
    minion.el.classList.add("moving");
    positionMinionAt(minion.el, target, false);

    minion.timer = setTimeout(() => {
      minion.el.classList.remove("moving");
      collectMinionScoops(minion, target, minionCarryAmount());
    }, minionTravelMs());
  }

  function collectMinionScoops(minion, target, scoopsLeft) {
    if (scoopsLeft <= 0) {
      minion.timer = setTimeout(() => scheduleMinionMove(minion), minionPauseMs());
      return;
    }

    tapSource(target, true);
    minion.timer = setTimeout(() => collectMinionScoops(minion, target, scoopsLeft - 1), 220);
  }

function spawnMinion() {

  const element =
    document.createElement("div");

  element.className =
    "minion";


  const img =
    document.createElement("img");

  img.src =
    "images/blob.png";

  img.alt =
    "Paint Blob";

  img.draggable =
    false;


  element.appendChild(img);

  field.appendChild(element);


  const minion = {
    el: element,
    timer: null,
    lastColor: null
  };


  minions.push(
    minion
  );


  const sources =
    getUnlockedSources();


  if (
    sources.length
  ) {

    positionMinionAt(

      element,

      sources[
        Math.floor(
          Math.random() *
          sources.length
        )
      ],

      true

    );

  }


  scheduleMinionMove(
    minion
  );

}

  // =========================================================
  // DOM REFERENCES
  // =========================================================

  const bagText = document.querySelector("#bagText");
  const bagContents = document.querySelector("#bagContents");
  const storageText = document.querySelector("#storageText");
  const storageContents = document.querySelector("#storageContents");
  const coinsEl = document.querySelector("#coins");
  const orderTarget = document.querySelector("#orderTarget");
  const rewardEl = document.querySelector("#reward");
  const message = document.querySelector("#message");
  const dropperToggle = document.querySelector("#mixerToolBtn");
  const dropperChips = document.querySelector("#dropperChips");
  const dropperFloaterEl = document.querySelector("#dropperFloater");
  const journalOverlay = document.querySelector("#journalOverlay");

  // =========================================================
  // BASIC HELPERS
  // =========================================================

  function say(text) {
    message.textContent = text;
    message.classList.remove("dimmed");
    message.classList.add("show");
    clearTimeout(message._timer);
    message._timer = setTimeout(() => {
      if (sellMode) {
        showSellHint(true);
      } else {
        message.classList.remove("show", "dimmed");
      }
    }, 950);
  }

  function showSellHint(dimmed = false) {
    clearTimeout(message._timer);
    message.textContent = "Tap a bucket, tube, or vial to sell paint";
    message.classList.add("show");
    message.classList.toggle("dimmed", dimmed);
  }

  function initTubes() {
    tubes = [];
    for (let i = 0; i < TUBE_COUNT; i++) tubes.push({ color: null, amount: 0 });
  }

  function initVials() {
    vials = [];
    for (let i = 0; i < VIAL_COUNT; i++) vials.push({ color: null, amount: 0 });
  }

  // find a slot that can take `amount` more of `color` (existing matching slot with
  // room, or an empty slot) and add it. Returns true if it fit, false if no room anywhere.
  function addToSlots(slots, color, amount, capacityPerSlot) {
    let target = slots.find(s => s.color === color && s.amount + amount <= capacityPerSlot);
    if (!target) target = slots.find(s => s.color === null);
    if (!target) return false;
    target.color = color;
    target.amount += amount;
    return true;
  }

  // true if addToSlots would succeed, without actually mutating anything
  function canAddToSlots(slots, color, amount, capacityPerSlot) {
    if (slots.some(s => s.color === color && s.amount + amount <= capacityPerSlot)) return true;
    return slots.some(s => s.color === null);
  }

  // remove `amount` of `color` from a single slot that holds enough of it.
  // (items aren't split across slots — one slot must cover the whole amount.)
  function removeFromSlots(slots, color, amount) {
    const target = slots.find(s => s.color === color && s.amount >= amount);
    if (!target) return false;
    target.amount -= amount;
    if (target.amount === 0) target.color = null;
    return true;
  }

  function colorTotalInTubes(color) {
    return tubes.filter(t => t.color === color).reduce((sum, t) => sum + t.amount, 0);
  }

  function colorTotalInVials(color) {
    return vials.filter(v => v.color === color).reduce((sum, v) => sum + v.amount, 0);
  }

  function tubesUsedTotal() {
    return tubes.reduce((sum, t) => sum + t.amount, 0);
  }

  function vialsUsedTotal() {
    return vials.reduce((sum, v) => sum + v.amount, 0);
  }

  function storageMaxTotal() {
    return VIAL_COUNT * storageCapacityPerVial;
  }

  function unlockedRawColors() {
    return whiteUnlocked ? ["red", "blue", "yellow", "white"] : ["red", "blue", "yellow"];
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

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
      const distance = randomBetween(baseSize * .35, baseSize * .95);
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
      const distance = randomBetween(baseSize * .95, baseSize * 1.45);
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

  
  function createCanvasTapSplat(source, color) {
    const game = document.querySelector("#game");
    if (!game || !source) return;

    const sourceRect = source.getBoundingClientRect();
    const gameRect = game.getBoundingClientRect();

    const wrap = document.createElement("div");
    wrap.className = "canvasTapSplat";

    const centerX = sourceRect.left - gameRect.left + sourceRect.width / 2;
    const centerY = sourceRect.top - gameRect.top + sourceRect.height / 2;

    // Start just outside the bucket edge so the paint reads as hitting the canvas.
    const angle = randomBetween(0, Math.PI * 2);
    const edgeDistance = randomBetween(sourceRect.width * .58, sourceRect.width * .88);
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

    const drops = Math.floor(randomBetween(2, 5));
    for (let i = 0; i < drops; i++) {
      const drop = document.createElement("div");
      drop.className = "canvasTapDrop";

      const dropSize = randomBetween(3, 9);
      const angle = randomBetween(0, Math.PI * 2);
      const distance = randomBetween(size * .45, size * .9);

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
  // BACKPACK / WAREHOUSE / MIXER RENDER
  // =========================================================

  function renderBackpack() {
    bagContents.innerHTML = "";
    tubes.forEach((tube, index) => {
      const chip = document.createElement("div");
      if (tube.color) {
        chip.className = "stashChip" + (dropperArmed ? " pickable" : "") + (sellMode ? " sellable" : "");
        chip.textContent = `${colorInfo[tube.color].emoji} ${tube.amount}/${bagCapacityPerTube}`;
        chip.addEventListener("click", event => {
          if (sellMode) sellOneFromTube(index);
          else feedDropperFromTube(index, event);
        });
      } else {
        chip.className = "stashChip empty";
        chip.textContent = "🧪 Empty Vial";
      }
      bagContents.appendChild(chip);
    });
  }

  function renderWarehouse() {
    storageContents.innerHTML = "";
    vials.forEach((vial, index) => {
      const chip = document.createElement("div");
      if (vial.color) {
        const isFull = vial.amount >= storageCapacityPerVial;
        chip.className = "stashChip"
          + (sellMode ? " sellable" : "")
          + (sellMode && isFull ? " fullVial" : "");
        chip.textContent = `${colorInfo[vial.color].emoji} ${colorInfo[vial.color].label} ${vial.amount}/${storageCapacityPerVial}`;
        if (sellMode) chip.addEventListener("click", () => sellOneFromVial(index));
      } else {
        chip.className = "stashChip empty";
        chip.textContent = "🧪 Empty Vial";
      }
      storageContents.appendChild(chip);
    });
  }

  function renderDropper() {
    dropperToggle.innerHTML = dropperArmed ? "❌<span>Done</span>" : "💧<span>Mix</span>";
    dropperToggle.classList.toggle("armed", dropperArmed);
    dropperFloaterEl.classList.toggle("visible", dropperArmed);

    dropperChips.innerHTML = "";
    dropperIngredients.forEach(ingredient => {
      const chip = document.createElement("span");
      chip.className = "mixChip";
      chip.textContent = colorInfo[ingredient.color].emoji;
      dropperChips.appendChild(chip);
    });
  }

  function positionDropperFloaterAtPoint(x, y) {
    dropperFloaterEl.style.left = x + "px";
    dropperFloaterEl.style.top = y + "px";
  }

  function positionDropperFloaterAtElement(el) {
    const rect = el.getBoundingClientRect();
    positionDropperFloaterAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  document.addEventListener("pointermove", event => {
    if (dropperArmed) positionDropperFloaterAtPoint(event.clientX, event.clientY);
  });

  function renderAll() {
    bagText.textContent = `${tubes.filter(t => t.color !== null).length} / ${TUBE_COUNT}`;
    storageText.textContent = `${vialsUsedTotal()} / ${storageMaxTotal()}`;
    coinsEl.textContent = coins;

    const orderInfo = colorInfo[currentOrder.color];
    orderTarget.textContent = `${orderInfo.emoji} ${orderInfo.label} ×1`;
    rewardEl.textContent = currentOrder.reward;

    renderBackpack();
    renderWarehouse();
    renderDropper();
    renderQuest();
    refreshPrimaryBucketVisual();

    const mixerToolBtnEl = document.querySelector("#mixerToolBtn");
    if (mixerToolBtnEl) mixerToolBtnEl.style.display = mixerUnlocked ? "flex" : "none";

    const warehouseRowEl = document.querySelector("#warehouseRow");
    if (warehouseRowEl) warehouseRowEl.style.display = mixerUnlocked ? "block" : "none";

    const storeBtnElForHighlight = document.querySelector("#storeBtn");
    if (storeBtnElForHighlight) {
      storeBtnElForHighlight.classList.toggle("canAfford", cheapestAffordableExists());
    }

    const storeBtnEl = document.querySelector("#storeBtn");
    const mixerBtnEl = document.querySelector("#mixerToolBtn");
    const fulfillBtnEl = document.querySelector("#fulfillBtn");
    if (storeBtnEl) storeBtnEl.style.display = currentProcessIndex >= 1 ? "flex" : "none";
    if (mixerBtnEl) mixerBtnEl.style.display = mixerUnlocked ? "flex" : "none";
    if (fulfillBtnEl) fulfillBtnEl.style.display = ordersUnlocked ? "flex" : "none";

    const sellBtnEl = document.querySelector("#sellBtn");
    const sellAllBtnEl = document.querySelector("#sellAllBtn");
    if (sellBtnEl) {
      sellBtnEl.innerHTML = sellMode ? "❌<span>Done</span>" : "🪙<span>Sell</span>";
      sellBtnEl.classList.toggle("armed", sellMode);
    }
    if (sellAllBtnEl) sellAllBtnEl.style.display = sellMode ? "flex" : "none";

    if (document.querySelector("#storeOverlay").classList.contains("open")) {
      renderStore();
    }

    saveState();
  }

  // =========================================================
  // FLOATING +1
  // =========================================================

  function spawnFloater(source, text) {
    const rect = source.getBoundingClientRect();
    const fieldRect = field.getBoundingClientRect();
    const floater = document.createElement("div");
    floater.className = "floater";
    floater.textContent = text;
    floater.style.left = `${rect.left - fieldRect.left + rect.width / 2 - 10}px`;
    floater.style.top = `${rect.top - fieldRect.top}px`;
    field.appendChild(floater);
    setTimeout(() => floater.remove(), 500);
  }

  // =========================================================
  // GATHERING
  // =========================================================

  function tapSource(source, fromMinion) {
    const color = source.dataset.color;

    // Manual taps always leave a small paint mark on the canvas,
    // even when there isn't room to collect more paint.
    if (!fromMinion) {
      // Splat and sound are feedback for touching the paint bucket itself,
      // so both happen even when the tube is full.
      createCanvasTapSplat(source, color);
      playSplatSound();
    }

    const placed = addToSlots(tubes, color, 1, bagCapacityPerTube);
    if (!placed) {
      if (!fromMinion) say("🧪 No tube space left!");
      return;
    }

    totalGathered++;

    source.classList.remove("pop");
    void source.offsetWidth;
    source.classList.add("pop");

    spawnFloater(source, `+1 ${colorInfo[color].emoji}`);
    if (!fromMinion) createCanvasTapSplat(source, color);
    renderAll();
    checkQuests();

    if (!fromMinion) {
      
      if (navigator.vibrate) navigator.vibrate(12);
    }
  }

  // =========================================================
  // DROPPER — pick it up, tap 2 colors (bucket or tube), it mixes itself
  // =========================================================

  function toggleDropper(event) {
    if (!mixerUnlocked) return;
    if (sellMode) sellMode = false;
    if (dropperArmed) {
      // cancelling: hand back anything pulled from a tube (field-collected drops are just lost)
      dropperIngredients.forEach(ingredient => {
        if (ingredient.source === "tube") addToSlots(tubes, ingredient.color, 1, bagCapacityPerTube);
      });
      dropperArmed = false;
      dropperIngredients = [];
    } else {
      dropperArmed = true;
      dropperIngredients = [];
      if (event && event.currentTarget) positionDropperFloaterAtElement(event.currentTarget);
    }
    renderAll();
  }

  function feedDropperFromTube(index, event) {
    if (!dropperArmed) return;

    const tube = tubes[index];
    if (!tube.color || tube.amount <= 0) return;

    const color = tube.color;
    tube.amount--;
    if (tube.amount === 0) tube.color = null;

    if (event && event.currentTarget) positionDropperFloaterAtElement(event.currentTarget);
    addIngredientToDropper(color, "tube");
  }

  function feedDropperFromField(source) {
    if (!dropperArmed) return;
    positionDropperFloaterAtElement(source);
    addIngredientToDropper(source.dataset.color, "field");
    spawnFloater(source, `💧 ${colorInfo[source.dataset.color].emoji}`);
  }

  function addIngredientToDropper(color, source) {
    dropperIngredients.push({ color, source });
    renderAll();

    if (navigator.vibrate) navigator.vibrate(10);

    if (dropperIngredients.length === 2) resolveDropperMix();
  }

  function resolveDropperMix() {
    const [first, second] = dropperIngredients;
    const recipe = findRecipeForPair(first.color, second.color);

    function returnTubeIngredients() {
      dropperIngredients.forEach(ingredient => {
        if (ingredient.source === "tube") addToSlots(tubes, ingredient.color, 1, bagCapacityPerTube);
      });
    }

    if (!recipe) {
      say("That combo doesn't mix");
      returnTubeIngredients();
      dropperArmed = false;
      dropperIngredients = [];
      renderAll();
      return;
    }

    const weight = weightOf(recipe.result);

    if (!canAddToSlots(vials, recipe.result, weight, storageCapacityPerVial)) {
      say(`🧪 ${colorInfo[recipe.result].label} vial full!`);
      returnTubeIngredients();
      dropperArmed = false;
      dropperIngredients = [];
      renderAll();
      return;
    }

    addToSlots(vials, recipe.result, weight, storageCapacityPerVial);
    totalMixed++;
    recordColorDiscovery(recipe.result);
    dropperArmed = false;
    dropperIngredients = [];

    paintSplatBurst(recipe.result);
    playSplatSound();
    say(`${colorInfo[recipe.result].emoji} Made ${colorInfo[recipe.result].label}!`);
    renderAll();
    checkQuests();

    if (navigator.vibrate) navigator.vibrate(28);
  }

  dropperToggle.addEventListener("click", toggleDropper);


  field.addEventListener("pointerdown", event => {
    const choices = document.querySelector("#sellAllChoices");
    if (!choices || !choices.classList.contains("open")) return;

    // Clicking the open canvas closes only the Sell All submenu.
    if (!event.target.closest(".source") && !event.target.closest(".toolRailBtn") && !event.target.closest(".toolRailChoiceBtn")) {
      choices.classList.remove("open");
    }
  });

  // =========================================================
  // RAW COLOR INPUT — tap to gather, hold to rearrange
  // =========================================================

  document.querySelectorAll(".source[data-color]").forEach(source => {
    source.addEventListener("pointerdown", event => {
      event.preventDefault();
      source.classList.add("pressed");

      const startX = event.clientX;
      const startY = event.clientY;
      let longPressFired = false;
      let moved = false;

      const holdTimer = setTimeout(() => {
        if (!rearrangeUnlocked) return;
        longPressFired = true;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        source.classList.remove("pressed");
        beginDragSource(source, event);
      }, 450);

      function onMove(e) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
          moved = true;
          clearTimeout(holdTimer);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        }
      }

      function onUp() {
        clearTimeout(holdTimer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        source.classList.remove("pressed");
        if (!longPressFired && !moved) {
          if (sellMode) {
            const color = source.dataset.color;
            const earned = 1 + studioEarningsBonus;
            coins += earned;
            totalSold += 1;
            playSellSound();

            source.classList.remove("sellBucketHint");
            void source.offsetWidth;
            source.classList.add("sellBucketHint");

            pulseCoins(earned);
            renderAll();              // updates the visible coin total immediately
            showSellHint(false);

            setTimeout(() => {
              source.classList.remove("sellBucketHint");
              showSellHint(true);
            }, 650);

            checkJournalSteps();
          } else if (dropperArmed) {
            feedDropperFromField(source);
          } else {
            tapSource(source, false);
          }
        }
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  });

  // =========================================================
  // SELL — selective selling, with Sell All as a convenience
  // =========================================================

  function pulseCoins(amount) {
    const coinPanel = coinsEl.closest(".panel") || coinsEl;
    coinPanel.classList.remove("coinImpact");
    void coinPanel.offsetWidth;
    coinPanel.classList.add("coinImpact");

    const rect = coinPanel.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.className = "coinGainFloater";
    pop.textContent = `+${amount} 🪙`;
    pop.style.left = `${rect.left + rect.width / 2}px`;
    pop.style.top = `${rect.bottom + 4}px`;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  function sellImpactAt(element, label) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.classList.remove("sellImpact");
    void element.offsetWidth;
    element.classList.add("sellImpact");

    for (let i = 0; i < 5; i++) {
      const coin = document.createElement("div");
      coin.className = "sellCoinBurst";
      coin.textContent = i % 2 ? "✨" : "🪙";
      coin.style.left = `${rect.left + rect.width / 2}px`;
      coin.style.top = `${rect.top + rect.height / 2}px`;
      coin.style.setProperty("--dx", `${randomBetween(-42, 42)}px`);
      coin.style.setProperty("--dy", `${randomBetween(-55, -18)}px`);
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 650);
    }

    if (label) {
      const text = document.createElement("div");
      text.className = "sellLabelBurst";
      text.textContent = label;
      text.style.left = `${rect.left + rect.width / 2}px`;
      text.style.top = `${rect.top}px`;
      document.body.appendChild(text);
      setTimeout(() => text.remove(), 750);
    }
  }

  function sellOneFromTube(index) {
    const tube = tubes[index];
    if (!tube || !tube.color || tube.amount <= 0) return;

    const color = tube.color;
    const earned = tube.amount + studioEarningsBonus;

    coins += earned;
    totalSold += tube.amount;
    playSellSound();

    tube.color = null;
    tube.amount = 0;

    sellImpactAt(bagContents.children[index], `+${earned}`);
    pulseCoins(earned);
    renderAll();
    showSellHint(true);

    checkQuests();

    if (navigator.vibrate) navigator.vibrate(24);
  }

  function sellOneFromVial(index) {
    const vial = vials[index];
    if (!vial || !vial.color || vial.amount <= 0) return;

    const chipEl = storageContents.children[index];
    const color = vial.color;
    const amount = vial.amount;
    const fullBonus = amount >= storageCapacityPerVial ? 1 : 0;
    const earned = amount + fullBonus;

    vial.color = null;
    vial.amount = 0;
    coins += earned;
    totalSold += amount;
    playSellSound();

    sellImpactAt(chipEl, fullBonus ? `+${earned} FULL!` : `+${earned}`);
    pulseCoins(earned);
    renderAll();
    showSellHint(true);
    checkQuests();
    if (navigator.vibrate) navigator.vibrate([18, 18, 28]);
  }

  function openSellAllPicker() {
  }

  document.querySelector("#sellBtn").addEventListener("click", () => {
    sellMode = !sellMode;
    if (sellMode && dropperArmed) {
      dropperIngredients.forEach(ingredient => {
        if (ingredient.source === "tube") addToSlots(tubes, ingredient.color, 1, bagCapacityPerTube);
      });
      dropperArmed = false;
      dropperIngredients = [];
    }

    if (sellMode) {
      showSellHint(false);
    } else {
      clearTimeout(message._timer);
      message.classList.remove("show", "dimmed");
      document.querySelector("#sellAllChoices")?.classList.remove("open");
    }

    renderAll();
  });

  document.querySelector("#sellAllBtn").addEventListener("click", openSellAllPicker);


  function sellAllTubesNow() {
    const earned = tubesUsedTotal() + studioEarningsBonus;
    if (tubesUsedTotal() === 0) { say("No tube paint to sell"); return; }

    totalSold += tubesUsedTotal();
    coins += earned;
    playSellSound();
    initTubes();

    pulseCoins(earned);
    renderAll();
    showSellHint(true);
    checkJournalSteps();
    if (navigator.vibrate) navigator.vibrate(24);
  }

  function sellAllVialsNow() {
    const base = vialsUsedTotal();
    if (base === 0) { say("No vial paint to sell"); return; }

    let fullBonus = 0;
    vials.forEach(v => {
      if (v.color && v.amount >= storageCapacityPerVial) fullBonus += 1;
    });

    const earned = base + fullBonus + studioEarningsBonus;
    totalSold += base;
    coins += earned;
    playSellSound();
    initVials();

    pulseCoins(earned);
    renderAll();
    showSellHint(true);
    checkJournalSteps();
    if (navigator.vibrate) navigator.vibrate(24);
  }

  function sellEverythingNow() {
    const raw = tubesUsedTotal();
    const mixed = vialsUsedTotal();

    if (raw + mixed === 0) { say("Nothing to sell"); return; }

    let fullBonus = 0;
    vials.forEach(v => {
      if (v.color && v.amount >= storageCapacityPerVial) fullBonus += 1;
    });

    const earned = raw + mixed + fullBonus + studioEarningsBonus;
    totalSold += raw + mixed;
    coins += earned;
    playSellSound();

    initTubes();
    initVials();

    pulseCoins(earned);
    renderAll();
    showSellHint(true);
    checkJournalSteps();
    if (navigator.vibrate) navigator.vibrate(28);
  }

  document.querySelector("#sellRawBtnRail").addEventListener("click", sellAllTubesNow);
  document.querySelector("#sellMixedBtnRail").addEventListener("click", sellAllVialsNow);
  document.querySelector("#sellEverythingBtnRail").addEventListener("click", sellEverythingNow);

  // =========================================================
  // FULFILL
  // =========================================================

  document.querySelector("#fulfillBtn").addEventListener("click", () => {
    const neededColor = currentOrder.color;
    const weight = weightOf(neededColor);

    if (!removeFromSlots(vials, neededColor, weight)) {
      say(`Need ${colorInfo[neededColor].emoji} ${colorInfo[neededColor].label}`);
      return;
    }

    const earnedReward = currentOrder.reward + studioEarningsBonus;
    coins += earnedReward;
    pulseCoins(earnedReward);
    totalFulfilled++;

    const colors = activeOrderColors();
    let nextColor;
    do {
      nextColor = colors[Math.floor(Math.random() * colors.length)];
    } while (colors.length > 1 && nextColor === currentOrder.color);
    currentOrder = makeOrder(nextColor);

    say(`✅ Order complete! +${earnedReward}`);
    renderAll();
    checkQuests();

    if (navigator.vibrate) navigator.vibrate([25, 20, 25]);
  });

  // =========================================================
  // JOURNAL OVERLAY
  // =========================================================

  document.querySelector("#journalBtn").addEventListener("click", () => {
    journalOverlay.classList.add("open");
    renderJournal();
  });

  document.querySelector("#quest").addEventListener("click", () => {
    journalOverlay.classList.add("open");
    renderJournal();
  });

  document.querySelector("#journalCloseBtn").addEventListener("click", () => {
    journalOverlay.classList.remove("open");
  });

  document.querySelector("#journalProcessesTab").addEventListener("click", () => setJournalTab("processes"));
  document.querySelector("#journalGuideTab").addEventListener("click", () => setJournalTab("guide"));

  document.querySelector("#sellAllBtn").addEventListener("click", () => {
    document.querySelector("#sellAllChoices").classList.toggle("open");
  });

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

  document.querySelector("#storeTabBtn").addEventListener("click", () => setStoreTab("store"));
  document.querySelector("#upgradeTabBtn").addEventListener("click", () => setStoreTab("upgrades"));

  // =========================================================
  // SAVE / LOAD / RESET
  // =========================================================

  const SAVE_KEY = "colorGatherSave_v1";

  function saveState() {
    try {
      const data = {
        coins, tubes, vials, bagCapacityPerTube, storageCapacityPerVial,
        primaryBucketSlots, primaryBucketColors, firstPrimaryChoice, pendingPrimaryBucketPosition, yellowUnlocked, mixerUnlocked, blueUnlocked, ordersUnlocked, rearrangeUnlocked,
        whiteUnlocked, minionCount, minionSpeedLevel, minionCarryLevel,
        totalGathered, totalSold, totalMixed, totalFulfilled, studioEarningsBonus,
        currentProcessIndex, followedStepId, completedJournalSteps,
        colorGuideUnlocked, activeJournalTab, discoveredColors,
        currentOrder, sourcePositions,
        storeItemLevels: storeItems.map(i => ({ id: i.id, level: i.level })),
        toolUpgradeLevels: toolUpgrades.map(i => ({ id: i.id, level: i.level }))
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // storage unavailable (private mode, quota, etc) — fail silently
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      coins = data.coins ?? coins;
      if (Array.isArray(data.tubes) && data.tubes.length > 0) {
        tubes = data.tubes;
        TUBE_COUNT = tubes.length;
      }
      bagCapacityPerTube = data.bagCapacityPerTube ?? bagCapacityPerTube;
      if (Array.isArray(data.vials) && data.vials.length > 0) {
        vials = data.vials;
        VIAL_COUNT = vials.length;
      }
      storageCapacityPerVial = data.storageCapacityPerVial ?? storageCapacityPerVial;
      yellowBucketPurchased = data.yellowBucketPurchased ?? data.yellowUnlocked ?? yellowBucketPurchased;
      primaryBucketSlots = data.primaryBucketSlots ?? primaryBucketSlots;
      primaryBucketColors = Array.isArray(data.primaryBucketColors) ? data.primaryBucketColors : primaryBucketColors;
      firstPrimaryChoice = data.firstPrimaryChoice ?? firstPrimaryChoice;
      pendingPrimaryBucketPosition = data.pendingPrimaryBucketPosition ?? pendingPrimaryBucketPosition;
      yellowUnlocked = data.yellowUnlocked ?? yellowUnlocked;
      mixerUnlocked = data.mixerUnlocked ?? mixerUnlocked;
      blueUnlocked = data.blueUnlocked ?? blueUnlocked;
      ordersUnlocked = data.ordersUnlocked ?? ordersUnlocked;
      rearrangeUnlocked = data.rearrangeUnlocked ?? rearrangeUnlocked;
      if (yellowUnlocked) {
        yellowBucketPurchased = true;
        document.querySelector("#yellow").style.display = "grid";
      }
      if (blueUnlocked) document.querySelector("#blue").style.display = "grid";
      if (mixerUnlocked) document.querySelector("#warehouseRow").style.display = "block";
      if (ordersUnlocked) {
        document.querySelector("#order").style.display = "block";
        document.querySelector("#fulfillBtn").style.display = "block";
      }
      whiteUnlocked = data.whiteUnlocked ?? whiteUnlocked;
      minionCount = data.minionCount ?? minionCount;
      minionSpeedLevel = data.minionSpeedLevel ?? minionSpeedLevel;
      minionCarryLevel = data.minionCarryLevel ?? minionCarryLevel;
      totalGathered = data.totalGathered ?? totalGathered;
      totalSold = data.totalSold ?? totalSold;
      totalMixed = data.totalMixed ?? totalMixed;
      totalFulfilled = data.totalFulfilled ?? totalFulfilled;
      studioEarningsBonus = data.studioEarningsBonus ?? studioEarningsBonus;
      if (typeof data.currentProcessIndex === "number") currentProcessIndex = data.currentProcessIndex;
      followedStepId = data.followedStepId ?? followedStepId;

      if (data.completedJournalSteps && typeof data.completedJournalSteps === "object") {
        completedJournalSteps = data.completedJournalSteps;
      } else if (typeof data.questIndex === "number") {
        const oldOrder = [
          "gatherRed", "sellRed", "buyYellow", "buyMixer", "firstMix",
          "buyVial2", "buyBlue", "buyOrders", "fulfill3", "collect20"
        ];
        oldOrder.slice(0, data.questIndex).forEach(id => completedJournalSteps[id] = true);
      }

      colorGuideUnlocked = data.colorGuideUnlocked ?? (totalMixed > 0);
      activeJournalTab = data.activeJournalTab ?? activeJournalTab;

      if (data.discoveredColors && typeof data.discoveredColors === "object") {
        Object.assign(discoveredColors, data.discoveredColors);
      } else if (totalMixed > 0) {
        discoveredColors.orange = true;
      }

      currentProcessIndex = 0;
      while (
        currentProcessIndex < processes.length - 1 &&
        isProcessComplete(processes[currentProcessIndex])
      ) {
        currentProcessIndex++;
      }
      ensureFollowedStep();

      if (data.currentOrder) currentOrder = data.currentOrder;
      if (data.sourcePositions) Object.assign(sourcePositions, data.sourcePositions);

      (data.storeItemLevels || []).forEach(saved => {
        const item = storeItems.find(i => i.id === saved.id);
        if (item) item.level = saved.level;
      });

      (data.toolUpgradeLevels || []).forEach(saved => {
        const item = toolUpgrades.find(i => i.id === saved.id);
        if (item) item.level = saved.level;
      });

      if (whiteUnlocked) document.querySelector("#white").style.display = "grid";
    } catch (e) {
      // corrupt save — ignore and start fresh
    }
  }

  const resetConfirmOverlay = document.querySelector("#resetConfirmOverlay");

  document.querySelector("#journalResetBtn").addEventListener("click", () => {
    resetConfirmOverlay.classList.add("open");
  });

  document.querySelector("#resetNoBtn").addEventListener("click", () => {
    resetConfirmOverlay.classList.remove("open");
  });

  document.querySelector("#resetYesBtn").addEventListener("click", () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    window.location.reload();
  });

  // =========================================================
  // IOS RAPID-TAP PROTECTION
  // =========================================================

  let lastTouchEnd = 0;
  document.addEventListener("touchend", event => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

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

  document.querySelector("#splashStartBtn").addEventListener("click", () => {
    document.querySelector("#splashOverlay").classList.remove("open");
  });

})();
