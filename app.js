const BASE_NEWS = {
  title: "Quiet Market Morning",
  body: "No major news yet. Watch the curve and choose a price that balances volume with margin."
};

const NO_NEWS = {
  title: "No Breaking News",
  body: "The market is moving mostly on weather, price, and your production plan today."
};

const ACCOUNTING = {
  flourCents: 82,
  pantryCents: 18,
  packagingCents: 12,
  electricityFixedCents: 350,
  electricityPerLoafCents: 9,
  laborDailyCents: 1800,
  storagePerLoafCents: 12,
  disposalPerSpoiledLoafCents: 8,
  maxCarryLoaves: 20
};

const state = {
  day: 1,
  maxDays: 10,
  cashCents: 50000,
  startingCashCents: 50000,
  inventory: 0,
  baseDemand: 145,
  demandSlope: 13.5,
  baseSupply: 38,
  supplySlope: 14.5,
  flourCents: ACCOUNTING.flourCents,
  capacity: 110,
  mood: "Steady",
  weather: "Mild morning",
  demandShift: 0,
  supplyShift: 0,
  history: [],
  currentNews: { ...BASE_NEWS },
  gameOver: false
};

const events = [
  {
    day: 2,
    title: "Wheat Harvest Bumper",
    body: "Local mills are full. Flour prices fall and bakers can produce more loaves with the same cash.",
    demandShift: 0,
    supplyShift: 16,
    flourDeltaCents: -22,
    capacityDelta: 18,
    mood: "Low Costs"
  },
  {
    day: 3,
    title: "Rainy Commute",
    body: "Foot traffic is lighter before lunch. Demand softens unless your price feels especially tempting.",
    demandShift: -16,
    supplyShift: 0,
    flourDeltaCents: 0,
    capacityDelta: 0,
    mood: "Rainy"
  },
  {
    day: 4,
    title: "Health Food Trend",
    body: "A popular post praises whole-grain bread. More people are looking for fresh loaves this week, and whole-grain flour costs a little more.",
    demandShift: 24,
    supplyShift: 0,
    flourDeltaCents: 6,
    capacityDelta: 0,
    mood: "Hungry"
  },
  {
    day: 6,
    title: "New Bakery Opens Next Door",
    body: "Competition pulls some customers away. Your demand curve shifts left until loyal buyers return.",
    demandShift: -24,
    supplyShift: 0,
    flourDeltaCents: 0,
    capacityDelta: 0,
    mood: "Competitive"
  },
  {
    day: 8,
    title: "School Festival Weekend",
    body: "Families are buying snack boxes nearby. Demand jumps, but flour and oven time are both under pressure.",
    demandShift: 30,
    supplyShift: 7,
    flourDeltaCents: 8,
    capacityDelta: 10,
    mood: "Festival"
  }
];

const weatherCycle = [
  { label: "Mild morning", demand: 0, supply: 0 },
  { label: "Sunny foot traffic", demand: 8, supply: 0 },
  { label: "Humid kitchen", demand: -2, supply: -5 },
  { label: "Cool breakfast rush", demand: 10, supply: 0 },
  { label: "Storm watch", demand: -12, supply: -8 },
  { label: "Clear market day", demand: 14, supply: 4 },
  { label: "Warm afternoon", demand: -4, supply: 0 },
  { label: "Crisp morning", demand: 9, supply: 3 },
  { label: "Drizzle", demand: -7, supply: -2 },
  { label: "Holiday crowd", demand: 18, supply: 0 }
];

const els = {
  dayPill: document.querySelector("#dayPill"),
  cashMetric: document.querySelector("#cashMetric"),
  inventoryMetric: document.querySelector("#inventoryMetric"),
  profitMetric: document.querySelector("#profitMetric"),
  moodMetric: document.querySelector("#moodMetric"),
  priceRange: document.querySelector("#priceRange"),
  priceOutput: document.querySelector("#priceOutput"),
  quantityRange: document.querySelector("#quantityRange"),
  quantityOutput: document.querySelector("#quantityOutput"),
  weatherSignal: document.querySelector("#weatherSignal"),
  costSignal: document.querySelector("#costSignal"),
  electricitySignal: document.querySelector("#electricitySignal"),
  laborSignal: document.querySelector("#laborSignal"),
  capacitySignal: document.querySelector("#capacitySignal"),
  newsTitle: document.querySelector("#newsTitle"),
  newsBody: document.querySelector("#newsBody"),
  balanceMessage: document.querySelector("#balanceMessage"),
  scaleBeam: document.querySelector("#scaleBeam"),
  demandCount: document.querySelector("#demandCount"),
  supplyCount: document.querySelector("#supplyCount"),
  demandLoaves: document.querySelector("#demandLoaves"),
  supplyLoaves: document.querySelector("#supplyLoaves"),
  decisionTitle: document.querySelector("#decisionTitle"),
  bakeButton: document.querySelector("#bakeButton"),
  restartButton: document.querySelector("#restartButton"),
  report: document.querySelector("#report"),
  canvas: document.querySelector("#marketCanvas"),
  equilibriumStat: document.querySelector("#equilibriumStat"),
  chosenPointStat: document.querySelector("#chosenPointStat")
};

const ctx = els.canvas.getContext("2d");

function cents(value) {
  return Math.round(value);
}

function priceCents() {
  return cents(Number(els.priceRange.value) * 100);
}

function dollarsFromCents(value) {
  return value / 100;
}

function money(valueCents) {
  const sign = valueCents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(valueCents) / 100).toFixed(2)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dayWeather(day) {
  return weatherCycle[day - 1] ?? weatherCycle[0];
}

function materialCostCents() {
  return state.flourCents + ACCOUNTING.pantryCents + ACCOUNTING.packagingCents;
}

function marketForDay(day = state.day) {
  const weather = dayWeather(day);
  return {
    demandIntercept: state.baseDemand + state.demandShift + weather.demand,
    supplyIntercept: state.baseSupply + state.supplyShift + weather.supply,
    demandSlope: state.demandSlope,
    supplySlope: state.supplySlope,
    weather
  };
}

function demandAt(priceDollars, market = marketForDay()) {
  return clamp(market.demandIntercept - market.demandSlope * priceDollars, 0, 180);
}

function supplyAt(priceDollars, market = marketForDay()) {
  return clamp(market.supplyIntercept + market.supplySlope * priceDollars, 0, 180);
}

function equilibrium(market = marketForDay()) {
  const price = (market.demandIntercept - market.supplyIntercept) / (market.demandSlope + market.supplySlope);
  const safePrice = clamp(price, 2, 10);
  return {
    price: safePrice,
    quantity: Math.min(demandAt(safePrice, market), supplyAt(safePrice, market))
  };
}

function seededNoise(day, selectedPriceCents, quantity) {
  const seed = Math.sin(day * 91.7 + selectedPriceCents * 0.233 + quantity * 0.61) * 10000;
  return seed - Math.floor(seed);
}

function calculateDay(selectedPriceCents, planned) {
  const market = marketForDay();
  const priceDollars = dollarsFromCents(selectedPriceCents);
  const noise = seededNoise(state.day, selectedPriceCents, planned);
  const demandNoise = Math.round((noise - 0.5) * 18);
  const supplyNoise = Math.round((0.5 - noise) * 10);
  const expectedDemand = demandAt(priceDollars, market);
  const expectedSupply = supplyAt(priceDollars, market);
  const customers = clamp(Math.round(expectedDemand + demandNoise), 0, 200);
  const marketSupply = clamp(Math.round(expectedSupply + supplyNoise), 0, state.capacity);
  const baked = Math.min(planned, marketSupply, state.capacity);
  const available = baked + state.inventory;
  const sold = Math.min(customers, available);
  const surplus = available - sold;
  const shortage = Math.max(0, customers - available);
  const spoiled = Math.max(0, surplus - ACCOUNTING.maxCarryLoaves);
  const carried = Math.min(ACCOUNTING.maxCarryLoaves, surplus);
  const revenueCents = sold * selectedPriceCents;
  const materialsCents = baked * materialCostCents();
  const electricityCents = baked > 0
    ? ACCOUNTING.electricityFixedCents + baked * ACCOUNTING.electricityPerLoafCents
    : 0;
  const laborCents = ACCOUNTING.laborDailyCents;
  const storageCents = carried * ACCOUNTING.storagePerLoafCents;
  const disposalCents = spoiled * ACCOUNTING.disposalPerSpoiledLoafCents;
  const totalCostCents = materialsCents + electricityCents + laborCents + storageCents + disposalCents;
  const profitCents = revenueCents - totalCostCents;
  const lostSalesCents = shortage * selectedPriceCents;

  return {
    day: state.day,
    priceCents: selectedPriceCents,
    planned,
    baked,
    carriedIn: state.inventory,
    customers,
    marketSupply,
    sold,
    surplus,
    shortage,
    spoiled,
    carried,
    expectedDemand,
    expectedSupply,
    demandNoise,
    supplyNoise,
    unitMaterialCents: materialCostCents(),
    revenueCents,
    materialsCents,
    electricityCents,
    laborCents,
    storageCents,
    disposalCents,
    totalCostCents,
    profitCents,
    lostSalesCents
  };
}

function drawMarket() {
  const rect = els.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.max(260, Math.floor(rect.width * dpr));
  els.canvas.height = Math.max(178, Math.floor(rect.width / 1.46 * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = els.canvas.width / dpr;
  const height = els.canvas.height / dpr;
  const pad = { left: 54, right: 20, top: 22, bottom: 45 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const qMax = 180;
  const pMin = 0;
  const pMax = 11;
  const market = marketForDay();
  const selectedPriceDollars = dollarsFromCents(priceCents());
  const chosenDemand = demandAt(selectedPriceDollars, market);
  const chosenSupply = supplyAt(selectedPriceDollars, market);
  const eq = equilibrium(market);

  const x = quantity => pad.left + (quantity / qMax) * chartW;
  const y = price => pad.top + chartH - ((price - pMin) / (pMax - pMin)) * chartH;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffefa";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e4e8e4";
  ctx.lineWidth = 1;
  const compact = width < 320;
  ctx.fillStyle = "#6f7978";
  ctx.font = `${compact ? 9 : 12}px Inter, system-ui, sans-serif`;
  for (let i = 0; i <= 6; i += 1) {
    const q = (qMax / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x(q), pad.top);
    ctx.lineTo(x(q), pad.top + chartH);
    ctx.stroke();
    if (!compact || i % 2 === 0) ctx.fillText(String(Math.round(q)), x(q) - 8, height - 18);
  }
  for (let p = 2; p <= 10; p += 2) {
    ctx.beginPath();
    ctx.moveTo(pad.left, y(p));
    ctx.lineTo(width - pad.right, y(p));
    ctx.stroke();
    ctx.fillText(`$${p}`, compact ? 8 : 15, y(p) + 4);
  }

  ctx.strokeStyle = "#313836";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(width - pad.right, pad.top + chartH);
  ctx.stroke();
  ctx.fillStyle = "#313836";
  ctx.font = `700 ${compact ? 10 : 12}px Inter, system-ui, sans-serif`;
  ctx.fillText("Price", compact ? 8 : 13, 20);
  if (!compact) ctx.fillText("Loaves", width - 75, height - 18);

  const demandPoints = [];
  const supplyPoints = [];
  for (let p = 2; p <= 10; p += 0.2) {
    demandPoints.push([x(demandAt(p, market)), y(p)]);
    supplyPoints.push([x(supplyAt(p, market)), y(p)]);
  }

  drawLine(demandPoints, "#356fa8", 4);
  drawLine(supplyPoints, "#c86f50", 4);

  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#7f8886";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, y(selectedPriceDollars));
  ctx.lineTo(width - pad.right, y(selectedPriceDollars));
  ctx.stroke();
  ctx.setLineDash([]);

  drawPoint(x(chosenDemand), y(selectedPriceDollars), "#356fa8", compact ? "Demand" : "Demand at your price");
  drawPoint(x(chosenSupply), y(selectedPriceDollars), "#c86f50", compact ? "Supply" : "Supply at your price");
  drawPoint(x(eq.quantity), y(eq.price), "#d59f30", "Equilibrium");

  els.equilibriumStat.textContent = `Equilibrium: $${eq.price.toFixed(2)} / ${eq.quantity.toFixed(1)} loaves`;
  els.chosenPointStat.textContent = `Your price: ${money(priceCents())} | Demand ${chosenDemand.toFixed(1)} | Supply ${chosenSupply.toFixed(1)}`;
}

function drawLine(points, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([px, py], index) => {
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
}

function drawPoint(px, py, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#26302d";
  const compact = els.canvas.getBoundingClientRect().width < 320;
  ctx.font = `700 ${compact ? 9 : 11}px Inter, system-ui, sans-serif`;
  const labelX = clamp(px + 9, compact ? 34 : 60, els.canvas.getBoundingClientRect().width - (compact ? 72 : 165));
  ctx.fillText(label, labelX, py - 9);
}

function updateOutputs() {
  els.priceOutput.textContent = money(priceCents());
  els.quantityOutput.textContent = els.quantityRange.value;
  drawMarket();
  renderBalanceScale();
}

function renderBalanceScale() {
  const market = marketForDay();
  const selectedPriceDollars = dollarsFromCents(priceCents());
  const demand = demandAt(selectedPriceDollars, market);
  const plannedSupply = Number(els.quantityRange.value);
  const demandRounded = Math.round(demand);
  const supplyRounded = plannedSupply;
  const gap = demandRounded - supplyRounded;
  const rotation = clamp(-gap / 6, -10, 10);

  els.demandCount.textContent = demandRounded;
  els.supplyCount.textContent = supplyRounded;
  els.scaleBeam.style.setProperty("--tilt", `${rotation}deg`);
  els.scaleBeam.style.setProperty("--pan-tilt", `${rotation * -1}deg`);
  els.demandLoaves.innerHTML = renderLoaves(demandRounded);
  els.supplyLoaves.innerHTML = renderLoaves(supplyRounded);

  if (Math.abs(gap) <= 8) {
    els.balanceMessage.textContent = "Demand and supply are close.";
  } else if (gap > 0) {
    els.balanceMessage.textContent = "Demand is heavier than prepared bread.";
  } else {
    els.balanceMessage.textContent = "Prepared bread is heavier than demand.";
  }
}

function renderLoaves(quantity) {
  const loafCount = clamp(Math.ceil(quantity / 12), 1, 16);
  return Array.from({ length: loafCount }, () => '<i class="loaf"></i>').join("");
}

function updateUI() {
  const weather = dayWeather(state.day);
  state.weather = weather.label;
  els.dayPill.textContent = state.gameOver ? "Challenge Complete" : `Day ${state.day} / ${state.maxDays}`;
  els.cashMetric.textContent = money(state.cashCents);
  els.inventoryMetric.textContent = `${state.inventory} loaves`;
  els.profitMetric.textContent = money(state.cashCents - state.startingCashCents);
  els.profitMetric.className = state.cashCents >= state.startingCashCents ? "positive" : "negative";
  els.moodMetric.textContent = state.mood;
  els.weatherSignal.textContent = weather.label;
  els.costSignal.textContent = money(materialCostCents());
  els.electricitySignal.textContent = `${money(ACCOUNTING.electricityFixedCents)} + ${money(ACCOUNTING.electricityPerLoafCents)}/loaf`;
  els.laborSignal.textContent = money(ACCOUNTING.laborDailyCents);
  els.capacitySignal.textContent = `${state.capacity} loaves`;
  els.newsTitle.textContent = state.currentNews.title;
  els.newsBody.textContent = state.currentNews.body;
  els.decisionTitle.textContent = state.gameOver ? "Final Results" : `Set Day ${state.day} Plan`;
  els.bakeButton.disabled = state.gameOver;
  els.bakeButton.textContent = state.gameOver ? "Shop Closed" : "Bake and Open Shop";
  updateOutputs();
}

function applyEvent(event) {
  state.demandShift += event.demandShift;
  state.supplyShift += event.supplyShift;
  state.flourCents = clamp(state.flourCents + event.flourDeltaCents, 45, 140);
  state.capacity = clamp(state.capacity + event.capacityDelta, 70, 180);
  state.mood = event.mood;
  state.currentNews = {
    title: event.title,
    body: event.body
  };
}

function maybeTriggerEvent() {
  const event = events.find(item => item.day === state.day);
  if (event) {
    applyEvent(event);
  } else {
    state.currentNews = { ...NO_NEWS };
  }
}

function playDay() {
  if (state.gameOver) return;

  const result = calculateDay(priceCents(), Number(els.quantityRange.value));
  state.cashCents += result.profitCents;
  state.inventory = result.carried;
  state.history.unshift(result);

  renderReport(result);

  if (state.day >= state.maxDays) {
    state.gameOver = true;
    renderFinalReport();
  } else {
    state.day += 1;
    maybeTriggerEvent();
  }

  updateUI();
}

function renderReport(result) {
  const balanceClass = result.profitCents >= 0 ? "positive" : "negative";
  const marketMessage = result.shortage > 0
    ? `${result.shortage} customers left without bread. Lost sales at today's price: ${money(result.lostSalesCents)}.`
    : result.surplus > 25
      ? `${result.surplus} loaves remained after closing. ${result.spoiled} spoiled and ${result.carried} carried into tomorrow.`
      : "Supply and demand stayed close. That was a clean trading day.";

  els.report.innerHTML = `
    <div class="report-grid">
      <div><span>Customers</span><strong>${result.customers}</strong></div>
      <div><span>Baked</span><strong>${result.baked}</strong></div>
      <div><span>Sold</span><strong>${result.sold}</strong></div>
      <div><span>Profit</span><strong class="${balanceClass}">${money(result.profitCents)}</strong></div>
    </div>
    <p>${marketMessage}</p>
    <div class="result-layout">
      <div class="cost-box">
        <strong>Accounting Results</strong>
        <span>Revenue: ${money(result.revenueCents)}</span>
        <span>Materials: ${money(result.materialsCents)}</span>
        <span>Electricity: ${money(result.electricityCents)}</span>
        <span>Labor: ${money(result.laborCents)}</span>
        <span>Storage: ${money(result.storageCents)}</span>
        <span>Disposal: ${money(result.disposalCents)}</span>
        <strong>Total cost: ${money(result.totalCostCents)}</strong>
        <strong>Profit: ${money(result.profitCents)}</strong>
      </div>
      ${renderLedger()}
    </div>
  `;
}

function renderInitialReport() {
  els.report.innerHTML = `
    <p>Choose your price and production quantity, then open the shop for Day 1.</p>
    <div class="result-layout">
      <div class="cost-box">
        <strong>Accounting Results</strong>
        <span>Open the shop to calculate today&apos;s revenue, costs, and profit.</span>
      </div>
      ${renderLedger()}
    </div>
  `;
}

function renderFinalReport() {
  const totalProfitCents = state.cashCents - state.startingCashCents;
  const best = state.history.reduce((winner, item) => (item.profitCents > winner.profitCents ? item : winner), state.history[0]);
  const verdict = totalProfitCents >= 26000
    ? "Outstanding run. You read the market like a seasoned owner."
    : totalProfitCents >= 12000
      ? "Profitable run. Your bakery leaves the week stronger."
      : totalProfitCents >= 0
        ? "You survived the challenge, but the margin was thin."
        : "The bakery lost money. Next run, watch surplus and shortage signals more closely.";

  els.report.innerHTML += `
    <p><strong>${verdict}</strong></p>
    <p>Best day: Day ${best.day}, earning ${money(best.profitCents)} at ${money(best.priceCents)} with ${best.baked} loaves baked.</p>
  `;
}

function renderLedger() {
  const completed = [...state.history].sort((a, b) => a.day - b.day);
  const maxAbsProfit = Math.max(1, ...completed.map(item => Math.abs(item.profitCents)));
  const items = completed
    .sort((a, b) => a.day - b.day)
    .map(item => {
      const width = Math.max(6, Math.round((Math.abs(item.profitCents) / maxAbsProfit) * 100));
      return `
      <li class="${item.profitCents >= 0 ? "profit-day" : "loss-day"}">
        <div class="bar-label">
          <strong>Day ${item.day}</strong>
          <span class="${item.profitCents >= 0 ? "positive" : "negative"}">${money(item.profitCents)}</span>
        </div>
        <div class="profit-bar" aria-hidden="true">
          <i style="width: ${width}%"></i>
        </div>
        <small>${item.sold} sold</small>
      </li>
    `;
    })
    .join("");

  return `
    <div class="ledger-wrap" aria-label="10-day profit summary">
      <h3>10-Day Profit Summary</h3>
      ${items ? `<ol class="ledger">${items}</ol>` : '<p class="empty-ledger">No completed days yet.</p>'}
    </div>
  `;
}

function restart() {
  Object.assign(state, {
    day: 1,
    cashCents: 50000,
    inventory: 0,
    demandShift: 0,
    supplyShift: 0,
    flourCents: ACCOUNTING.flourCents,
    capacity: 110,
    mood: "Steady",
    weather: "Mild morning",
    history: [],
    currentNews: { ...BASE_NEWS },
    gameOver: false
  });
  els.priceRange.value = 5;
  els.quantityRange.value = 80;
  renderInitialReport();
  updateUI();
}

els.priceRange.addEventListener("input", updateOutputs);
els.quantityRange.addEventListener("input", updateOutputs);
els.bakeButton.addEventListener("click", playDay);
els.restartButton.addEventListener("click", restart);
window.addEventListener("resize", drawMarket);

renderInitialReport();
updateUI();
