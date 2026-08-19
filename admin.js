import { getUsers, getActiveUser, checkPass } from './auth.js';

export function initAdminUI() {
  const toggleBtn = document.getElementById('btnToggleAdmin');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const body = document.getElementById('adminSectionBody');
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? '🔼 Ocultar' : '🔽 Mostrar';
    });
  }

  const btnCreate = document.getElementById('btnAdminCreateUser');
  if (btnCreate) {
    btnCreate.addEventListener('click', async (e) => {
      e.preventDefault();
      await adminCreateUser();
    });
  }

  const btnJson = document.getElementById('btnExportAuditJson');
  if (btnJson) btnJson.addEventListener('click', () => exportAuditLogs('json'));

  const btnCsv = document.getElementById('btnExportAuditCsv');
  if (btnCsv) btnCsv.addEventListener('click', () => exportAuditLogs('csv'));

  window.addEventListener('appLoaded', renderAdminSection);
  renderAdminSection();
}

export async function renderAdminSection() {
  const activeUser = getActiveUser();
  const adminSec = document.getElementById('adminSection');
  
  if (activeUser && activeUser.isAdmin) {
    if (adminSec) adminSec.style.display = 'block';
    await renderUsersTable();
    renderAuditLogs();
  } else {
    if (adminSec) adminSec.style.display = 'none';
  }
}

async function adminCreateUser() {
  const u = document.getElementById('newUsername').value.trim().toLowerCase();
  const p = document.getElementById('newUserPass').value.trim();
  const pConfirm = document.getElementById('newUserPassConfirm').value.trim();

  if (!u || !p || p !== pConfirm || !checkPass(p)) {
    alert('Verifica los datos: Las contraseñas deben coincidir y tener al menos 3 caracteres.');
    return;
  }

  try {
    let users = await getUsers();
    if (users.some(x => x.username === u)) {
      alert('El usuario ya existe.');
      return;
    }

    const newUser = {
      username: u,
      password: p,
      isAdmin: false,
      status: 'active',
      canEdit: false,
      canDelete: false,
      requestEdit: false
    };

    await window.db.ref('users/' + u).set(newUser);

    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPass').value = '';
    document.getElementById('newUserPassConfirm').value = '';

    alert('✅ Usuario creado con éxito en la nube.');
    await renderUsersTable();
  } catch (err) {
    alert('Error al crear usuario: ' + err.message);
  }
}

async function renderUsersTable() {
  const users = await getUsers();
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    if (u.isAdmin) return `<tr><td><b>${u.username}</b> (Admin)</td><td>Activo</td><td>Sí</td><td>Sí</td><td>-</td></tr>`;
    return `
      <tr>
        <td>${u.username}</td>
        <td>${u.status === 'blocked' ? 'Bloqueado' : 'Activo'}</td>
        <td><input type="checkbox" ${u.canEdit ? 'checked' : ''} data-user="${u.username}" data-perm="canEdit" class="perm-check"></td>
        <td><input type="checkbox" ${u.canDelete ? 'checked' : ''} data-user="${u.username}" data-perm="canDelete" class="perm-check"></td>
        <td>
          <button class="btn btn-warning btn-block-user" data-user="${u.username}">${u.status === 'blocked' ? 'Activar' : 'Bloquear'}</button>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.perm-check').forEach(chk => {
    chk.onchange = async (e) => {
      const uname = e.target.getAttribute('data-user');
      const perm = e.target.getAttribute('data-perm');
      let allUsers = await getUsers();
      let target = allUsers.find(x => x.username === uname);
      if (target) {
        target[perm] = e.target.checked;
        await window.db.ref('users/' + uname).set(target);
      }
    };
  });

  document.querySelectorAll('.btn-block-user').forEach(btn => {
    btn.onclick = async (e) => {
      const uname = e.target.getAttribute('data-user');
      let allUsers = await getUsers();
      let target = allUsers.find(x => x.username === uname);
      if (target) {
        target.status = target.status === 'blocked' ? 'active' : 'blocked';
        await window.db.ref('users/' + uname).set(target);
        await renderUsersTable();
      }
    };
  });
}

function renderAuditLogs() {
  const logs = JSON.parse(localStorage.getItem('sys_audit_logs')) || [];
  const list = document.getElementById('auditLogsList');
  if (!list) return;

  if (!logs.length) {
    list.innerHTML = `<li style="color:var(--text-muted); font-size:0.8rem;">No hay registros de edición.</li>`;
    return;
  }

  list.innerHTML = logs.slice().reverse().map(l => `
    <li class="log-item">
      <div><strong>Usuario:</strong> ${l.user} | <strong>Fecha:</strong> ${l.timestamp}</div>
      <div><strong>OT:</strong> ${l.otNumber}</div>
      <div style="font-size:0.75rem;">${l.changes}</div>
    </li>
  `).join('');
}

function exportAuditLogs(format) {
  const logs = JSON.parse(localStorage.getItem('sys_audit_logs')) || [];
  if (!logs.length) { alert('No hay historial para exportar.'); return; }
  const jsonStr = JSON.stringify(logs, null, 2);
  const blob = new Blob([jsonStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AUDITORIA_${Date.now()}.${format}`;
  a.click();
}
