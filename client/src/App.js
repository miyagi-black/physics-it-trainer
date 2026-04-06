/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-eval */
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

function App() {
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [badges, setBadges] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [output, setOutput] = useState('');
  const [codes, setCodes] = useState({});
  const [editingLessonId, setEditingLessonId] = useState(null);

  const xpForLevel = 50;
  const progress = user ? ((user.xp % xpForLevel) / xpForLevel) * 100 : 0;

  const handleLogin = async () => {
    if (!username || !password) return alert("Введите логин и пароль!");
    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.error) return alert(data.error);
      setUser(data);

      const lRes = await fetch('http://localhost:5000/api/lessons');
      const lData = await lRes.json();
      setLessons(lData);
      if (lData.length > 0) setCurrentLesson(lData[0]);

      const hRes = await fetch(`http://localhost:5000/api/completed-lessons/${username}`);
      setCompletedLessons(await hRes.json());

      const bRes = await fetch(`http://localhost:5000/api/badges/${username}`);
      setBadges(await bRes.json());
    } catch (e) { alert("Ошибка сервера"); }
  };

 const runCode = async () => {
    try {
      const currentCode = codes[currentLesson.id] || '';
      setOutput("Выполнение...");

      // 1. Сброс среды
      window.log = [];
      window.print = (msg) => window.log.push(String(msg));
      window.console.log = (msg) => window.log.push(String(msg));
      
      window.heroes = [
        { name: 'Superman', power: 100 },
        { name: 'Batman', power: 70 },
        { name: 'Wonder Woman', power: 90 }
      ];
      
      // Чистим старые следы
      delete window.test;
      delete window.score;
      delete window.powerfulHeroes;

      // 2. ВЫПОЛНЕНИЕ КОДА
      try {
        // Главный секрет: выполняем код в функции, которая возвращает созданные объекты
        // Это обойдет ограничения let/const в eval
        const scriptBody = `
          ${currentCode};
          return {
            test: typeof test !== 'undefined' ? test : undefined,
            score: typeof score !== 'undefined' ? score : undefined,
            powerfulHeroes: typeof powerfulHeroes !== 'undefined' ? powerfulHeroes : undefined
          };
        `;

        const userRoutine = new Function(scriptBody);
        const userExports = userRoutine();

        // Записываем результаты в window, чтобы база данных (check_logic) их увидела
        if (userExports.test) window.test = userExports.test;
        if (userExports.score) window.score = userExports.score;
        if (userExports.powerfulHeroes) window.powerfulHeroes = userExports.powerfulHeroes;

        // Создаем объект results для твоей админки
        window.results = {
          userScore: window.score || 0,
          powerfulHeroes: window.powerfulHeroes || [],
          userTestFn: typeof window.test === 'function' ? window.test : undefined
        };

        // 3. ПРОВЕРКА
        const isCorrect = eval(currentLesson.check_logic);
        
        if (isCorrect) {
          setOutput("✅ Задание выполнено верно!\n" + window.log.join('\n'));
          
          if (!completedLessons.includes(currentLesson.id)) {
            setCompletedLessons(prev => [...prev, currentLesson.id]);
            await fetch('http://localhost:5000/api/complete-lesson', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user.username, lessonId: currentLesson.id })
            });
            
            const resXp = await fetch('http://localhost:5000/api/update-xp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user.username, xpGain: currentLesson.xp_reward })
            });
            const updatedUser = await resXp.json();
            setUser(updatedUser);
            
            const bRes = await fetch(`http://localhost:5000/api/badges/${user.username}`);
            setBadges(await bRes.json());
          }
        } else {
          setOutput("❌ Условие не выполнено!\n" + window.log.join('\n'));
        }
      } catch (innerErr) {
        setOutput("❌ Ошибка в твоем коде:\n" + innerErr.message);
      }
    } catch (e) {
      setOutput("⚠️ Системная ошибка: " + e.message);
    }
  };

  const openAdmin = async () => {
    if (!user || user.role !== 'admin') return alert("Доступ только для админа!");
    try {
      const res = await fetch('http://localhost:5000/api/admin/stats');
      if (res.ok) {
        setAllUsers(await res.json());
        setRole('admin');
      } else { alert("Ошибка доступа к статистике"); }
    } catch (e) { alert("Ошибка соединения с сервером"); }
  };

  // --- КОМПОНЕНТЫ ИНТЕРФЕЙСА (без изменений) ---
  if (!user) return (
    <div style={loginContainer}>
      <h2>Вход в JS Learn</h2>
      <input style={inputS} placeholder="Ник" onChange={e => setUsername(e.target.value)} />
      <input style={inputS} type="password" placeholder="Пароль" onChange={e => setPassword(e.target.value)} />
      <button style={loginB} onClick={handleLogin}>Войти / Зарегистрироваться</button>
    </div>
  );

  return (
    <div style={{ background: '#0f0f0f', color: '#e0e0e0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      <div style={headerS}>
        <div>
          <button onClick={() => setRole('student')} style={btnS}>👨‍🎓 Студент</button>
          <button onClick={openAdmin} style={{...btnS, background: '#d32f2f', marginLeft: '10px'}}>⚙️ Админ</button>
        </div>
        <div style={{ width: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><b>{user.username}</b> | Уровень {user.level}</span>
            <span>{user.xp} XP</span>
          </div>
          <div style={progressBg}><div style={{ width: `${progress}%`, ...progressFill }} /></div>
          <div style={{marginTop: '5px'}}>
            {badges.map((b, i) => <span key={i} title={b} style={badgeIcon}>🏅</span>)}
          </div>
        </div>
      </div>

      <div style={mainGrid}>
        <div style={sidebarS}>
          <h3>📚 Уроки</h3>
          {lessons.map(l => (
            <div 
              key={l.id} 
              onClick={() => { setCurrentLesson(l); setOutput(''); }} 
              style={{ 
                ...lessonItem, 
                background: currentLesson?.id === l.id ? '#333' : 'transparent',
                borderLeft: completedLessons.includes(l.id) ? '4px solid #4caf50' : 'none'
              }}
            >
              {completedLessons.includes(l.id) ? '✅ ' : '📖 '} {l.title}
            </div>
          ))}
        </div>

        <div>
          {role === 'admin' ? (
            <div style={adminS}>
              <h2>📊 Панель управления</h2>
              <div style={{ background: '#222', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>{editingLessonId ? '📝 Редактировать урок' : '➕ Добавить новый урок'}</h3>
                <input style={adminInput} id="newTitle" placeholder="Название" />
                <textarea style={adminArea} id="newTask" placeholder="Описание задания..." />
                <input style={adminInput} id="newLogic" placeholder="Логика проверки (например: score === 100)" />
                <input style={adminInput} id="newXP" type="number" placeholder="Награда XP" />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={async () => {
                    const title = document.getElementById('newTitle').value;
                    const task = document.getElementById('newTask').value;
                    const check_logic = document.getElementById('newLogic').value;
                    const xp_reward = parseInt(document.getElementById('newXP').value);
                    const lessonData = { title, task, check_logic, xp_reward };

                    if (editingLessonId) {
                      const res = await fetch(`http://localhost:5000/api/admin/lessons/${editingLessonId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lessonData)
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setLessons(lessons.map(l => l.id === editingLessonId ? updated : l));
                        setEditingLessonId(null);
                        alert("Урок обновлен!");
                      }
                    } else {
                      const res = await fetch('http://localhost:5000/api/admin/lessons', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(lessonData)
                      });
                      if (res.ok) {
                        const saved = await res.json();
                        setLessons([...lessons, saved]);
                        alert("Урок добавлен!");
                      }
                    }
                    document.querySelectorAll('#newTitle, #newTask, #newLogic, #newXP').forEach(i => i.value = '');
                  }} style={{...runB, background: editingLessonId ? '#2196f3' : '#4caf50'}}>
                    {editingLessonId ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОХРАНИТЬ УРОК'}
                  </button>
                  {editingLessonId && (
                    <button onClick={() => setEditingLessonId(null)} style={{...runB, background: '#777', width: '100px'}}>ОТМЕНА</button>
                  )}
                </div>
              </div>

              <h3>🛠 Управление уроками</h3>
              {lessons.map(l => (
                <div key={l.id} style={{...userRow, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span>{l.title}</span>
                  <div>
                    <button onClick={() => {
                      setEditingLessonId(l.id);
                      document.getElementById('newTitle').value = l.title;
                      document.getElementById('newTask').value = l.task;
                      document.getElementById('newLogic').value = l.check_logic;
                      document.getElementById('newXP').value = l.xp_reward;
                    }} style={{background: '#ff9800', color: 'white', border: 'none', padding: '5px 10px', marginRight: '5px', borderRadius: '4px', cursor: 'pointer'}}>Изменить</button>
                    <button onClick={async () => {
                      if(window.confirm(`Удалить урок "${l.title}"?`)) {
                        await fetch(`http://localhost:5000/api/admin/lessons/${l.id}`, { method: 'DELETE' });
                        setLessons(prev => prev.filter(lesson => lesson.id !== l.id));
                      }
                    }} style={{background: '#ff5252', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}>Удалить</button>
                  </div>
                </div>
              ))}
              
              <h3 style={{marginTop: '30px'}}>🏆 Рейтинг пользователей</h3>
              {allUsers.map(u => <div key={u.username} style={userRow}>{u.username} — {u.xp} XP</div>)}
            </div>
          ) : (
            lessons.length === 0 ? (
              <div style={{ padding: '20px' }}>Уроков пока нет.</div>
            ) : currentLesson ? (
              <>
                <div style={taskS}><b>Задание:</b> {currentLesson.task}</div>
                <Editor 
                  height="400px" 
                  theme="vs-dark" 
                  defaultLanguage="javascript" 
                  value={codes[currentLesson.id] || ''} 
                  onChange={(v) => setCodes({...codes, [currentLesson.id]: v})} 
                />
                <button onClick={runCode} style={runB}>ПРОВЕРИТЬ (+{currentLesson.xp_reward} XP)</button>
                {output.includes('✅') && (
                  <button 
                    style={{...runB, background: '#2196f3', marginTop: '10px'}} 
                    onClick={() => {
                      const idx = lessons.findIndex(l => l.id === currentLesson.id) + 1;
                      if (lessons[idx]) { setCurrentLesson(lessons[idx]); setOutput(''); }
                    }}
                  >
                    СЛЕДУЮЩИЙ УРОК →
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '20px' }}>Выберите урок.</div>
            )
          )}
        </div>

        <div style={consoleS}>
          <h4>Результат:</h4>
          <pre style={{ color: output.includes('✅') ? '#4caf50' : '#ff5252', whiteSpace: 'pre-wrap' }}>{output}</pre>
        </div>
      </div>
    </div>
  );
}

// --- СТИЛИ (без изменений) ---
const adminInput = { width: '100%', padding: '10px', marginBottom: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box' };
const adminArea = { width: '100%', height: '80px', padding: '10px', marginBottom: '10px', background: '#333', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontFamily: 'inherit', boxSizing: 'border-box' };
const loginContainer = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f', color: '#fff' };
const inputS = { padding: '10px', margin: '5px', width: '250px', borderRadius: '5px', border: 'none' };
const loginB = { padding: '10px 20px', background: '#f0db4f', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' };
const headerS = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '10px' };
const btnS = { padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: '#fff', background: '#444' };
const progressBg = { width: '100%', height: '10px', background: '#333', borderRadius: '5px', marginTop: '5px' };
const progressFill = { height: '100%', background: '#f0db4f', transition: '0.5s' };
const badgeIcon = { fontSize: '20px', marginRight: '5px', cursor: 'help' };
const mainGrid = { display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '20px', marginTop: '20px' };
const sidebarS = { background: '#1a1a1a', padding: '15px', borderRadius: '10px' };
const lessonItem = { padding: '10px', cursor: 'pointer', borderRadius: '5px' };
const adminS = { background: '#1a1a1a', padding: '20px', borderRadius: '10px' };
const userRow = { padding: '10px', borderBottom: '1px solid #333' };
const taskS = { padding: '15px', background: '#333', borderRadius: '5px 5px 0 0', borderLeft: '5px solid #f0db4f' };
const runB = { width: '100%', padding: '15px', background: '#f0db4f', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const consoleS = { background: '#000', padding: '15px', borderRadius: '10px' };

export default App;