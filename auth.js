export function getUsers() {
  const data = localStorage.getItem('sys_users');
  return data ? JSON.parse(data) : [];
}

export function getActiveUser() {
  const session = localStorage.getItem('sys_session');
  return session ? JSON.parse(session) : { username: 'invitado', isAdmin: false };
}
