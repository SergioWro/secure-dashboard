import Database from 'better-sqlite3';
const db = new Database('app.db');
console.log('db.js v2 loaded');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT,
    role TEXT NOT NULL CHECK (role IN ('user','admin')),
    allowedSections TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    credId TEXT UNIQUE NOT NULL,
    publicKey TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

export const insertUser = db.prepare(
  'INSERT INTO users (username, passwordHash, role, allowedSections) VALUES (@username, @passwordHash, @role, @allowedSections)'
);
export const getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ?');
export const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
export const updateUserPassword = db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?');

export const listUsers = db.prepare(
  'SELECT id, username, role, allowedSections FROM users WHERE role = ?'
);

export const updateAllowed = db.prepare('UPDATE users SET allowedSections = ? WHERE id = ?');

export const insertCredential = db.prepare('INSERT INTO credentials (userId, credId, publicKey, counter, transports) VALUES (?,?,?,?,?)');
export const getCredsForUser = db.prepare('SELECT * FROM credentials WHERE userId = ?');
export const getCredById = db.prepare('SELECT * FROM credentials WHERE credId = ?');
export const updateCounter = db.prepare('UPDATE credentials SET counter = ? WHERE id = ?');

export default db;
