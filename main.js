import { login, logout } from './auth.js';
import { initAdminUI } from './admin.js';
import { initOTsUI } from './ots.js';

document.addEventListener('DOMContentLoaded', () => {
  // Manejo del Formulario de Login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userVal = document.getElementById('loginUsername').value.trim();
      const passVal = document.getElementById('loginPassword').value.trim();
      
      // Validación de campos vacíos
      if (!userVal || !passVal) {
        alert('Por favor, ingresa tu usuario y contraseña.');
        return;
      }
      
      await login(userVal, passVal);
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
