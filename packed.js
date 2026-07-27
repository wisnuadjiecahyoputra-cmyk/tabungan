// ============================================================
// Buku Kas — Pencatat Tabungan, Pemasukan & Pengeluaran
// Data disimpan di localStorage browser (per perangkat/browser)
// ============================================================

const STORAGE_KEY = "bukukas.transaksi";

/** @type {Array<{id:string, jenis:'pemasukan'|'pengeluaran', keterangan:string, jumlah:number, tanggal:string}>} */
let transaksi = [];
let editingId = null;

// ---------- Elemen DOM ----------
const form = document.getElementById("entryForm");
const entryIdInput = document.getElementById("entryId");
const keteranganInput = document.getElementById("keterangan");
const jumlahInput = document.getElementById("jumlah");
const tanggalInput = document.getElementById("tanggal");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEdit");
const formTitle = document.getElementById("formTitle");
const ledgerBody = document.getElementById("ledgerBody");
const emptyState = document.getElementById("emptyState");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalSavingsEl = document.getElementById("totalSavings");
const balanceAmountEl = document.getElementById("balanceAmount");

// ---------- Util ----------
function formatRupiah(angka) {
  const nilai = Number(angka) || 0;
  return "Rp " + nilai.toLocaleString("id-ID");
}

function formatTanggal(isoDate) {
  if (!isoDate) return "-";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function buatId() {
  return "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

// ---------- Penyimpanan ----------
function muatData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transaksi = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Gagal memuat data:", err);
    transaksi = [];
  }
}

function simpanData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transaksi));
  } catch (err) {
    console.error("Gagal menyimpan data:", err);
    alert("Data gagal disimpan. Penyimpanan browser mungkin penuh.");
  }
}

// ---------- Perhitungan ----------
function hitungTotal() {
  let masuk = 0;
  let keluar = 0;
  for (const t of transaksi) {
    if (t.jenis === "pemasukan") masuk += t.jumlah;
    else keluar += t.jumlah;
  }
  const saldo = masuk - keluar;
  return { masuk, keluar, saldo };
}

// ---------- Render ----------
function render() {
  const { masuk, keluar, saldo } = hitungTotal();

  totalIncomeEl.textContent = formatRupiah(masuk);
  totalExpenseEl.textContent = formatRupiah(keluar);
  totalSavingsEl.textContent = formatRupiah(saldo);
  balanceAmountEl.textContent = formatRupiah(saldo);

  const urut = [...transaksi].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  ledgerBody.innerHTML = "";

  if (urut.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  for (const t of urut) {
    const tr = document.createElement("tr");
    tr.className = t.jenis === "pemasukan" ? "row-in" : "row-out";

    const tanda = t.jenis === "pemasukan" ? "+" : "-";

    tr.innerHTML = `
      <td>${formatTanggal(t.tanggal)}</td>
      <td>${escapeHtml(t.keterangan)}</td>
      <td><span class="tag ${t.jenis === "pemasukan" ? "tag-in" : "tag-out"}">${t.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}</span></td>
      <td class="num amount">${tanda} ${formatRupiah(t.jumlah)}</td>
      <td class="actions">
        <div class="row-actions">
          <button type="button" class="icon-btn edit" data-id="${t.id}">Edit</button>
          <button type="button" class="icon-btn delete" data-id="${t.id}">Hapus</button>
        </div>
      </td>
    `;

    ledgerBody.appendChild(tr);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Form: tambah / edit ----------
function resetForm() {
  form.reset();
  entryIdInput.value = "";
  editingId = null;
  tanggalInput.value = new Date().toISOString().slice(0, 10);
  submitBtn.textContent = "Simpan Catatan";
  formTitle.textContent = "Tambah Catatan";
  cancelEditBtn.classList.add("hidden");
  document.querySelector('input[name="jenis"][value="pemasukan"]').checked = true;
}

function mulaiEdit(id) {
  const t = transaksi.find((x) => x.id === id);
  if (!t) return;

  editingId = id;
  entryIdInput.value = id;
  keteranganInput.value = t.keterangan;
  jumlahInput.value = t.jumlah;
  tanggalInput.value = t.tanggal;
  document.querySelector(`input[name="jenis"][value="${t.jenis}"]`).checked = true;

  submitBtn.textContent = "Simpan Perubahan";
  formTitle.textContent = "Edit Catatan";
  cancelEditBtn.classList.remove("hidden");

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  keteranganInput.focus();
}

function hapus(id) {
  const t = transaksi.find((x) => x.id === id);
  if (!t) return;
  const ok = confirm(`Hapus catatan "${t.keterangan}" sebesar ${formatRupiah(t.jumlah)}?`);
  if (!ok) return;

  transaksi = transaksi.filter((x) => x.id !== id);
  simpanData();
  render();

  if (editingId === id) resetForm();
}

// ---------- Event listeners ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const jenis = document.querySelector('input[name="jenis"]:checked').value;
  const keterangan = keteranganInput.value.trim();
  const jumlah = Number(jumlahInput.value);
  const tanggal = tanggalInput.value;

  if (!keterangan || !jumlah || jumlah <= 0 || !tanggal) {
    alert("Mohon lengkapi keterangan, jumlah (lebih dari 0), dan tanggal.");
    return;
  }

  if (editingId) {
    const idx = transaksi.findIndex((x) => x.id === editingId);
    if (idx !== -1) {
      transaksi[idx] = { ...transaksi[idx], jenis, keterangan, jumlah, tanggal };
    }
  } else {
    transaksi.push({ id: buatId(), jenis, keterangan, jumlah, tanggal });
  }

  simpanData();
  render();
  resetForm();
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

ledgerBody.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const id = target.getAttribute("data-id");
  if (!id) return;

  if (target.classList.contains("edit")) {
    mulaiEdit(id);
  } else if (target.classList.contains("delete")) {
    hapus(id);
  }
});

// ---------- Inisialisasi ----------
muatData();
resetForm();
render();