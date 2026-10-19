/* =====================================================================
   app.js — Mode switching, slide deck navigation, global shortcuts
   Shortcuts: ← → (slides) · Space (flip next card) · F fullscreen
              M mute · G switch mode · 1–4 answer (game) · Enter next
   ===================================================================== */
const App = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ------------------------------------------------------------------
  // MODES
  // ------------------------------------------------------------------
  const modes = { slides: $('#mode-slides'), game: $('#mode-game') };
  let mode = 'slides';

  function movePill() {
    const active = $('.mode-btn.active');
    const pill = $('.mode-pill');
    if (!active || !pill) return;
    pill.style.width = `${active.offsetWidth}px`;
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
  }

  function setMode(m) {
    if (m === mode || !modes[m]) return;
    mode = m;
    Sound.whoosh();
    modes.slides.classList.toggle('is-hidden', m !== 'slides');
    modes.game.classList.toggle('is-hidden', m !== 'game');
    document.body.classList.toggle('in-game', m === 'game');
    $$('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    movePill();
    if (m === 'game') Game.onEnter(); else Game.onLeave();
    history.replaceState(null, '', `#${m}`);
  }

  // ------------------------------------------------------------------
  // SLIDES
  // ------------------------------------------------------------------
  const deck = $('#mode-slides');
  const slides = $$('.slide', deck);
  const dotsWrap = $('#deck-dots');
  let cur = -1;

  dotsWrap.innerHTML = slides
    .map((s, i) => `<button class="dot" id="dot-${i + 1}" data-i="${i}" role="tab" aria-label="Slide ${i + 1}: ${s.dataset.title}"></button>`)
    .join('');
  const dots = $$('.dot', dotsWrap);
  const pad = (n) => String(n).padStart(2, '0');

  function goTo(i, silent = false) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    if (!silent && cur !== -1) Sound.whoosh();
    slides.forEach((s, k) => {
      s.classList.toggle('active', k === i);
      s.classList.toggle('before', k < i);
    });
    // reset flipped cards so they can be revealed again live
    $$('.flip.flipped', slides[i]).forEach((f) => f.classList.remove('flipped'));
    cur = i;

    deck.dataset.theme = slides[i].dataset.theme || 'both';
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
    $('#deck-progress').style.width = `${((i + 1) / slides.length) * 100}%`;
    $('#deck-count').innerHTML = `${pad(i + 1)} <span>/ ${pad(slides.length)}</span>`;
    $('#deck-title').textContent = slides[i].dataset.title || '';
    $('#btn-prev').disabled = i === 0;
    $('#btn-next').disabled = i === slides.length - 1;
  }

  /** Space bar: flip the next hidden card on the slide, or advance. */
  function revealNext() {
    const next = $$('.flip:not(.flipped)', slides[cur])[0];
    if (next) { next.classList.add('flipped'); Sound.flip(); }
    else goTo(cur + 1);
  }

  // Flip cards (click / Enter on focus)
  $$('.flip').forEach((card) => {
    card.addEventListener('click', () => { card.classList.toggle('flipped'); Sound.flip(); });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); card.classList.toggle('flipped'); Sound.flip(); }
    });
  });

  // Swipe support (touch screens / interactive boards)
  let sx = null;
  deck.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  deck.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 80 && e.pointerType !== 'mouse') goTo(cur + (dx < 0 ? 1 : -1));
  });

  // ------------------------------------------------------------------
  // BUTTONS
  // ------------------------------------------------------------------
  $$('.mode-btn').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#btn-prev').addEventListener('click', () => goTo(cur - 1));
  $('#btn-next').addEventListener('click', () => goTo(cur + 1));
  dotsWrap.addEventListener('click', (e) => {
    const d = e.target.closest('.dot');
    if (d) goTo(Number(d.dataset.i));
  });
  $('#btn-start-deck').addEventListener('click', () => goTo(1));
  $('#btn-cover-game').addEventListener('click', () => setMode('game'));
  $('#btn-launch').addEventListener('click', () => {
    Confetti.burst({ x: 0.5, y: 0.85, count: 140, speed: 20, spread: 90 });
    setMode('game');
    setTimeout(() => Sound.start(), 250);
  });

  const muteBtn = $('#btn-mute');
  function toggleMute() {
    const m = Sound.toggleMute();
    muteBtn.textContent = m ? '🔇' : '🔊';
  }
  muteBtn.addEventListener('click', toggleMute);

  const fsBtn = $('#btn-fullscreen');
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  }
  fsBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? '🗗' : '⛶';
    setTimeout(movePill, 50);
  });

  // Don't keep focus on clicked buttons (so Space / Enter don't re-trigger them)
  document.addEventListener('mouseup', () => {
    const a = document.activeElement;
    if (a && a.tagName === 'BUTTON') a.blur();
  });

  // Unlock audio on the first interaction (browser autoplay policy)
  const unlock = () => Sound.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // ------------------------------------------------------------------
  // KEYBOARD
  // ------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (k === 'f' || k === 'F') { toggleFullscreen(); return; }
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (k === 'g' || k === 'G') { setMode(mode === 'slides' ? 'game' : 'slides'); return; }

    if (mode === 'slides') {
      if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); goTo(cur + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); goTo(cur - 1); }
      else if (k === ' ') { e.preventDefault(); revealNext(); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(slides.length - 1); }
    } else {
      Game.onKey(e);
    }
  });

  window.addEventListener('resize', movePill);

  // ------------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------------
  goTo(0, true);
  requestAnimationFrame(movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  if (location.hash === '#game') setMode('game');

  return { setMode, goTo };
})();
