const invoices = [
  {
    id: "INV-2048",
    supplier: "Aperture Office Co.",
    initials: "AO",
    invoiceNumber: "AO-2026-2048",
    poNumber: "PO-88410",
    amount: 4500,
    subtotal: 4140,
    tax: 360,
    currency: "USD",
    dueDate: "2026-10-20",
    invoiceDate: "2026-10-01",
    confidence: 98,
    status: "Matched",
    matchOutcome: "MATCHED",
    matchSummary: "Invoice lines, PO quantities, and accepted receipt quantities agree.",
    reviewed: true,
    hasMatchEvidence: true,
    matchData: { supplier: "Aperture Office Co.", poNumber: "PO-88410", currency: "USD", poAmount: 4500, tolerance: 0, receiptAvailable: true, invoiceQuantity: 10, acceptedQuantity: 10 },
    reason: "",
    paymentTerms: "Net 30",
    activity: "Three-way match passed",
  },
  {
    id: "INV-2051",
    supplier: "Brightworks Studio",
    initials: "BS",
    invoiceNumber: "BW-88172",
    poNumber: "PO-88395",
    amount: 3920,
    subtotal: 3920,
    tax: 0,
    currency: "USD",
    dueDate: "2026-10-22",
    invoiceDate: "2026-10-02",
    confidence: 96,
    status: "Matched",
    matchOutcome: "MATCHED_WITHIN_TOLERANCE",
    matchSummary: "Quantities agree. Unit-price variance is within the demo review tolerance.",
    reviewed: true,
    hasMatchEvidence: true,
    matchData: { supplier: "Brightworks Studio", poNumber: "PO-88395", currency: "USD", poAmount: 3919, tolerance: 2, receiptAvailable: true, invoiceQuantity: 8, acceptedQuantity: 8 },
    reason: "",
    paymentTerms: "Net 30",
    activity: "Three-way match passed",
  },
  {
    id: "INV-2049",
    supplier: "Juniper Tech Systems",
    initials: "JT",
    invoiceNumber: "JTS-7784",
    poNumber: "PO-88201",
    amount: 1320.5,
    subtotal: 1214.86,
    tax: 105.64,
    currency: "USD",
    dueDate: "2026-10-16",
    invoiceDate: "2026-09-28",
    confidence: 82,
    status: "Needs review",
    matchOutcome: "MISSING_RECEIPT",
    matchSummary: "No accepted receipt line was found for this PO.",
    hasMatchEvidence: true,
    matchData: { supplier: "Juniper Tech Systems", poNumber: "PO-88201", currency: "USD", poAmount: 1320.5, tolerance: 0, receiptAvailable: false, invoiceQuantity: 4, acceptedQuantity: 0 },
    reason: "Missing receipt evidence",
    paymentTerms: "Net 30",
    activity: "Receipt evidence requested",
  },
  {
    id: "INV-2047",
    supplier: "Atlas Supply Group",
    initials: "AS",
    invoiceNumber: "ASG-10478",
    poNumber: "PO-88176",
    amount: 1968,
    subtotal: 1810.56,
    tax: 157.44,
    currency: "USD",
    dueDate: "2026-10-18",
    invoiceDate: "2026-09-25",
    confidence: 94,
    status: "Duplicate review",
    matchOutcome: "MATCHED",
    matchSummary: "PO and receipt quantities match. Resolve the duplicate candidate before payment review.",
    hasMatchEvidence: true,
    matchData: { supplier: "Atlas Supply Group", poNumber: "PO-88176", currency: "USD", poAmount: 1968, tolerance: 0, receiptAvailable: true, invoiceQuantity: 6, acceptedQuantity: 6 },
    reason: "Possible duplicate invoice",
    paymentTerms: "Net 30",
    duplicateCandidate: "ASG-10478",
    activity: "Similar invoice found",
  },
  {
    id: "INV-2046",
    supplier: "Cobalt Freight Services",
    initials: "CF",
    invoiceNumber: "CFS-90318",
    poNumber: "PO-88012",
    amount: 790,
    subtotal: 726.8,
    tax: 63.2,
    currency: "USD",
    dueDate: "2026-10-14",
    invoiceDate: "2026-09-24",
    confidence: 91,
    status: "Needs review",
    matchOutcome: "MISMATCH",
    matchSummary: "Invoiced quantity is 10; only 8 units are supported by accepted receipt data.",
    hasMatchEvidence: true,
    matchData: { supplier: "Cobalt Freight Services", poNumber: "PO-88012", currency: "USD", poAmount: 790, tolerance: 0, receiptAvailable: true, invoiceQuantity: 10, acceptedQuantity: 8 },
    reason: "Quantity exceeds accepted receipt",
    paymentTerms: "Net 20",
    activity: "Quantity variance flagged",
  },
];

const activityItems = [
  { initials: "JT", color: "lavender", text: "<strong>Juniper Tech Systems</strong> needs receipt evidence", time: "12 min ago", icon: "!" },
  { initials: "AO", color: "peach", text: "<strong>Aperture Office Co.</strong> passed three-way match", time: "38 min ago", icon: "✓" },
  { initials: "AS", color: "mint", text: "Potential duplicate found for <strong>Atlas Supply</strong>", time: "1 hr ago", icon: "↗" },
];

let selectedInvoiceId = null;
const auditTrail = [];

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));
const money = (amount, currency = "USD") => {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, minimumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    return `${currency || "—"} ${safeValue.toFixed(2)}`;
  }
};
const toCents = (value) => {
  const raw = String(value ?? "").trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace(/^-/, "").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
};
const shortDate = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return "—";
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed);
};
const statusClass = (status) => ({
  Matched: "status-green",
  "Needs review": "status-amber",
  "Duplicate review": "status-purple",
  "On hold": "status-neutral",
}[status] || "status-neutral");
const eligibleInvoices = () => invoices.filter((invoice) =>
  invoice.status === "Matched"
  && invoice.reviewed === true
  && !invoice.duplicateCandidate
  && !invoice.duplicateConfirmed
  && !invoice.hold
  && invoice.currency === "USD"
  && (toCents(invoice.amount) ?? 0n) > 0n);
const totalEligible = () => Number(eligibleInvoices().reduce((total, invoice) => total + (toCents(invoice.amount) ?? 0n), 0n)) / 100;

function logActivity(action, invoice) {
  auditTrail.unshift({ action, invoice: invoice.invoiceNumber, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) });
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast-error" : ""}`;
  toast.textContent = message;
  $("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function setView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === name));
  const title = { overview: "Overview", invoices: "Invoice queue", exceptions: "Exceptions", payments: "Payment proposal" }[name];
  $("#page-crumb").textContent = title;
  if (name === "invoices") renderInvoiceQueue();
  if (name === "exceptions") renderExceptions();
  if (name === "payments") renderPayments();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const focusTarget = $("input, textarea, button", modal);
  focusTarget?.focus();
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (!$(".overlay.open")) document.body.classList.remove("modal-open");
}

function renderOverview() {
  $("#stat-open").textContent = String(invoices.length).padStart(2, "0");
  $("#stat-review").textContent = String(invoices.filter((invoice) => invoice.status !== "Matched").length).padStart(2, "0");
  $("#stat-matched").textContent = String(invoices.filter((invoice) => invoice.status === "Matched").length).padStart(2, "0");
  $("#stat-payment").innerHTML = `${money(totalEligible()).replace(/\.00$/, "")}<span class="value-currency">.00</span>`;
  $("#invoice-nav-count").textContent = String(invoices.length).padStart(2, "0");
  $("#exception-nav-count").textContent = String(invoices.filter((invoice) => invoice.status !== "Matched").length).padStart(2, "0");

  const priority = [...invoices].filter((invoice) => invoice.status !== "Matched").slice(0, 3);
  $("#priority-rows").innerHTML = priority.map((invoice) => `
    <tr data-open-invoice="${safe(invoice.id)}">
      <td><div class="supplier-cell"><span class="supplier-avatar ${safe(invoice.initials.toLowerCase())}">${safe(invoice.initials)}</span><span><strong>${safe(invoice.supplier)}</strong><small>${safe(invoice.invoiceNumber)}</small></span></div></td>
      <td class="amount-cell">${money(invoice.amount, invoice.currency)}</td>
      <td><span class="${new Date(`${invoice.dueDate}T12:00:00`) < new Date("2026-10-12T12:00:00") ? "overdue-date" : "date-cell"}">${shortDate(invoice.dueDate)}</span></td>
      <td><span class="status-pill ${statusClass(invoice.status)}"><span></span>${safe(invoice.status)}</span></td>
      <td><button class="row-more" aria-label="Open invoice">→</button></td>
    </tr>`).join("");
  $("#activity-list").innerHTML = activityItems.map((item) => `
    <div class="activity-item"><span class="activity-avatar ${item.color}">${item.initials}</span><div class="activity-copy"><p>${item.text}</p><small>${item.time}</small></div><span class="activity-mark">${item.icon}</span></div>`).join("")
    + auditTrail.slice(0, 2).map((item) => `<div class="activity-item"><span class="activity-avatar gray">AM</span><div class="activity-copy"><p><strong>${safe(item.action)}</strong> · ${safe(item.invoice)}</p><small>${safe(item.time)}</small></div><span class="activity-mark">✓</span></div>`).join("");
}

function renderInvoiceQueue() {
  const query = $("#invoice-filter").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  const filtered = invoices.filter((invoice) =>
    `${invoice.supplier} ${invoice.invoiceNumber} ${invoice.poNumber}`.toLowerCase().includes(query)
    && (status === "all" || invoice.status === status));
  $("#queue-total").textContent = `${filtered.length} invoice${filtered.length === 1 ? "" : "s"}`;
  $("#invoice-rows").innerHTML = filtered.map((invoice) => `
    <tr data-open-invoice="${safe(invoice.id)}">
      <td><div class="supplier-cell"><span class="supplier-avatar ${safe(invoice.initials.toLowerCase())}">${safe(invoice.initials)}</span><span><strong>${safe(invoice.supplier)}</strong><small>${safe(invoice.invoiceNumber)}</small></span></div></td>
      <td class="muted-cell">${safe(invoice.poNumber || "—")}</td>
      <td class="amount-cell">${money(invoice.amount, invoice.currency)}</td>
      <td><span class="confidence-value ${invoice.confidence != null && invoice.confidence < 90 ? "confidence-low" : ""}">${invoice.confidence == null ? "—" : `${invoice.confidence}%`}</span></td>
      <td><span class="status-pill ${statusClass(invoice.status)}"><span></span>${safe(invoice.status)}</span></td>
      <td>${shortDate(invoice.dueDate)}</td>
      <td><button class="row-more" aria-label="Open invoice">→</button></td>
    </tr>`).join("") || `<tr><td class="empty-row" colspan="7">No invoices match that filter.</td></tr>`;
}

function renderExceptions() {
  const openItems = invoices.filter((invoice) => invoice.status !== "Matched");
  $("#exception-summary").textContent = `${openItems.length} open item${openItems.length === 1 ? "" : "s"}`;
  $("#exception-cards").innerHTML = openItems.map((invoice, index) => `
    <article class="exception-card">
      <div class="exception-card-top"><span class="exception-severity ${index === 0 ? "severity-high" : ""}"><span></span>${index === 0 ? "HIGH PRIORITY" : "REVIEW REQUIRED"}</span><span class="exception-age">${index === 0 ? "Due in 2 days" : `${index + 1} days open`}</span></div>
      <h2>${safe(invoice.reason || invoice.status)}</h2>
      <p>${safe(invoice.supplier)} <span>·</span> ${safe(invoice.invoiceNumber)}</p>
      <div class="exception-detail">${safe(invoice.matchSummary)}</div>
      <div class="exception-bottom"><span class="amount-cell">${money(invoice.amount, invoice.currency)}</span><button class="text-button" data-open-invoice="${safe(invoice.id)}">Review exception →</button></div>
    </article>`).join("") || `<div class="empty-state">No open exceptions. Great work.</div>`;
}

function renderPayments() {
  const eligible = eligibleInvoices().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  $("#eligible-count").textContent = String(eligible.length).padStart(2, "0");
  $("#eligible-amount").innerHTML = `${money(totalEligible()).replace(/\.00$/, "")}<span class="value-currency">.00</span>`;
  $("#held-count").textContent = String(invoices.length - eligible.length).padStart(2, "0");
  $("#proposal-rows").innerHTML = eligible.map((invoice) => `
    <tr><td><div class="supplier-cell"><span class="supplier-avatar ${safe(invoice.initials.toLowerCase())}">${safe(invoice.initials)}</span><span><strong>${safe(invoice.supplier)}</strong><small>${safe(invoice.invoiceNumber)}</small></span></div></td><td class="amount-cell">${money(invoice.amount, invoice.currency)}</td><td>${shortDate(invoice.dueDate)}</td><td class="muted-cell">${safe(invoice.paymentTerms || "Not supplied")}</td><td><span class="status-pill status-green"><span></span>Eligible for review</span></td></tr>`).join("")
    || `<tr><td class="empty-row" colspan="5">No invoices currently meet the review criteria.</td></tr>`;
}

function renderMatch(invoice) {
  const good = invoice.matchOutcome === "MATCHED" || invoice.matchOutcome === "MATCHED_WITHIN_TOLERANCE";
  const tone = good ? "match-good" : "match-warning";
  const label = invoice.matchOutcome.replaceAll("_", " ");
  return `<div class="match-summary ${tone}"><span class="match-symbol">${good ? "✓" : "!"}</span><div><strong>${safe(label)}</strong><p>${safe(invoice.matchSummary)}</p></div></div>
    <div class="match-metrics"><div><span>PO line</span><strong>${safe(invoice.poNumber || "Not linked")}</strong></div><div><span>Receipt evidence</span><strong>${invoice.matchOutcome === "MISSING_RECEIPT" ? "Not found" : good ? "Available" : "Variance flagged"}</strong></div><div><span>Rule outcome</span><strong>${good ? "Clear for review" : "Hold until resolved"}</strong></div></div>`;
}

function updateInvoiceFromFields(invoice) {
  invoice.supplier = $("#field-supplier").value.trim();
  invoice.invoiceNumber = $("#field-invoice").value.trim();
  invoice.invoiceDate = $("#field-date").value;
  invoice.dueDate = $("#field-due").value;
  invoice.poNumber = $("#field-po").value.trim();
  invoice.currency = $("#field-currency").value.trim().toUpperCase();
  invoice.subtotal = $("#field-subtotal").value;
  invoice.tax = $("#field-tax").value;
  invoice.amount = $("#field-total").value;
}

function evaluateMatch(invoice) {
  if (!invoice.hasMatchEvidence || !invoice.matchData) {
    invoice.matchOutcome = "NEEDS_REVIEW";
    invoice.matchSummary = "No PO and receipt evidence is linked to this invoice yet.";
    return;
  }
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const subtotalCents = toCents(invoice.subtotal);
  const taxCents = toCents(invoice.tax);
  const totalCents = toCents(invoice.amount);
  const requiredFieldsPresent = invoice.supplier && invoice.invoiceNumber && validDate(invoice.invoiceDate)
    && validDate(invoice.dueDate) && invoice.poNumber && invoice.currency
    && subtotalCents !== null && taxCents !== null && totalCents !== null && totalCents > 0n;
  if (!requiredFieldsPresent) {
    invoice.matchOutcome = "NEEDS_REVIEW";
    invoice.matchSummary = "A required invoice field is missing or invalid.";
    return;
  }
  if (subtotalCents + taxCents !== totalCents) {
    invoice.matchOutcome = "MISMATCH";
    invoice.matchSummary = "Subtotal plus tax does not equal the invoice total.";
    return;
  }
  const evidence = invoice.matchData;
  if (invoice.supplier.toLowerCase() !== evidence.supplier.toLowerCase()
      || invoice.poNumber !== evidence.poNumber
      || invoice.currency !== evidence.currency) {
    invoice.matchOutcome = "MISMATCH";
    invoice.matchSummary = "Supplier, PO number, or currency does not agree with the uploaded PO evidence.";
    return;
  }
  if (!evidence.receiptAvailable) {
    invoice.matchOutcome = "MISSING_RECEIPT";
    invoice.matchSummary = "No accepted receipt line was found for this PO.";
    return;
  }
  if (evidence.invoiceQuantity > evidence.acceptedQuantity) {
    invoice.matchOutcome = "MISMATCH";
    invoice.matchSummary = `Invoiced quantity is ${evidence.invoiceQuantity}; only ${evidence.acceptedQuantity} units are supported by accepted receipt data.`;
    return;
  }
  const amountVarianceCents = (totalCents - toCents(evidence.poAmount));
  const absoluteVarianceCents = amountVarianceCents < 0n ? -amountVarianceCents : amountVarianceCents;
  const toleranceCents = toCents(evidence.tolerance) ?? 0n;
  const amountVariance = Number(absoluteVarianceCents) / 100;
  if (absoluteVarianceCents > toleranceCents) {
    invoice.matchOutcome = "MISMATCH";
    invoice.matchSummary = `Invoice amount differs from PO evidence by ${money(amountVariance, invoice.currency)}, above the demo tolerance of ${money(evidence.tolerance, invoice.currency)}.`;
    return;
  }
  if (absoluteVarianceCents > 0n) {
    invoice.matchOutcome = "MATCHED_WITHIN_TOLERANCE";
    invoice.matchSummary = `Invoice amount variance of ${money(amountVariance, invoice.currency)} is within the demo tolerance of ${money(evidence.tolerance, invoice.currency)}.`;
    return;
  }
  invoice.matchOutcome = "MATCHED";
  invoice.matchSummary = "Invoice lines, PO quantities, and accepted receipt quantities agree.";
}

function renderDuplicate(invoice) {
  const container = $("#duplicate-card");
  if (!invoice.duplicateCandidate) {
    container.innerHTML = `<div class="side-card-title"><span class="side-icon duplicate-clear">✓</span><h3>Duplicate check</h3></div><div class="duplicate-clear-text">No likely duplicate found</div><p>Supplier, invoice number, and currency checked against this demo batch.</p>`;
  } else {
    container.innerHTML = `<div class="side-card-title"><span class="side-icon duplicate-alert">!</span><h3>${invoice.duplicateConfirmed ? "Duplicate confirmed" : "Possible duplicate"}</h3></div><div class="duplicate-candidate">${safe(invoice.duplicateCandidate)} <span>· ${money(invoice.amount)}</span></div><p>Supplier and normalized invoice number match. A reviewer must resolve this before payment consideration.</p><div class="duplicate-actions">${invoice.duplicateConfirmed ? `<span class="duplicate-confirmed">Confirmed by reviewer · excluded</span>` : `<button class="text-button" id="false-duplicate">Mark false positive</button><button class="text-button duplicate-confirm-button" id="confirm-duplicate">Confirm duplicate</button>`}</div>`;
    $("#confirm-duplicate")?.addEventListener("click", () => {
      invoice.duplicateConfirmed = true;
      invoice.status = "Duplicate review";
      invoice.reason = "Duplicate confirmed by reviewer";
      logActivity("Duplicate confirmed", invoice);
      renderDuplicate(invoice);
      renderOverview();
      renderInvoiceQueue();
      renderPayments();
      showToast("Duplicate confirmed and permanently excluded from payment consideration.");
    });
    $("#false-duplicate")?.addEventListener("click", () => {
      invoice.duplicateCandidate = "";
      invoice.duplicateConfirmed = false;
      if (invoice.status === "Duplicate review") invoice.status = "Needs review";
      logActivity("False positive recorded", invoice);
      renderDuplicate(invoice);
      renderOverview();
      showToast("Duplicate candidate marked as a false positive.");
    });
  }
}

function openInvoice(id) {
  const invoice = invoices.find((item) => item.id === id);
  if (!invoice) return;
  selectedInvoiceId = id;
  $("#invoice-modal-title").textContent = invoice.supplier;
  $("#invoice-modal-subtitle").textContent = `${invoice.invoiceNumber} · ${invoice.id}`;
  $("#invoice-modal-status").textContent = invoice.status.toUpperCase();
  $("#invoice-confidence").textContent = invoice.confidence == null ? "AI suggestion · review required" : `${invoice.confidence}% extraction confidence`;
  $("#field-supplier").value = invoice.supplier;
  $("#field-invoice").value = invoice.invoiceNumber;
  $("#field-date").value = invoice.invoiceDate;
  $("#field-due").value = invoice.dueDate;
  $("#field-po").value = invoice.poNumber || "";
  $("#field-currency").value = invoice.currency;
  $("#field-total").value = invoice.amount;
  $("#field-subtotal").value = invoice.subtotal ?? "";
  $("#field-tax").value = invoice.tax;
  $("#match-result").innerHTML = renderMatch(invoice);
  $("#source-text").value = "";
  $("#source-results").innerHTML = "";
  $("#draft-result").innerHTML = "";
  $("#search-results").innerHTML = "";
  $("#supplier-query").value = invoice.supplier;
  renderDuplicate(invoice);
  openModal("invoice-modal");
}

function selectedInvoice() {
  return invoices.find((invoice) => invoice.id === selectedInvoiceId);
}

function applyExtractedFields(fields) {
  if (!fields || typeof fields !== "object") throw new Error("The extraction response was empty.");
  const invoice = {
    id: `INV-${Date.now().toString().slice(-6)}`,
    supplier: typeof fields.supplier === "string" ? fields.supplier.trim() : "",
    initials: typeof fields.supplier === "string" ? fields.supplier.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() : "",
    invoiceNumber: typeof fields.invoiceNumber === "string" ? fields.invoiceNumber.trim() : "",
    poNumber: String(fields.poNumber || ""),
    amount: fields.total == null ? "" : String(fields.total),
    subtotal: fields.subtotal == null ? "" : String(fields.subtotal),
    tax: fields.tax == null ? "" : String(fields.tax),
    currency: typeof fields.currency === "string" ? fields.currency.trim().toUpperCase() : "",
    dueDate: typeof fields.dueDate === "string" ? fields.dueDate : "",
    invoiceDate: typeof fields.invoiceDate === "string" ? fields.invoiceDate : "",
    confidence: null,
    status: "Needs review",
    matchOutcome: "NEEDS_REVIEW",
    matchSummary: "Newly extracted invoice. Verify its fields and upload PO/receipt evidence before review.",
    reason: "New invoice — human review required",
    paymentTerms: "Not supplied",
    activity: "Extracted invoice fields",
  };
  invoices.unshift(invoice);
  logActivity("Invoice extracted", invoice);
  renderOverview();
  renderInvoiceQueue();
  return invoice;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function bindEvents() {
  $$(".nav-link").forEach((link) => link.addEventListener("click", () => setView(link.dataset.view)));
  $$("[data-navigate]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.navigate)));
  $("#priority-rows").addEventListener("click", (event) => {
    const row = event.target.closest("[data-open-invoice]");
    if (row) openInvoice(row.dataset.openInvoice);
  });
  $("#invoice-rows").addEventListener("click", (event) => {
    const row = event.target.closest("[data-open-invoice]");
    if (row) openInvoice(row.dataset.openInvoice);
  });
  $("#exception-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-invoice]");
    if (button) openInvoice(button.dataset.openInvoice);
  });
  $("#invoice-filter").addEventListener("input", renderInvoiceQueue);
  $("#status-filter").addEventListener("change", renderInvoiceQueue);
  $("#upload-open").addEventListener("click", () => openModal("upload-modal"));
  $("#invoice-upload-open").addEventListener("click", () => openModal("upload-modal"));
  $("#help-button").addEventListener("click", async () => {
    openModal("help-modal");
    try {
      const response = await fetch("/api/health");
      const health = await response.json();
      $("#provider-health").innerHTML = `<span class="${health.deepseekConfigured ? "health-on" : "health-off"}">●</span> DeepSeek ${health.deepseekConfigured ? "configured" : "key missing"} <span class="health-separator">·</span> <span class="${health.serperConfigured ? "health-on" : "health-off"}">●</span> Serper ${health.serperConfigured ? "configured" : "key missing"}`;
    } catch {
      $("#provider-health").textContent = "Could not check the local API configuration.";
    }
  });
  $("#learn-button").addEventListener("click", () => openModal("help-modal"));
  $$(".overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeModal(overlay);
    });
    $$("[data-close-modal]", overlay).forEach((button) => button.addEventListener("click", () => closeModal(overlay)));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") $$(".overlay.open").forEach(closeModal);
  });

  $("#run-match").addEventListener("click", () => {
    const invoice = selectedInvoice();
    if (!invoice) return;
    updateInvoiceFromFields(invoice);
    evaluateMatch(invoice);
    $("#match-result").innerHTML = renderMatch(invoice);
    showToast("Deterministic match rules re-checked against demo evidence.");
  });

  $("#confirm-invoice").addEventListener("click", () => {
    const invoice = selectedInvoice();
    if (!invoice) return;
    updateInvoiceFromFields(invoice);
    evaluateMatch(invoice);
    invoice.reviewed = true;
    invoice.hold = false;
    if (invoice.duplicateCandidate && !invoice.duplicateConfirmed) {
      invoice.status = "Duplicate review";
    } else if (invoice.matchOutcome === "MATCHED" || invoice.matchOutcome === "MATCHED_WITHIN_TOLERANCE") {
      invoice.status = "Matched";
      invoice.reason = "";
    } else {
      invoice.status = "Needs review";
      invoice.reason = invoice.matchSummary;
    }
    logActivity("Invoice review confirmed", invoice);
    closeModal($("#invoice-modal"));
    renderOverview();
    renderInvoiceQueue();
    renderExceptions();
    renderPayments();
    showToast(invoice.status === "Matched" ? "Review confirmed. Invoice is eligible for payment consideration." : "Review saved. The matching exception still blocks payment consideration.");
  });

  $("#hold-invoice").addEventListener("click", () => {
    const invoice = selectedInvoice();
    if (!invoice) return;
    invoice.status = "On hold";
    invoice.hold = true;
    invoice.reason = "Reviewer placed on hold";
    logActivity("Invoice placed on hold", invoice);
    closeModal($("#invoice-modal"));
    renderOverview();
    renderInvoiceQueue();
    renderExceptions();
    renderPayments();
    showToast("Invoice placed on hold and excluded from payment consideration.");
  });

  $("#draft-email").addEventListener("click", async () => {
    const invoice = selectedInvoice();
    if (!invoice) return;
    const button = $("#draft-email");
    button.disabled = true;
    button.textContent = "Drafting…";
    try {
      const { draft } = await postJson("/api/ai/draft", {
        invoice: {
          supplier: invoice.supplier,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          poNumber: invoice.poNumber,
        },
        exception: invoice.reason || invoice.matchSummary,
      });
      $("#draft-result").innerHTML = `<div class="ai-draft">${safe(draft).replace(/\n/g, "<br>")}</div><small>AI suggestion · review before sending</small>`;
    } catch (error) {
      $("#draft-result").innerHTML = `<div class="inline-error">${safe(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = "Draft email with DeepSeek";
    }
  });

  $("#search-supplier").addEventListener("click", async () => {
    const query = $("#supplier-query").value.trim();
    const button = $("#search-supplier");
    if (!query) {
      showToast("Enter a supplier name to search.", true);
      return;
    }
    button.disabled = true;
    $("#search-results").innerHTML = `<div class="search-loading">Searching public sources…</div>`;
    try {
      const { results } = await postJson("/api/search", { query: `${query} company supplier` });
      $("#search-results").innerHTML = results.length
        ? results.map((result) => {
          let link = "#";
          try {
            const parsed = new URL(result.link);
            if (parsed.protocol === "https:" || parsed.protocol === "http:") link = parsed.href;
          } catch {}
          return `<a class="search-result" href="${safe(link)}" target="_blank" rel="noopener noreferrer"><strong>${safe(result.title)}</strong><span>${safe(result.snippet)}</span><small>${safe(result.date)}</small></a>`;
        }).join("")
        : `<div class="search-loading">No public results found.</div>`;
    } catch (error) {
      $("#search-results").innerHTML = `<div class="inline-error">${safe(error.message)}</div>`;
    } finally {
      button.disabled = false;
    }
  });

  $("#extract-button").addEventListener("click", async () => {
    const text = $("#source-text").value.trim();
    const button = $("#extract-button");
    if (!text) {
      showToast("Paste invoice text first.", true);
      return;
    }
    button.disabled = true;
    button.textContent = "Extracting…";
    try {
      const { fields } = await postJson("/api/ai/extract", { text });
      const invoice = applyExtractedFields(fields);
      $("#source-results").innerHTML = `<div class="extract-success"><strong>Fields extracted · needs human review</strong><span>${safe(invoice.invoiceNumber)} · ${money(invoice.amount, invoice.currency)}</span><button class="text-button" id="open-extracted">Review extracted invoice →</button></div>`;
      $("#open-extracted").addEventListener("click", () => openInvoice(invoice.id));
      showToast("Invoice fields extracted. Verify before using them.");
    } catch (error) {
      $("#source-results").innerHTML = `<div class="inline-error">${safe(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = "✳ Extract fields with AI";
    }
  });

  $("#text-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 18_000) {
      $("#upload-feedback").innerHTML = `<span class="inline-error">Text files must be 18 KB or smaller.</span>`;
      event.target.value = "";
      return;
    }
    $("#upload-text").value = await file.text();
    $("#upload-feedback").textContent = `${file.name} loaded locally. Nothing has been uploaded.`;
  });

  $("#parse-upload").addEventListener("click", async () => {
    const text = $("#upload-text").value.trim();
    const button = $("#parse-upload");
    if (!text) {
      $("#upload-feedback").innerHTML = `<span class="inline-error">Choose a .txt file or paste invoice text.</span>`;
      return;
    }
    button.disabled = true;
    button.textContent = "Extracting…";
    try {
      const { fields } = await postJson("/api/ai/extract", { text });
      const invoice = applyExtractedFields(fields);
      $("#upload-feedback").innerHTML = `<span class="extract-success-inline">Invoice ${safe(invoice.invoiceNumber)} added to review. Verify all fields.</span>`;
      renderOverview();
      window.setTimeout(() => {
        closeModal($("#upload-modal"));
        $("#upload-text").value = "";
        $("#text-file").value = "";
        openInvoice(invoice.id);
      }, 900);
    } catch (error) {
      $("#upload-feedback").innerHTML = `<span class="inline-error">${safe(error.message)}</span>`;
    } finally {
      button.disabled = false;
      button.textContent = "Extract with AI";
    }
  });

  $("#create-proposal").addEventListener("click", () => {
    const eligible = eligibleInvoices();
    if (!eligible.length) {
      showToast("There are no eligible invoices to propose.", true);
      return;
    }
    renderPayments();
    showToast(`Review proposal prepared for ${eligible.length} invoices. No payment has been initiated.`);
  });

  $("#export-proposal").addEventListener("click", () => {
    const eligible = eligibleInvoices();
    if (!eligible.length) {
      showToast("No eligible invoices to export.", true);
      return;
    }
    const rows = [
      ["Supplier", "Invoice number", "Amount", "Currency", "Due date", "Status"],
      ...eligible.map((invoice) => [invoice.supplier, invoice.invoiceNumber, invoice.amount, invoice.currency, invoice.dueDate, "Eligible for human review"]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payment-proposal-review-only.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Review-only proposal CSV exported. No payment instruction was created.");
    logActivity("Payment proposal CSV exported", eligible[0]);
  });
}

bindEvents();
renderOverview();
renderInvoiceQueue();
renderPayments();
