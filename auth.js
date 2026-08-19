// Manejo de Estado de Usuarios
export function getUsers() {
  let users = JSON.parse(localStorage.getItem('sys_users')) || [];
  if (!users.length) {
    users = [{ username: 'admin', password: 'admin', isAdmin: true, status: 'active', canEdit: true, canDelete: true, requestEdit: false }];
    localStorage.setItem('sys_users', JSON.stringify(users));
  }
  return users;
}

export function getActiveUser() {
  try {
    return JSON.parse(localStorage.getItem('sys_session')) || null;
  } catch (e) {
    return null;
  }
}

export function validatePasswordStrength(pass) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

export function registerUser(username, password) {
  const users = getUsers();
  const u = username.trim().toLowerCase();

  if (users.some(x => x.username === u)) {
    throw new Error('El usuario ya existe.');
  }
  if (!validatePasswordStrength(password)) {
    throw new Error('La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.');
  }

  const newUser = { 
    username: u, 
    password, 
    isAdmin: false, 
    status: 'active', 
    canEdit: false, 
    canDelete: false, 
    requestEdit: false 
  };

  users.push(newUser);
  localStorage.setItem('sys_users', JSON.stringify(users));
  localStorage.setItem('sys_session', JSON.stringify(newUser));
  return newUser;
}

export function loginUser(username, password) {
  const users = getUsers();
  const u = username.trim().toLowerCase();
  const found = users.find(x => x.username === u && x.password === password);

  if (!found) throw new Error('Usuario o contraseña incorrectos.');
  if (found.status === 'blocked') throw new Error('El usuario se encuentra bloqueado.');

  localStorage.setItem('sys_session', JSON.stringify(found));
  return found;
}

export function logoutUser() {
  localStorage.removeItem('sys_session');
}
