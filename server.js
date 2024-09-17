const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const db = require('./db'); // Verwijzing naar de database


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Voeg sessiemiddleware toe
app.use(session({
    secret: 'yefizuehiazjdhaziugdyezgfdsqjieuzaydiygfisqhbazezadsqzda', // Gebruik een sterke geheime sleutel
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Zet op true bij HTTPS
}));

// let users = []; // Simpele gebruikersopslag (later naar een database)


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

let friendRequests = []; // Opslag voor vriendschapsverzoeken

app.post('/add-friend', (req, res) => {
    const { username } = req.body;
    const sender = req.session.username;

    if (!sender) {
        return res.send('Je moet ingelogd zijn om een vriend toe te voegen.');
    }

    console.log(`Vriendschapsverzoek van: ${sender} naar: ${username}`); // Voeg debugging toe

    // Controleer of de ontvanger in de database bestaat
    db.get(`SELECT * FROM users WHERE LOWER(username) = ?`, [username], (err, user) => {
        if (err) {
            console.error('Fout bij het zoeken naar gebruiker:', err); // Log fout naar console
            return res.send('Er is een fout opgetreden.');
        }

        if (!user) {
            console.log('Gebruiker niet gevonden:', username); // Log gebruikersnaam die niet wordt gevonden
            return res.send('Gebruiker niet gevonden.');
        }

        // Voeg het vriendschapsverzoek toe aan de database
        db.run(`INSERT INTO friend_requests (from_user, to_user, status) VALUES (?, ?, 'pending')`,
            [sender, username], (err) => {
                if (err) {
                    console.error('Fout bij het toevoegen van vriendschapsverzoek:', err); // Log fout naar console
                    return res.send('Er is een fout opgetreden bij het versturen van het vriendschapsverzoek.');
                }
                res.send('Vriendschapsverzoek verstuurd.');
            });
    });
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
                res.send('Vriendschapsverzoek geaccepteerd.');
            });
        });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
});
