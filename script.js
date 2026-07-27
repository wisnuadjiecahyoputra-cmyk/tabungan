/* ==========================================================
   Buku Tagihan — logika aplikasi
   Data disimpan di localStorage bila tersedia; jika tidak,
   otomatis jatuh ke penyimpanan sementara di memori.
   ========================================================== */

const STORAGE_KEY = "buku-tagihan:entries";

/* ---------- Lapisan penyimpanan (dengan fallback aman) ---------- */
const memoryStore = { data: null };

function loadEntries() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return memoryStore.data ? [...memoryStore.data] : [];
  }
}

function saveEntries(entries) {
  memoryStore.data = [...entries];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    // Penyimpanan browser tidak tersedia — data tetap ada selama sesi ini.
  }
}

/* ---------- State ---------- */
let entries = loadEntries();
let activeFilter = "semua";

/* ---------- Util ---------- */
function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function formatTanggal(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso + "T00:00:00");
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Render ---------- */
const listEl = document.getElementById("billList");
const emptyStateEl = document.getElementById("emptyState");
const listCountEl = document.getElementById("listCount");

function visibleEntries() {
  const sorted = [...entries].sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo));
  if (activeFilter === "lunas") return sorted.filter(e => e.lunas);
  if (activeFilter === "belum") return sorted.filter(e => !e.lunas);
  return sorted;
}

function renderList() {
  const items = visibleEntries();
  listEl.innerHTML = "";

  emptyStateEl.classList.toggle("is-visible", items.length === 0);
  listCountEl.textContent = `${items.length} catatan`;

  items.forEach(entry => {
    const row = document.createElement("div");
    row.className = "ledger-row";

    const sisaHari = daysUntil(entry.jatuhTempo);
    let dueClass = "";
    if (!entry.lunas && sisaHari < 0) dueClass = "is-overdue";
    else if (!entry.lunas && sisaHari <= 7) dueClass = "is-soon";

    row.innerHTML = `
      <div class="row-name">
        <strong>${escapeHtml(entry.nama)}</strong>
        <span>${escapeHtml(entry.kategori)}</span>
      </div>
      <div class="row-due ${dueClass}">${formatTanggal(entry.jatuhTempo)}</div>
      <div class="row-amount">${formatRupiah(entry.jumlah)}</div>
      <div class="align-center">
        <span class="stamp ${entry.lunas ? "stamp--lunas" : "stamp--belum"}">
          ${entry.lunas ? "Lunas" : "Belum Lunas"}
        </span>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-action="toggle" data-id="${entry.id}">
          ${entry.lunas ? "Batal Lunas" : "Tandai Lunas"}
        </button>
        <button class="icon-btn icon-btn--danger" data-action="hapus" data-id="${entry.id}">Hapus</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Ringkasan ---------- */
function renderSummary() {
  const total = entries.reduce((sum, e) => sum + Number(e.jumlah), 0);
  const paid = entries.filter(e => e.lunas).reduce((sum, e) => sum + Number(e.jumlah), 0);
  const unpaid = total - paid;
  const soon = entries.filter(e => !e.lunas && daysUntil(e.jatuhTempo) <= 7 && daysUntil(e.jatuhTempo) >= 0).length;

  document.getElementById("sumTotal").textContent = formatRupiah(total);
  document.getElementById("sumPaid").textContent = formatRupiah(paid);
  document.getElementById("sumUnpaid").textContent = formatRupiah(unpaid);
  document.getElementById("sumSoon").textContent = soon;
}

function renderAll() {
  renderSummary();
  renderList();
}

/* ---------- Tanggal hari ini di header ---------- */
document.getElementById("todayDate").textContent = new Date().toLocaleDateString("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

/* ---------- Form tambah tagihan ---------- */
document.getElementById("billForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const nama = document.getElementById("nama").value.trim();
  const kategori = document.getElementById("kategori").value;
  const jumlah = document.getElementById("jumlah").value;
  const jatuhTempo = document.getElementById("jatuhTempo").value;

  if (!nama || !jumlah || !jatuhTempo) return;

  entries.push({
    id: uid(),
    nama,
    kategori,
    jumlah: Number(jumlah),
    jatuhTempo,
    lunas: false,
  });

  saveEntries(entries);
  renderAll();
  e.target.reset();
  document.getElementById("nama").focus();
});

/* ---------- Aksi baris (lunas / hapus) ---------- */
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === "toggle") {
    entries = entries.map(entry =>
      entry.id === id ? { ...entry, lunas: !entry.lunas } : entry
    );
  }

  if (action === "hapus") {
    const target = entries.find(entry => entry.id === id);
    const yakin = target ? confirm(`Hapus catatan "${target.nama}"?`) : true;
    if (!yakin) return;
    entries = entries.filter(entry => entry.id !== id);
  }

  saveEntries(entries);
  renderAll();
});

/* ---------- Filter status ---------- */
document.getElementById("filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;

  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  activeFilter = btn.dataset.filter;
  renderList();
});

/* ---------- Mulai ---------- */
renderAll();
