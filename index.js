const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:3000"],
  credentials: true
}));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'expense_management'
});

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// User Authentication API Endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE LOWER(username) = LOWER(?)";

    try {
        db.query(sql, [username], async (err, data) => {
            if (err) {
                console.error('Error executing the query:', err);
                return res.status(500).json({ success: false, message: 'Internal Server Error' });
            }

            if (data.length === 0) {
                return res.status(404).json("User does not exist!");
            }

            const user = data[0];
            const match = await bcrypt.compare(password, user.password_hash);

            if (match) {
                const token = jwt.sign({ id: user.id }, "your_jwt_secret", { expiresIn: '1h' });
                res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: 'None' })
                   .status(200)
                   .json({ id: user.id, username: user.username });
            } else {
                return res.status(404).json("Incorrect password!");
            }
        });
    } catch (error) {
        console.error('Unhandled error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie("access_token", {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    })
    .status(200)
    .json("Logged out successfully");
});

// Expense Management API Endpoints
app.get('/api/expenses', (req, res) => {
    const sql = "SELECT * FROM expenses";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json(results);
    });
});

app.post('/api/expenses', (req, res) => {
    const { description, amount, user_id } = req.body;
    const sql = "INSERT INTO expenses (description, amount, user_id) VALUES (?, ?, ?)";
    db.query(sql, [description, amount, user_id], (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.status(201).json({ id: results.insertId, description, amount, user_id });
    });
});

app.put('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const { description, amount } = req.body;
    const sql = "UPDATE expenses SET description = ?, amount = ? WHERE id = ?";
    db.query(sql, [description, amount, id], (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ id, description, amount });
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM expenses WHERE id = ?";
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.status(204).end();
    });
});

// Expense Calculation API Endpoint
app.get('/api/expense', (req, res) => {
    const sql = "SELECT SUM(amount) AS total FROM expenses";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error executing the query:', err);
            return res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
        res.json({ total: results[0].total });
    });
});

app.listen(3004, () => {
    console.log("Server listening on port 3004");
});
