-- 0. Убедимся, что таблица пользователей существует (нужна для связей)
CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT, -- может быть NULL, если используем упрощенную схему
    xp INTEGER DEFAULT 0
);

-- 1. Таблица уроков
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    task TEXT NOT NULL,
    check_logic TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 10
);

-- 2. Таблица пройденных уроков
CREATE TABLE IF NOT EXISTS user_completed_lessons (
    id SERIAL PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(username, lesson_id)
);

-- 3. Таблица бейджей
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    badge_name TEXT NOT NULL,
    awarded_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(username, badge_name)
);

-- 4. Обновление контента уроков
TRUNCATE TABLE lessons CASCADE;

INSERT INTO lessons (title, task, check_logic, xp_reward) VALUES 
(
  'Переменные', 
  'Создай переменную score и присвой ей 100', 
  'window.results.userScore === 100', 
  10
),
(
  'Консоль', 
  'Выведи в консоль число 777', 
  'window.log.some(item => item.includes("777"))', 
  15
),
(
  'Функции', 
  'Создай функцию test, которая возвращает true', 
  'typeof window.results.userTestFn === "function" && window.results.userTestFn() === true', 
  25
),
(
  'Массивы (Физика)', 
  'Отфильтруй массив heroes, оставив только тех, у кого power > 80, в переменную powerfulHeroes', 
  'Array.isArray(window.results.powerfulHeroes) && window.results.powerfulHeroes.length === 2', 
  30
);