const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

let users = []; // Simpele gebruikersopslag (dit kan later naar een database)

// Routes





app.get('/friends', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'friends.html'));
});









app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Registreren
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    const userExists = users.some(user => user.username === username || user.email === email);

    if (userExists) {
        res.send('Gebruiker bestaat al. <a href="/register">Probeer opnieuw</a>');
    } else {
        users.push({ username, email, password });
        res.redirect(`/welcome?user=${username}`);
    }
});

// Inloggen
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        res.redirect(`/welcome?user=${username}`);
    } else {
        res.send('Ongeldige login. <a href="/login">Probeer opnieuw</a>');
    }
});

// Welkom pagina
app.get('/welcome', (req, res) => {
    const { user } = req.query;
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

// Route voor de app (chat) pagina
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html')); // Verzend app.html naar de gebruiker
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
});
