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

// Sanitización para prevenir XSS
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
      alert('Tu usuario está bloqueado.');
      logout();
      return;
    }

    showApp();

    // Si es administrador, suscribir a datos sensibles
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
}

async function doAuth() {
  document.getElementById('loginAlert').style.display = 'none';
  const emailInput = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();

  if (!emailInput || !p) { showAlert('Escribe correo y contraseña.'); return; }

  // Formatear alias simple a email si no tiene arroba
  const email = emailInput.includes('@') ? emailInput : `${emailInput}@gestorots.local`;

  try {
    if (isRegistering) {
      const pConfirm = document.getElementById('loginPassConfirm').value.trim();
      if (p !== pConfirm) { showAlert('Las contraseñas no coinciden.'); return; }
      if (!checkPass(p)) { showAlert('Contraseña débil. Requiere 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'); return; }

      const cred = await auth.createUserWithEmailAndPassword(email, p);
      
      // Crear perfil público en base de datos
      await db.ref(`users/${cred.user.uid}`).set({
        uid: cred.user.uid,
        username: emailInput.split('@')[0],
        email: email,
        isAdmin: false,
        status: 'active',
        canEdit: false,
        canDelete: false,
        requestEdit: false
      });
    } else {
      await auth.signInWithEmailAndPassword(email, p);
    }
  } catch (err) {
    showAlert(err.message || 'Error de autenticación.');
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
    const oldRecord = globalOTs[editingId];
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
  const filter = document.getElementById('searchBus').value.trim().toLowerCase();
  const list = document.getElementById('otList');

  if (!currentUserProfile.isAdmin) {
    ots = ots.filter(x => x.createdUid === activeUser.uid);
  }

  let filtered = ots.filter(x => (x.bus || '').toLowerCase().includes(filter));

  filtered.sort((a, b) => sortDesc ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));

  if (!filtered.length) {
    list.innerHTML = `<li style="text-align:center; color:var(--text-muted);">Sin registros.</li>`;
    return;
  }

  const canEdit = currentUserProfile.canEdit || currentUserProfile.isAdmin;
  const canDelete = currentUserProfile.canDelete || currentUserProfile.isAdmin;

  list.innerHTML = filtered.map(x => `
    <li class="object-item">
      <div class="object-header">
        <span class="object-title">OT: ${escapeHTML(x.ot || 'N/A')}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(x.fecha)}</span>
      </div>
      <div class="object-prop"><strong>Bus:</strong> ${escapeHTML(x.bus || 'N/A')}</div>
      <div class="object-prop"><strong>Kilometraje:</strong> ${escapeHTML(x.km || 'N/A')}</div>
      <div class="object-prop"><strong>Detalle:</strong>\n${escapeHTML(x.detalle || 'N/A')}</div>
      <div class="object-actions">
        ${canEdit ? `<button type="button" class="btn btn-warning" onclick="editOT('${x.id}')">✏️ Editar</button>` : ''}
        ${canDelete ? `<button type="button" class="btn btn-danger" onclick="deleteOT('${x.id}')">🗑️ Borrar</button>` : ''}
      </div>
    </li>
  `).join('');
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

window.onload = init;