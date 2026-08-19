// Esperar a que Firebase esté disponible
function getDb() {
  if (!window.db) {
    throw new Error('Firebase no está inicializado en index.html');
  }
  return window.db;
}

// Obtener usuarios desde Firebase
export async function getUsers() {
  try {
    const db = getDb();
    const snapshot = await db.ref('users').once('value');
    const data = snapshot.val();
    
    if (!data) {
      const defaultAdmin = {
        username: 'admin',
        password: '123',
        isAdmin: true,
        status: 'active',
        canEdit: true,
        canDelete: true
      };
      await db.ref('users/admin').set(defaultAdmin);
      return [defaultAdmin];
    }
    return Object.values(data);
  } catch (error) {
    console.error('Error al conectar con Firebase:', error);
    alert('Error de conexión con la base de datos: ' + error.message);
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
  try {
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
    alert('¡Inicio de sesión exitoso!');
    return true;
  } catch (error) {
    alert('Error al iniciar sesión: ' + error.message);
    return false;
  }
}

export function logout() {
  sessionStorage.removeItem('activeUser');
  location.reload();
}
