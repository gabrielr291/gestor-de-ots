import { login, logout } from './auth.js';
import { initAdminUI } from './admin.js';
import { initOTsUI } from './ots.js';

// 1. Delegación de eventos para capturar el ENVÍO del formulario
document.addEventListener('submit', async (e) => {
  // Capturar cualquier formulario enviado en la página
  e.preventDefault();

  const userEl = document.getElementById('loginUsername') || document.querySelector('input[type="text"]');
  const passEl = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');

  if (!userEl || !passEl) {
    alert('⚠️ No se encontraron los campos de usuario/contraseña en la pantalla.');
    return;
  }

  const userVal = userEl.value.trim();
  const passVal = passEl.value.trim();

  if (!userVal || !passVal) {
    alert('Por favor, ingresa tu usuario y contraseña.');
    return;
  }

  if (!window.db) {
    alert('⚠️ Firebase no se ha inicializado correctamente. Revisa tu index.html.');
    return;
  }

  // Intentar iniciar sesión
  await login(userVal, passVal);
});

// 2. Delegación de eventos para CLICS (por si el botón es tipo "button" en lugar de "submit")
document.addEventListener('click', async (e) => {
  const target = e.target;

  // Botón de Logout
  if (target && target.id === 'btnLogout') {
    logout();
    return;
  }

  // Botón de Login (si está fuera de un form)
  if (target && (target.id === 'btnLogin' || target.getAttribute('type') === 'submit')) {
    const form = target.closest('form');
    if (!form) {
      // Si el botón no pertenece a un <form>, disparamos la lógica manualmente
      const userEl = document.getElementById('loginUsername') || document.querySelector('input[type="text"]');
      const passEl = document.getElementById('loginPassword') || document.querySelector('input[type="password"]');

      if (userEl && passEl) {
        const userVal = userEl.value.trim();
        const passVal = passEl.value.trim();
        if (!userVal || !passVal) {
          alert('Por favor, ingresa tu usuario y contraseña.');
          return;
        }
        await login(userVal, passVal);
      }
    }
  }
});

// 3. Inicializar módulos UI al cargar la estructura
document.addEventListener('DOMContentLoaded', () => {
  initAdminUI();
  initOTsUI();
});
