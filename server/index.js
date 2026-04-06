require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  // ВАЖНО: Мы используем прямой хост и порт 5432, чтобы избежать проблем с пулером
  connectionString: "postgresql://postgres:Hajimerecords14.@db.gnsqgnlgjhmshmxtyxui.supabase.co:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

// Добавим проверку, чтобы ты сразу видел успех в терминале
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Ошибка подключения к базе:', err.message);
  }
  console.log('✅ База данных подключена успешно! Можно защищать диплом.');
  release();
});

// --- ПРОВЕРКА БАЗЫ ---
pool.connect((err, client, release) => {
    if (err) return console.error('❌ Ошибка подключения к базе:', err.stack);
    console.log('✅ База данных подключена успешно');
    release();
});

// --- АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (userCheck.rows.length > 0) {
            const user = userCheck.rows[0];
            const inputLogin = username.trim().toLowerCase();

            let isMatch = false;

            // 1. Проверка для админа (текстом 123)
            if ((inputLogin === 'admin' || inputLogin === 'админ') && password === '123') {
                isMatch = true;
            } 
            // 2. Проверка через bcrypt (если в базе хеш)
            else if (user.password && user.password.startsWith('$')) {
                isMatch = await bcrypt.compare(password, user.password);
            } 
            // 3. Проверка обычным текстом (если в базе просто текст)
            else {
                isMatch = (password === user.password);
            }

            if (!isMatch) {
                return res.status(400).json({ error: "Неверный пароль" });
            }
            
            return res.json(user);
        } else {
            // Регистрация нового пользователя
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await pool.query(
                'INSERT INTO users (username, password, xp, level, role) VALUES ($1, $2, 0, 1, $3) RETURNING *',
                [username, hashedPassword, username === 'admin' ? 'admin' : 'student']
            );
            return res.json(newUser.rows[0]);
        }
    } catch (err) {
        console.error("Ошибка авторизации:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// --- УРОКИ ---
app.get('/api/lessons', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lessons ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/lessons', async (req, res) => {
    const { title, task, check_logic, xp_reward } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO lessons (title, task, check_logic, xp_reward) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, task, check_logic, xp_reward]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/lessons/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
        res.json({ success: true, message: "Урок удален" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/complete-lesson', async (req, res) => {
    const { username, lessonId } = req.body;
    try {
        await pool.query(
            'INSERT INTO user_completed_lessons (username, lesson_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [username, lessonId]
        );
        await pool.query(
            "INSERT INTO user_badges (username, badge_name) VALUES ($1, 'Первый код') ON CONFLICT DO NOTHING",
            [username]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- XP И ПРОГРЕСС ---
app.post('/api/update-xp', async (req, res) => {
    const { username, xpGain } = req.body;
    try {
        const userRes = await pool.query('SELECT xp FROM users WHERE username = $1', [username]);
        if (userRes.rows.length === 0) return res.status(404).json({error: "Юзер не найден"});

        const newXP = (userRes.rows[0].xp || 0) + xpGain;
        const newLevel = Math.floor(newXP / 50) + 1;

        const result = await pool.query(
            'UPDATE users SET xp = $1, level = $2 WHERE username = $3 RETURNING id, username, xp, level, role',
            [newXP, newLevel, username]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/completed-lessons/:username', async (req, res) => {
    try {
        const result = await pool.query('SELECT lesson_id FROM user_completed_lessons WHERE username = $1', [req.params.username]);
        res.json(result.rows.map(row => row.lesson_id));
    } catch (err) { res.json([]); }
});

app.get('/api/badges/:username', async (req, res) => {
    try {
        const result = await pool.query('SELECT badge_name FROM user_badges WHERE username = $1', [req.params.username]);
        res.json(result.rows.map(r => r.badge_name));
    } catch (err) { res.json([]); }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT username, xp, level, role FROM users ORDER BY xp DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ОБНОВЛЕНИЕ УРОКА ---
app.put('/api/admin/lessons/:id', async (req, res) => {
    const { id } = req.params;
    const { title, task, check_logic, xp_reward } = req.body;
    try {
        const result = await pool.query(
            'UPDATE lessons SET title = $1, task = $2, check_logic = $3, xp_reward = $4 WHERE id = $5 RETURNING *',
            [title, task, check_logic, xp_reward, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Ошибка при обновлении урока:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- ЗАПУСК СЕРВЕРА ---
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});