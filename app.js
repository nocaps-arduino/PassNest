const STORAGE_KEY = "passnest-wallet-v1";
const MAX_ATTACHMENT_SIZE = 1.5 * 1024 * 1024;

const passTypes = {
  boarding: "Boarding",
  event: "Ticket",
  service: "Service"
};

const demoPasses = [
  {
    id: crypto.randomUUID(),
    type: "boarding",
    provider: "IndiGo",
    title: "Delhi to Bengaluru",
    dateTime: "2026-06-03T08:25",
    location: "Terminal 2, Gate 18",
    reference: "PNR 7KQ92A",
    travelClass: "Economy",
    seatNumber: "12A",
    code: "6E-2037-7KQ92A",
    notes: "Seat 12A. Web check-in complete.",
    createdAt: Date.now() - 400000
  },
  {
    id: crypto.randomUUID(),
    type: "event",
    provider: "NCPA Mumbai",
    title: "Evening concert",
    dateTime: "2026-05-28T19:30",
    location: "Tata Theatre, Row G",
    reference: "TKT-48192",
    code: "NCPA-TKT-48192-G14",
    notes: "Entry opens 45 minutes before showtime.",
    createdAt: Date.now() - 300000
  },
  {
    id: crypto.randomUUID(),
    type: "service",
    provider: "Urban Wellness",
    title: "Annual membership",
    dateTime: "2026-12-31T23:59",
    location: "Bandra branch",
    reference: "MEM-20488",
    code: "UW-MEM-20488",
    notes: "Includes lounge access and priority appointments.",
    createdAt: Date.now() - 200000
  }
];

let passes = loadPasses();
let activeFilter = "all";
let highlightedPassId = "";

const passGrid = document.querySelector("#passGrid");
const passDialog = document.querySelector("#passDialog");
const detailDialog = document.querySelector("#detailDialog");
const detailCard = document.querySelector("#detailCard");
const passForm = document.querySelector("#passForm");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const typeSelect = passForm.elements.type;
const boardingFields = [...document.querySelectorAll(".boarding-field")];

document.querySelector("#openFormButton").addEventListener("click", () => {
  updateBoardingFields();
  passDialog.showModal();
});
document.querySelector("#closeFormButton").addEventListener("click", () => passDialog.close());
document.querySelector("#resetDemoButton").addEventListener("click", resetDemo);
document.querySelector("#exportButton").addEventListener("click", exportPasses);
document.querySelector("#importInput").addEventListener("change", importPasses);
typeSelect.addEventListener("change", updateBoardingFields);
searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

document.querySelectorAll(".category-pill").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    updateActiveCategory();
    render();
  });
});

passForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(passForm);
  const pass = Object.fromEntries(data.entries());
  delete pass.attachment;

  const attachmentFile = passForm.elements.attachment.files[0];
  if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_SIZE) {
    alert("That file is too large for browser-only storage. Please upload a PDF or image under 1.5 MB.");
    return;
  }

  const attachment = pass.type === "boarding" && attachmentFile ? await readAttachment(attachmentFile) : null;
  if (pass.type !== "boarding") {
    pass.travelClass = "";
    pass.seatNumber = "";
  }

  const newPass = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attachment,
    ...pass
  };

  passes = [
    newPass,
    ...passes
  ];

  try {
    savePasses();
  } catch {
    passes = passes.filter((item) => item.id !== newPass.id);
    alert("This pass could not be saved in browser storage. Try a smaller upload or export and clear old saved passes.");
    return;
  }

  highlightedPassId = newPass.id;
  activeFilter = "all";
  searchInput.value = "";
  sortSelect.value = "recent";
  updateActiveCategory();
  passForm.reset();
  updateBoardingFields();
  passDialog.close();
  render();
  window.setTimeout(() => {
    highlightedPassId = "";
    render();
  }, 2200);
});

function loadPasses() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoPasses));
    return demoPasses;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : demoPasses;
  } catch {
    return demoPasses;
  }
}

function savePasses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
}

function render() {
  updateCounts();
  const query = searchInput.value.trim().toLowerCase();
  const visiblePasses = passes
    .filter((pass) => activeFilter === "all" || pass.type === activeFilter)
    .filter((pass) => {
      const haystack = [pass.provider, pass.title, pass.location, pass.reference, pass.travelClass, pass.seatNumber, pass.notes].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort(sortPasses);

  if (!visiblePasses.length) {
    passGrid.innerHTML = `
      <div class="empty-state">
        <div>
          <h3>No passes found</h3>
          <p>Add a pass or adjust the current filter.</p>
        </div>
      </div>
    `;
    return;
  }

  passGrid.innerHTML = visiblePasses.map(renderPassCard).join("");
  passGrid.querySelectorAll("[data-open-pass]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.openPass));
  });
}

function renderPassCard(pass) {
  return `
    <article class="pass-card ${escapeHtml(pass.type)} ${pass.id === highlightedPassId ? "is-new" : ""}">
      <div class="pass-card-header">
        <span class="pass-type">${passTypes[pass.type]}</span>
        <strong>${formatDate(pass.dateTime)}</strong>
      </div>
      <h3>${escapeHtml(pass.title)}</h3>
      <p>${escapeHtml(pass.provider)}</p>
      <p>${escapeHtml(getCardSubline(pass))}</p>
      <div class="pass-card-footer">
        <span>${escapeHtml(pass.reference)}</span>
        <button class="primary-button open-detail" data-open-pass="${pass.id}" type="button">View</button>
      </div>
    </article>
  `;
}

function updateActiveCategory() {
  document.querySelectorAll(".category-pill").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.filter === activeFilter);
  });
}

function openDetail(id) {
  const pass = passes.find((item) => item.id === id);
  if (!pass) return;

  detailCard.innerHTML = `
    <div class="detail-card">
      <div class="detail-top">
        <div>
          <p class="eyebrow">${passTypes[pass.type]}</p>
          <h2>${escapeHtml(pass.title)}</h2>
        </div>
        <button class="icon-button" aria-label="Close details" data-close-detail type="button">x</button>
      </div>
      <p>${escapeHtml(pass.provider)} · ${escapeHtml(pass.location || "Location not set")}</p>
      <div class="detail-meta">
        <div>
          <span>Date</span>
          <strong>${formatLongDate(pass.dateTime)}</strong>
        </div>
        <div>
          <span>Reference</span>
          <strong>${escapeHtml(pass.reference)}</strong>
        </div>
      </div>
      ${pass.type === "boarding" ? renderComfortDetails(pass) : ""}
      <div class="code-panel" aria-label="Scannable code preview">
        <strong>${escapeHtml(pass.code || pass.reference)}</strong>
      </div>
      ${renderAttachment(pass)}
      <p>${escapeHtml(pass.notes || "No notes saved.")}</p>
      <div class="detail-actions">
        <button class="ghost-button" data-delete-pass="${pass.id}" type="button">Delete</button>
        <button class="primary-button" data-close-detail type="button">Done</button>
      </div>
    </div>
  `;

  detailCard.querySelectorAll("[data-close-detail]").forEach((button) => {
    button.addEventListener("click", () => detailDialog.close());
  });
  detailCard.querySelector("[data-delete-pass]").addEventListener("click", () => deletePass(pass.id));
  detailDialog.showModal();
}

function deletePass(id) {
  passes = passes.filter((pass) => pass.id !== id);
  savePasses();
  detailDialog.close();
  render();
}

function updateCounts() {
  const counts = {
    all: passes.length,
    boarding: passes.filter((pass) => pass.type === "boarding").length,
    event: passes.filter((pass) => pass.type === "event").length,
    service: passes.filter((pass) => pass.type === "service").length
  };

  Object.entries(counts).forEach(([key, value]) => {
    document.querySelector(`#count-${key}`).textContent = value;
  });

  document.querySelector("#stat-upcoming").textContent = passes.filter((pass) => new Date(pass.dateTime) >= new Date()).length;
  document.querySelector("#stat-boarding").textContent = counts.boarding;
  document.querySelector("#stat-service").textContent = counts.service;
}

function sortPasses(a, b) {
  if (sortSelect.value === "recent") return b.createdAt - a.createdAt;
  if (sortSelect.value === "name") return a.title.localeCompare(b.title);
  return new Date(a.dateTime) - new Date(b.dateTime);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function resetDemo() {
  passes = demoPasses.map((pass) => ({ ...pass, id: crypto.randomUUID() }));
  savePasses();
  passForm.reset();
  updateBoardingFields();
  passDialog.close();
  render();
}

function exportPasses() {
  const blob = new Blob([JSON.stringify(passes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "passnest-wallet.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importPasses(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid wallet file");
    passes = imported.map((pass) => ({
      id: pass.id || crypto.randomUUID(),
      createdAt: pass.createdAt || Date.now(),
      type: pass.type || "service",
      provider: pass.provider || "Imported",
      title: pass.title || "Untitled pass",
      dateTime: pass.dateTime || new Date().toISOString().slice(0, 16),
      location: pass.location || "",
      reference: pass.reference || "No reference",
      travelClass: pass.travelClass || "",
      seatNumber: pass.seatNumber || "",
      code: pass.code || pass.reference || "",
      attachment: pass.attachment || null,
      notes: pass.notes || ""
    }));
    savePasses();
    render();
  } catch {
    alert("That file could not be imported. Please choose a PassNest JSON export.");
  } finally {
    event.target.value = "";
  }
}

function updateBoardingFields() {
  const isBoarding = typeSelect.value === "boarding";
  boardingFields.forEach((field) => {
    field.hidden = !isBoarding;
    field.querySelectorAll("input, select").forEach((input) => {
      input.disabled = !isBoarding;
      if (!isBoarding) {
        if (input.type === "file") input.value = "";
        if (input.name === "travelClass" || input.name === "seatNumber") input.value = "";
      }
    });
  });
}

function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        dataUrl: reader.result
      });
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function getCardSubline(pass) {
  if (pass.type !== "boarding") return pass.location || "Location not set";
  return [pass.location, pass.travelClass, pass.seatNumber ? `Seat ${pass.seatNumber}` : ""].filter(Boolean).join(" · ") || "Boarding details not set";
}

function renderComfortDetails(pass) {
  return `
    <div class="detail-meta comfort-meta">
      <div>
        <span>Class</span>
        <strong>${escapeHtml(pass.travelClass || "Not set")}</strong>
      </div>
      <div>
        <span>Seat</span>
        <strong>${escapeHtml(pass.seatNumber || "Not set")}</strong>
      </div>
    </div>
  `;
}

function renderAttachment(pass) {
  if (!pass.attachment?.dataUrl) return "";
  const isImage = pass.attachment.type.startsWith("image/");
  const preview = isImage
    ? `<img src="${pass.attachment.dataUrl}" alt="${escapeHtml(pass.attachment.name)} preview">`
    : `<div class="attachment-file">PDF</div>`;

  return `
    <div class="attachment-panel">
      ${preview}
      <a class="ghost-button attachment-link" href="${pass.attachment.dataUrl}" download="${escapeHtml(pass.attachment.name)}">Download uploaded pass</a>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

updateBoardingFields();
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works if offline caching is unavailable.
    });
  });
}
