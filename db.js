const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./stinkvis.db');

// Maak tabellen voor gebruikers en friend requests
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT NOT NULL,
            to_user TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY(from_user) REFERENCES users(username),
            FOREIGN KEY(to_user) REFERENCES users(username)
        );
    `);
    db.run(`
     CREATE TABLE IF NOT EXISTS friends (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user1 TEXT NOT NULL,
      user2 TEXT NOT NULL
      );

    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT,
        recipient TEXT,
        message TEXT,
         timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

   
    `);
});

module.exports = db;
