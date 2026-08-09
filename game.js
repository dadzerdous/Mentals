(() => {

  // =========================================================
  // STATE
  // =========================================================

  let coins = 0;

  const bag = { red: 0, blue: 0, yellow: 0, white: 0 };
  let bagCapacity = 8;

  const storage = { purple: 0, orange: 0, green: 0, pink: 0, skyblue: 0, cream: 0 };
  let storageCapacity = 4;

  let mixerSlots = [];

  let whiteUnlocked = false;

  let minionCount = 0;
  let minionSpeedLevel = 0;
  const minions = [];

  let totalGathered = 0;
  let totalSold = 0;
  let totalMixed = 0;
  let totalFulfilled = 0;

  let activeStoreTab = "store";

  let rearrangeModeActive = false;

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
    purple: "#8e5bd9", orange: "#ff9f43", green: "#55c96b",
    pink: "#ff8fc7", skyblue: "#7fcfff", cream: "#f3df9b"
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

  function getAvailableRecipes() {
    return activeRecipes().filter(r => bag[r.a] > 0 && bag[r.b] > 0);
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
  // QUESTS
  // =========================================================

  const quests = [
    { id: "collect5", desc: "Collect 5 raw colors", type: "gather", target: 5, reward: 15 },
    { id: "sell5", desc: "Sell 5 raw colors", type: "sell", target: 5, reward: 20 },
    { id: "mix3", desc: "Mix 3 colors together", type: "mix", target: 3, reward: 25 },
    { id: "fulfill3", desc: "Fulfill 3 orders", type: "fulfill", target: 3, reward: 30 },
    { id: "collect20", desc: "Collect 20 raw colors total", type: "gather", target: 20, reward: 40 }
  ];
  let questIndex = 0;

  function currentTotalFor(type) {
    if (type === "gather") return totalGathered;
    if (type === "sell") return totalSold;
    if (type === "mix") return totalMixed;
    if (type === "fulfill") return totalFulfilled;
    return 0;
  }

  function checkQuests() {
    if (questIndex >= quests.length) return;
    const q = quests[questIndex];
    if (currentTotalFor(q.type) >= q.target) {
      coins += q.reward;
      say(`✅ Quest complete! +${q.reward}`);
      questIndex++;
    }
    renderQuest();
  }

  function renderQuest() {
    const questText = document.querySelector("#questText");
    const questProgress = document.querySelector("#questProgress");

    if (questIndex >= quests.length) {
      questText.textContent = "All starter quests done! 🎉";
      questProgress.textContent = "";
      return;
    }

    const q = quests[questIndex];
    questText.textContent = `Quest: ${q.desc}`;
    questProgress.textContent = `${Math.min(currentTotalFor(q.type), q.target)} / ${q.target}`;
  }

  // =========================================================
  // STORE ITEMS (one-time / repeatable tool purchases)
  // =========================================================

  const storeItems = [
    {
      id: "white",
      name: "Unlock White Source",
      level: 0,
      maxLevel: 1,
      baseCost: 50,
      growth: 1,
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
      name: "Bigger Backpack",
      level: 0,
      baseCost: 20,
      growth: 1.6,
      desc: () => `Raw color capacity: ${bagCapacity} → ${bagCapacity + 4}`,
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { bagCapacity += 4; this.level++; }
    },
    {
      id: "storage",
      name: "Bigger Warehouse",
      level: 0,
      baseCost: 25,
      growth: 1.6,
      desc: () => `Mixed color capacity: ${storageCapacity} → ${storageCapacity + 4}`,
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { storageCapacity += 4; this.level++; }
    },
    {
      id: "minionSpeed",
      name: "Faster Minions",
      level: 0,
      maxLevel: 5,
      baseCost: 30,
      growth: 1.7,
      requires: () => minionCount > 0,
      lockedNote: "Hire a minion in the Store tab first",
      desc: function () { return `Minions gather quicker. Speed level ${this.level} / ${this.maxLevel}`; },
      cost: function () { return Math.round(this.baseCost * Math.pow(this.growth, this.level)); },
      buy: function () { minionSpeedLevel++; this.level++; }
    }
  ];

  function minionTravelMs() { return Math.max(400, 900 - minionSpeedLevel * 100); }
  function minionPauseMs() { return Math.max(120, 300 - minionSpeedLevel * 30); }

  // =========================================================
  // STORE LOGIC
  // =========================================================

  function cheapestAffordableExists() {
    const affordable = list => list.some(item => {
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
    const cost = item.cost();
    if (coins < cost) { say("Not enough coins"); return; }
    coins -= cost;
    item.buy();
    say(`${item.name} upgraded!`);
    renderAll();
  }

  function renderUpgradeCard(item, list) {
    const maxed = item.maxLevel && item.level >= item.maxLevel;
    const locked = item.requires && !item.requires();

    const card = document.createElement("div");
    card.className = "upgradeCard";

    const info = document.createElement("div");
    info.className = "upgradeInfo";
    info.innerHTML = `
      <div class="upgradeName">${item.name}${maxed ? " (Maxed)" : ""}</div>
      <div class="upgradeDesc">${locked ? item.lockedNote : (typeof item.desc === "function" ? item.desc() : item.desc)}</div>
    `;

    const buyBtn = document.createElement("button");
    buyBtn.className = "upgradeBuyBtn";
    buyBtn.textContent = maxed ? "✓" : `🪙 ${item.cost()}`;
    buyBtn.disabled = maxed || locked || coins < item.cost();
    buyBtn.addEventListener("click", () => buyFromList(list, item.id));

    card.appendChild(info);
    card.appendChild(buyBtn);
    return card;
  }

  function renderStore() {
    const list = document.querySelector("#upgradeList");
    list.innerHTML = "";

    const items = activeStoreTab === "store" ? storeItems : toolUpgrades;

    if (activeStoreTab === "upgrades" && toolUpgrades.every(u => u.requires && !u.requires())) {
      const note = document.createElement("div");
      note.id = "emptyTabNote";
      note.textContent = "No tools owned yet — buy one in the Store tab to unlock its upgrades.";
      list.appendChild(note);
      return;
    }

    items.forEach(item => list.appendChild(renderUpgradeCard(item, activeStoreTab === "store" ? storeItems : toolUpgrades)));
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
  const rearrangeDone = document.querySelector("#rearrangeDone");

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function initSourcePositions() {
    const fieldRect = field.getBoundingClientRect();
    Object.keys(defaultPositionFractions).forEach(color => {
      if (!sourcePositions[color]) {
        const frac = defaultPositionFractions[color];
        sourcePositions[color] = {
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
    return Array.from(document.querySelectorAll(".source")).filter(el => el.style.display !== "none");
  }

  function enterRearrangeMode() {
    if (rearrangeModeActive) return;
    rearrangeModeActive = true;
    document.querySelectorAll(".source").forEach(el => el.classList.add("jiggling"));
    rearrangeDone.classList.add("visible");
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function exitRearrangeMode() {
    rearrangeModeActive = false;
    document.querySelectorAll(".source").forEach(el => el.classList.remove("jiggling"));
    rearrangeDone.classList.remove("visible");
  }

  rearrangeDone.addEventListener("click", exitRearrangeMode);

  function beginDragSource(sourceEl, startEvent) {
    const color = sourceEl.dataset.color;
    const fieldRect = field.getBoundingClientRect();

    const startLeft = parseFloat(sourceEl.style.left) || 0;
    const startTop = parseFloat(sourceEl.style.top) || 0;
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;

    sourceEl.classList.add("dragging");
    sourceEl.style.transition = "none";

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
    const left = rect.left - fieldRect.left + rect.width / 2 - 16;
    const top = rect.top - fieldRect.top + rect.height / 2 - 16;

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
    if (bagTotal() >= bagCapacity) {
      minion.el.classList.add("asleep");
      minion.timer = setTimeout(() => scheduleMinionMove(minion), 1000);
      return;
    }

    minion.el.classList.remove("asleep");

    const sources = getUnlockedSources();
    if (!sources.length) {
      minion.timer = setTimeout(() => scheduleMinionMove(minion), 1000);
      return;
    }

    const target = sources[Math.floor(Math.random() * sources.length)];
    positionMinionAt(minion.el, target, false);

    minion.timer = setTimeout(() => {
      tapSource(target, true);
      minion.timer = setTimeout(() => scheduleMinionMove(minion), minionPauseMs());
    }, minionTravelMs());
  }

  function spawnMinion() {
    const element = document.createElement("div");
    element.className = "minion";
    const img = document.createElement("img");
img.src = "images/blob.png";
img.alt = "Paint Blob";
img.draggable = false;

element.appendChild(img);";
    field.appendChild(element);

    const minion = { el: element, timer: null };
    minions.push(minion);

    const sources = getUnlockedSources();
    if (sources.length) {
      positionMinionAt(element, sources[Math.floor(Math.random() * sources.length)], true);
    }

    scheduleMinionMove(minion);
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
  const mixChips = document.querySelector("#mixChips");
  const storeBadge = document.querySelector("#storeBadge");

  // =========================================================
  // BASIC HELPERS
  // =========================================================

  function say(text) {
    message.textContent = text;
    message.classList.add("show");
    clearTimeout(message._timer);
    message._timer = setTimeout(() => message.classList.remove("show"), 950);
  }

  function bagTotal() {
    return Object.values(bag).reduce((a, b) => a + b, 0);
  }

  function storageTotal() {
    return Object.values(storage).reduce((a, b) => a + b, 0);
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
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
    Object.keys(bag).forEach(color => {
      if (bag[color] > 0) {
        const chip = document.createElement("div");
        chip.className = "stashChip pickable";
        chip.textContent = `${colorInfo[color].emoji} ${bag[color]}`;
        chip.addEventListener("click", () => selectForMixer(color));
        bagContents.appendChild(chip);
      }
    });
    if (bagTotal() === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = ".6";
      empty.textContent = "Empty";
      bagContents.appendChild(empty);
    }
  }

  function renderWarehouse() {
    storageContents.innerHTML = "";
    Object.keys(storage).forEach(color => {
      if (storage[color] > 0) {
        const chip = document.createElement("div");
        chip.className = "stashChip";
        chip.textContent = `${colorInfo[color].emoji} ${colorInfo[color].label} ×${storage[color]}`;
        storageContents.appendChild(chip);
      }
    });
    if (storageTotal() === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "12px";
      empty.style.opacity = ".6";
      empty.textContent = "Empty";
      storageContents.appendChild(empty);
    }
  }

  function renderMixChips() {
    mixChips.innerHTML = "";
    mixerSlots.forEach((color, index) => {
      const chip = document.createElement("span");
      chip.className = "mixChip";
      chip.textContent = colorInfo[color].emoji;
      chip.addEventListener("click", event => {
        event.stopPropagation();
        clearMixerSlot(index);
      });
      mixChips.appendChild(chip);
    });
  }

  function renderAll() {
    bagText.textContent = `${bagTotal()} / ${bagCapacity}`;
    storageText.textContent = `${storageTotal()} / ${storageCapacity}`;
    coinsEl.textContent = coins;

    const orderInfo = colorInfo[currentOrder.color];
    orderTarget.textContent = `${orderInfo.emoji} ${orderInfo.label} ×1`;
    rewardEl.textContent = currentOrder.reward;

    renderBackpack();
    renderWarehouse();
    renderMixChips();
    renderQuest();

    storeBadge.style.display = cheapestAffordableExists() ? "grid" : "none";

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
    if (bagTotal() >= bagCapacity) {
      if (!fromMinion) say("🎒 Backpack full!");
      return;
    }

    const color = source.dataset.color;
    bag[color]++;
    totalGathered++;

    source.classList.remove("pop");
    void source.offsetWidth;
    source.classList.add("pop");

    spawnFloater(source, `+1 ${colorInfo[color].emoji}`);
    renderAll();
    checkQuests();

    if (!fromMinion && navigator.vibrate) navigator.vibrate(12);
  }

  // =========================================================
  // MIXER SELECTION
  // =========================================================

  function selectForMixer(color) {
    if (mixerSlots.length >= 2) { say("Mixer full — tap a selected color to remove it"); return; }
    if (bag[color] <= 0) return;

    bag[color]--;
    mixerSlots.push(color);
    renderAll();

    if (navigator.vibrate) navigator.vibrate(10);
  }

  function clearMixerSlot(index) {
    const color = mixerSlots[index];
    if (color === undefined) return;

    bag[color]++;
    mixerSlots.splice(index, 1);
    renderAll();
  }

  // =========================================================
  // RAW COLOR INPUT — tap to gather, hold to rearrange
  // =========================================================

  document.querySelectorAll(".source").forEach(source => {
    source.addEventListener("pointerdown", event => {
      event.preventDefault();

      if (rearrangeModeActive) {
        beginDragSource(source, event);
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;
      let longPressFired = false;
      let moved = false;

      const holdTimer = setTimeout(() => {
        longPressFired = true;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        enterRearrangeMode();
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
        if (!longPressFired && !moved) {
          tapSource(source, false);
        }
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  });

  // =========================================================
  // MIX
  // =========================================================

  document.querySelector("#mixBtn").addEventListener("click", () => {
    let colorA, colorB;
    let automaticMix = false;

    if (mixerSlots.length === 2) {
      colorA = mixerSlots[0];
      colorB = mixerSlots[1];
    } else if (mixerSlots.length === 1) {
      say("Pick one more color");
      return;
    } else {
      const available = getAvailableRecipes();
      if (available.length === 0) { say("No mixable colors available"); return; }
      const randomRecipe = available[Math.floor(Math.random() * available.length)];
      colorA = randomRecipe.a;
      colorB = randomRecipe.b;
      automaticMix = true;
    }

    const recipe = findRecipeForPair(colorA, colorB);

    if (!recipe) {
      say("That combo doesn't mix");
      if (mixerSlots.length === 2) { bag[colorA]++; bag[colorB]++; }
      mixerSlots = [];
      renderAll();
      return;
    }

    if (storageTotal() >= storageCapacity) { say("📦 Warehouse full!"); return; }

    if (automaticMix) { bag[colorA]--; bag[colorB]--; }

    storage[recipe.result]++;
    totalMixed++;
    mixerSlots = [];

    paintSplatBurst(recipe.result);
    say(`${colorInfo[recipe.result].emoji} Made ${colorInfo[recipe.result].label}!`);
    renderAll();
    checkQuests();

    if (navigator.vibrate) navigator.vibrate(28);
  });

  // =========================================================
  // SELL (raw vs mixed picker)
  // =========================================================

  const sellOverlay = document.querySelector("#sellOverlay");
  const sellRawCount = document.querySelector("#sellRawCount");
  const sellMixedCount = document.querySelector("#sellMixedCount");

  document.querySelector("#sellBtn").addEventListener("click", () => {
    sellRawCount.textContent = bagTotal();
    sellMixedCount.textContent = storageTotal();
    sellOverlay.classList.add("open");
  });

  document.querySelector("#sellCancelBtn").addEventListener("click", () => {
    sellOverlay.classList.remove("open");
  });

  document.querySelector("#sellRawBtn").addEventListener("click", () => {
    const earned = bagTotal();
    sellOverlay.classList.remove("open");

    if (earned === 0) { say("No raw colors to sell"); return; }

    coins += earned;
    totalSold += earned;
    Object.keys(bag).forEach(color => bag[color] = 0);

    say(`🪙 Sold raw colors +${earned}`);
    renderAll();
    checkQuests();

    if (navigator.vibrate) navigator.vibrate(24);
  });

  document.querySelector("#sellMixedBtn").addEventListener("click", () => {
    const earned = storageTotal();
    sellOverlay.classList.remove("open");

    if (earned === 0) { say("No mixed colors to sell"); return; }

    coins += earned;
    totalSold += earned;
    Object.keys(storage).forEach(color => storage[color] = 0);

    say(`🪙 Sold mixed colors +${earned}`);
    renderAll();
    checkQuests();

    if (navigator.vibrate) navigator.vibrate(24);
  });

  // =========================================================
  // FULFILL
  // =========================================================

  document.querySelector("#fulfillBtn").addEventListener("click", () => {
    const neededColor = currentOrder.color;

    if (storage[neededColor] <= 0) {
      say(`Need ${colorInfo[neededColor].emoji} ${colorInfo[neededColor].label}`);
      return;
    }

    storage[neededColor]--;
    const earnedReward = currentOrder.reward;
    coins += earnedReward;
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
        coins, bag, bagCapacity, storage, storageCapacity,
        whiteUnlocked, minionCount, minionSpeedLevel,
        totalGathered, totalSold, totalMixed, totalFulfilled,
        questIndex, currentOrder, sourcePositions,
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
      Object.assign(bag, data.bag || {});
      bagCapacity = data.bagCapacity ?? bagCapacity;
      Object.assign(storage, data.storage || {});
      storageCapacity = data.storageCapacity ?? storageCapacity;
      whiteUnlocked = data.whiteUnlocked ?? whiteUnlocked;
      minionCount = data.minionCount ?? minionCount;
      minionSpeedLevel = data.minionSpeedLevel ?? minionSpeedLevel;
      totalGathered = data.totalGathered ?? totalGathered;
      totalSold = data.totalSold ?? totalSold;
      totalMixed = data.totalMixed ?? totalMixed;
      totalFulfilled = data.totalFulfilled ?? totalFulfilled;
      questIndex = data.questIndex ?? questIndex;
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

  document.querySelector("#resetBtn").addEventListener("click", () => {
    if (!window.confirm("Reset all progress? This can't be undone.")) return;
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

  loadState();
  initSourcePositions();
  applySourcePositions();

  for (let i = 0; i < minionCount; i++) spawnMinion();

  renderAll();

})();
