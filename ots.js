import { getActiveUser, getUsers } from './auth.js';

let editingId = null;
let sortDesc = true;

export function initOTsUI() {
  const form = document.getElementById('otForm');
  if (form) form.addEventListener('submit', saveOT);

  const btnAddExtra = document.getElementById('btnAddExtra');
  if (btnAddExtra) btnAddExtra.addEventListener('click', () => addExtraField());

  const searchBus = document.getElementById('searchBus');
  if (searchBus) searchBus.addEventListener('input', renderOTs);

  const sortBtn = document.getElementById('sortBtn');
  if (sortBtn) {
    sortBtn.addEventListener('click', async () => {
      sortDesc = !sortDesc;
      sortBtn.textContent = sortDesc ? '⬇️ Más recientes primero' : '⬆️ Más antiguas primero';
      await renderOTs();
    });
  }

  const btnExportBackup = document.getElementById('btnExportBackup');
  if (btnExportBackup) btnExportBackup.addEventListener('click', exportBackup);

  const btnExportExcel = document.getElementById('btnExportExcel');
  if (btnExportExcel) btnExportExcel.addEventListener('click', exportToExcel);

  const importInput = document.getElementById('importFileInput');
  if (importInput) importInput.addEventListener('change', importBackup);

  window.addEventListener('appLoaded', renderOTs);

  // Llamada directa para renderizar al recargar con F5
  renderOTs();
}

function addExtraField(key = '', val = '') {
  const div = document.createElement('div');
  div.className = 'dynamic-field';
  div.innerHTML = `
    <input type="text" placeholder="Campo" class="extra-key" value="${key}" />
    <input type="text" placeholder="Valor" class="extra-val" value="${val}" />
    <button type="button" class="btn btn-danger btn-del-field">X</button>
  `;
  div.querySelector('.btn-del-field').onclick = () => div.remove();
  document.getElementById('dynamicContainer').appendChild(div);
}

async function saveOT(e) {
  e.preventDefault();
  const activeUser = getActiveUser();
  if (!activeUser) return;

  let ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  const otVal = document.getElementById('otNumber').value.trim();
  const busVal = document.getElementById('busNumber').value.trim();
  const kmVal = document.getElementById('kilometraje').value.trim();
  const detVal = document.getElementById('detalle').value.trim();

  const extras = {};
  document.querySelectorAll('.dynamic-field').forEach(f => {
    const k = f.querySelector('.extra-key').value.trim();
    const v = f.querySelector('.extra-val').value.trim();
    if (k) extras[k] = v;
  });

  const now = new Date();

  if (editingId) {
    const idx = ots.findIndex(x => x.id === editingId);
    if (idx !== -1) {
      ots[idx] = { ...ots[idx], ot: otVal, bus: busVal, km: kmVal, detalle: detVal, extras };
    }
    editingId = null;
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.textContent = 'Guardar OT';
  } else {
    ots.unshift({
      id: 'ID_' + Date.now(),
      ot: otVal,
      bus: busVal,
      km: kmVal,
      detalle: detVal,
      extras,
      fecha: now.toLocaleDateString('es-ES'),
      timestamp: now.getTime(),
      createdUser: activeUser.username
    });
  }

  localStorage.setItem('sys_ots', JSON.stringify(ots));
  document.getElementById('otForm').reset();
  document.getElementById('dynamicContainer').innerHTML = '';
  await renderOTs();
}

export async function renderOTs() {
  const activeUser = getActiveUser();
  if (!activeUser) return;

  let ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  
  // SOLUCIÓN AL ERROR: getUsers() devuelve una Promesa y requiere await
  const rawUsers = await getUsers();
  const users = Array.isArray(rawUsers) ? rawUsers : Object.values(rawUsers || {});
  let me = users.find(u => u && u.username === activeUser.username) || activeUser;

  const searchInput = document.getElementById('searchBus');
  const filter = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const list = document.getElementById('otList');
  if (!list) return;

  // El usuario normal solo ve sus OTs, el admin ve todas
  if (!me.isAdmin) {
    ots = ots.filter(x => x.createdUser === me.username);
  }

  let filtered = ots.filter(x => (x.bus || '').toLowerCase().includes(filter));

  filtered.sort((a, b) => sortDesc ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));

  if (!filtered.length) {
    list.innerHTML = `<li style="text-align:center; color:var(--text-muted); padding: 1rem;">Sin registros guardados.</li>`;
    return;
  }

  list.innerHTML = filtered.map(x => `
    <li class="object-item">
      <div class="object-header">
        <span class="object-title">OT: ${x.ot || 'N/A'}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${x.fecha}</span>
      </div>
      ${me.isAdmin ? `<div class="object-prop" style="color:var(--primary);"><strong>Creado por:</strong> ${x.createdUser}</div>` : ''}
      <div class="object-prop"><strong>Bus:</strong> ${x.bus || 'N/A'}</div>
      <div class="object-prop"><strong>Kilometraje:</strong> ${x.km || 'N/A'}</div>
      <div class="object-prop"><strong>Detalle:</strong> ${x.detalle || 'N/A'}</div>
      <div class="object-actions">
        ${(me.canEdit || me.isAdmin) ? `<button class="btn btn-warning btn-edit-ot" data-id="${x.id}">✏️ Editar</button>` : ''}
        ${(me.canDelete || me.isAdmin) ? `<button class="btn btn-danger btn-del-ot" data-id="${x.id}">🗑️ Borrar</button>` : ''}
      </div>
    </li>
  `).join('');

  document.querySelectorAll('.btn-del-ot').forEach(btn => {
    btn.onclick = async (e) => {
      const id = e.target.getAttribute('data-id');
      let allOts = JSON.parse(localStorage.getItem('sys_ots')) || [];
      allOts = allOts.filter(x => x.id !== id);
      localStorage.setItem('sys_ots', JSON.stringify(allOts));
      await renderOTs();
    };
  });

  document.querySelectorAll('.btn-edit-ot').forEach(btn => {
    btn.onclick = (e) => {
      const id = e.target.getAttribute('data-id');
      let allOts = JSON.parse(localStorage.getItem('sys_ots')) || [];
      const target = allOts.find(x => x.id === id);
      if (!target) return;

      editingId = id;
      document.getElementById('otNumber').value = target.ot || '';
      document.getElementById('busNumber').value = target.bus || '';
      document.getElementById('kilometraje').value = target.km || '';
      document.getElementById('detalle').value = target.detalle || '';

      const container = document.getElementById('dynamicContainer');
      container.innerHTML = '';
      if (target.extras) {
        Object.entries(target.extras).forEach(([k, v]) => addExtraField(k, v));
      }

      const saveBtn = document.getElementById('saveBtn');
      if (saveBtn) saveBtn.textContent = 'Actualizar OT';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });
}

function exportBackup() {
  const ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  const blob = new Blob([JSON.stringify(ots, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `BACKUP_OTS_${Date.now()}.json`;
  a.click();
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        localStorage.setItem('sys_ots', JSON.stringify(imported));
        alert('Respaldo cargado con éxito.');
        await renderOTs();
      }
    } catch (err) {
      alert('Archivo JSON inválido.');
    }
  };
  reader.readAsText(file);
}

function exportToExcel() {
  let ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  if (!ots.length) { alert('No hay registros.'); return; }
  let csv = "\uFEFFN° OT;Bus;Kilometraje;Detalle;Fecha;Creado Por\n";
  ots.forEach(x => {
    csv += `"${x.ot}";"${x.bus}";"${x.km}";"${x.detalle}";"${x.fecha}";"${x.createdUser}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Registros_OT_${Date.now()}.csv`;
  a.click();
}
