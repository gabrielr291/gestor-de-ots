import { login, logout } from './auth.js';
import { initAdminUI } from './admin.js';
import { initOTsUI } from './ots.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('App cargada correctamente.');

  // Buscar elementos de login en el HTML
  const loginForm = document.getElementById('loginForm');
  const btnLogin = document.getElementById('btnLogin') || document.querySelector('#loginForm button[type="submit"]');

  // Función principal para procesar el Login
  async function handleLogin(e) {
    if (e) e.preventDefault();

    // Intentar obtener los inputs
    const userEl = document.getElementById('loginUsername') || document.querySelector('input[type="text"]');
    const passEl = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');

    if (!userEl || !passEl) {
      alert('Error: No se encontraron los campos de texto para usuario o contraseña en el HTML.');
      return;
    }

    const userVal = userEl.value.trim();
    const passVal = passEl.value.trim();

    if (!userVal || !passVal) {
      alert('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    // Verificar conexion a Firebase
    if (!window.db) {
      alert('Error: Firebase no se ha cargado correctamente en index.html.');
      return;
    }

    // Ejecutar login
    await login(userVal, passVal);
  }

  // Asignar eventos tanto al Formulario como al Botón
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (btnLogin) {
    btnLogin.addEventListener('click', (e) => {
      // Si el botón no está dentro de un form con submit
      if (!loginForm) handleLogin(e);
    });
  }

  // Manejo del Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // Inicializar UI de Admin y OTs
  initAdminUI();
  initOTsUI();
});
