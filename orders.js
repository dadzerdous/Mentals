// Quick / Standard / Big Job Orders.
// Tracking an order only controls what is shown on the HUD.
// Any ready order may be fulfilled at any time.

  function ensureOrderChoices(force = false) {
    if (!ordersUnlocked) return;

    if (force || !Array.isArray(orderChoices) || orderChoices.length !== 3) {
      orderChoices = generateOrderChoices();
    }
  }

  function isTrackedOrder(order) {
    return !!currentOrder &&
      currentOrder.color === order.color &&
      currentOrder.quantity === order.quantity &&
      currentOrder.tier === order.tier;
  }

  function trackOrder(order) {
    currentOrder = { ...order };
    orderSelectedCount++;

    say(`${orderTierInfo(order.tier).label} tracked`);
    renderAll();
    renderOrdersOverlay();
    checkJournalSteps();
    saveState();
  }

  function regenerateOrderSlot(index) {
    const old = orderChoices[index];
    if (!old) return;

    const info = orderTierInfo(old.tier);
    const colors = activeOrderColors();
    const color = colors[Math.floor(Math.random() * colors.length)];

    orderChoices[index] = makeOrder(color, info.quantity, old.tier);
  }

  function fulfillOrderAt(index) {
    const order = orderChoices[index];
    if (!order) return;

    if (!canFulfillOrder(order)) {
      const info = colorInfo[order.color];
      say(`Need ${order.quantity} full ${info.emoji} ${info.label} Mixer Vial${order.quantity > 1 ? "s" : ""}`);
      return;
    }

    let remaining = order.quantity;

    for (const vial of vials) {
      if (remaining <= 0) break;

      if (
        vial.color === order.color &&
        vial.amount >= storageCapacityPerVial
      ) {
        vial.color = null;
        vial.amount = 0;
        remaining--;
      }
    }

    const earned = orderReward(order) + studioEarningsBonus;
    const orderXp =
      order.tier === "big" ? 25 :
      order.tier === "standard" ? 15 :
      8;

    coins += earned;
    totalFulfilled++;
    pulseCoins(earned);
    addStudioXp(orderXp, "order");

    const wasTracked = isTrackedOrder(order);

    say(`✅ ${orderTierInfo(order.tier).label} complete! +${earned} · +${orderXp} XP`);

    regenerateOrderSlot(index);

    // If the completed job was being tracked, automatically track
    // the new job that replaced it. Otherwise leave tracking alone.
    if (wasTracked) {
      currentOrder = { ...orderChoices[index] };
    }

    renderAll();
    renderOrdersOverlay();
    checkJournalSteps();
    saveState();

    if (navigator.vibrate) navigator.vibrate([25, 20, 25]);
  }

  function renderOrdersOverlay() {
    ensureOrderChoices();

    const list = document.querySelector("#ordersChoices");
    if (!list) return;

    list.innerHTML = "";

    orderChoices.forEach((order, index) => {
      const tier = orderTierInfo(order.tier);
      const info = colorInfo[order.color];
      const ready = canFulfillOrder(order);
      const tracked = isTrackedOrder(order);

      const card = document.createElement("div");
      card.className = "orderChoiceCard";
      card.classList.toggle("selected", tracked);
      card.classList.toggle("ready", ready);

      card.innerHTML = `
        <div class="orderChoiceTop">
          <span>${tracked ? "📌 " : ""}${tier.label}</span>
          <span>🪙 ${orderReward(order)}</span>
        </div>

        <div class="orderChoiceNeed">
          ${order.quantity} ${info.emoji} ${info.label} Mixer Vial${order.quantity > 1 ? "s" : ""}
        </div>

        <div class="orderChoiceReward">
          ${ready
            ? "✓ Ready"
            : `Need ${order.quantity} full vial${order.quantity > 1 ? "s" : ""}`}
        </div>

        <div class="orderChoiceActions">
          <button class="orderTrackBtn">
            ${tracked ? "📌 Tracking" : "Track"}
          </button>

          ${ready
            ? '<button class="orderCardFulfillBtn">✅ Fulfill</button>'
            : ""}
        </div>
      `;

      card.querySelector(".orderTrackBtn")?.addEventListener("click", event => {
        event.stopPropagation();
        trackOrder(order);
      });

      card.querySelector(".orderCardFulfillBtn")?.addEventListener("click", event => {
        event.stopPropagation();
        fulfillOrderAt(index);
      });

      // Clicking the body of the card tracks it, like selecting a Journal step.
      card.addEventListener("click", () => trackOrder(order));

      list.appendChild(card);
    });
  }

  function anyOrderReady() {
    ensureOrderChoices();
    return orderChoices.some(canFulfillOrder);
  }

  function openOrders() {
    if (!ordersUnlocked) return;

    ensureOrderChoices();
    document.querySelector("#ordersOverlay")?.classList.add("open");
    renderOrdersOverlay();
  }

  function closeOrders() {
    document.querySelector("#ordersOverlay")?.classList.remove("open");
  }

  document.querySelector("#fulfillBtn")?.addEventListener("click", openOrders);
  document.querySelector("#ordersCloseBtn")?.addEventListener("click", closeOrders);
