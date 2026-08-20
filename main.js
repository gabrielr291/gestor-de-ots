import { getActiveUser } from './auth.js';
import { initOTsUI } from './ots.js';

// Función para cambiar la pantalla según si el usuario está logueado o no
function updateUIVisibility() {
  const user = getActiveUser();
  const loginCard = document.getElementById('loginCard');
  const otsSection = document.getElementById('otsSection');
  const adminSection = document.getElementById('adminSection');

  if (user) {
    // Si hay un usuario, ocultamos el login y mostramos el sistema
    if (loginCard) loginCard.style.display = 'none';
    if (otsSection) otsSection.style.display = 'block';
    
    // Si es admin, mostramos el panel de admin
    if (adminSection) {
      adminSection.style.display = user.isAdmin ? 'block' : 'none';
    }
  } else {
    // Si no hay usuario, mostramos el login y ocultamos el resto
    if (loginCard) loginCard.style.display = 'block';
    if (otsSection) otsSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
  }
}

// 1. Inicializar la UI cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initOTsUI();
  updateUIVisibility(); // Verifica si ya hay sesión al abrir
});

// 2. Escuchar el evento que emite tu archivo auth.js al loguearse
window.addEventListener('appLoaded', () => {
  updateUIVisibility();
});
