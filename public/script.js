const API = '';
let allMedicines = [];

window.addEventListener('load', () => {
  initCanvas();
  applyTheme();
  setTimeout(() => {
    document.getElementById('loader-screen').classList.add('fade-out');
    setTimeout(() => { document.getElementById('loader-screen').style.display = 'none'; }, 600);
  }, 1800);
  if (localStorage.getItem('token')) {
    showAdminUI();
    showSection('dashboard');
  }
});

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === id);
  });
  if (id === 'dashboard' && localStorage.getItem('token')) {
    loadMedicines();
    loadStats();
  }
}

function showAdminUI() {
  document.getElementById('adminBtn').classList.add('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
  document.getElementById('dashNavBtn').classList.remove('hidden');
}

function hideAdminUI() {
  document.getElementById('adminBtn').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  document.getElementById('dashNavBtn').classList.add('hidden');
}

async function loginFlow() {
  const choice = await modalPrompt('admin-choice');
  if (!choice) return;
  if (choice === 'login') {
    const data = await modalPrompt('login-form');
    if (data) performAuth('/api/auth/login', data);
  } else {
    const data = await modalPrompt('register-form');
    if (data) performAuth('/api/auth/register', data);
  }
}

function modalPrompt(type) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    let html = '';
    if (type === 'admin-choice') {
      html = `<div class="modal-card">
        <div class="modal-header"><h3>Admin Portal</h3><button class="modal-close" id="mc-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <p style="color:var(--text2);font-size:14px;margin-bottom:24px;">Access the pharmaceutical registry management system.</p>
        <div style="display:flex;gap:10px;">
          <button class="btn-primary" style="flex:1" id="ch-login">Login</button>
          <button class="btn-outline" style="flex:1" id="ch-reg">Register</button>
        </div></div>`;
    } else if (type === 'login-form') {
      html = `<div class="modal-card">
        <div class="modal-header"><h3>Login</h3><button class="modal-close" id="mc-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="form-group"><label>Email</label><input type="email" id="mc-email" class="form-input" placeholder="admin@hospital.com"/></div>
        <div class="form-group"><label>Password</label><input type="password" id="mc-pass" class="form-input" placeholder="••••••••"/></div>
        <div class="modal-actions"><button class="btn-ghost" id="mc-cancel">Cancel</button><button class="btn-primary" id="mc-submit">Login</button></div></div>`;
    } else if (type === 'register-form') {
      html = `<div class="modal-card">
        <div class="modal-header"><h3>Create Account</h3><button class="modal-close" id="mc-close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        <div class="form-group"><label>Full Name</label><input type="text" id="mc-name" class="form-input" placeholder="Dr. John Smith"/></div>
        <div class="form-group"><label>Email</label><input type="email" id="mc-email" class="form-input" placeholder="admin@hospital.com"/></div>
        <div class="form-group"><label>Password</label><input type="password" id="mc-pass" class="form-input" placeholder="••••••••"/></div>
        <div class="modal-actions"><button class="btn-ghost" id="mc-cancel">Cancel</button><button class="btn-primary" id="mc-submit">Create Account</button></div></div>`;
    }

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    const close = () => { overlay.remove(); resolve(null); };
    overlay.querySelector('#mc-close').onclick = close;
    const cancelBtn = overlay.querySelector('#mc-cancel');
    if (cancelBtn) cancelBtn.onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    if (type === 'admin-choice') {
      overlay.querySelector('#ch-login').onclick = () => { overlay.remove(); resolve('login'); };
      overlay.querySelector('#ch-reg').onclick = () => { overlay.remove(); resolve('register'); };
    } else {
      overlay.querySelector('#mc-submit').onclick = () => {
        const email = overlay.querySelector('#mc-email').value;
        const pass = overlay.querySelector('#mc-pass').value;
        if (!email || !pass) { showToast('Please fill all fields', 'warning'); return; }
        const result = { email, password: pass };
        if (type === 'register-form') {
          const name = overlay.querySelector('#mc-name').value;
          if (!name) { showToast('Please enter your name', 'warning'); return; }
          result.fullName = name;
        }
        overlay.remove();
        resolve(result);
      };
    }
  });
}

async function performAuth(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      showAdminUI();
      showSection('dashboard');
      showToast('Welcome! Authentication successful.', 'success');
    } else {
      showToast(data.message || 'Authentication failed', 'error');
    }
  } catch {
    showToast('Server connection failed', 'error');
  }
}

function logout() {
  localStorage.removeItem('token');
  hideAdminUI();
  showSection('home');
  showToast('Signed out successfully', 'info');
}

function formatSerial(input) {
  let val = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (val.length > 2 && val.slice(0, 2) !== 'MV') val = 'MV' + val.slice(2);
  if (val.length > 2) val = val.slice(0, 2) + '-' + val.slice(2);
  if (val.length > 7) val = val.slice(0, 7) + '-' + val.slice(7);
  input.value = val.slice(0, 14);
}

async function verifyMed() {
  const serial = document.getElementById('serialInput').value.trim();
  if (!serial) { showToast('Please enter a serial code', 'warning'); return; }

  const resultDiv = document.getElementById('verify-result');
  resultDiv.className = '';
  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = `<div style="display:flex;align-items:center;gap:10px;color:var(--text2)"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div><span>Authenticating...</span></div>`;

  try {
    const res = await fetch(`/api/medicines/verify/${encodeURIComponent(serial)}`);
    const data = await res.json();

    if (data.success) {
      const med = data.data;
      const expired = new Date(med.expiryDate) < new Date();
      const expiryStr = new Date(med.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      if (expired) {
        resultDiv.className = 'warning';
        resultDiv.innerHTML = `
          <div class="result-title warn">⚠ Expired Medicine — Do Not Use</div>
          <div class="result-rows">
            <div class="result-row"><span>Product</span><span>${med.name}</span></div>
            <div class="result-row"><span>Manufacturer</span><span>${med.brand || 'N/A'}</span></div>
            <div class="result-row"><span>Serial</span><span>${med.serialNumber}</span></div>
            <div class="result-row"><span>Expired On</span><span style="color:var(--red)">${expiryStr}</span></div>
          </div>`;
      } else {
        resultDiv.className = 'success';
        resultDiv.innerHTML = `
          <div class="result-title ok">✓ Authentic — Safe to Use</div>
          <div class="result-rows">
            <div class="result-row"><span>Product</span><span>${med.name}</span></div>
            <div class="result-row"><span>Manufacturer</span><span>${med.brand || 'N/A'}</span></div>
            <div class="result-row"><span>Serial</span><span>${med.serialNumber}</span></div>
            <div class="result-row"><span>Expires On</span><span style="color:var(--green)">${expiryStr}</span></div>
            <div class="result-row"><span>Status</span><span style="color:var(--green)">WHO Compliant ✓</span></div>
          </div>`;
      }
    } else {
      resultDiv.className = 'error';
      resultDiv.innerHTML = `
        <div class="result-title bad">⚠ Not Found — Potential Counterfeit</div>
        <p style="font-size:13px;color:var(--text2);margin-top:8px">This serial code is not in our official registry. Do not consume this medicine. Report to authorities.</p>`;
    }
  } catch {
    resultDiv.className = 'error';
    resultDiv.innerHTML = `<div class="result-title bad">Connection Error</div><p style="font-size:13px;color:var(--text2);margin-top:6px">Could not reach the verification server. Please try again.</p>`;
  }
}

/* =========================================================================
   UNIFIED CAMERA SCANNER (reads both QR codes and 1D barcodes)
   Used by two flows, controlled by "scanMode":
     - 'verify'   -> public "Authenticate Medicine" scan (fills serialInput)
     - 'register' -> admin dashboard scan-to-register flow
   The scanner UI lives in a single global modal (#scannerModal) so it works
   correctly no matter which section (home/dashboard) is currently active.
========================================================================= */

let html5QrCode = null;
let scanMode = 'verify';

function openScannerModal() {
  document.getElementById('scannerModal').classList.remove('hidden');
}

function closeScannerModal() {
  document.getElementById('scannerModal').classList.add('hidden');
}

async function startScanner(mode) {
  if (mode === 'register') {
    const token = localStorage.getItem('token');
    if (!token) { showToast('Please login first', 'warning'); return; }
  }

  scanMode = mode;
  openScannerModal();

  const config = {
    fps: 10,
    qrbox: { width: 250, height: 180 },
    aspectRatio: 1.0,
    formatsToSupport: [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR
    ],
    // Ask for a higher-resolution video stream so thin barcode lines are
    // sharp enough to decode (low-res streams are the #1 cause of "camera
    // opens but never detects anything").
    videoConstraints: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  html5QrCode = new Html5Qrcode('scanner-video', { verbose: false });

  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      showToast('No camera available on this device', 'error');
      closeScannerModal();
      return;
    }

    // Prefer the rear/back camera automatically when available
    const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
    const cameraId = backCam ? backCam.id : cameras[cameras.length - 1].id;

    await html5QrCode.start(
      cameraId,
      config,
      async (decodedText) => {
        if (navigator.vibrate) navigator.vibrate(120); // haptic feedback on successful scan
        await stopScanner();

        if (scanMode === 'register') {
          await handleScannedForRegistration(decodedText);
        } else {
          document.getElementById('serialInput').value = decodedText;
          verifyMed();
        }
      },
      () => { /* called continuously while no code is found - ignore */ }
    );
  } catch (err) {
    console.error(err);
    showToast('Could not access the camera. Please allow camera permission.', 'error');
    closeScannerModal();
  }
}

async function stopScanner() {
  if (html5QrCode) {
    try {
      const state = html5QrCode.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await html5QrCode.stop();
      }
      await html5QrCode.clear();
    } catch (e) {
      // camera was already stopped - ignore
    }
  }
  closeScannerModal();
}

/* ---------------- Admin: scan-to-register a new medicine ---------------- */

// Checks whether the scanned code already exists; if not, opens the
// "register new medicine" form pre-filled with the scanned code.
async function handleScannedForRegistration(code) {
  try {
    const res = await fetch(`/api/medicines/verify/${encodeURIComponent(code)}`);
    const data = await res.json();

    if (data.success) {
      showToast(`This code is already registered: ${data.data.name}`, 'info');
    } else {
      openRegisterFormModal(code);
    }
  } catch {
    showToast('An error occurred while checking the code', 'error');
  }
}

function openRegisterFormModal(scannedCode) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-card">
    <div class="modal-header"><h3>Register New Medicine</h3><button class="modal-close" id="rc-close">✕</button></div>
    <div class="form-group"><label>Scanned Code</label><input type="text" class="form-input" value="${scannedCode}" disabled/></div>
    <div class="form-group"><label>Medicine Name</label><input type="text" id="rc-name" class="form-input" placeholder="Paracetamol 500mg"/></div>
    <div class="form-group"><label>Manufacturer</label><input type="text" id="rc-brand" class="form-input" placeholder="Company name"/></div>
    <div class="form-group"><label>Expiry Date</label><input type="date" id="rc-expiry" class="form-input"/></div>
    <div class="form-group"><label>Description / Notes</label><textarea id="rc-desc" class="form-input"></textarea></div>
    <div class="modal-actions"><button class="btn-ghost" id="rc-cancel">Cancel</button><button class="btn-primary" id="rc-submit">Register Medicine</button></div>
  </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#rc-close').onclick = close;
  overlay.querySelector('#rc-cancel').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#rc-submit').onclick = async () => {
    const name = overlay.querySelector('#rc-name').value.trim();
    const brand = overlay.querySelector('#rc-brand').value.trim();
    const expiryDate = overlay.querySelector('#rc-expiry').value;
    const description = overlay.querySelector('#rc-desc').value.trim();

    if (!name || !expiryDate) { showToast('Medicine name and expiry date are required', 'warning'); return; }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/medicines/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, brand, expiryDate, description, serialNumber: scannedCode })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Medicine registered successfully — Code: ${data.data.serialNumber}`, 'success');
        close();
        loadMedicines();
        loadStats();
      } else {
        showToast(data.message || 'Failed to register medicine', 'error');
      }
    } catch {
      showToast('Server connection error', 'error');
    }
  };
}

async function sendSymptoms() {
  const input = document.getElementById('symptomInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addChatMsg(text, 'user');
  const typing = addTypingMsg();

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    typing.remove();
    addChatMsg(data.reply || 'I could not process that. Please try again.', 'ai');
  } catch {
    typing.remove();
    addChatMsg('Connection error. Please try again.', 'ai');
  }
}

function quickSymptom(text) {
  document.getElementById('symptomInput').value = text;
  sendSymptoms();
  showSection('advisor');
}

function addChatMsg(text, role) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'ai' ? 'AI' : 'You'}</div>
    <div class="msg-bubble">${text.replace(/\n/g, '<br>')}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function addTypingMsg() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg ai msg-typing';
  div.innerHTML = `<div class="msg-avatar">AI</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function generateBulkMedicines() {
  const btn = document.getElementById('generateBtn');
  const progress = document.getElementById('generateProgress');
  const fill = document.getElementById('progressFill');
  const label = document.getElementById('progressLabel');
  const result = document.getElementById('generateResult');

  btn.disabled = true;
  progress.classList.remove('hidden');
  result.classList.add('hidden');

  const medicines = [
    'Paracetamol 500mg', 'Ibuprofen 400mg', 'Amoxicillin 250mg',
    'Omeprazole 20mg', 'Metformin 500mg', 'Aspirin 100mg',
    'Cetirizine 10mg', 'Azithromycin 500mg', 'Vitamin D3 1000IU', 'Lisinopril 10mg'
  ];

  let success = 0;
  for (let i = 0; i < medicines.length; i++) {
    label.textContent = `Generating ${i + 1}/10: ${medicines[i]}`;
    fill.style.width = `${((i) / 10) * 100}%`;
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: medicines[i] })
      });
      const data = await res.json();
      if (data.success) success++;
    } catch { }
    await new Promise(r => setTimeout(r, 400));
  }

  fill.style.width = '100%';
  label.textContent = 'Complete!';

  setTimeout(() => {
    result.classList.remove('hidden');
    result.innerHTML = `✓ Successfully generated ${success}/10 medicines and added to registry`;
    progress.classList.add('hidden');
    btn.disabled = false;
    fill.style.width = '0%';
    showToast(`${success} medicines added to registry`, 'success');
    if (document.getElementById('dashboard').classList.contains('active')) {
      loadMedicines();
      loadStats();
    }
  }, 600);
}

async function addNewMed() {
  const token = localStorage.getItem('token');
  const name = document.getElementById('mName').value.trim();
  const brand = document.getElementById('mBrand').value.trim();
  const expiryDate = document.getElementById('mExpiry').value;
  const description = document.getElementById('mDesc').value.trim();

  if (!name || !expiryDate) { showToast('Name and expiry date are required', 'warning'); return; }

  try {
    const res = await fetch('/api/medicines/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, brand, expiryDate, description })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Medicine saved — Serial: ${data.data.serialNumber}`, 'success');
      document.getElementById('mName').value = '';
      document.getElementById('mBrand').value = '';
      document.getElementById('mExpiry').value = '';
      document.getElementById('mDesc').value = '';
      loadMedicines();
      loadStats();
    } else {
      showToast(data.message || 'Failed to add medicine', 'error');
    }
  } catch {
    showToast('Server error', 'error');
  }
}

async function loadMedicines() {
  const tbody = document.getElementById('medTableBody');
  const loader = document.getElementById('tableLoader');
  const empty = document.getElementById('tableEmpty');

  loader.classList.remove('hidden');
  tbody.innerHTML = '';
  empty.classList.add('hidden');

  try {
    const res = await fetch('/api/medicines/all');
    const data = await res.json();
    loader.classList.add('hidden');

    if (data.success && data.data.length > 0) {
      allMedicines = data.data;
      renderTable(allMedicines);
    } else {
      empty.classList.remove('hidden');
    }
  } catch {
    loader.classList.add('hidden');
    showToast('Failed to load medicines', 'error');
  }
}

function renderTable(meds) {
  const tbody = document.getElementById('medTableBody');
  tbody.innerHTML = meds.map(med => {
    const expired = new Date(med.expiryDate) < new Date();
    const expStr = new Date(med.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `<tr>
      <td><div class="med-name">${med.name}</div><div class="med-brand">${med.brand || '—'}</div></td>
      <td><span class="serial-code">${med.serialNumber}</span></td>
      <td style="font-size:13px;color:var(--text2)">${expStr}</td>
      <td><span class="status-badge ${expired ? 'expired' : 'active'}">${expired ? 'Expired' : 'Active'}</span></td>
      <td><div class="table-actions">
        <button class="action-btn" onclick="openEditModal('${med._id}','${med.name}','${med.brand || ''}','${med.expiryDate}')" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn del" onclick="deleteMed('${med._id}')" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterTable(query) {
  const q = query.toLowerCase();
  const filtered = allMedicines.filter(m =>
    m.name.toLowerCase().includes(q) || m.serialNumber.toLowerCase().includes(q) || (m.brand || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
}

async function loadStats() {
  try {
    const res = await fetch('/api/medicines/all');
    const data = await res.json();
    if (data.success) {
      const meds = data.data;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const expired = meds.filter(m => new Date(m.expiryDate) < now).length;
      const active = meds.length - expired;
      const todayAdded = meds.filter(m => new Date(m.createdAt) >= today).length;
      document.getElementById('totalCount').textContent = meds.length;
      document.getElementById('activeCount').textContent = active;
      document.getElementById('expiredCount').textContent = expired;
      document.getElementById('todayCount').textContent = todayAdded;
    }
  } catch { }
}

async function deleteMed(id) {
  const token = localStorage.getItem('token');
  if (!confirm('Delete this medicine permanently?')) return;
  try {
    const res = await fetch(`/api/medicines/delete/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      showToast('Medicine deleted', 'info');
      loadMedicines();
      loadStats();
    }
  } catch {
    showToast('Delete failed', 'error');
  }
}

function openEditModal(id, name, brand, expiry) {
  document.getElementById('editId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editBrand').value = brand;
  document.getElementById('editExpiry').value = new Date(expiry).toISOString().split('T')[0];
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

async function submitEdit() {
  const id = document.getElementById('editId').value;
  const token = localStorage.getItem('token');
  const body = {
    name: document.getElementById('editName').value,
    brand: document.getElementById('editBrand').value,
    expiryDate: document.getElementById('editExpiry').value
  };
  try {
    const res = await fetch(`/api/medicines/update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Medicine updated successfully', 'success');
      closeEditModal();
      loadMedicines();
    }
  } catch {
    showToast('Update failed', 'error');
  }
}

document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEditModal();
});

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
  document.querySelector('.icon-moon').classList.toggle('hidden', !isDark);
  document.querySelector('.icon-sun').classList.toggle('hidden', isDark);
}

function applyTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  if (saved === 'light') {
    document.querySelector('.icon-moon').classList.add('hidden');
    document.querySelector('.icon-sun').classList.remove('hidden');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  let t = 0;

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.5 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const particleColor = isDark ? '0,212,255' : '0,100,180';

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particleColor},${p.opacity})`;
      ctx.fill();
    });

    particles.forEach((p, i) => {
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${particleColor},${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    t++;
    requestAnimationFrame(draw);
  }

  draw();
  window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });
}