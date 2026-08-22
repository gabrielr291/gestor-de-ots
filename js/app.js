// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCcljiWo9h5nqIgaGvktP6EIQ325Qgn0s8",
  authDomain: "gestorots-58168.firebaseapp.com",
  databaseURL: "https://gestorots-58168-default-rtdb.firebaseio.com",
  projectId: "gestorots-58168",
  storageBucket: "gestorots-58168.firebasestorage.app",
  messagingSenderId: "382994854791",
  appId: "1:382994854791:web:34d6d9fef8d597e49e5922"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let editingId = null;
let activeUser = null;
let currentUserProfile = null;
let isRegistering = false;
let sortDesc = true;

let globalUsers = {};
let globalOTs = {};
let globalLogs = {};

// Sanitización para prevenir ataques XSS
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function init() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      activeUser = user;
      syncUserProfile(user.uid);
    } else {
      activeUser = null;
      currentUserProfile = null;
      showLogin();
    }
  });
}

function syncUserProfile(uid) {
  db.ref(`users/${uid}`).on('value', (snapshot) => {
    currentUserProfile = snapshot.val();
    if (!currentUserProfile) return;

    if (currentUserProfile.status === 'blocked') {
      alert('Tu cuenta está bloqueada.');
      logout();
      return;
    }

    showApp();

    if (currentUserProfile.isAdmin) {
      subscribeAdminData();
    }
    
    subscribeOTs();
  });
}

function subscribeAdminData() {
  db.ref('users').on('value', (snapshot) => {
    globalUsers = snapshot.val() || {};
    renderUsersTable();
  });

  db.ref('audit_logs').on('value', (snapshot) => {
    globalLogs = snapshot.val() || {};
    renderAuditLogs();
  });
}

function subscribeOTs() {
  db.ref('ots').on('value', (snapshot) => {
    globalOTs = snapshot.val() || {};
    renderOTs();
  });
}

function checkPass(pass) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

function checkStrength(val, barId, textId, boxId) {
  const box = document.getElementById(boxId);
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);
  if (!box || !bar || !text) return;

  if (!val) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[a-z]/.test(val)) score++;
  if (/\d/.test(val)) score++;

  if (score <= 2) {
    bar.style.width = '33%';
    bar.style.background = '#ef4444';
    text.textContent = 'Débil';
  } else if (score === 3) {
    bar.style.width = '66%';
    bar.style.background = '#f59e0b';
    text.textContent = 'Media';
  } else {
    bar.style.width = '100%';
    bar.style.background = '#10b981';
    text.textContent = 'Fuerte';
  }
}

function toggleAuthMode() {
  const alertBox = document.getElementById('loginAlert');
  if (alertBox) alertBox.style.display = 'none';
  
  isRegistering = !isRegistering;
  document.getElementById('loginTitle').textContent = isRegistering ? 'Crear Usuario' : 'Iniciar Sesión';
  document.getElementById('loginBtn').textContent = isRegistering ? 'Registrar' : 'Ingresar';
  document.getElementById('toggleRegister').textContent = isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes usuario? Crea uno nuevo';
  document.getElementById('confirmPassGroup').style.display = isRegistering ? 'block' : 'none';
}

async function doAuth() {
  const alertBox = document.getElementById('loginAlert');
  if (alertBox) alertBox.style.display = 'none';

  const emailInput = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();

  if (!emailInput || !p) { 
    alert('Ingresa usuario y contraseña.'); 
    return; 
  }

  const email = emailInput.includes('@') ? emailInput : `${emailInput}@gestorots.local`;

  if (isRegistering) {
    const pConfirm = document.getElementById('loginPassConfirm').value.trim();
    if (p !== pConfirm) { 
      alert('Las contraseñas no coinciden.'); 
      return; 
    }
    if (!checkPass(p)) { 
      alert('Contraseña débil. Debe contener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'); 
      return; 
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, p);
      
      await db.ref(`users/${cred.user.uid}`).set({
        uid: cred.user.uid,
        username: emailInput.split('@')[0],
        email: email,
        isAdmin: true, 
        status: 'active',
        canEdit: true,
        canDelete: true,
        requestEdit: false
      });

      alert('¡Usuario registrado correctamente!');
    } catch (err) {
      console.error(err);
      alert(`Error en registro: ${err.message}`);
    }
  } else {
    try {
      await auth.signInWithEmailAndPassword(email, p);
    } catch (err) {
      console.error(err);
      alert(`Error al iniciar sesión: ${err.message}`);
    }
  }
}

function logout() {
  auth.signOut().then(() => showLogin());
}

function showLogin() {
  document.getElementById('viewLogin').style.display = 'block';
  document.getElementById('viewApp').style.display = 'none';
}

function showApp() {
  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewApp').style.display = 'block';
  document.getElementById('currentUserLabel').textContent = currentUserProfile.username;
  document.getElementById('profileUsername').textContent = currentUserProfile.username;

  if (currentUserProfile.isAdmin) {
    document.getElementById('adminSection').style.display = 'block';
  } else {
    document.getElementById('adminSection').style.display = 'none';
  }
  renderOTs();
}

function toggleSection(id, btn) {
  const body = document.getElementById(id);
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (btn) btn.textContent = isHidden ? '🔼 Ocultar' : '🔽 Mostrar';
}

// CAMBIO DE CONTRASEÑA
async function updatePassword() {
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('changePass').value;
  const newPassConfirm = document.getElementById('changePassConfirm').value;

  if (!oldPass || !newPass || !newPassConfirm) {
    alert('Completa todos los campos para cambiar la contraseña.');
    return;
  }
  if (newPass !== newPassConfirm) {
    alert('La nueva contraseña y su confirmación no coinciden.');
    return;
  }
  if (!checkPass(newPass)) {
    alert('La nueva contraseña no cumple con los requisitos de seguridad.');
    return;
  }

  try {
    const cred = firebase.auth.EmailAuthProvider.credential(activeUser.email, oldPass);
    await activeUser.reauthenticateWithCredential(cred);
    await activeUser.updatePassword(newPass);
    
    alert('¡Contraseña actualizada con éxito!');
    document.getElementById('oldPass').value = '';
    document.getElementById('changePass').value = '';
    document.getElementById('changePassConfirm').value = '';
  } catch (err) {
    alert('Error al actualizar contraseña: ' + err.message);
  }
}

// GESTIÓN Y AUDITORÍA DE USUARIOS (ADMIN)
function renderUsersTable() {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;

  const users = Object.values(globalUsers);
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escapeHTML(u.username)} ${u.isAdmin ? '<b>(Admin)</b>' : ''}</td>
      <td><span style="color:${u.status === 'blocked' ? 'red' : 'green'}">${escapeHTML(u.status)}</span></td>
      <td>
        <input type="checkbox" ${u.canEdit ? 'checked' : ''} onchange="toggleUserPerm('${u.uid}', 'canEdit', this.checked)" ${u.isAdmin ? 'disabled' : ''} />
      </td>
      <td>
        <input type="checkbox" ${u.canDelete ? 'checked' : ''} onchange="toggleUserPerm('${u.uid}', 'canDelete', this.checked)" ${u.isAdmin ? 'disabled' : ''} />
      </td>
      <td>
        ${!u.isAdmin ? `
          <button class="btn btn-secondary" onclick="toggleUserStatus('${u.uid}', '${u.status}')">
            ${u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
          </button>
        ` : 'N/A'}
      </td>
    </tr>
  `).join('');
}

function toggleUserPerm(uid, field, val) {
  db.ref(`users/${uid}/${field}`).set(val);
}

function toggleUserStatus(uid, currentStatus) {
  const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
  db.ref(`users/${uid}/status`).set(newStatus);
}

function renderAuditLogs() {
  const list = document.getElementById('auditLogsList');
  if (!list) return;

  const logs = Object.values(globalLogs).reverse();
  if (!logs.length) {
    list.innerHTML = `<li style="color:var(--text-muted); font-size:0.8rem;">No hay ediciones registradas.</li>`;
    return;
  }

  list.innerHTML = logs.map(l => `
    <li style="font-size:0.8rem; margin-bottom:0.4rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.2rem;">
      <b>${escapeHTML(l.user)}</b> [${escapeHTML(l.timestamp)}]: OT ${escapeHTML(l.otNumber)} - <i>${escapeHTML(l.changes)}</i>
    </li>
  `).join('');
}

// REGISTRO Y EDICIÓN DE OT
function addExtraField() {
  const container = document.getElementById('dynamicContainer');
  const div = document.createElement('div');
  div.className = 'dynamic-field';
  div.style.cssText = 'display:flex; gap:0.5rem; margin-top:0.4rem;';
  div.innerHTML = `
    <input type="text" class="extra-key" placeholder="Nombre (Ej: Técnico)" style="flex:1;" />
    <input type="text" class="extra-val" placeholder="Valor (Ej: Juan Pérez)" style="flex:1;" />
    <button type="button" class="btn btn-danger" style="width:auto;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(div);
}

function saveOT(e) {
  e.preventDefault();

  if (editingId && !currentUserProfile.canEdit && !currentUserProfile.isAdmin) {
    alert('No tienes permiso de edición.');
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
    const oldRecord = globalOTs[editingId] || {};
    let changes = [];
    if (oldRecord.ot !== otVal) changes.push(`OT: "${oldRecord.ot}" ➔ "${otVal}"`);
    if (oldRecord.bus !== busVal) changes.push(`Bus: "${oldRecord.bus}" ➔ "${busVal}"`);

    db.ref('audit_logs').push({
      user: currentUserProfile.username,
      timestamp: now.toLocaleString('es-ES'),
      otNumber: oldRecord.ot || 'S/N',
      changes: changes.length > 0 ? changes.join(' | ') : 'Modificación en campos'
    });

    db.ref('ots/' + editingId).update({
      ot: otVal, bus: busVal, km: kmVal, detalle: detVal, extras
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
      createdUid: activeUser.uid,
      createdUser: currentUserProfile.username
    });
  }

  resetForm();
}

function renderOTs() {
  if (!currentUserProfile) return;

  let ots = Object.values(globalOTs);
  const filterInput = document.getElementById('searchBus');
  const filter = filterInput ? filterInput.value.trim().toLowerCase() : '';
  const list = document.getElementById('otList');

  if (!list) return;

  if (!currentUserProfile.isAdmin) {
    ots = ots.filter(x => x.createdUid === activeUser.uid);
  }

  let filtered = ots.filter(x => (x.bus || '').toLowerCase().includes(filter));
  filtered.sort((a, b) => sortDesc ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));

  if (!filtered.length) {
    list.innerHTML = `<li style="text-align:center; color:var(--text-muted); padding:1rem;">Sin registros guardados.</li>`;
    return;
  }

  const canEdit = currentUserProfile.canEdit || currentUserProfile.isAdmin;
  const canDelete = currentUserProfile.canDelete || currentUserProfile.isAdmin;

  list.innerHTML = filtered.map(x => {
    let extrasHtml = '';
    if (x.extras) {
      extrasHtml = Object.entries(x.extras)
        .map(([k, v]) => `<div class="object-prop"><strong>${escapeHTML(k)}:</strong> ${escapeHTML(v)}</div>`)
        .join('');
    }

    return `
      <li class="object-item">
        <div class="object-header">
          <span class="object-title">OT: ${escapeHTML(x.ot || 'N/A')}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(x.fecha)}</span>
        </div>
        <div class="object-prop"><strong>Bus:</strong> ${escapeHTML(x.bus || 'N/A')}</div>
        <div class="object-prop"><strong>Kilometraje:</strong> ${escapeHTML(x.km || 'N/A')}</div>
        <div class="object-prop"><strong>Detalle:</strong>\n${escapeHTML(x.detalle || 'N/A')}</div>
        ${extrasHtml}
        <div class="object-actions" style="margin-top:0.5rem;">
          ${canEdit ? `<button type="button" class="btn btn-warning" onclick="editOT('${x.id}')">✏️ Editar</button>` : ''}
          ${canDelete ? `<button type="button" class="btn btn-danger" onclick="deleteOT('${x.id}')">🗑️ Borrar</button>` : ''}
        </div>
      </li>
    `;
  }).join('');
}

function editOT(id) {
  const item = globalOTs[id];
  if (!item) return;

  editingId = id;
  document.getElementById('otNumber').value = item.ot || '';
  document.getElementById('busNumber').value = item.bus || '';
  document.getElementById('kilometraje').value = item.km || '';
  document.getElementById('detalle').value = item.detalle || '';

  const container = document.getElementById('dynamicContainer');
  container.innerHTML = '';
  if (item.extras) {
    Object.entries(item.extras).forEach(([k, v]) => {
      const div = document.createElement('div');
      div.className = 'dynamic-field';
      div.style.cssText = 'display:flex; gap:0.5rem; margin-top:0.4rem;';
      div.innerHTML = `
        <input type="text" class="extra-key" value="${escapeHTML(k)}" style="flex:1;" />
        <input type="text" class="extra-val" value="${escapeHTML(v)}" style="flex:1;" />
        <button type="button" class="btn btn-danger" style="width:auto;" onclick="this.parentElement.remove()">✕</button>
      `;
      container.appendChild(div);
    });
  }

  document.getElementById('formTitle').textContent = 'Editar OT';
  document.getElementById('saveBtn').textContent = 'Actualizar OT';
  document.getElementById('cancelBtn').style.display = 'inline-block';
}

function deleteOT(id) {
  if (confirm('¿Desea eliminar esta OT?')) {
    db.ref('ots/' + id).remove();
  }
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
  const btn = document.getElementById('sortBtn');
  if (btn) {
    btn.textContent = sortDesc ? '⬇️ Más recientes primero' : '⬆️ Más antiguos primero';
  }
  renderOTs();
}

// EXPORTACIÓN Y RESPALDO (JSON / EXCEL CSV)
function exportBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalOTs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `respaldo_ots_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      if (typeof importedData === 'object') {
        db.ref('ots').update(importedData, (err) => {
          if (err) alert('Error al cargar datos: ' + err.message);
          else alert('¡Respaldo importado con éxito!');
        });
      }
    } catch (err) {
      alert('El archivo no tiene un formato JSON válido.');
    }
  };
  reader.readAsText(file);
}

function exportToExcel() {
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "OT,Bus,Kilometraje,Fecha,Usuario,Detalle\n";

  Object.values(globalOTs).forEach(x => {
    const row = [
      `"${x.ot || ''}"`,
      `"${x.bus || ''}"`,
      `"${x.km || ''}"`,
      `"${x.fecha || ''}"`,
      `"${x.createdUser || ''}"`,
      `"${(x.detalle || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `reporte_ots_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function exportAuditLogs(type) {
  if (type === 'json') {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalLogs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `auditoria_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  } else if (type === 'csv') {
    let csv = "data:text/csv;charset=utf-8,\uFEFFUsuario,Fecha/Hora,OT,Cambios\n";
    Object.values(globalLogs).forEach(l => {
      csv += `"${l.user}","${l.timestamp}","${l.otNumber}","${(l.changes || '').replace(/"/g, '""')}"\n`;
    });
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }
}

window.onload = init;
