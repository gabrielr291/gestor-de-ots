export function getOTsForUser(currentUser, isAdmin) {
  const allOTs = JSON.parse(localStorage.getItem('sys_ots')) || [];
  
  // Regla de privacidad: Solo admin ve todas las OTs
  if (isAdmin) {
    return allOTs;
  }
  return allOTs.filter(ot => ot.createdUser === currentUser);
}

export function saveOTRecord(otData, currentUser) {
  const ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  
  if (otData.id) {
    const idx = ots.findIndex(x => x.id === otData.id);
    if (idx !== -1) {
      ots[idx] = { ...ots[idx], ...otData };
    }
  } else {
    ots.unshift({
      id: 'ID_' + Date.now(),
      ...otData,
      timestamp: Date.now(),
      createdUser: currentUser
    });
  }

  localStorage.setItem('sys_ots', JSON.stringify(ots));
}
