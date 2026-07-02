const rowsBody = document.querySelector("#rowsBody");
const printRowsEl = document.querySelector("#printRows");
const rowTemplate = document.querySelector("#rowTemplate");
const appRoot = document.querySelector("#appRoot");
const addRowBtn = document.querySelector("#addRowBtn");
const togglePricesBtn = document.querySelector("#togglePricesBtn");
const clearBtn = document.querySelector("#clearBtn");
const printBtn = document.querySelector("#printBtn");
const viewButtons = document.querySelectorAll(".view-btn");
const printViewName = document.querySelector("#printViewName");
const dateInput = document.querySelector("#dateInput");
const drawNumbersInput = document.querySelector("#drawNumbersInput");
const confirmDrawBtn = document.querySelector("#confirmDrawBtn");
const drawNumberInputs = document.querySelectorAll(".draw-number-input");
const carDownPriceInput = document.querySelector("#carDownPriceInput");
const carUpPriceInput = document.querySelector("#carUpPriceInput");
const pillarDownPriceInput = document.querySelector("#pillarDownPriceInput");
const pillarUpPriceInput = document.querySelector("#pillarUpPriceInput");
const pillarRoundUpInput = document.querySelector("#pillarRoundUpInput");
const comboTwoUnitPriceInput = document.querySelector("#comboTwoUnitPriceInput");
const comboThreeUnitPriceInput = document.querySelector("#comboThreeUnitPriceInput");
const comboFourUnitPriceInput = document.querySelector("#comboFourUnitPriceInput");
const carPrizeInput = document.querySelector("#carPrizeInput");
const pillarTwoPrizeInput = document.querySelector("#pillarTwoPrizeInput");
const pillarThreePrizeInput = document.querySelector("#pillarThreePrizeInput");
const pillarFourPrizeInput = document.querySelector("#pillarFourPrizeInput");
const comboTwoPrizeInput = document.querySelector("#comboTwoPrizeInput");
const comboThreePrizeInput = document.querySelector("#comboThreePrizeInput");
const comboFourPrizeInput = document.querySelector("#comboFourPrizeInput");
const previousBalanceInput = document.querySelector("#previousBalanceInput");
const currentPeriodTotalEl = document.querySelector("#currentPeriodTotal");
const grandTotalEl = document.querySelector("#grandTotal");
const downTotalEl = document.querySelector("#downTotal");
const upTotalEl = document.querySelector("#upTotal");
const marginTotalEl = document.querySelector("#marginTotal");
const carCountTotalEl = document.querySelector("#carCountTotal");
const carAmountTotalEl = document.querySelector("#carAmountTotal");
const pillarCountTotalEl = document.querySelector("#pillarCountTotal");
const pillarAmountTotalEl = document.querySelector("#pillarAmountTotal");
const carBreakdownEl = document.querySelector("#carBreakdown");
const pillarBreakdownEl = document.querySelector("#pillarBreakdown");
const downBreakdownEl = document.querySelector("#downBreakdown");
const upBreakdownEl = document.querySelector("#upBreakdown");
const marginBreakdownEl = document.querySelector("#marginBreakdown");
const SETTINGS_STORAGE_KEY = "shuang-shuang-ying-539-rate-settings-v1";
const DRAFT_STORAGE_KEY = "shuang-shuang-ying-539-current-draft-v1";
let isRestoringDraft = false;
const persistentSettingInputs = Array.from(
  document.querySelectorAll(".setting-price input:not([type='checkbox']), .setting-prize input, #previousBalanceInput")
);
const persistentSettingCheckboxes = Array.from(
  document.querySelectorAll(".setting-option input[type='checkbox']")
);

const currencyFormatter = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 2,
});

function todayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const directNumber = Number(raw.replace(/,/g, ""));
  if (Number.isFinite(directNumber)) return directNumber;

  return evaluateNumberExpression(raw);
}

function evaluateNumberExpression(raw) {
  const expression = String(raw)
    .replace(/[，,]/g, "")
    .replace(/[＋]/g, "+")
    .replace(/[－]/g, "-")
    .replace(/[＊×xX]/g, "*")
    .replace(/[／÷]/g, "/")
    .replace(/\s+/g, "");

  if (!/^[\d+\-*/().]+$/.test(expression)) return 0;

  let index = 0;

  function peek() {
    return expression[index];
  }

  function consume(char) {
    if (peek() === char) {
      index += 1;
      return true;
    }
    return false;
  }

  function parseNumber() {
    const start = index;
    while (/\d|\./.test(peek() || "")) index += 1;
    if (start === index) return NaN;
    return Number(expression.slice(start, index));
  }

  function parseFactor() {
    if (consume("+")) return parseFactor();
    if (consume("-")) return -parseFactor();
    if (consume("(")) {
      const value = parseExpression();
      if (!consume(")")) return NaN;
      return value;
    }
    return parseNumber();
  }

  function parseTerm() {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const operator = expression[index];
      index += 1;
      const right = parseFactor();
      if (operator === "*") value *= right;
      if (operator === "/") value /= right;
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = expression[index];
      index += 1;
      const right = parseTerm();
      if (operator === "+") value += right;
      if (operator === "-") value -= right;
    }
    return value;
  }

  const result = parseExpression();
  return index === expression.length && Number.isFinite(result) ? result : 0;
}

function formatMoney(value) {
  return currencyFormatter.format(value).replace("NT$", "$");
}

function formatWholeMoney(value) {
  const rounded = Math.round(value);
  return `$${rounded.toLocaleString("zh-TW")}`;
}

function formatCount(value) {
  return Number(value.toFixed(4)).toString();
}

function emptyBreakdown() {
  return {
    down: { stake: 0, prize: 0 },
    up: { stake: 0, prize: 0 },
    margin: { stake: 0, prize: 0 },
  };
}

function addBreakdownAmount(target, amounts) {
  target.down.stake += amounts.stake.down;
  target.up.stake += amounts.stake.up;
  target.margin.stake += amounts.stake.margin;
  target.down.prize += amounts.prize.down;
  target.up.prize += amounts.prize.up;
  target.margin.prize += amounts.prize.margin;
}

function renderBreakdown(element, breakdown, amountKey, formulaText = "") {
  const stake = breakdown[amountKey].stake;
  const prize = breakdown[amountKey].prize;
  const subtotal = stake - prize;
  element.innerHTML = `
    ${formulaText ? `<span class="unit-price-col summary-formula">${formulaText}</span>` : ""}
    <span class="settlement-formula">簽牌費用 ${formatWholeMoney(stake)} - 中獎金額 ${formatWholeMoney(prize)} = <b>${formatWholeMoney(subtotal)}</b></span>
  `;
}

function renderTypeBreakdown(element, breakdown, amountKey, formulaText = "") {
  const stake = breakdown[amountKey].stake;
  const prize = breakdown[amountKey].prize;
  const subtotal = stake - prize;
  element.innerHTML = `
    ${formulaText ? `<span class="unit-price-col summary-formula">${formulaText}</span>` : ""}
    <span class="settlement-formula">簽牌費用 ${formatWholeMoney(stake)} - 中獎金額 ${formatWholeMoney(prize)} = <b>${formatWholeMoney(subtotal)}</b></span>
  `;
}

function renderRowAmount(element, stake, prize) {
  element.innerHTML = `
    <small>費用 ${formatWholeMoney(stake)}</small>
    <small class="row-prize-line">中獎 ${formatWholeMoney(prize)}</small>
  `;
}

function getAmountLabel(amountKey) {
  if (amountKey === "up") return "上家金額";
  if (amountKey === "margin") return "價差";
  return "下家金額";
}

function renderPrintRows(rows, amountKey) {
  if (!printRowsEl) return;

  printRowsEl.innerHTML = "";
  rows.forEach((rowData, index) => {
    const item = document.createElement("article");
    item.className = "print-row";

    const type = document.createElement("div");
    type.className = "print-row-type";
    type.innerHTML = `
      <strong>${rowData.type}</strong>
      ${rowData.starsSummary ? `<small class="print-stars-summary">星別：${rowData.starsSummary}</small>` : ""}
      ${rowData.summary ? `<small>${rowData.summary}</small>` : ""}
    `;

    const numbers = document.createElement("div");
    numbers.className = "print-row-numbers";
    numbers.innerHTML = rowData.numbersHtml || `<span class="print-empty">第 ${index + 1} 列未輸入號碼</span>`;

    const count = document.createElement("div");
    count.className = "print-row-count";
    count.innerHTML = rowData.countLines.length
      ? rowData.countLines
          .map((line) => {
            const matchedStar = ["二星", "三星", "四星"].find((star) => line.startsWith(star));
            if (!matchedStar) return `<span>${line}</span>`;
            return `<span><b>${matchedStar}</b>${line.slice(matchedStar.length)}</span>`;
          })
          .join("")
      : `<span>-</span>`;

    const amount = document.createElement("div");
    amount.className = rowData.hasHit ? "print-row-amount has-hit" : "print-row-amount";
    const netAmount = rowData.amounts[amountKey].stake - rowData.amounts[amountKey].prize;
    amount.innerHTML = `
      <strong class="${netAmount < 0 ? "negative" : ""}">${formatWholeMoney(netAmount)}</strong>
      ${rowData.amounts[amountKey].prize ? `<small>中獎 ${formatWholeMoney(rowData.amounts[amountKey].prize)}</small>` : ""}
    `;

    item.append(type, numbers, count, amount);
    printRowsEl.append(item);
  });
}

function getBreakdownNet(breakdown, amountKey) {
  return breakdown[amountKey].stake - breakdown[amountKey].prize;
}

function getUnitPriceForView(type, amountKey) {
  if (type === "坐車") {
    const downPrice = toNumber(carDownPriceInput.value);
    const upPrice = toNumber(carUpPriceInput.value);
    if (amountKey === "up") return upPrice;
    if (amountKey === "margin") return downPrice - upPrice;
    return downPrice;
  }

  if (type === "立柱") {
    const downPrice = toNumber(pillarDownPriceInput.value);
    const upPrice = toNumber(pillarUpPriceInput.value);
    if (amountKey === "up") return upPrice;
    if (amountKey === "margin") return downPrice - upPrice;
    return downPrice;
  }

  return 0;
}

function getSummaryFormula(type, count, amountKey) {
  if (count === 0) return "";
  const unit = type === "坐車" ? "車" : "注";
  const price = getUnitPriceForView(type, amountKey);
  return `${formatCount(count)}${unit} × 單價${formatWholeMoney(price)} = ${formatWholeMoney(count * price)}`;
}

function getViewName(view) {
  if (view === "up") return "上家";
  if (view === "margin") return "中間價差";
  return "下家";
}

function setView(view) {
  if (appRoot.dataset.hidePrices === "true" && view === "margin") {
    view = "down";
  }
  appRoot.dataset.view = view;
  printViewName.textContent = getViewName(view);
  viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  saveDraft();
  recalculate();
}

function setPricesHidden(hidden) {
  appRoot.dataset.hidePrices = hidden ? "true" : "false";
  togglePricesBtn.textContent = hidden ? "顯示單價" : "隱藏單價";
  togglePricesBtn.classList.toggle("primary", hidden);
  togglePricesBtn.classList.toggle("secondary", !hidden);
  if (hidden && appRoot.dataset.view === "margin") {
    setView("down");
  }
  saveDraft();
}

function loadPersistentSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    persistentSettingInputs.forEach((input) => {
      if (Object.prototype.hasOwnProperty.call(saved, input.id)) {
        input.value = saved[input.id];
      } else if (input.id === "carPrizeInput") {
        input.value = saved.carUpPrizeInput || saved.carDownPrizeInput || input.value;
      } else if (input.id === "pillarTwoPrizeInput") {
        input.value = saved.pillarTwoUpPrizeInput || saved.pillarTwoDownPrizeInput || input.value;
      } else if (input.id === "pillarThreePrizeInput") {
        input.value = saved.pillarThreeUpPrizeInput || saved.pillarThreeDownPrizeInput || input.value;
      } else if (input.id === "pillarFourPrizeInput") {
        input.value = saved.pillarFourUpPrizeInput || saved.pillarFourDownPrizeInput || input.value;
      } else if (input.id === "comboTwoUnitPriceInput") {
        input.value = saved.comboTwoUnitPriceInput || saved.comboTwoDownPriceInput || saved.comboTwoUpPriceInput || input.value;
      } else if (input.id === "comboThreeUnitPriceInput") {
        input.value =
          saved.comboThreeUnitPriceInput || saved.comboThreeDownPriceInput || saved.comboThreeUpPriceInput || input.value;
      } else if (input.id === "comboFourUnitPriceInput") {
        input.value = saved.comboFourUnitPriceInput || saved.comboFourDownPriceInput || saved.comboFourUpPriceInput || input.value;
      } else if (input.id === "comboTwoPrizeInput") {
        input.value = saved.comboTwoUpPrizeInput || saved.comboTwoDownPrizeInput || input.value;
      } else if (input.id === "comboThreePrizeInput") {
        input.value = saved.comboThreeUpPrizeInput || saved.comboThreeDownPrizeInput || input.value;
      } else if (input.id === "comboFourPrizeInput") {
        input.value = saved.comboFourUpPrizeInput || saved.comboFourDownPrizeInput || input.value;
      }
    });
    persistentSettingCheckboxes.forEach((input) => {
      if (Object.prototype.hasOwnProperty.call(saved, input.id)) {
        input.checked = Boolean(saved[input.id]);
      }
    });
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
}

function savePersistentSettings() {
  const payload = {};
  persistentSettingInputs.forEach((input) => {
    payload[input.id] = input.value;
  });
  persistentSettingCheckboxes.forEach((input) => {
    payload[input.id] = input.checked;
  });
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

function serializeRow(row) {
  const type = row.querySelector(".type-input").value;
  return {
    type,
    plainNumbers: row.querySelector(".plain-numbers-input")?.value || "",
    pillarPattern: row.querySelector(".pillar-pattern-input")?.value || "",
    pillarNumbers: Array.from(row.querySelectorAll(".pillar-number-input")).map((input) => ({
      key: input.dataset.pillarKey || "",
      size: input.dataset.groupSize || "",
      value: input.value,
    })),
    count: row.querySelector(".count-input")?.value || "1",
    pillarStarCounts: Array.from(row.querySelectorAll(".pillar-star-count-input")).reduce((acc, input) => {
      acc[input.dataset.star] = input.value;
      return acc;
    }, {}),
    selectedStars: getSelectedStars(row),
    downPrice: row.querySelector(".down-price-input")?.value || "0",
    upPrice: row.querySelector(".up-price-input")?.value || "0",
  };
}

function saveDraft() {
  if (isRestoringDraft) return;
  const payload = {
    date: dateInput.value,
    drawNumbers: Array.from(drawNumberInputs).map((input) => input.value),
    view: appRoot.dataset.view || "up",
    pricesHidden: appRoot.dataset.hidePrices === "true",
    rows: Array.from(rowsBody.querySelectorAll(".entry-row")).map(serializeRow),
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

function getCountUnit(type) {
  if (type === "坐車") return "車";
  if (isComboType(type)) return "碰";
  return "組";
}

function typeNeedsStars(type) {
  return type === "立柱" || isComboType(type);
}

function isComboType(type) {
  return type === "連碰" || type === "多組連碰";
}

function getSelectedStars(row) {
  return Array.from(row.querySelectorAll(".star-checkbox:checked")).map((input) => input.value);
}

function combination(n, k) {
  if (n < k || k < 0) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - i + 1)) / i;
  }
  return result;
}

function starToPickCount(star) {
  if (star === "二星") return 2;
  if (star === "三星") return 3;
  if (star === "四星") return 4;
  return 0;
}

function getComboStarPrice(star) {
  if (star === "二星") {
    const price = toNumber(comboTwoUnitPriceInput.value);
    return {
      downPrice: price,
      upPrice: price,
    };
  }

  if (star === "三星") {
    const price = toNumber(comboThreeUnitPriceInput.value);
    return {
      downPrice: price,
      upPrice: price,
    };
  }

  if (star === "四星") {
    const price = toNumber(comboFourUnitPriceInput.value);
    return {
      downPrice: price,
      upPrice: price,
    };
  }

  return { downPrice: 0, upPrice: 0 };
}

function getComboStarPrize(star) {
  if (star === "二星") {
    const prize = toNumber(comboTwoPrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  if (star === "三星") {
    const prize = toNumber(comboThreePrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  if (star === "四星") {
    const prize = toNumber(comboFourPrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  return { downPrize: 0, upPrize: 0 };
}

function getPillarStarPrize(star) {
  if (star === "二星") {
    const prize = toNumber(pillarTwoPrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  if (star === "三星") {
    const prize = toNumber(pillarThreePrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  if (star === "四星") {
    const prize = toNumber(pillarFourPrizeInput.value);
    return { downPrize: prize, upPrize: prize };
  }

  return { downPrize: 0, upPrize: 0 };
}

function pillarCombinationCount(values, pickCount, startIndex = 0) {
  if (pickCount === 0) return 1;
  if (values.length - startIndex < pickCount) return 0;

  let total = 0;
  for (let index = startIndex; index <= values.length - pickCount; index += 1) {
    total += values[index] * pillarCombinationCount(values, pickCount - 1, index + 1);
  }
  return total;
}

function parseGroupedNumbers(raw) {
  const groups = String(raw || "")
    .split(/[\/／\n]+/)
    .map((group) => group.trim())
    .filter(Boolean);
  const errors = [];
  const normalizedGroups = groups.map((group, index) => {
    const { normalized, errors: groupErrors } = normalizeNumbers(group);
    errors.push(...groupErrors.map((message) => `第 ${index + 1} 組：${message}`));
    return normalized;
  });

  return { groups: normalizedGroups, errors };
}

function getMultiComboGroups(row) {
  const input = row.querySelector(".plain-numbers-input");
  return parseGroupedNumbers(input?.value || "").groups.filter((group) => group.length > 0);
}

function getMultiComboFormulaCount(row, star) {
  const groupSizes = getMultiComboGroups(row).map((group) => group.length);
  return pillarCombinationCount(groupSizes, starToPickCount(star));
}

function getMultiComboHitValues(row, drawSet) {
  if (drawSet.size === 0) return [];
  return getMultiComboGroups(row).map((group) => group.filter((number) => drawSet.has(number)).length);
}

function getPillarFormulaCount(row, star) {
  const { values } = parsePattern(row.querySelector(".pillar-pattern-input").value);
  return pillarCombinationCount(values, starToPickCount(star));
}

function getPillarStarMultiplier(row, star) {
  const input = row.querySelector(`.pillar-star-count-input[data-star="${star}"]`);
  return input ? toNumber(input.value) : 0;
}

function shouldRoundUpPillarCount() {
  return Boolean(pillarRoundUpInput?.checked);
}

function getPillarRawBillableCount(row, star) {
  return getPillarFormulaCount(row, star) * getPillarStarMultiplier(row, star);
}

function getPillarBillableCount(row, star) {
  const rawCount = getPillarRawBillableCount(row, star);
  return shouldRoundUpPillarCount() ? Math.ceil(rawCount) : rawCount;
}

function getPillarPatternSummary(row) {
  const { values } = parsePattern(row.querySelector(".pillar-pattern-input").value);
  if (!values.length) return "";

  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((size) => `${size}碼柱×${counts[size]}`)
    .join(" / ");
}

function renderPillarItemSummary(row, type) {
  const summary = row.querySelector(".pillar-item-summary");
  if (!summary) return;
  summary.textContent = type === "立柱" ? getPillarPatternSummary(row) : "";
}

function getStarCheckText(row, type) {
  const selectedStars = getSelectedStars(row);
  if (!typeNeedsStars(type) || selectedStars.length === 0) return "";

  if (type === "連碰") {
    const numberCount = getPlainNumberCount(row);
    return selectedStars
      .map((star) => {
        const pickCount = starToPickCount(star);
        return `${star}${combination(numberCount, pickCount)}組`;
      })
      .join(" / ");
  }

  if (type === "多組連碰") {
    return selectedStars
      .map((star) => `${star}${formatCount(getMultiComboFormulaCount(row, star))}組`)
      .join(" / ");
  }

  if (type === "立柱") {
    return "";
  }

  return "";
}

function getPrintCountLines(type, row, count, billableCount) {
  if (type === "坐車") {
    const numberCount = getPlainNumberCount(row);
    const safeNumberCount = numberCount || 1;
    return [`${safeNumberCount}碼 × ${formatCount(count)}車 = ${formatCount(billableCount)}車`];
  }

  if (type === "立柱") {
    const lines = getSelectedStars(row)
      .map((star) => {
        const formulaCount = getPillarFormulaCount(row, star);
        const multiplier = getPillarStarMultiplier(row, star);
        const rawCount = formulaCount * multiplier;
        const billedCount = getPillarBillableCount(row, star);
        const roundedNote = billedCount !== rawCount ? ` → ${formatCount(billedCount)}注` : "";
        return `${star} ${formatCount(formulaCount)}組 × ${formatCount(multiplier)} = ${formatCount(rawCount)}注${roundedNote}`;
      });
    lines.push(`合計 ${formatCount(billableCount)}注`);
    return lines;
  }

  if (isComboType(type)) {
    const numberCount = getPlainNumberCount(row);
    const lines = getSelectedStars(row).map((star) => {
      const groupCount =
        type === "多組連碰" ? getMultiComboFormulaCount(row, star) : combination(numberCount, starToPickCount(star));
      return `${star} ${formatCount(groupCount)}組 × ${formatCount(count)} = ${formatCount(groupCount * count)}注`;
    });
    lines.push(`合計 ${formatCount(billableCount)}注`);
    return lines;
  }

  return [`${formatCount(count)}組`];
}

function getPrintStarsSummary(type, row) {
  if (!typeNeedsStars(type)) return "";
  return getSelectedStars(row).join(" / ");
}

function renderPillarCountNotes(row, type) {
  const countRows = row.querySelectorAll(".pillar-count-row");
  const totalEl = row.querySelector(".pillar-count-total");
  if (!countRows.length || !totalEl) return;

  if (type !== "立柱") {
    countRows.forEach((countRow) => {
      const note = countRow.querySelector(".pillar-count-note");
      note.textContent = "";
    });
    totalEl.textContent = "";
    return;
  }

  let total = 0;
  countRows.forEach((countRow) => {
    const input = countRow.querySelector(".pillar-star-count-input");
    const note = countRow.querySelector(".pillar-count-note");
    const star = note.dataset.star;
    const formulaCount = getPillarFormulaCount(row, star);
    const multiplier = toNumber(input?.value);
    const rawSubtotal = formulaCount * multiplier;
    const subtotal = getPillarBillableCount(row, star);
    total += subtotal;
    const roundedNote = subtotal !== rawSubtotal ? ` → ${formatCount(subtotal)}注` : "";
    note.textContent = `${formulaCount}組 × ${formatCount(multiplier)} = ${formatCount(rawSubtotal)}注${roundedNote}`;
  });
  totalEl.textContent = `合計 ${formatCount(total)}注`;
}

function syncPillarPatternState(row, type) {
  const input = row.querySelector(".pillar-pattern-input");
  const isPillar = type === "立柱";
  input.disabled = !isPillar;
  input.placeholder = isPillar ? "例：111112" : "-";
  if (!isPillar) input.value = "";
}

function syncPlainNumbersHint(row, type) {
  const input = row.querySelector(".plain-numbers-input");
  if (!input) return;

  if (type === "多組連碰") {
    input.placeholder = "例：01 02 / 03 04 / 05 06";
    return;
  }

  input.placeholder = "例：08 16 38 33 34";
}

function getGlobalPrices(type) {
  if (type === "坐車") {
    return {
      downPrice: toNumber(carDownPriceInput.value),
      upPrice: toNumber(carUpPriceInput.value),
      usesGlobalPrice: true,
    };
  }

  if (type === "立柱") {
    return {
      downPrice: toNumber(pillarDownPriceInput.value),
      upPrice: toNumber(pillarUpPriceInput.value),
      usesGlobalPrice: true,
    };
  }

  return {
    downPrice: null,
    upPrice: null,
    usesGlobalPrice: false,
  };
}

function splitNumbers(raw) {
  return String(raw || "")
    .replace(/[，,、.。．xX＊*×]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeNumber(part) {
  if (!/^\d{1,2}$/.test(part)) return null;
  const number = Number(part);
  if (number < 1 || number > 39) return null;
  return String(number).padStart(2, "0");
}

function normalizeNumbers(raw) {
  const errors = [];
  const normalized = [];

  for (const part of splitNumbers(raw)) {
    const number = normalizeNumber(part);
    if (!number) {
      errors.push(`號碼「${part}」不在 01~39`);
    } else {
      normalized.push(number);
    }
  }

  return { normalized, errors };
}

function getDrawNumberSet() {
  const normalized = Array.from(drawNumberInputs)
    .map((input) => normalizeNumber(input.value.trim()))
    .filter(Boolean);
  return new Set(normalized);
}

function confirmDrawNumbers() {
  const normalized = Array.from(drawNumberInputs)
    .map((input) => normalizeNumber(input.value.trim()))
    .filter(Boolean);

  normalized.sort((a, b) => Number(a) - Number(b));
  drawNumberInputs.forEach((input) => {
    input.value = "";
  });
  normalized.slice(0, drawNumberInputs.length).forEach((number, index) => {
    drawNumberInputs[index].value = number;
  });
}

function renderNumberPreview(preview, raw, drawSet) {
  const parts = splitNumbers(raw);
  preview.innerHTML = "";
  preview.hidden = parts.length === 0;

  parts.forEach((part) => {
    const number = normalizeNumber(part);
    const chip = document.createElement("span");
    chip.className = "number-chip";
    chip.textContent = number || part;
    if (number && drawSet.has(number)) {
      chip.classList.add("hit-number");
    }
    preview.append(chip);
  });
}

function renderGroupedNumberPreview(preview, raw, drawSet) {
  const { groups } = parseGroupedNumbers(raw);
  preview.innerHTML = "";
  preview.hidden = groups.length === 0;

  groups.forEach((group, index) => {
    if (index > 0) {
      const slash = document.createElement("span");
      slash.className = "group-separator";
      slash.textContent = "/";
      preview.append(slash);
    }

    const groupEl = document.createElement("span");
    groupEl.className = "number-group";
    group.forEach((number) => {
      const chip = document.createElement("span");
      chip.className = "number-chip";
      chip.textContent = number;
      if (drawSet.has(number)) chip.classList.add("hit-number");
      groupEl.append(chip);
    });
    preview.append(groupEl);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printNumberChip(number, drawSet) {
  const normalized = normalizeNumber(number);
  const display = normalized || number;
  const hitClass = normalized && drawSet.has(normalized) ? " hit-number" : "";
  return `<span class="number-chip${hitClass}">${escapeHtml(display)}</span>`;
}

function getPrintNumbersHtml(row, type, drawSet) {
  if (type === "多組連碰") {
    const input = row.querySelector(".plain-numbers-input");
    const { groups } = parseGroupedNumbers(input?.value || "");
    return groups
      .map((group) => `<span class="print-number-group">${group.map((number) => printNumberChip(number, drawSet)).join("")}</span>`)
      .join(`<span class="print-group-separator">/</span>`);
  }

  if (type !== "立柱") {
    const input = row.querySelector(".plain-numbers-input");
    return splitNumbers(input?.value || "")
      .map((part) => printNumberChip(part, drawSet))
      .join("");
  }

  return Array.from(row.querySelectorAll(".pillar-number-input"))
    .map((input) => {
      const groupSize = Math.max(1, Number(input.dataset.groupSize) || 1);
      const occurrences = Math.max(1, Number(input.dataset.groupOccurrences) || 1);
      const numbers = normalizeNumbers(input.value).normalized;

      if (groupSize === 1) {
        return numbers.map((number) => printNumberChip(number, drawSet)).join("");
      }

      const groups = [];
      for (let index = 0; index < Math.max(occurrences, Math.ceil(numbers.length / groupSize)); index += 1) {
        const chunk = numbers.slice(index * groupSize, index * groupSize + groupSize);
        if (chunk.length === 0) continue;
        groups.push(`<span class="print-pillar-stack">${chunk.map((number) => printNumberChip(number, drawSet)).join("")}</span>`);
      }
      return groups.join("");
    })
    .join("");
}

function parsePattern(rawPattern) {
  const pattern = String(rawPattern || "").replace(/\D/g, "").slice(0, 12);
  const values = pattern
    .split("")
    .map((digit) => Number(digit))
    .filter((digit) => digit >= 1 && digit <= 5);

  return {
    pattern: values.join(""),
    values,
  };
}

function makeTextNumbersInput(value = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "numbers-stack";

  const textarea = document.createElement("textarea");
  textarea.className = "numbers-input plain-numbers-input";
  textarea.rows = 2;
  textarea.placeholder = "例：08 16 38 33 34";
  textarea.value = value;

  const preview = document.createElement("div");
  preview.className = "number-preview";
  preview.hidden = true;

  wrapper.append(textarea, preview);
  return wrapper;
}

function makePillarBox(patternValues = [1, 1, 1, 1, 1]) {
  const box = document.createElement("div");
  box.className = "pillar-box";
  const groups = [];
  let oneColumnGroup = null;

  patternValues.forEach((count, index) => {
    if (count === 1) {
      if (!oneColumnGroup) {
        oneColumnGroup = { size: 1, occurrences: 0, firstIndex: index, key: "one-columns" };
        groups.push(oneColumnGroup);
      }
      oneColumnGroup.occurrences += 1;
      return;
    }

    groups.push({
      size: count,
      occurrences: 1,
      firstIndex: index,
      key: `pillar-${index}-${count}`,
    });
  });

  groups.forEach((group) => {
    const expectedCount = group.size * group.occurrences;
    const field = document.createElement("label");
    field.className = "pillar-field";

    const label = document.createElement("span");
    label.textContent = `${group.size}碼柱`;
    label.title = `${group.occurrences}柱，共需 ${expectedCount} 個號碼`;

    const input = document.createElement("input");
    input.className = "pillar-number-input";
    input.type = "text";
    input.placeholder = `需 ${expectedCount} 個`;
    input.dataset.expectedCount = String(expectedCount);
    input.dataset.groupSize = String(group.size);
    input.dataset.groupOccurrences = String(group.occurrences);
    input.dataset.pillarKey = group.key;

    const preview = document.createElement("div");
    preview.className = "number-preview pillar-number-preview";
    preview.hidden = true;

    field.append(label, input, preview);
    box.append(field);
  });

  return box;
}

function setNumbersCell(row) {
  const type = row.querySelector(".type-input").value;
  const cell = row.querySelector(".numbers-cell");
  const currentPlain = row.querySelector(".plain-numbers-input")?.value || "";
  const currentPillarInputs = Array.from(row.querySelectorAll(".pillar-number-input")).map((input) => ({
    key: input.dataset.pillarKey || "",
    size: input.dataset.groupSize || "",
    value: input.value,
  }));
  const currentPillarsByKey = new Map(
    currentPillarInputs.map((input) => [input.key, input.value])
  );
  const currentPillarsBySize = currentPillarInputs.reduce((acc, input) => {
    if (!acc.has(input.size)) acc.set(input.size, []);
    acc.get(input.size).push(input.value);
    return acc;
  }, new Map());

  cell.innerHTML = "";

  if (type === "立柱") {
    const { values } = parsePattern(row.querySelector(".pillar-pattern-input").value || "11111");
    const patternValues = values.length ? values : [1, 1, 1, 1, 1];
    const box = makePillarBox(patternValues);
    Array.from(box.querySelectorAll(".pillar-number-input")).forEach((input) => {
      const sizeQueue = currentPillarsBySize.get(input.dataset.groupSize || "");
      const fallbackValue = sizeQueue
        ?.splice(0, Number(input.dataset.groupOccurrences) || 1)
        .filter(Boolean)
        .join(" ");
      input.value =
        currentPillarsByKey.get(input.dataset.pillarKey || "") ||
        fallbackValue ||
        "";
      input.addEventListener("input", () => recalculate());
      input.addEventListener("blur", () => normalizeRowNumbers(row));
    });
    cell.append(box);
  } else {
    const wrapper = makeTextNumbersInput(currentPlain);
    const input = wrapper.querySelector(".plain-numbers-input");
    input.addEventListener("input", () => recalculate());
    input.addEventListener("blur", () => normalizeRowNumbers(row));
    cell.append(wrapper);
    syncPlainNumbersHint(row, type);
  }
}

function updateNumberPreviews(row, drawSet) {
  const type = row.querySelector(".type-input").value;
  if (type === "立柱") {
    row.querySelectorAll(".pillar-field").forEach((field) => {
      const input = field.querySelector(".pillar-number-input");
      const preview = field.querySelector(".number-preview");
      renderNumberPreview(preview, input.value, drawSet);
    });
    return;
  }

  const input = row.querySelector(".plain-numbers-input");
  const preview = row.querySelector(".number-preview");
  if (input && preview) {
    if (type === "多組連碰") renderGroupedNumberPreview(preview, input.value, drawSet);
    else renderNumberPreview(preview, input.value, drawSet);
  }
}

function rowHasDrawHit(row, drawSet) {
  if (drawSet.size === 0) return false;

  if (row.querySelector(".type-input").value === "立柱") {
    return Array.from(row.querySelectorAll(".pillar-number-input")).some((input) =>
      normalizeNumbers(input.value).normalized.some((number) => drawSet.has(number))
    );
  }

  if (row.querySelector(".type-input").value === "多組連碰") {
    return getMultiComboGroups(row).some((group) => group.some((number) => drawSet.has(number)));
  }

  const input = row.querySelector(".plain-numbers-input");
  if (!input) return false;
  return normalizeNumbers(input.value).normalized.some((number) => drawSet.has(number));
}

function getPlainNumberCount(row) {
  const input = row.querySelector(".plain-numbers-input");
  if (!input) return 0;
  return normalizeNumbers(input.value).normalized.length;
}

function getBillableCount(type, row, count) {
  if (type === "立柱") {
    return getSelectedStars(row).reduce((total, star) => {
      return total + getPillarBillableCount(row, star);
    }, 0);
  }

  if (type === "多組連碰") {
    return getSelectedStars(row).reduce((total, star) => {
      return total + getMultiComboFormulaCount(row, star) * count;
    }, 0);
  }

  if (type !== "坐車") return count;

  const numberCount = getPlainNumberCount(row);
  const safeNumberCount = numberCount || 1;
  return safeNumberCount * count;
}

function calculatePillarAmounts(row) {
  const selectedStars = getSelectedStars(row);
  const downPrice = toNumber(pillarDownPriceInput.value);
  const upPrice = toNumber(pillarUpPriceInput.value);
  let downAmount = 0;
  let upAmount = 0;

  selectedStars.forEach((star) => {
    const billableCount = getPillarBillableCount(row, star);
    downAmount += billableCount * downPrice;
    upAmount += billableCount * upPrice;
  });

  return {
    downAmount,
    upAmount,
    margin: downAmount - upAmount,
  };
}

function calculateComboAmounts(row, count) {
  const type = row.querySelector(".type-input").value;
  const numberCount = getPlainNumberCount(row);
  const selectedStars = getSelectedStars(row);
  let downAmount = 0;
  let upAmount = 0;

  selectedStars.forEach((star) => {
    const pickCount = starToPickCount(star);
    const baseCount = type === "多組連碰" ? getMultiComboFormulaCount(row, star) : combination(numberCount, pickCount);
    const groupCount = baseCount * count;
    const { downPrice, upPrice } = getComboStarPrice(star);
    downAmount += groupCount * downPrice;
    upAmount += groupCount * upPrice;
  });

  return {
    downAmount,
    upAmount,
    margin: downAmount - upAmount,
  };
}

function getPlainHitCount(row, drawSet) {
  if (drawSet.size === 0) return 0;
  const input = row.querySelector(".plain-numbers-input");
  if (!input) return 0;
  return normalizeNumbers(input.value).normalized.filter((number) => drawSet.has(number)).length;
}

function getPillarHitValues(row, drawSet) {
  if (drawSet.size === 0) return [];

  const hitValues = [];
  row.querySelectorAll(".pillar-number-input").forEach((input) => {
    const groupSize = Math.max(1, Number(input.dataset.groupSize) || 1);
    const occurrences = Math.max(1, Number(input.dataset.groupOccurrences) || 1);
    const numbers = normalizeNumbers(input.value).normalized;

    for (let index = 0; index < occurrences; index += 1) {
      const pillarNumbers = numbers.slice(index * groupSize, index * groupSize + groupSize);
      hitValues.push(pillarNumbers.filter((number) => drawSet.has(number)).length);
    }
  });

  return hitValues;
}

function calculatePrizeAmounts(row, type, count, drawSet) {
  let downPrize = 0;
  let upPrize = 0;

  if (drawSet.size === 0) {
    return { down: 0, up: 0, margin: 0 };
  }

  if (type === "坐車") {
    const winningCars = getPlainHitCount(row, drawSet) * count;
    downPrize = winningCars * toNumber(carPrizeInput.value);
    upPrize = winningCars * toNumber(carPrizeInput.value);
  }

  if (isComboType(type)) {
    const hitCount = getPlainHitCount(row, drawSet);
    const hitValues = type === "多組連碰" ? getMultiComboHitValues(row, drawSet) : [];
    getSelectedStars(row).forEach((star) => {
      const pickCount = starToPickCount(star);
      const winningGroups =
        type === "多組連碰"
          ? pillarCombinationCount(hitValues, pickCount) * count
          : combination(hitCount, pickCount) * count;
      const { downPrize: starDownPrize, upPrize: starUpPrize } = getComboStarPrize(star);
      downPrize += winningGroups * starDownPrize;
      upPrize += winningGroups * starUpPrize;
    });
  }

  if (type === "立柱") {
    const hitValues = getPillarHitValues(row, drawSet);
    getSelectedStars(row).forEach((star) => {
      const pickCount = starToPickCount(star);
      const winningGroups = pillarCombinationCount(hitValues, pickCount) * getPillarStarMultiplier(row, star);
      const { downPrize: starDownPrize, upPrize: starUpPrize } = getPillarStarPrize(star);
      downPrize += winningGroups * starDownPrize;
      upPrize += winningGroups * starUpPrize;
    });
  }

  return {
    down: downPrize,
    up: upPrize,
    margin: downPrize - upPrize,
  };
}

function getPrizeSettingWarnings(row, type, count, drawSet) {
  if (drawSet.size === 0) return [];

  const missing = [];

  if (type === "坐車") {
    const winningCars = getPlainHitCount(row, drawSet) * count;
    if (winningCars > 0) {
      if (toNumber(carPrizeInput.value) === 0) missing.push("坐車中一車");
    }
  }

  if (isComboType(type)) {
    const hitCount = getPlainHitCount(row, drawSet);
    const hitValues = type === "多組連碰" ? getMultiComboHitValues(row, drawSet) : [];
    getSelectedStars(row).forEach((star) => {
      const winningGroups =
        type === "多組連碰"
          ? pillarCombinationCount(hitValues, starToPickCount(star)) * count
          : combination(hitCount, starToPickCount(star)) * count;
      const { downPrize, upPrize } = getComboStarPrize(star);
      if (winningGroups > 0) {
        if (downPrize === 0 || upPrize === 0) missing.push(`連碰${star}獎`);
      }
    });
  }

  if (type === "立柱") {
    const hitValues = getPillarHitValues(row, drawSet);
    getSelectedStars(row).forEach((star) => {
      const winningGroups =
        pillarCombinationCount(hitValues, starToPickCount(star)) * getPillarStarMultiplier(row, star);
      const { downPrize, upPrize } = getPillarStarPrize(star);
      if (winningGroups > 0) {
        if (downPrize === 0 || upPrize === 0) missing.push(`立柱${star}獎`);
      }
    });
  }

  return missing.length ? [`有中獎，請輸入中獎金額：${missing.join("、")}`] : [];
}

function getSingleComboPriceForDisplay(row) {
  const selectedStars = getSelectedStars(row);
  if (selectedStars.length !== 1) return null;
  return getComboStarPrice(selectedStars[0]);
}

function normalizeRowNumbers(row) {
  const type = row.querySelector(".type-input").value;

  if (type === "立柱") {
    row.querySelectorAll(".pillar-number-input").forEach((input) => {
      const { normalized } = normalizeNumbers(input.value);
      input.value = normalized.join(" ");
    });
  } else if (type === "多組連碰") {
    const input = row.querySelector(".plain-numbers-input");
    const { groups } = parseGroupedNumbers(input.value);
    input.value = groups.map((group) => group.join(" ")).join(" / ");
  } else {
    const input = row.querySelector(".plain-numbers-input");
    const { normalized } = normalizeNumbers(input.value);
    input.value = normalized.join(" ");
  }

  recalculate();
}

function getRowWarnings(row, drawSet) {
  const type = row.querySelector(".type-input").value;
  const warnings = [];
  const count = toNumber(row.querySelector(".count-input").value);

  if (typeNeedsStars(type) && getSelectedStars(row).length === 0) {
    warnings.push("星別請至少勾選一個");
  }

  if (type === "立柱") {
    const { pattern, values } = parsePattern(row.querySelector(".pillar-pattern-input").value);
    if (!pattern) warnings.push("立柱柱型請輸入 1~5，例如 11112");

    row.querySelectorAll(".pillar-number-input").forEach((input) => {
      const expected = toNumber(input.dataset.expectedCount);
      const groupSize = input.dataset.groupSize;
      const groupOccurrences = input.dataset.groupOccurrences;
      const { normalized, errors } = normalizeNumbers(input.value);
      warnings.push(...errors);
      if (normalized.length && normalized.length !== expected) {
        warnings.push(`${groupSize}碼柱（${groupOccurrences}柱）需 ${expected} 個號碼，目前輸入 ${normalized.length} 個`);
      }
    });

    if (values.length > 0 && values.length < 2) warnings.push("立柱至少建議輸入 2 柱");
  } else if (type === "多組連碰") {
    const input = row.querySelector(".plain-numbers-input");
    const { groups, errors } = parseGroupedNumbers(input?.value || "");
    warnings.push(...errors);
    if (groups.length > 0 && groups.length < 2) warnings.push("多組連碰至少需要 2 組，請用 / 分組");
    getSelectedStars(row).forEach((star) => {
      const pickCount = starToPickCount(star);
      if (groups.length > 0 && groups.length < pickCount) warnings.push(`${star}至少需要 ${pickCount} 組`);
    });
  } else {
    const input = row.querySelector(".plain-numbers-input");
    const { errors } = normalizeNumbers(input?.value || "");
    warnings.push(...errors);
  }

  warnings.push(...getPrizeSettingWarnings(row, type, count, drawSet));

  return warnings;
}

function recalculate() {
  const typeTotals = {
    坐車: { count: 0, down: 0, up: 0, margin: 0 },
    立柱: { count: 0, down: 0, up: 0, margin: 0 },
  };
  const typeBreakdowns = {
    坐車: emptyBreakdown(),
    立柱: emptyBreakdown(),
  };
  const totalBreakdown = emptyBreakdown();
  const drawSet = getDrawNumberSet();
  const currentView = appRoot.dataset.view || "down";
  const amountKey = currentView === "up" ? "up" : currentView === "margin" ? "margin" : "down";
  const printRows = [];

  rowsBody.querySelectorAll(".entry-row").forEach((row) => {
    const type = row.querySelector(".type-input").value;
    row.classList.toggle("is-car", type === "坐車");
    row.classList.toggle("is-pillar", type === "立柱");
    row.classList.toggle("is-combo", isComboType(type));
    row.classList.toggle("is-multi-combo", type === "多組連碰");
    row.classList.toggle("is-manual", type === "手動");
    syncPillarPatternState(row, type);
    syncPlainNumbersHint(row, type);
    const hasHit = rowHasDrawHit(row, drawSet);
    row.classList.toggle("has-hit", hasHit);
    const count = toNumber(row.querySelector(".count-input").value);
    const billableCount = getBillableCount(type, row, count);
    const downPriceInput = row.querySelector(".down-price-input");
    const upPriceInput = row.querySelector(".up-price-input");
    const globalPrice = getGlobalPrices(type);
    let downPrice = globalPrice.usesGlobalPrice ? globalPrice.downPrice : toNumber(downPriceInput.value);
    let upPrice = globalPrice.usesGlobalPrice ? globalPrice.upPrice : toNumber(upPriceInput.value);
    let downAmount = billableCount * downPrice;
    let upAmount = billableCount * upPrice;

    if (type === "立柱") {
      const pillarAmounts = calculatePillarAmounts(row);
      downAmount = pillarAmounts.downAmount;
      upAmount = pillarAmounts.upAmount;
    }

    if (isComboType(type)) {
      const comboAmounts = calculateComboAmounts(row, count);
      downAmount = comboAmounts.downAmount;
      upAmount = comboAmounts.upAmount;
      const displayPrice = getSingleComboPriceForDisplay(row);
      downPrice = displayPrice?.downPrice ?? null;
      upPrice = displayPrice?.upPrice ?? null;
    }

    const marginPrice = downPrice === null || upPrice === null ? null : downPrice - upPrice;
    const margin = downAmount - upAmount;
    const prizeAmounts = calculatePrizeAmounts(row, type, count, drawSet);

    if (globalPrice.usesGlobalPrice || isComboType(type)) {
      downPriceInput.value = downPrice ?? "";
      upPriceInput.value = upPrice ?? "";
      downPriceInput.readOnly = true;
      upPriceInput.readOnly = true;
      const priceTitle = isComboType(type) ? "連碰使用上方二星/三星/四星每碰單價" : `${type}使用上方統一單價`;
      downPriceInput.title = priceTitle;
      upPriceInput.title = priceTitle;
    } else {
      downPriceInput.readOnly = false;
      upPriceInput.readOnly = false;
      downPriceInput.title = "";
      upPriceInput.title = "";
    }

    const rowAmounts = {
      stake: { down: downAmount, up: upAmount, margin },
      prize: prizeAmounts,
    };
    addBreakdownAmount(totalBreakdown, rowAmounts);

    if (typeTotals[type]) {
      typeTotals[type].count += billableCount;
      typeTotals[type].down += downAmount;
      typeTotals[type].up += upAmount;
      typeTotals[type].margin += margin;
      addBreakdownAmount(typeBreakdowns[type], rowAmounts);
    }

    renderRowAmount(row.querySelector(".down-amount"), downAmount, prizeAmounts.down);
    renderRowAmount(row.querySelector(".up-amount"), upAmount, prizeAmounts.up);
    row.querySelector(".margin-price").textContent = marginPrice === null ? "多星" : formatMoney(marginPrice);
    renderRowAmount(row.querySelector(".margin-amount"), margin, prizeAmounts.margin);
    row.querySelector(".count-unit").textContent = getCountUnit(type);
    row.classList.toggle("needs-stars", typeNeedsStars(type));
    renderPillarItemSummary(row, type);
    row.querySelector(".stars-check-note").textContent = getStarCheckText(row, type);
    renderPillarCountNotes(row, type);
    row.querySelector(".row-warning").textContent = getRowWarnings(row, drawSet).join("；");
    updateNumberPreviews(row, drawSet);
    row.querySelector(".type-print").textContent = type;

    printRows.push({
      type,
      starsSummary: getPrintStarsSummary(type, row),
      summary: type === "立柱" ? row.querySelector(".pillar-item-summary").textContent : "",
      numbersHtml: getPrintNumbersHtml(row, type, drawSet),
      countLines: getPrintCountLines(type, row, count, billableCount),
      hasHit,
      amounts: {
        down: { stake: downAmount, prize: prizeAmounts.down },
        up: { stake: upAmount, prize: prizeAmounts.up },
        margin: { stake: margin, prize: prizeAmounts.margin },
      },
    });
  });

  downTotalEl.textContent = formatWholeMoney(getBreakdownNet(totalBreakdown, "down"));
  upTotalEl.textContent = formatWholeMoney(getBreakdownNet(totalBreakdown, "up"));
  marginTotalEl.textContent = formatWholeMoney(getBreakdownNet(totalBreakdown, "margin"));
  const currentPeriodTotal = getBreakdownNet(totalBreakdown, amountKey);
  const previousBalance = toNumber(previousBalanceInput?.value);
  currentPeriodTotalEl.textContent = formatWholeMoney(currentPeriodTotal);
  grandTotalEl.textContent = formatWholeMoney(previousBalance + currentPeriodTotal);

  renderPrintRows(printRows, amountKey);
  carCountTotalEl.textContent = `${formatCount(typeTotals.坐車.count)} 車`;
  carAmountTotalEl.textContent = "";
  renderTypeBreakdown(
    carBreakdownEl,
    typeBreakdowns.坐車,
    amountKey,
    getSummaryFormula("坐車", typeTotals.坐車.count, amountKey)
  );
  pillarCountTotalEl.textContent = `${formatCount(typeTotals.立柱.count)} 注`;
  pillarAmountTotalEl.textContent = "";
  renderTypeBreakdown(
    pillarBreakdownEl,
    typeBreakdowns.立柱,
    amountKey,
    getSummaryFormula("立柱", typeTotals.立柱.count, amountKey)
  );
  renderBreakdown(downBreakdownEl, totalBreakdown, "down");
  renderBreakdown(upBreakdownEl, totalBreakdown, "up");
  renderBreakdown(marginBreakdownEl, totalBreakdown, "margin");
  saveDraft();
}

function applyRowData(row, data = {}) {
  if (!data || Object.keys(data).length === 0) return;

  row.querySelector(".type-input").value = data.type || "坐車";
  row.querySelector(".pillar-pattern-input").value = data.pillarPattern || (data.type === "立柱" ? "11111" : "");
  setNumbersCell(row);

  const plainInput = row.querySelector(".plain-numbers-input");
  if (plainInput) plainInput.value = data.plainNumbers || "";

  const pillarNumbersByKey = new Map((data.pillarNumbers || []).map((item) => [item.key || "", item.value || ""]));
  const pillarNumbersBySize = new Map((data.pillarNumbers || []).map((item) => [item.size || "", item.value || ""]));
  row.querySelectorAll(".pillar-number-input").forEach((input) => {
    input.value = pillarNumbersByKey.get(input.dataset.pillarKey || "") || pillarNumbersBySize.get(input.dataset.groupSize || "") || "";
  });

  row.querySelector(".count-input").value = data.count || "1";
  row.querySelector(".down-price-input").value = data.downPrice || "0";
  row.querySelector(".up-price-input").value = data.upPrice || "0";

  row.querySelectorAll(".star-checkbox").forEach((input) => {
    input.checked = (data.selectedStars || []).includes(input.value);
  });

  row.querySelectorAll(".pillar-star-count-input").forEach((input) => {
    input.value = data.pillarStarCounts?.[input.dataset.star] ?? input.value;
  });
}

function getLastRowType() {
  const rows = Array.from(rowsBody.querySelectorAll(".entry-row"));
  return rows.at(-1)?.querySelector(".type-input")?.value || "坐車";
}

function addRow(defaultType = "坐車", rowData = null) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".entry-row");
  const hadRows = Boolean(rowsBody.querySelector(".entry-row"));

  row.querySelector(".type-input").value = rowData?.type || defaultType;
  row.querySelector(".pillar-pattern-input").value = rowData?.pillarPattern || (row.querySelector(".type-input").value === "立柱" ? "11111" : "");
  setNumbersCell(row);

  row.querySelector(".type-input").addEventListener("change", () => {
    const type = row.querySelector(".type-input").value;
    if (type === "立柱" && !row.querySelector(".pillar-pattern-input").value) {
      row.querySelector(".pillar-pattern-input").value = "11111";
    }
    syncPillarPatternState(row, type);
    setNumbersCell(row);
    recalculate();
  });

  row.querySelector(".pillar-pattern-input").addEventListener("input", (event) => {
    const { pattern } = parsePattern(event.target.value);
    event.target.value = pattern;
    if (row.querySelector(".type-input").value === "立柱") {
      setNumbersCell(row);
    }
    recalculate();
  });

  row.querySelectorAll(".count-input, .down-price-input, .up-price-input").forEach((input) => {
    input.addEventListener("input", () => recalculate());
  });

  row.querySelectorAll(".star-checkbox").forEach((input) => {
    input.addEventListener("change", () => {
      if (row.querySelector(".type-input").value === "立柱") {
        const countInput = row.querySelector(`.pillar-star-count-input[data-star="${input.value}"]`);
        if (countInput && input.checked && toNumber(countInput.value) === 0) countInput.value = "1";
        if (countInput && !input.checked) countInput.value = "0";
      }
      recalculate();
    });
  });

  row.querySelectorAll(".pillar-star-count-input").forEach((input) => {
    input.addEventListener("input", () => {
      if (row.querySelector(".type-input").value === "立柱" && toNumber(input.value) > 0) {
        const checkbox = row.querySelector(`.star-checkbox[value="${input.dataset.star}"]`);
        if (checkbox) checkbox.checked = true;
      }
      recalculate();
    });
  });

  row.querySelector(".delete-row-btn").addEventListener("click", () => {
    row.remove();
    if (!rowsBody.querySelector(".entry-row")) addRow();
    recalculate();
  });

  applyRowData(row, rowData || {});
  rowsBody.append(row);
  recalculate();

  if (hadRows) {
    const tableWrap = document.querySelector(".details-card .table-wrap");
    tableWrap.scrollTop = tableWrap.scrollHeight;
    row.querySelector(".plain-numbers-input, .pillar-number-input")?.focus();
  }
}

function clearAll() {
  if (!confirm("確定要清空明細與今日開獎號碼？單價與獎金設定會保留。")) return;
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  rowsBody.innerHTML = "";
  drawNumberInputs.forEach((input) => {
    input.value = "";
  });
  dateInput.value = todayString();
  addRow();
  recalculate();
}

function setPrintMode(enabled) {
  document.body.classList.toggle("is-printing", enabled);
}

function printPage() {
  setPrintMode(true);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

dateInput.value = todayString();
loadPersistentSettings();
const savedDraft = loadDraft();
if (savedDraft) {
  isRestoringDraft = true;
  dateInput.value = savedDraft.date || todayString();
  drawNumberInputs.forEach((input, index) => {
    input.value = savedDraft.drawNumbers?.[index] || "";
  });
  rowsBody.innerHTML = "";
  (savedDraft.rows?.length ? savedDraft.rows : [{ type: "坐車" }]).forEach((rowData) => {
    addRow(rowData.type || "坐車", rowData);
  });
  setPricesHidden(Boolean(savedDraft.pricesHidden));
  setView(savedDraft.view || "up");
  isRestoringDraft = false;
  recalculate();
} else {
  addRow();
  setView("up");
  setPricesHidden(false);
}

addRowBtn.addEventListener("click", () => addRow(getLastRowType()));
togglePricesBtn.addEventListener("click", () => {
  setPricesHidden(appRoot.dataset.hidePrices !== "true");
});
clearBtn.addEventListener("click", clearAll);
printBtn.addEventListener("click", printPage);
confirmDrawBtn.addEventListener("click", () => {
  confirmDrawNumbers();
  recalculate();
});

window.addEventListener("beforeprint", () => setPrintMode(true));
window.addEventListener("afterprint", () => setPrintMode(false));

document.querySelectorAll(".settings-card input").forEach((input) => {
  input.addEventListener("input", () => {
    if (persistentSettingInputs.includes(input) || persistentSettingCheckboxes.includes(input)) savePersistentSettings();
    recalculate();
  });
  input.addEventListener("change", () => {
    if (persistentSettingInputs.includes(input) || persistentSettingCheckboxes.includes(input)) savePersistentSettings();
    recalculate();
  });
});

drawNumberInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
    if (input.value.length === 2 && drawNumberInputs[index + 1]) {
      drawNumberInputs[index + 1].focus();
    }
    recalculate();
  });
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setView(button.dataset.view);
  });
});
