export function getUsers() {
  let users = JSON.parse(localStorage.getItem('sys_users'));
  if (!users || !users.length) {
    users = [{ username: 'admin', password: 'admin', isAdmin: true, status: 'active', canEdit: true, canDelete: true, requestEdit: false }];
    localStorage.setItem('sys_users', JSON.stringify(users));
  }
  return users;
}

export function getActiveUser() {
  try { return JSON.parse(localStorage.getItem('sys_session')); } catch(e) { return null; }
}

export function checkPass(pass) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

export function checkStrength(pass, barId, textId, boxId) {
  const box = document.getElementById(boxId);
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);

  if (!pass) { if (box) box.style.display = 'none'; return; }
  if (box) box.style.display = 'block';

  let score = 0;
  if (pass.length >= 8) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/\d/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;

  if (score <= 2) {
    if (bar) { bar.style.width = '33%'; bar.style.backgroundColor = 'var(--danger)'; }
    if (text) { text.style.color = 'var(--danger)'; text.textContent = 'Fortaleza: Débil'; }
  } else if (score <= 4) {
    if (bar) { bar.style.width = '66%'; bar.style.backgroundColor = 'var(--warning)'; }
    if (text) { text.style.color = 'var(--warning)'; text.textContent = 'Fortaleza: Media'; }
  } else {
    if (bar) { bar.style.width = '100%'; bar.style.backgroundColor = 'var(--success)'; }
    if (text) { text.style.color = 'var(--success)'; text.textContent = 'Fortaleza: Excelente'; }
  }
}

let isRegistering = false;

export function initAuthUI() {
  const loginPass = document.getElementById('loginPass');
  const changePass = document.getElementById('changePass');
  const newUserPass = document.getElementById('newUserPass');

  if (loginPass) loginPass.addEventListener('input', e => checkStrength(e.target.value, 'loginMeterBar', 'loginMeterText', 'loginMeterBox'));
  if (changePass) changePass.addEventListener('input', e => checkStrength(e.target.value, 'changeMeterBar', 'changeMeterText', 'changeMeterBox'));
  if (newUserPass) newUserPass.addEventListener('input', e => checkStrength(e.target.value, 'adminMeterBar', 'adminMeterText', 'adminMeterBox'));

  const toggleRegister = document.getElementById('toggleRegister');
  if (toggleRegister) {
    toggleRegister.addEventListener('click', () => {
      isRegistering = !isRegistering;
      document.getElementById('loginTitle').textContent = isRegistering ? 'Crear Usuario' : 'Iniciar Sesión';
      document.getElementById('loginBtn').textContent = isRegistering ? 'Registrar' : 'Ingresar';
      toggleRegister.textContent = isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes usuario? Crea uno nuevo';
      document.getElementById('confirmPassGroup').style.display = isRegistering ? 'block' : 'none';
    });
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', doAuth);

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) logout();

  const btnUpdatePass = document.getElementById('btnUpdatePass');
  if (btnUpdatePass) btnUpdatePass.addEventListener('click', updatePassword);

  const activeUser = getActiveUser();
  if (activeUser) {
    showApp(activeUser);
  } else {
    showLogin();
  }
}

function doAuth() {
  const u = document.getElementById('loginUser').value.trim().toLowerCase();
  const p = document.getElementById('loginPass').value.trim();
  const alertBox = document.getElementById('loginAlert');

  if (!u || !p) { alertBox.textContent = 'Escribe usuario y contraseña.'; alertBox.style.display = 'block'; return; }

  let users = getUsers();

  if (isRegistering) {
    const pConfirm = document.getElementById('loginPassConfirm').value.trim();
    if (users.some(x => x.username === u)) { alertBox.textContent = 'El usuario ya existe.'; alertBox.style.display = 'block'; return; }
    if (p !== pConfirm) { alertBox.textContent = 'Las contraseñas no coinciden.'; alertBox.style.display = 'block'; return; }
    if (!checkPass(p)) { alertBox.textContent = 'Contraseña débil. Requiere 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.'; alertBox.style.display = 'block'; return; }

    const newUser = { username: u, password: p, isAdmin: false, status: 'active', canEdit: false, canDelete: false, requestEdit: false };
    users.push(newUser);
    localStorage.setItem('sys_users', JSON.stringify(users));
    localStorage.setItem('sys_session', JSON.stringify(newUser));
    showApp(newUser);
  } else {
    const found = users.find(x => x.username === u && x.password === p);
    if (!found) { alertBox.textContent = 'Usuario o contraseña incorrectos.'; alertBox.style.display = 'block'; return; }
    if (found.status === 'blocked') { alertBox.textContent = 'Usuario bloqueado.'; alertBox.style.display = 'block'; return; }

    localStorage.setItem('sys_session', JSON.stringify(found));
    showApp(found);
  }
}

function updatePassword() {
  const oldP = document.getElementById('oldPass').value.trim();
  const newP = document.getElementById('changePass').value.trim();
  const newPConfirm = document.getElementById('changePassConfirm').value.trim();
  const activeUser = getActiveUser();

  let users = getUsers();
  let target = users.find(u => u.username === activeUser.username);

  if (!target || target.password !== oldP) { alert('Contraseña actual incorrecta.'); return; }
  if (newP !== newPConfirm) { alert('Las contraseñas no coinciden.'); return; }
  if (!checkPass(newP)) { alert('Contraseña débil.'); return; }

  target.password = newP;
  localStorage.setItem('sys_users', JSON.stringify(users));
  localStorage.setItem('sys_session', JSON.stringify(target));
  alert('Contraseña actualizada con éxito.');
}

export function showLogin() {
  document.getElementById('viewLogin').style.display = 'block';
  document.getElementById('viewApp').style.display = 'none';
}

export function showApp(user) {
  document.getElementById('viewLogin').style.display = 'none';
  document.getElementById('viewApp').style.display = 'block';
  document.getElementById('currentUserLabel').textContent = user.username;
  document.getElementById('profileUsername').textContent = user.username;
  window.dispatchEvent(new Event('appLoaded'));
}

export function logout() {
  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.onclick = () => {
      localStorage.removeItem('sys_session');
      showLogin();
    };
  }
}
  
