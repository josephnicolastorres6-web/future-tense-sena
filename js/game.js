/* =====================================================================
   game.js — SENA-HOOT! (Kahoot-style class game)
   Lobby → Intro → Question (20 s timer) → Feedback → … → Podium
   ===================================================================== */
const Game = (() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // ------------------------------------------------------------------
  // QUESTION BANK
  // ------------------------------------------------------------------
  const QUESTIONS = [
    {
      emoji: '🔋', cat: 'Tech Life',
      text: "Look at the laptop! The battery is at 1%! It ________ turn off right now!",
      options: ['will', 'is going to', 'going to', 'are going to'], answer: 1,
      tip: '👀 Visual evidence = IS GOING TO',
      why: '1% battery is visual evidence right in front of your eyes = IS GOING TO.',
    },
    {
      emoji: '🥵', cat: 'Classroom',
      text: "'It is super hot in this classroom!' — 'Wait, I ________ open the window right now.'",
      options: ['will', 'am going to', 'is going to', "won't to"], answer: 0,
      tip: '⚡ Spontaneous decision = WILL',
      why: 'You decided at the exact moment of speaking (Spontaneous Decision = WILL).',
    },
    {
      emoji: '🎸', cat: 'Weekend Plans',
      text: 'Why did you buy two tickets? — Because we ________ go to a rock concert in December!',
      options: ['will', 'is going to', 'are going to', 'going to'], answer: 2,
      tip: '📅 Prior plan = ARE GOING TO',
      why: 'Buying tickets first means it was a prior plan made before speaking = ARE GOING TO.',
    },
    {
      emoji: '💻', cat: 'Dev Promises',
      text: "Don't worry about the GitHub repository, bro. I promise I ________ push my code tonight.",
      options: ['am going to', 'are going to', 'going to', 'will'], answer: 3,
      tip: '🤝 Promise = WILL',
      why: 'Promises always use WILL!',
    },
    {
      emoji: '⛈️', cat: 'Weather',
      text: 'Look at those giant black clouds in the sky! It ________ rain in 5 minutes.',
      options: ['will', 'is going to', 'am going to', 'are going to'], answer: 1,
      tip: '☁️ Physical evidence = IS GOING TO',
      why: 'Dark clouds in the sky are real physical evidence = IS GOING TO.',
    },
    {
      emoji: '🤖', cat: 'Future of AI',
      text: 'In my opinion, I think Artificial Intelligence ________ replace many jobs in 2040.',
      options: ['is going to', 'will', 'are going to', 'going to'], answer: 1,
      tip: '💭 Personal opinion = WILL',
      why: "Predictions based on personal opinion ('I think', 'I believe') always use WILL.",
    },
    {
      emoji: '🥟', cat: 'Friendship',
      text: "'I forgot my money and I'm super hungry.' — 'Don't worry! I ________ buy you an empanada!'",
      options: ['am going to', 'will', 'is going to', 'going'], answer: 1,
      tip: '🙋 Instant offer = WILL',
      why: 'An instant offer to help a friend on the spot = WILL.',
    },
    {
      emoji: '🛠️', cat: 'Coding Projects',
      text: 'Why did you download Angular on your PC? — Because Jhojan and I ________ build a web app this week.',
      options: ['will', 'am going to', 'are going to', 'is going to'], answer: 2,
      tip: '🛠️ Prior intention = ARE GOING TO',
      why: 'Downloading the tools beforehand shows a prior plan/intention = ARE GOING TO.',
    },
    {
      emoji: '🧐', cat: 'Grammar Check',
      text: 'Which of these sentences is 100% GRAMMATICALLY CORRECT?',
      options: ['She going to study.', 'He will studies.', 'They are going to play.', 'I am will work.'], answer: 2,
      tip: '🧩 Subject + BE + going to + verb',
      why: 'Correct structure: Subject (They) + Verb To Be (are) + going to + base verb (play).',
    },
    {
      emoji: '🗣️', cat: 'Native Speaking',
      text: "In movies, music, and fast spoken English, how do native speakers pronounce 'going to'?",
      options: ['Wanna', 'Gonna', 'Gotta', 'Willa'], answer: 1,
      tip: "🔥 'going to' = GONNA",
      why: "Native speakers contract 'going to' into 'GONNA' in casual conversation!",
    },
  ];

  const TIME = 20;
  const BASE_POINTS = 500;
  const SPEED_POINTS = 25;
  const TEAM_COLORS = ['#ff4f7b', '#2ec4ff', '#ffb627', '#3ddc84', '#ff8a3d', '#b57bff'];
  const TEAM_EMOJIS = ['🦅', '🐺', '🦁', '🐉', '🦈', '🦊'];
  const DEFAULT_NAMES = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Omega', 'Team Sigma'];
  const MODE_DESC = {
    turns: '🔄 <b>Turns:</b> teams take turns — each question belongs to one team (highlighted on the scoreboard).',
    fastest: '⚡ <b>Fastest team:</b> everyone competes! Tap the team that answered first (on the scoreboard, or when choosing the answer).',
  };
  const RING_C = 2 * Math.PI * 44;

  // ------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------
  const st = {
    teamCount: 4,
    names: [...DEFAULT_NAMES],
    mode: 'turns',
    teams: [],
    q: 0,
    phase: 'lobby',
    answered: false,
    remaining: TIME,
    endAt: 0,
    raf: null,
    lastSec: null,
    paused: false,
    visible: false,
    selected: null,
    pending: null,
    timers: [],
  };

  const later = (fn, ms) => { const id = setTimeout(fn, ms); st.timers.push(id); return id; };
  const clearLater = () => { st.timers.forEach(clearTimeout); st.timers = []; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const swatch = (i) => `<span class="team-sw" style="--tc:${TEAM_COLORS[i]}">${TEAM_EMOJIS[i]}</span>`;

  // ------------------------------------------------------------------
  // SCREENS
  // ------------------------------------------------------------------
  function showScreen(name) {
    st.phase = name;
    $$('.g-screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  }

  // ------------------------------------------------------------------
  // LOBBY
  // ------------------------------------------------------------------
  function renderLobby() {
    const seg = $('#team-count');
    seg.innerHTML = [2, 3, 4, 5, 6]
      .map((n) => `<button id="teams-${n}" data-n="${n}" class="${n === st.teamCount ? 'active' : ''}">${n}</button>`)
      .join('');

    const wrap = $('#team-inputs');
    wrap.innerHTML = '';
    for (let i = 0; i < st.teamCount; i++) {
      const field = document.createElement('label');
      field.className = 'team-field';
      field.style.animationDelay = `${i * 0.05}s`;
      field.innerHTML = `${swatch(i)}<input id="team-name-${i}" maxlength="18" value="${esc(st.names[i])}" aria-label="Team ${i + 1} name" />`;
      field.querySelector('input').addEventListener('input', (e) => { st.names[i] = e.target.value; });
      wrap.appendChild(field);
    }

    $$('#mode-select button').forEach((b) => b.classList.toggle('active', b.dataset.mode === st.mode));
    $('#mode-desc').innerHTML = MODE_DESC[st.mode];
  }

  function startGame() {
    st.teams = st.names.slice(0, st.teamCount).map((n, i) => ({
      name: (n || '').trim() || DEFAULT_NAMES[i],
      color: TEAM_COLORS[i],
      idx: i,
      score: 0,
      correct: 0,
    }));
    st.q = 0;
    clearLater();
    Sound.start();
    runIntro();
  }

  // ------------------------------------------------------------------
  // INTRO (Get ready…)
  // ------------------------------------------------------------------
  function turnTeam() { return st.teams[st.q % st.teams.length]; }

  function runIntro() {
    const Q = QUESTIONS[st.q];
    showScreen('intro');
    $('#intro-q').textContent = `Question ${st.q + 1} of ${QUESTIONS.length}`;
    $('#intro-cat').textContent = Q.cat;

    const em = $('#intro-emoji');
    em.textContent = Q.emoji;
    em.style.animation = 'none'; void em.offsetWidth; em.style.animation = '';

    if (st.mode === 'turns') {
      const t = turnTeam();
      $('#intro-turn').innerHTML = `${swatch(t.idx)}<span>${esc(t.name)} — your turn!</span>`;
    } else {
      $('#intro-turn').innerHTML = `<span class="team-sw" style="--tc:#ffd400">⚡</span><span>All teams — fastest wins!</span>`;
    }

    const bar = $('#intro-bar');
    bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');

    const count = $('#intro-count');
    [3, 2, 1].forEach((n, k) => {
      later(() => {
        count.textContent = n;
        count.classList.remove('tick'); void count.offsetWidth; count.classList.add('tick');
        Sound.countBlip(n === 1);
      }, k * 700);
    });
    later(renderQuestion, 2150);
  }

  // ------------------------------------------------------------------
  // QUESTION
  // ------------------------------------------------------------------
  function renderQuestion() {
    const Q = QUESTIONS[st.q];
    showScreen('question');
    st.answered = false;
    st.selected = null;
    st.pending = null;

    $('#q-counter').textContent = `${st.q + 1} / ${QUESTIONS.length}`;
    $('#q-emoji').textContent = Q.emoji;
    $('#q-cat').textContent = Q.cat;
    $('#q-text').innerHTML = esc(Q.text).replace('________', '<span class="blank" id="q-blank">&nbsp;</span>');

    const card = $('#q-card');
    card.classList.remove('enter', 'shake'); void card.offsetWidth; card.classList.add('enter');

    $$('.k-btn').forEach((b, i) => {
      b.disabled = false;
      b.classList.remove('is-dim', 'is-correct', 'is-wrong');
      b.querySelector('.k-label').textContent = Q.options[i];
    });
    const answers = $('#answers');
    answers.classList.remove('enter'); void answers.offsetWidth; answers.classList.add('enter');

    $('#feedback').classList.remove('show');
    renderScoreboard();
    renderTurnPanel();
    startTimer(TIME);
  }

  function renderScoreboard() {
    const sb = $('#scoreboard');
    sb.innerHTML = st.teams.map((t) => {
      const cls = ['team-chip'];
      if (st.mode === 'turns' && t === turnTeam()) cls.push('is-turn');
      if (st.mode === 'fastest') cls.push('selectable');
      if (st.mode === 'fastest' && st.selected === t.idx) cls.push('is-selected');
      return `<div class="${cls.join(' ')}" id="chip-${t.idx}" data-idx="${t.idx}" style="--tc:${t.color}">
          ${swatch(t.idx)}<span class="tc-name">${esc(t.name)}</span><span class="tc-score" id="score-${t.idx}">${t.score}</span>
        </div>`;
    }).join('');
  }

  function renderTurnPanel() {
    const el = $('#q-turn');
    if (st.mode === 'turns') {
      const t = turnTeam();
      el.innerHTML = `${swatch(t.idx)}🎯 ${esc(t.name)}`;
    } else if (st.selected !== null) {
      const t = st.teams[st.selected];
      el.innerHTML = `${swatch(t.idx)}⚡ ${esc(t.name)}`;
    } else {
      el.innerHTML = `<span class="team-sw" style="--tc:#ffd400">⚡</span>Fastest team!`;
    }
  }

  function selectTeam(idx) {
    if (st.mode !== 'fastest' || st.answered || st.phase !== 'question') return;
    st.selected = st.selected === idx ? null : idx;
    Sound.click();
    $$('.team-chip').forEach((c) => c.classList.toggle('is-selected', Number(c.dataset.idx) === st.selected));
    renderTurnPanel();
  }

  // ------------------------------------------------------------------
  // TIMER
  // ------------------------------------------------------------------
  function startTimer(sec) {
    st.remaining = sec;
    st.lastSec = Math.ceil(sec);
    drawTimer(sec);
    if (!st.visible) { st.paused = true; return; }   // mode hidden → wait
    st.paused = false;
    st.endAt = performance.now() + sec * 1000;
    cancelAnimationFrame(st.raf);
    st.raf = requestAnimationFrame(tickLoop);
  }

  function stopTimer() {
    cancelAnimationFrame(st.raf);
    st.raf = null;
  }

  function tickLoop() {
    const rem = Math.max(0, (st.endAt - performance.now()) / 1000);
    st.remaining = rem;
    drawTimer(rem);
    const s = Math.ceil(rem);
    if (s !== st.lastSec) {
      st.lastSec = s;
      if (s <= 5 && s > 0) Sound.tick(s <= 3);
    }
    if (rem <= 0) { st.raf = null; onTimeUp(); return; }
    st.raf = requestAnimationFrame(tickLoop);
  }

  function drawTimer(rem) {
    const s = Math.ceil(rem);
    $('#timer-ring').style.strokeDasharray = RING_C;
    $('#timer-ring').style.strokeDashoffset = RING_C * (1 - rem / TIME);
    $('#timer-num').textContent = s;
    $('#timer').classList.toggle('danger', s <= 5 && rem > 0);
    $('#pot-num').textContent = rem > 0 ? BASE_POINTS + s * SPEED_POINTS : 0;
  }

  // ------------------------------------------------------------------
  // ANSWERING
  // ------------------------------------------------------------------
  function onAnswer(idx) {
    if (st.phase !== 'question' || st.answered || st.pending || st.paused) return;
    const secs = Math.ceil(st.remaining);
    if (secs <= 0) return;
    stopTimer();
    Sound.click();

    if (st.mode === 'turns') return resolve(idx, turnTeam().idx, secs);
    if (st.selected !== null) return resolve(idx, st.selected, secs);
    openPicker(idx, secs);
  }

  function openPicker(idx, secs) {
    st.pending = { idx, secs, rem: st.remaining };
    $('#pick-grid').innerHTML = st.teams.map((t, k) =>
      `<button class="pick-btn" id="pick-${t.idx}" data-idx="${t.idx}" style="--tc:${t.color}">${TEAM_EMOJIS[t.idx]} ${esc(t.name)} <small style="opacity:.7">[${k + 1}]</small></button>`
    ).join('');
    $('#team-picker').classList.add('show');
  }

  function closePicker() { $('#team-picker').classList.remove('show'); }

  function pickTeam(teamIdx) {
    if (!st.pending) return;
    const { idx, secs } = st.pending;
    st.pending = null;
    st.selected = teamIdx;
    closePicker();
    resolve(idx, teamIdx, secs);
  }

  function cancelPick() {
    if (!st.pending) return;
    const { rem } = st.pending;
    st.pending = null;
    closePicker();
    startTimer(rem);
  }

  function revealAnswers(pickedIdx) {
    const Q = QUESTIONS[st.q];
    $$('.k-btn').forEach((b, i) => {
      b.disabled = true;
      if (i === Q.answer) b.classList.add('is-correct');
      else { b.classList.add('is-dim'); if (i === pickedIdx) b.classList.add('is-wrong'); }
    });
    const blank = $('#q-blank');
    if (blank) { blank.textContent = Q.options[Q.answer]; blank.classList.add('filled'); }
  }

  function resolve(idx, teamIdx, secs) {
    const Q = QUESTIONS[st.q];
    const team = st.teams[teamIdx];
    st.answered = true;
    revealAnswers(idx);
    renderScoreboard();
    renderTurnPanel();

    if (idx === Q.answer) {
      const pts = BASE_POINTS + secs * SPEED_POINTS;
      const from = team.score;
      team.score += pts;
      team.correct++;
      Sound.correct();
      const r = $(`#ans-${idx}`).getBoundingClientRect();
      Confetti.burst({ x: (r.left + r.width / 2) / innerWidth, y: r.top / innerHeight, count: 90, speed: 14, spread: 80 });
      awardAnimation(team, from, pts);
      showFeedback('ok', '🎉', `Correct! +${pts} pts for ${team.name}`, Q, `${BASE_POINTS} base + ${secs}s × ${SPEED_POINTS} speed bonus`);
    } else {
      Sound.wrong();
      $('#q-card').classList.add('shake');
      showFeedback('bad', '❌', `Oops, ${team.name}! The answer is “${Q.options[Q.answer]}”`, Q, 'No points this round — keep going!');
    }
  }

  function onTimeUp() {
    if (st.answered) return;
    st.answered = true;
    const Q = QUESTIONS[st.q];
    Sound.timeUp();
    revealAnswers(-1);
    $('#q-card').classList.add('shake');
    showFeedback('time', '⏰', `Time's up! The answer is “${Q.options[Q.answer]}”`, Q, 'No points this round.');
  }

  function showFeedback(kind, icon, title, Q, bonus) {
    $('#fb-box').className = `fb-box ${kind}`;
    $('#fb-icon').textContent = icon;
    $('#fb-title').textContent = title;
    $('#fb-tip').textContent = Q.tip;
    $('#fb-why').textContent = Q.why;
    $('#fb-bonus').textContent = bonus || '';
    $('#btn-next-q').textContent = st.q < QUESTIONS.length - 1 ? 'Next ▶' : '🏆 Podium';
    const fb = $('#feedback');
    const icn = $('#fb-icon');
    icn.style.animation = 'none'; void icn.offsetWidth; icn.style.animation = '';
    fb.classList.add('show');
  }

  function awardAnimation(team, from, pts) {
    const chip = $(`#chip-${team.idx}`);
    const scoreEl = $(`#score-${team.idx}`);
    if (!chip || !scoreEl) return;
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    const fl = document.createElement('span');
    fl.className = 'float-pts';
    fl.textContent = `+${pts}`;
    chip.appendChild(fl);
    setTimeout(() => fl.remove(), 1600);
    countUp(scoreEl, from, team.score, 900);
  }

  function countUp(el, from, to, ms) {
    const t0 = performance.now();
    (function frame(now) {
      const k = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }

  function next() {
    if (st.phase !== 'question' || !st.answered) return;
    Sound.click();
    if (st.q < QUESTIONS.length - 1) {
      st.q++;
      runIntro();
    } else {
      showPodium();
    }
  }

  // ------------------------------------------------------------------
  // PODIUM
  // ------------------------------------------------------------------
  function showPodium() {
    showScreen('podium');
    clearLater();
    const ranked = [...st.teams].sort((a, b) => b.score - a.score);
    const title = $('#pod-title');
    title.textContent = '🥁 And the winners are…';
    title.classList.remove('win');

    const medals = ['🥇', '🥈', '🥉'];
    const heights = ['72%', '54%', '40%'];
    const order = ranked.length >= 3 ? [1, 0, 2] : [1, 0];
    const podium = $('#podium');
    podium.innerHTML = order.filter((r) => ranked[r]).map((r) => {
      const t = ranked[r];
      return `<div class="pod-col ${r === 0 ? 'first' : ''}" id="pod-${r}">
          <div class="pod-info">
            <div class="pod-name">${TEAM_EMOJIS[t.idx]} <span>${esc(t.name)}</span></div>
            <div class="pod-score" id="pod-score-${r}">0 pts</div>
            <div class="pod-meta">✅ ${t.correct} / ${QUESTIONS.length} correct</div>
          </div>
          <div class="pod-bar" style="--h:${heights[r]};--tc:${t.color}">
            <div class="pod-medal">${r === 0 ? '👑' : medals[r]}</div>
            <div class="pod-rank">${r + 1}</div>
          </div>
        </div>`;
    }).join('');

    $('#rest-list').innerHTML = ranked.slice(3).map((t, k) =>
      `<div class="rest-item">${swatch(t.idx)}#${k + 4} ${esc(t.name)} · ${t.score} pts</div>`
    ).join('');
    $('#rest-list').classList.remove('show');
    $('#pod-actions').classList.remove('show');

    const reveal = (r, delay) => later(() => {
      const col = $(`#pod-${r}`);
      if (!col) return;
      col.classList.add('show');
      const scoreEl = $(`#pod-score-${r}`);
      const target = ranked[r].score;
      later(() => {
        const t0 = performance.now();
        (function f(now) {
          const k = Math.min(1, (now - t0) / 900);
          scoreEl.textContent = `${Math.round(target * (1 - Math.pow(1 - k, 3)))} pts`;
          if (k < 1) requestAnimationFrame(f);
        })(t0);
      }, 500);
      if (r > 0) Sound.countBlip(false);
    }, delay);

    Sound.drumroll(2.7);
    if (ranked[2]) reveal(2, 700);
    reveal(1, 1600);
    reveal(0, 2700);
    later(() => {
      const top = ranked[0];
      const tie = ranked[1] && ranked[1].score === top.score;
      title.textContent = tie ? "🤝 It's a tie at the top!" : `🏆 ${top.name} WINS!`;
      title.classList.add('win');
      Sound.fanfare();
      Confetti.cannons();
      Confetti.rain(5000);
    }, 2750);
    later(() => {
      $('#rest-list').classList.add('show');
      $('#pod-actions').classList.add('show');
    }, 3700);
  }

  // ------------------------------------------------------------------
  // QUIT / LIFECYCLE
  // ------------------------------------------------------------------
  function toLobby() {
    clearLater();
    stopTimer();
    closePicker();
    st.pending = null;
    st.paused = false;
    renderLobby();
    showScreen('lobby');
  }

  function quit() {
    const wasRunning = !!st.raf;
    if (wasRunning) stopTimer();
    if (confirm('Exit the current game and go back to the lobby?')) {
      toLobby();
    } else if (wasRunning) {
      startTimer(st.remaining);
    }
  }

  /** Called by app.js when the game mode becomes visible / hidden. */
  function onEnter() {
    st.visible = true;
    if (st.phase === 'question' && st.paused && !st.answered && !st.pending) startTimer(st.remaining);
  }
  function onLeave() {
    st.visible = false;
    if (st.raf) { stopTimer(); st.paused = true; }
  }

  function onKey(e) {
    const k = e.key;
    if (st.pending) {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= st.teams.length) { e.preventDefault(); pickTeam(st.teams[n - 1].idx); }
      else if (k === 'Escape') cancelPick();
      return;
    }
    if (st.phase === 'question') {
      if (!st.answered && ['1', '2', '3', '4'].includes(k)) { e.preventDefault(); onAnswer(Number(k) - 1); }
      else if (st.answered && (k === 'Enter' || k === 'ArrowRight' || k === ' ')) { e.preventDefault(); next(); }
    } else if (st.phase === 'lobby' && k === 'Enter') {
      e.preventDefault(); startGame();
    }
  }

  // ------------------------------------------------------------------
  // WIRING
  // ------------------------------------------------------------------
  function init() {
    renderLobby();

    $('#team-count').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-n]');
      if (!b) return;
      st.teamCount = Number(b.dataset.n);
      Sound.click();
      renderLobby();
    });
    $('#mode-select').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]');
      if (!b) return;
      st.mode = b.dataset.mode;
      Sound.click();
      renderLobby();
    });
    $('#btn-start-game').addEventListener('click', startGame);

    $('#answers').addEventListener('click', (e) => {
      const b = e.target.closest('.k-btn');
      if (b) onAnswer(Number(b.dataset.i));
    });
    $('#scoreboard').addEventListener('click', (e) => {
      const c = e.target.closest('.team-chip');
      if (c) selectTeam(Number(c.dataset.idx));
    });
    $('#pick-grid').addEventListener('click', (e) => {
      const b = e.target.closest('.pick-btn');
      if (b) pickTeam(Number(b.dataset.idx));
    });
    $('#pick-cancel').addEventListener('click', cancelPick);
    $('#btn-next-q').addEventListener('click', next);
    $('#btn-quit').addEventListener('click', quit);

    $('#btn-play-again').addEventListener('click', startGame);
    $('#btn-new-teams').addEventListener('click', () => { Sound.click(); toLobby(); });
    $('#btn-to-slides').addEventListener('click', () => { toLobby(); window.App && App.setMode('slides'); });
  }

  init();
  return { onEnter, onLeave, onKey, toLobby };
})();
