// Obtener usuarios desde Firebase en tiempo real
export async function getUsers() {
  try {
    const snapshot = await window.db.ref('users').once('value');
    const data = snapshot.val();
    if (!data) {
      // Si la base de datos está vacía, crea el usuario admin por defecto
      const defaultAdmin = [{
        username: 'admin',
        password: 'admin',
        isAdmin: true,
        status: 'active',
        canEdit: true,
        canDelete: true
      }];
      await window.db.ref('users/admin').set(defaultAdmin[0]);
      return defaultAdmin;
    }
    return Object.values(data);
  } catch (error) {
    console.error('Error al obtener usuarios de Firebase:', error);
    return [];
  }
}

export function getActiveUser() {
  return JSON.parse(sessionStorage.getItem('activeUser')) || null;
}

export function checkPass(pass) {
  return pass.length >= 3;
}

export async function login(username, password) {
  const users = await getUsers();
  const u = username.trim().toLowerCase();
  const user = users.find(x => x.username === u && x.password === password);

  if (!user) {
    alert('Usuario o contraseña incorrectos.');
    return false;
  }

  if (user.status === 'blocked') {
    alert('Este usuario está bloqueado.');
    return false;
  }

  sessionStorage.setItem('activeUser', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('appLoaded'));
  return true;
}

export function logout() {
  sessionStorage.removeItem('activeUser');
  location.reload();
}
