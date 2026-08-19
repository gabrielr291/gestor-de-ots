import { login, logout, getActiveUser } from './auth.js';
import { initAdminUI } from './admin.js';
import { initOTsUI } from './ots.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Manejo del Login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userVal = document.getElementById('loginUsername').value;
      const passVal = document.getElementById('loginPassword').value;
      
      await login(userVal, passVal);
    });
  }

  // 2. Manejo del Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', logout);
  }

  // 3. Inicializar los módulos de Admin y OTs
  initAdminUI();
  initOTsUI();
});

