// CONFIGURACIÓN DE FIREBASE (Reemplaza con tus credenciales)
const firebaseConfig = {
  apiKey: "AIzaSyCcljiWo9h5nqIgaGvktP6EIQ325Qgn0s8",
  authDomain: "gestorots-58168.firebaseapp.com",
  databaseURL: "https://gestorots-58168-default-rtdb.firebaseio.com",
  projectId: "gestorots-58168",
  storageBucket: "gestorots-58168.firebasestorage.app",
  messagingSenderId: "382994854791",
  appId: "1:382994854791:web:34d6d9fef8d597e49e5922"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isRegistering = false;
let editingId = null;
let activeUser = null;
let sortDesc = true;

// Estado global sincronizado
let globalUsers = {};
let globalOTs = {};
let globalLogs = {};

function toggleSection(sectionId, btn) {
  const container = document.getElementById(sectionId);
  if (container.style.display === 'none') {
    container.style.display = 'block';
    btn.textContent = '🔼 Ocultar';
  } else {
    container.style.display = 'none';
    btn.textContent = '🔽 Mostrar';
  }
}

function init() {
  // Listener de Usuarios en tiempo real
  db.ref('users').on('value', (snapshot) => {
    globalUsers = snapshot.val() || {};
    
    // Crear admin por defecto si no existen usuarios
    if (!snapshot.exists()) {
      db.ref('users/admin').set({
        username: 'admin',
        password: 'admin',
        isAdmin: true,
        status: 'active',
        canEdit: true,
        canDelete: true,
        requestEdit: false
      });
    }

    if (activeUser) {
      activeUser = globalUsers[activeUser.username] || activeUser;
      if (activeUser.isAdmin) renderUsersTable();
    }
  });

  // Listener de OTs en tiempo real
  db.ref('ots').on('value', (snapshot) => {
    globalOTs = snapshot.val() || {};
    if (activeUser) renderOTs();
  });

  // Listener de Logs de Auditoría
  db.ref('audit_logs').on('value', (snapshot) => {
    globalLogs = snapshot.val() || {};
    if (activeUser && activeUser.isAdmin) renderAuditLogs();
  });

  // Verificar Sesión activa local
  try {
    const session = JSON.parse(localStorage.getItem('sys_session'));
    if (session && session.username) {
      activeUser = session;
      showApp();
      return;
    }
  } catch(e) {}

  showLogin();
}

function checkPass(pass) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

function checkStrength(pass, barId, textId, boxId) {
  const box = document.getElementById(boxId);
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);

  if (!pass) { box.style.display = 'none'; return; }

  box.style.display = 'block';

  let score = 0;
  if (pass.length >= 8) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;

  if (score <= 2) {
    bar.style.width = '33%';
    bar.style.backgroundColor = 'var(--danger)';
    text.style.color = 'var(--danger)';
    text.textContent = 'Fortaleza: Débil';
  } else if (score === 3 || score === 4) {
    bar.style.width = '66%';
    bar.style.backgroundColor = 'var(--warning)';
    text.style.color = 'var(--warning)';
    text.textContent = 'Fortaleza: Media';
  } else {
    bar.style.width = '100%';
    bar.style.backgroundColor = 'var(--success)';
    text.style.color = 'var(--success)';
    text.textContent = 'Fortaleza: Excelente / Muy Segura';
  }
}

function showAlert(msg) {
  const box = document.getElementById('loginAlert');
  box.textContent = msg;
  box.style.display = 'block';
}

function toggleAuthMode() {
  document.getElementById('loginAlert').style.display = 'none';
  isRegistering = !isRegistering;
  document.getElementById('loginTitle').textContent = isRegistering ? 'Crear Usuario' : 'Iniciar Sesión';
  document.getElementById('loginBtn').textContent = isRegistering ? 'Registrar' : 'Ingresar';
  document.getElementById('toggleRegister').textContent = isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes usuario? Crea uno nuevo';
  document.getElementById('confirmPassGroup').style.display = isRegistering ? 'block' : 'none';
  if (!isRegistering) document.getElementById('loginMeterBox').style.display = 'none';
}

function doAuth() {
  document.getElementById('loginAlert').style.display = 'none';
  const u = document.getElementById('loginUser').value.trim().toLowerCase();
  const p = document.getElementById('loginPass').value.trim();

  if (!u || !p) { showAlert('Escribe usuario y contraseña.'); return; }

  if (isRegistering) {
    const pConfirm = document.getElementById('loginPassConfirm').value.trim();
    if (globalUsers[u]) { showAlert('El usuario ya existe.'); return; }
    if (p !== pConfirm) { showAlert('Las contraseñas no coinciden.'); return; }
    if (!checkPass(p)) { showAlert('Contraseña débil. Requiere 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'); return; }

    const newUser = { username: u, password: p, isAdmin: false, status: 'active', canEdit: false, canDelete: false, requestEdit: false };
    db.ref('users/' + u).set(newUser);
    activeUser = newUser;
  } else {
    const found = globalUsers[u];
    if (!found || found.password !== p) { showAlert('Usuario o contraseña incorrectos.'); return; }
    if (found.status === 'blocked') { showAlert('Usuario bloqueado.'); return; }
    activeUser = found;
  }

  localStorage.setItem('sys_session', JSON.stringify({ username: activeUser.username }));
  showApp();
}

function updatePassword() {
  const oldP = document.getElementById('oldPass').value.trim();
  const newP = document.getElementById('changePass').value.trim();
  const newPConfirm = document.getElementById('changePassConfirm').value.trim();

  let target = globalUsers[activeUser.username];

  if (!target) return;
  if (target.password !== oldP) { alert('La contraseña actual es incorrecta.'); return; }
  if (oldP === newP) { alert('La nueva contraseña no puede ser igual a la actual.'); return; }
  if (newP !== newPConfirm) { alert('La confirmación de contraseña no coincide.'); return; }
  if (!checkPass(newP)) { alert('La nueva contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'); return; }

  db.ref('users/' + activeUser.username + '/password').set(newP);

  document.getElementById('oldPass').value = '';
  document.getElementById('changePass').value = '';
  document.getElementById('changePassConfirm').value = '';
  document.getElementById('changeMeterBox').style.display = 'none';

  alert('Contraseña actualizada correctamente.');
}

function showLogin() {
  document.getElementById('viewLogin').style.display = 'block';
  document.getElementById('viewApp').style.display = 'none';
}

function showApp() {
  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewApp').style.display = 'block';
  document.getElementById('currentUserLabel').textContent = activeUser.username;
  document.getElementById('profileUsername').textContent = activeUser.username;

  if (activeUser.isAdmin) {
    document.getElementById('adminSection').style.display = 'block';
    renderUsersTable();
    renderAuditLogs();
  } else {
    document.getElementById('adminSection').style.display = 'none';
  }

  renderOTs();
}

function logout() {
  localStorage.removeItem('sys_session');
  activeUser = null;
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginPassConfirm').value = '';
  document.getElementById('loginMeterBox').style.display = 'none';
  showLogin();
}

function adminCreateUser() {
  const u = document.getElementById('newUsername').value.trim().toLowerCase();
  const p = document.getElementById('newUserPass').value.trim();
  const pConfirm = document.getElementById('newUserPassConfirm').value.trim();

  if (!u || !p || !pConfirm) { alert('Rellena todos los campos.'); return; }
  if (globalUsers[u]) { alert('El usuario ya existe.'); return; }
  if (p !== pConfirm) { alert('Las contraseñas no coinciden.'); return; }
  if (!checkPass(p)) { alert('Contraseña débil. Debe tener 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'); return; }

  db.ref('users/' + u).set({ username: u, password: p, isAdmin: false, status: 'active', canEdit: false, canDelete: false, requestEdit: false });

  document.getElementById('newUsername').value = '';
  document.getElementById('newUserPass').value = '';
  document.getElementById('newUserPassConfirm').value = '';
  document.getElementById('adminMeterBox').style.display = 'none';
  alert('Usuario creado con éxito.');
}

function renderUsersTable() {
  const usersList = Object.values(globalUsers);
  const tbody = document.getElementById('userTableBody');
  const requestsBox = document.getElementById('requestsContainer');

  const pendingRequests = usersList.filter(u => u.requestEdit && !u.canEdit);
  if (pendingRequests.length > 0) {
    requestsBox.innerHTML = pendingRequests.map(u => `
      <div class="request-badge">
        <span>⚠️ <b>${u.username}</b> solicitó permisos de edición.</span>
        <button type="button" class="btn btn-warning" style="width:auto; padding:0.3rem 0.6rem;" onclick="approveEdit('${u.username}')">Aprobar Permiso</button>
      </div>
    `).join('');
  } else {
    requestsBox.innerHTML = '';
  }

  tbody.innerHTML = usersList.map(u => {
    if (u.isAdmin) return `<tr><td><b>${u.username}</b> (Admin)</td><td>Activo</td><td>Sí</td><td>Sí</td><td>-</td></tr>`;
    return `
      <tr>
        <td>${u.username} ${u.requestEdit ? '<span style="color:var(--warning)">⚠️ Solicitó Editar</span>' : ''}</td>
        <td>${u.status === 'blocked' ? '<span style="color:red">Bloqueado</span>' : 'Activo'}</td>
        <td><input type="checkbox" ${u.canEdit ? 'checked' : ''} onchange="togglePerm('${u.username}', 'canEdit')"></td>
        <td><input type="checkbox" ${u.canDelete ? 'checked' : ''} onchange="togglePerm('${u.username}', 'canDelete')"></td>
        <td class="actions-cell">
          <button type="button" class="btn btn-warning" onclick="toggleBlock('${u.username}')">${u.status === 'blocked' ? 'Activar' : 'Bloquear'}</button>
          <button type="button" class="btn btn-danger" onclick="deleteUser('${u.username}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAuditLogs() {
  const logsList = Object.values(globalLogs);
  const list = document.getElementById('auditLogsList');

  if (!logsList.length) {
    list.innerHTML = `<li style="color:var(--text-muted); font-size:0.8rem;">No hay registros de edición aún.</li>`;
    return;
  }

  list.innerHTML = logsList.slice().reverse().map(l => `
    <li class="log-item">
      <div><strong>Usuario:</strong> ${l.user} | <strong>Fecha:</strong> ${l.timestamp}</div>
      <div><strong>Registro OT:</strong> ${l.otNumber}</div>
      <div style="font-size:0.75rem; color: #334155;"><strong>Cambios:</strong> ${l.changes}</div>
    </li>
  `).join('');
}

function approveEdit(user) {
  db.ref('users/' + user).update({ canEdit: true, requestEdit: false });
  alert(`Permiso de edición aprobado para ${user}`);
}

function togglePerm(user, key) {
  const current = globalUsers[user] ? globalUsers[user][key] : false;
  const updates = {};
  updates[key] = !current;
  if (key === 'canEdit' && !current) updates['requestEdit'] = false;
  db.ref('users/' + user).update(updates);
}

function toggleBlock(user) {
  const currentStatus = globalUsers[user] ? globalUsers[user].status : 'active';
  db.ref('users/' + user).update({ status: currentStatus === 'blocked' ? 'active' : 'blocked' });
}

function deleteUser(username) {
  if (!confirm(`¿Estás seguro de que deseas eliminar a "${username}"?`)) return;
  db.ref('users/' + username).remove();
}

function requestEditPermission() {
  db.ref('users/' + activeUser.username).update({ requestEdit: true });
  alert('Solicitud enviada al Administrador.');
}

function addExtraField(key = '', val = '') {
  const div = document.createElement('div');
  div.className = 'dynamic-field';
  div.innerHTML = `
    <input type="text" placeholder="Campo" class="extra-key" value="${key}" />
    <input type="text" placeholder="Valor" class="extra-val" value="${val}" />
    <button type="button" class="btn btn-danger" onclick="this.parentElement.remove()">X</button>
  `;
  document.getElementById('dynamicContainer').appendChild(div);
}

function saveOT(e) {
  e.preventDefault();

  const me = globalUsers[activeUser.username] || activeUser;
  if (editingId && !me.canEdit && !me.isAdmin) {
    alert('No tienes permiso de edición otorgado por el Administrador.');
    return;
  }

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
    const oldRecord = globalOTs[editingId];
    let changes = [];
    if (oldRecord.ot !== otVal) changes.push(`OT: "${oldRecord.ot}" ➔ "${otVal}"`);
    if (oldRecord.bus !== busVal) changes.push(`Bus: "${oldRecord.bus}" ➔ "${busVal}"`);
    if (oldRecord.km !== kmVal) changes.push(`KM: "${oldRecord.km}" ➔ "${kmVal}"`);
    if (oldRecord.detalle !== detVal) changes.push(`Detalle modificado`);

    db.ref('audit_logs').push({
      user: activeUser.username,
      timestamp: now.toLocaleString('es-ES'),
      otNumber: oldRecord.ot || 'S/N',
      changes: changes.length > 0 ? changes.join(' | ') : 'Modificación en campos adicionales'
    });

    db.ref('ots/' + editingId).update({
      ot: otVal,
      bus: busVal,
      km: kmVal,
      detalle: detVal,
      extras
    });
  } else {
    const newRef = db.ref('ots').push();
    newRef.set({
      id: newRef.key,
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

  resetForm();
}

function resetForm() {
  editingId = null;
  document.getElementById('otForm').reset();
  document.getElementById('dynamicContainer').innerHTML = '';
  document.getElementById('formTitle').textContent = 'Registrar OT';
  document.getElementById('saveBtn').textContent = 'Guardar OT';
  document.getElementById('cancelBtn').style.display = 'none';
}

function toggleSortOrder() {
  sortDesc = !sortDesc;
  document.getElementById('sortBtn').textContent = sortDesc 
    ? '⬇️ Más recientes primero' 
    : '⬆️ Más antiguas primero';
  renderOTs();
}

function renderOTs() {
  let ots = Object.values(globalOTs);
  const me = globalUsers[activeUser.username] || activeUser;
  const filter = document.getElementById('searchBus').value.trim().toLowerCase();
  const list = document.getElementById('otList');

  if (!me.isAdmin) {
    ots = ots.filter(x => x.createdUser === me.username);
  }

  let filtered = ots.filter(x => (x.bus || '').toLowerCase().includes(filter));

  filtered.sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return sortDesc ? timeB - timeA : timeA - timeB;
  });

  if (!filtered.length) {
    list.innerHTML = `<li style="text-align:center; color:var(--text-muted);">Sin registros.</li>`;
    return;
  }

  const canEdit = me.canEdit || me.isAdmin;
  const canDelete = me.canDelete || me.isAdmin;

  list.innerHTML = filtered.map(x => {
    const extrasHTML = Object.entries(x.extras || {})
      .map(([k, v]) => `<div class="object-prop"><strong>${k}:</strong> ${v}</div>`).join('');

    let editBtnHTML = '';
    if (canEdit) {
      editBtnHTML = `<button type="button" class="btn btn-warning" onclick="editOT('${x.id}')">✏️ Editar</button>`;
    } else {
      editBtnHTML = me.requestEdit 
        ? `<span style="font-size:0.75rem; color:var(--warning); align-self:center;">⏳ Solicitud enviada</span>`
        : `<button type="button" class="btn btn-secondary" style="font-size:0.75rem;" onclick="requestEditPermission()">🔒 Solicitar Edición</button>`;
    }

    const creatorLabel = me.isAdmin && x.createdUser 
      ? `<div class="object-prop" style="color: var(--primary);"><strong>Creado por:</strong> ${x.createdUser}</div>` 
      : '';

    return `
      <li class="object-item">
        <div class="object-header">
          <span class="object-title">OT: ${x.ot || 'N/A'}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${x.fecha}</span>
        </div>
        ${creatorLabel}
        <div class="object-prop"><strong>Bus:</strong> ${x.bus || 'N/A'}</div>
        <div class="object-prop"><strong>Kilometraje:</strong> ${x.km || 'N/A'}</div>
        <div class="object-prop"><strong>Detalle:</strong>\n${x.detalle || 'N/A'}</div>
        ${extrasHTML}
        <div class="object-actions">
          ${editBtnHTML}
          ${canDelete ? `<button type="button" class="btn btn-danger" onclick="deleteOT('${x.id}')">🗑️ Borrar</button>` : ''}
        </div>
      </li>
    `;
  }).join('');
}

function editOT(id) {
  const target = globalOTs[id];
  if (!target) return;

  editingId = id;
  document.getElementById('formTitle').textContent = `Editando OT: ${target.ot}`;
  document.getElementById('otNumber').value = target.ot || '';
  document.getElementById('busNumber').value = target.bus || '';
  document.getElementById('kilometraje').value = target.km || '';
  document.getElementById('detalle').value = target.detalle || '';

  const dyn = document.getElementById('dynamicContainer');
  dyn.innerHTML = '';
  Object.entries(target.extras || {}).forEach(([k, v]) => addExtraField(k, v));

  document.getElementById('saveBtn').textContent = 'Actualizar OT';
  document.getElementById('cancelBtn').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteOT(id) {
  if (confirm('¿Desea eliminar esta OT?')) {
    db.ref('ots/' + id).remove();
  }
}

function exportBackup() {
  const ots = Object.values(globalOTs);
  const jsonStr = JSON.stringify(ots, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `BACKUP_OTS_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      const otsToImport = Array.isArray(data) ? data : (data.ots || null);

      if (otsToImport && confirm('¿Deseas restaurar esta copia de seguridad? Se actualizarán los registros en Firebase.')) {
        otsToImport.forEach(item => {
          const id = item.id || ('ID_' + Date.now() + Math.random().toString(36).substr(2, 5));
          db.ref('ots/' + id).set({ ...item, id });
        });
        alert('¡Registros restaurados con éxito en la nube!');
      }
    } catch (err) {
      alert('Error al leer el archivo de respaldo.');
    }
  };
  reader.readAsText(file);
}

function exportToExcel() {
  let ots = Object.values(globalOTs);
  if (!ots.length) { alert('No hay registros guardados.'); return; }

  let csvContent = "\uFEFFN° OT;Bus;Kilometraje;Detalle;Fecha;Creado Por;Campos Extras\n";

  ots.forEach(item => {
    let extrasStr = Object.entries(item.extras || {})
      .map(([k, v]) => `${k}: ${v}`).join(' | ');

    let row = [
      `"${item.ot || ''}"`,
      `"${item.bus || ''}"`,
      `"${item.km || ''}"`,
      `"${(item.detalle || '').replace(/"/g, '""')}"`,
      `"${item.fecha || ''}"`,
      `"${item.createdUser || ''}"`,
      `"${extrasStr.replace(/"/g, '""')}"`
    ];
    csvContent += row.join(';') + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Registros_OT_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAuditLogs(format) {
  const logs = Object.values(globalLogs);
  if (!logs.length) { alert('No hay historial de ediciones para exportar.'); return; }

  if (format === 'json') {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HISTORIAL_AUDITORIA_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === 'csv') {
    let csvContent = "\uFEFFUsuario;Fecha y Hora;N° OT;Cambios Realizados\n";
    logs.forEach(l => {
      let row = [
        `"${l.user || ''}"`,
        `"${l.timestamp || ''}"`,
        `"${l.otNumber || ''}"`,
        `"${(l.changes || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(';') + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HISTORIAL_AUDITORIA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.onload = init;
