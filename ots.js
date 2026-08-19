export function getOTsForUser(currentUser, isAdmin) {
  const ots = JSON.parse(localStorage.getItem('sys_ots')) || [];
  if (isAdmin) return ots;
  return ots.filter(ot => ot.createdUser === currentUser);
}
