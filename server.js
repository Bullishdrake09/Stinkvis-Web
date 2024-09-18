const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./db'); // Verwijzing naar de database


const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(bodyParser.json()); // Voeg deze regel toe voor het parsen van JSON-data

// Voeg sessiemiddleware toe
app.use(session({
    secret: 'yefizuehiazjdhaziugdyezgfdsqjieuzaydiygfisqhbazezadsqzda', // Gebruik een sterke geheime sleutel
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Zet op true bij HTTPS
}));

// let users = []; // Simpele gebruikersopslag (later naar een database)
// let messages = {}; // Een eenvoudig object om berichten per gebruiker op te slaan



//Terugsturen wanneer niet ingelogd
function isAuthenticated(req, res, next) {
    if (req.session.username) {
        return next();
    } else {
        res.redirect('/login');
    }
}




// Routes
app.get('/friends', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'friends.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/app');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});


app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// registreren
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    // Controleer of de gebruiker al bestaat in de database
    db.get(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email], (err, user) => {
        if (err) {
            return res.send('Er is een fout opgetreden.');
        }

        if (user) {
            return res.send('Gebruiker bestaat al. <a href="/register">Probeer opnieuw</a>');
        } else {
            // Sla de nieuwe gebruiker op in de database
            db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, [username, email, password], (err) => {
                if (err) {
                    return res.send('Er is een fout opgetreden bij het registreren.');
                }
                req.session.username = username; // Sla de gebruikersnaam op in de sessie
                res.redirect(`/welcome?user=${username}`);
            });
        }
    });
});


// Inloggen
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Haal de gebruiker op uit de database
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (err) {
            return res.send('Er is een fout opgetreden.');
        }

        if (user) {
            req.session.username = username; // Sla de gebruikersnaam op in de sessie
            res.redirect(`/welcome?user=${username}`);
        } else {
            res.send('Ongeldige login. <a href="/login">Probeer opnieuw</a>');
        }
    });
});




//Sessie username zoeken --> Zelf toegevoegd
app.get('/get-session-username', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ error: 'Niet ingelogd' });
    }
});





// Welkom pagina
app.get('/welcome', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

// Route voor de app (chat) pagina
app.get('/app', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.post('/add-friend', (req, res) => {
    const { username } = req.body;
    const sender = req.session.username;
    console.log('Request body:', req.body); // Debugging

    if (!username || !sender) {
        return res.send('Je moet ingelogd zijn of een geldige gebruikersnaam opgeven.');
    }

    console.log(`Vriendschapsverzoek van: ${sender} naar: ${username}`); // Voeg debugging toe

    // Controleer of de ontvanger in de database bestaat
    db.get(`SELECT * FROM users WHERE LOWER(username) = ?`, [username.toLowerCase()], (err, user) => {
        if (err) {
            console.error('Fout bij het zoeken naar gebruiker:', err);
            alert('Er is een fout opgetreden.')
            return res.send('Er is een fout opgetreden.');
        }

        if (!user) {
            console.log('Gebruiker niet gevonden:', username);
            alert('Gebruiker niet gevonden')
            return res.send('Gebruiker niet gevonden.');
            
        }

        db.run(`INSERT INTO friend_requests (from_user, to_user, status) VALUES (?, ?, 'pending')`,
            [sender, username], (err) => {
                if (err) {
                    console.error('Fout bij het toevoegen van vriendschapsverzoek:', err);
                    return res.send('Er is een fout opgetreden bij het versturen van het vriendschapsverzoek.');
                }
                res.send('Vriendschapsverzoek verstuurd.');
                
            });
    });
});

//admin database beheer
// Middleware om alleen Bullishdrake09 toegang te geven
function isAdmin(req, res, next) {
    if (req.session.username === 'Bullishdrake09') {
        return next();
    } else {
        res.status(403).send('Toegang geweigerd');
    }
}

// Route voor de beheerpagina
app.get('/admin', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route om alle gebruikers op te halen
app.get('/admin/get-users', isAdmin, (req, res) => {
    db.all(`SELECT username, email FROM users`, (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Er is een fout opgetreden.' });
        }
        res.json(users);
    });
});

// Route om een gebruiker te verwijderen
app.post('/admin/delete-user', isAdmin, (req, res) => {
    const { username } = req.body;

    db.run(`DELETE FROM users WHERE username = ?`, [username], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Er is een fout opgetreden.' });
        }
        res.json({ success: true });
    });
});
app.get('/admin-users', (req, res) => {
    db.all(`SELECT id, username, email FROM users`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Stuur de lijst met gebruikers als JSON terug
    });
});

const adminPassword = 'Admin';
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === adminPassword) {
        req.session.isAdmin = true; // Zet admin sessie
        return res.status(200).json({ success: true });
    } else {
        return res.status(403).json({ error: 'Onjuist wachtwoord' });
    }
});

// Voeg beveiliging toe aan de admin route
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        res.sendFile(__dirname + '/admin.html');
    } else {
        res.redirect('/login'); // Redirect naar login als ze niet zijn ingelogd
    }
});






// Route om ontvangen verzoeken op te halen
app.get('/received-requests', (req, res) => {
    const username = req.session.username;

    db.all(`SELECT * FROM friend_requests WHERE to_user = ? AND status = 'pending'`, [username], (err, requests) => {
        if (err) {
            return res.send('Er is een fout opgetreden.');
        }
        res.json(requests);
    });
});

// Route om verzonden verzoeken op te halen
app.get('/sent-requests', (req, res) => {
    const username = req.session.username;

    db.all(`SELECT * FROM friend_requests WHERE from_user = ? AND status = 'pending'`, [username], (err, requests) => {
        if (err) {
            return res.send('Er is een fout opgetreden.');
        }
        res.json(requests);
    });
});

// Route om een vriendschapsverzoek te accepteren
app.post('/accept-friend', (req, res) => {
    const { from } = req.body;
    const to = req.session.username;

    db.get(`SELECT * FROM friend_requests WHERE from_user = ? AND to_user = ? AND status = 'pending'`,
        [from, to], (err, request) => {
            if (err) {
                return res.send('Er is een fout opgetreden.');
            }

            if (!request) {
                return res.send('Vriendschapsverzoek niet gevonden.');
            }

            db.run(`UPDATE friend_requests SET status = 'accepted' WHERE id = ?`, [request.id], (err) => {
                if (err) {
                    return res.send('Er is een fout opgetreden bij het accepteren van het verzoek.');
                }

                // Voeg de vriendschap toe aan de friends-tabel
                db.run(`INSERT INTO friends (user1, user2) VALUES (?, ?)`, [from, to], (err) => {
                    if (err) {
                        return res.send('Er is een fout opgetreden bij het toevoegen van de vriend.');
                    }
                    res.send('Vriendschapsverzoek geaccepteerd.');
                });
            });
        });
});


app.get('/friends-list', (req, res) => {
    const username = req.session.username;

    db.all(`SELECT user1 AS friend FROM friends WHERE user2 = ?
            UNION
            SELECT user2 AS friend FROM friends WHERE user1 = ?`, 
            [username, username], (err, friends) => {
        if (err) {
            return res.send('Er is een fout opgetreden.');
        }
        res.json(friends);
    });
});



app.post('/send-message', (req, res) => {
    const { recipient, message } = req.body;
    const sender = req.session.username;

    if (!recipient || !message || !sender) {
        return res.status(400).json({ error: 'Ongeldige invoer' });
    }

    db.run(`INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)`, [sender, recipient, message], (err) => {
        if (err) return res.status(500).json({ error: 'Fout bij het opslaan van het bericht.' });
        res.status(200).json({ success: true });
    });
});

app.get('/messages/:friend', (req, res) => {
    const friend = req.params.friend;
    const username = req.session.username;

    if (!username || !friend) return res.status(400).json({ error: 'Ongeldige invoer' });

    db.all(`SELECT * FROM messages WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?) ORDER BY timestamp`, 
           [username, friend, friend, username], (err, messages) => {
        if (err) return res.status(500).json({ error: 'Fout bij het ophalen van berichten.' });
        res.json(messages);
    });
});




// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
});
