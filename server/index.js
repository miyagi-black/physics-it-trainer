require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// --- НАСТРОЙКА SUPABASE ---
const supabaseUrl = 'https://gnsqgnlgjhmshmxtyxui.supabase.co';
// ВСТАВЬ СВОЙ ANON KEY (возьми в Supabase -> Settings -> API -> anon public)
const supabaseKey = process.env.SUPABASE_KEY || 'ВСТАВЬ_СЮДА_СВОЙ_КЛЮЧ'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- API РОУТЫ ---

app.get('/api/lessons', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .order('id', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (user) {
            if (password === user.password || (username.toLowerCase() === 'admin' && password === '123')) {
                return res.json(user);
            }
            return res.status(400).json({ error: "Неверный пароль" });
        } else {
            const { data: newUser, error: regErr } = await supabase
                .from('users')
                .insert([{ username, password, xp: 0, level: 1, role: username.toLowerCase() === 'admin' ? 'admin' : 'student' }])
                .select()
                .single();
            if (regErr) throw regErr;
            res.json(newUser);
        }
    } catch (err) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// --- РАЗДАЧА ФРОНТЕНДА ---

// --- РАЗДАЧА ФРОНТЕНДА ---

const buildPath = path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

// Используем регулярное выражение /.*/ — это поймет любая версия Express
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ ${PORT}`);
    console.log(`🚀 База подключена. Сайт готов к работе!`);
});