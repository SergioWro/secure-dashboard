import bcrypt from 'bcryptjs';
import { insertUser, getUserByUsername, listUsers, updateAllowed } from './db.js';

export async function bootstrapAdmin() {
  const adminUsername = 'admin';
  try {
    const existing = getUserByUsername.get(adminUsername);
    if (!existing) {
      insertUser.run({ username: adminUsername, passwordHash: null, role: 'admin', allowedSections: '[]' });
      console.log('Admin created: "admin". Enroll a passkey at /login (Sign in with fingerprint)');
    } else {
      console.log('Admin already exists.');
    }
  } catch (e) {
    console.error(e);
  }
}

export async function registerUser({ username, password, sections = [] }) {
  if (!username || !password) throw new Error('username and password required');
  const passwordHash = await bcrypt.hash(password, 12);
  insertUser.run({ username, passwordHash, role: 'user', allowedSections: JSON.stringify(sections) });
}

export async function verifyPassword(username, password) {
  const user = getUserByUsername.get(username);
  if (!user || user.role !== 'user' || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export function setUserSections(userId, sections) {
  updateAllowed.run(JSON.stringify(sections || []), userId);
}

// ✅ pass the role to the parameterized query
export function listRegularUsers() {
  return listUsers.all('user');
}
