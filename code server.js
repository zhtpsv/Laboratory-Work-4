const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
    user: 'postgres',        
    host: 'localhost',
    database: 'velox_db',    
    password: 'postgres',  
    port: 5432,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));


app.get('/api/user', async (req, res) => {
    const sessionUser = req.cookies.session_user;
    if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const result = await pool.query('SELECT username FROM users WHERE username = $1', [sessionUser]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.json({ username: result.rows[0].username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during session verification' });
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Fill in all fields!' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Incorrect login or password!' });
        }

        res.cookie('session_user', username, { maxAge: 86400000, httpOnly: true, secure: false });
        res.json({ success: true, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during authorization' });
    }
});


app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Fill in all fields!' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'The password must be at least 6 characters long!' });
    }

    try {
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Such a user already exists!' });
        }

        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, password]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('session_user');
    res.json({ success: true });
});

app.listen(8080, () => {
    console.log('The backend is running with a connection to PostgreSQL: http://localhost:8080');
});