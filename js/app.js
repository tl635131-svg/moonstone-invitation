/* MOONSTONE — invitation behaviour */
(() => {
  'use strict';
  const D = window.INVITE, T = window.I18N;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(D.storage + ':' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(D.storage + ':' + k, JSON.stringify(v)); } catch {} },
  };

  /* ---------------- language ---------------- */
  let lang = store.get('lang', 'en');
  const t = (k) => (T[lang] && T[lang][k]) ?? T.en[k] ?? '';
  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-t]').forEach((el) => { const v = t(el.dataset.t); if (v) el.textContent = v; });
    $('.lang__alt').textContent = lang === 'en' ? T.si.lang : T.en.lang;
    renderHotels();
  }
  $('#langBtn').addEventListener('click', () => { lang = lang === 'en' ? 'si' : 'en'; store.set('lang', lang); applyLang(); });

  /* ---------------- hotels ---------------- */
  function renderHotels() {
    $('#hotels').innerHTML = D.hotels.map((h) => `
      <article class="hotel rv in">
        <h3>${h.name}</h3><p>${h.area}</p>
        <p class="rate">${h.rate} · ${t('stayPer')}</p>
        <div class="links">
          <a class="link" href="tel:${h.phone.replace(/\s/g, '')}">${t('call')}</a>
          <a class="link" target="_blank" rel="noopener" href="${maps(h.name + ', ' + h.area + ', Sri Lanka')}">${t('maps')}</a>
        </div>
      </article>`).join('');
  }
  const maps = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  $('#mapWed').href = maps(D.wedding.address);
  $('#mapHome').href = maps(D.homecoming.address);

  /* ---------------- lamp flames (positions over the lamp image, in %) ---------------- */
  const FLAMES = window.LAMP_FLAMES || [[50, 8]];
  $('#flames').innerHTML = FLAMES.map(([x, y], i) => `<i class="flame" style="left:${x}%;top:${y}%;animation-delay:${(-i * 0.37).toFixed(2)}s;transition-delay:${(i * 0.18).toFixed(2)}s"></i>`).join('');

  /* ---------------- music (generated live: soft pad + plucked pentatonic melody) ---------------- */
  let ctx, master, playing = false, melodyTimer;
  function startMusic() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // simple reverb from generated noise impulse
    const rev = ctx.createConvolver(); const len = ctx.sampleRate * 3.2; const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = buf; const wet = ctx.createGain(); wet.gain.value = 0.55; rev.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.6; dry.connect(master);
    // drone pad (tanpura-like D + A)
    [146.83, 220, 293.66].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 6;
      lp.type = 'lowpass'; lp.frequency.value = 520; g.gain.value = 0.028;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(lp); lp.connect(g); g.connect(rev); g.connect(dry); o.start();
    });
    // plucked melody, D major pentatonic, gentle and slow
    const scale = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25, 739.99];
    const phrase = [0, 2, 3, 4, 3, 2, 5, 4, 3, 2, 1, 0, 2, 3, 5, 6, 5, 4, 3, 2];
    let step = 0;
    const pluck = (f, when, vel) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2;
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, when); lp.frequency.exponentialRampToValueAtTime(700, when + 1.2);
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vel, when + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, when + 2.6);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(rev); g.connect(dry);
      o.start(when); o2.start(when); o.stop(when + 2.8); o2.stop(when + 2.8);
    };
    const tick = () => {
      if (!playing) return;
      const now = ctx.currentTime;
      const n = phrase[step % phrase.length];
      pluck(scale[n], now + 0.05, step % 4 === 0 ? 0.11 : 0.075);
      if (step % 8 === 0) pluck(scale[n] / 2, now + 0.05, 0.05);
      step++;
      melodyTimer = setTimeout(tick, step % 4 === 3 ? 1150 : 760);
    };
    restartMelody = tick;
    playing = true; tick();
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
    const btn = $('#musicBtn'); btn.hidden = false;
  }
  function setMusic(on) {
    if (!ctx) return;
    playing = on; $('#musicBtn').classList.toggle('off', !on);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.8);
    clearTimeout(melodyTimer);
    if (on) { ctx.resume(); restartMelody(); }
  }
  let restartMelody = () => {};
  $('#musicBtn').addEventListener('click', () => {
    setMusic(!playing); store.set('muted', !playing);
    const f = document.getElementById('envFilm'); if (f) f.muted = !playing;
  });

  /* ---------------- opening ---------------- */
  const env = $('#env');
  document.body.classList.add('locked');
  let opened = false;
  const after = (ms, fn) => setTimeout(fn, reduce ? 0 : ms);
  function reveal() {   // shared ending: envelope layer fades into the hero
    env.classList.add('s5'); document.body.classList.remove('locked'); document.body.classList.add('opened');
    after(900, () => { env.remove(); document.body.classList.add('lit'); startPetals(); });
  }

  /* filmed opening (Google Flow clip). The paper envelope stays as the fallback. */
  const film = $('#envFilm');
  let filmOn = !!film && !reduce && film.canPlayType('video/mp4') !== '';
  if (filmOn) {
    env.classList.add('env--film');
    film.addEventListener('error', () => { if (!opened) dropFilm(); }, true);
  }
  function dropFilm() { filmOn = false; env.classList.remove('env--film', 'named'); if (film) { film.pause(); film.remove(); } }

  let filmDone = false;
  function finishFilm() {
    if (filmDone) return; filmDone = true;
    env.classList.add('named');
    after(1100, reveal);
  }
  function playFilm() {
    env.classList.add('s1');
    film.muted = store.get('muted', false);
    film.volume = 0.85;
    let started = false;
    const stall = setTimeout(() => { if (!started) { dropFilm(); cssOpen(); } }, 3500);
    film.addEventListener('playing', () => { started = true; clearTimeout(stall); }, { once: true });
    film.addEventListener('timeupdate', () => {
      if (film.duration && film.currentTime > film.duration - 1.5) env.classList.add('named');
    });
    film.addEventListener('ended', finishFilm, { once: true });
    const p = film.play();
    if (p && p.catch) p.catch(() => { film.muted = true; film.play().catch(() => { clearTimeout(stall); dropFilm(); cssOpen(); }); });
    // a second tap skips to the names
    env.addEventListener('click', () => {
      if (started && !filmDone && film.duration && film.currentTime < film.duration - 1.2) film.currentTime = film.duration - 1.2;
    });
  }

  function open() {
    if (opened) return; opened = true;
    if (!store.get('muted', false)) startMusic();
    if (filmOn) playFilm(); else cssOpen();
  }
  function cssOpen() {
    env.classList.add('s1');
    after(450, () => env.classList.add('s2'));
    after(950, () => env.classList.add('s3'));
    after(1500, () => env.classList.add('s3b'));
    after(1900, () => env.classList.add('s4'));
    after(2650, () => env.classList.add('s4b'));   // envelope drops away, the whole card shows
    after(3450, () => env.classList.add('s4c'));   // card opens up to fill the screen
    after(4400, () => { env.classList.add('s5'); document.body.classList.remove('locked'); document.body.classList.add('opened'); });
    after(5300, () => { env.remove(); document.body.classList.add('lit'); startPetals(); });
  }
  env.addEventListener('click', open);
  env.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

  /* ---------------- petals ---------------- */
  function startPetals() {
    if (reduce) return;
    const box = $('#petals');
    box.innerHTML = Array.from({ length: 8 }, () => {
      const left = Math.random() * 100, d = 11 + Math.random() * 9, dl = -Math.random() * 20, s = 0.6 + Math.random() * 0.7;
      return `<i class="petal" style="left:${left}%;--d:${d}s;--dl:${dl}s;scale:${s}"></i>`;
    }).join('');
  }
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('hidden-tab', document.hidden);
    if (ctx) { if (document.hidden) ctx.suspend(); else if (playing) ctx.resume(); }
  });

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach((el) => io.observe(el));

  /* ---------------- countdown ---------------- */
  const target = new Date(D.wedding.start).getTime();
  const cdB = $$('#countdown b');
  const cd = () => {
    let s = Math.floor((target - Date.now()) / 1000);
    if (s <= 0) { $('#countdown').hidden = true; $('#cdDone').hidden = false; return; }
    const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
    cdB.forEach((b, i) => { b.textContent = String(v[i]).padStart(2, '0'); });
  };
  cd(); setInterval(cd, 1000);

  /* ---------------- calendar (.ics) ---------------- */
  const icsDate = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  $$('[data-ics]').forEach((b) => b.addEventListener('click', () => {
    const ev = D[b.dataset.ics];
    const title = b.dataset.ics === 'wedding' ? `${T.en.name1} & ${T.en.name2} — Wedding (Poruwa 9.41 a.m.)` : `${T.en.name1} & ${T.en.name2} — Homecoming`;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moonstone//Invitation//EN', 'BEGIN:VEVENT',
      'UID:' + b.dataset.ics + '-' + target + '@moonstone', 'DTSTAMP:' + icsDate(new Date().toISOString()),
      'DTSTART:' + icsDate(ev.start), 'DTEND:' + icsDate(ev.end), 'SUMMARY:' + title,
      'LOCATION:' + ev.venue + ', ' + ev.address, 'DESCRIPTION:You are warmly invited.',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = b.dataset.ics + '.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }));

  /* ---------------- scratch to reveal ---------------- */
  (function scratch() {
    const box = $('#scratch'), cv = $('#scratchCanvas'), g = cv.getContext('2d');
    let drawing = false, done = false, last = null;
    const paint = () => {
      const r = box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gr = g.createLinearGradient(0, 0, r.width, r.height);
      gr.addColorStop(0, '#b68a3e'); gr.addColorStop(0.35, '#f3dca2'); gr.addColorStop(0.55, '#c49a50'); gr.addColorStop(0.8, '#f0d595'); gr.addColorStop(1, '#a87a2e');
      g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, r.width, r.height);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(Math.random() * r.width, Math.random() * r.height, 1.2, 1.2); }
      g.fillStyle = 'rgba(90,26,31,.75)'; g.textAlign = 'center';
      g.font = '500 13px Jost, sans-serif'; g.fillText('✦', r.width / 2, r.height / 2 - 14);
      g.font = (lang === 'si' ? '600 17px "Abhaya Libre"' : 'italic 500 20px "Cormorant Garamond"');
      g.fillText(lang === 'si' ? 'සීරීමට' : 'Scratch here', r.width / 2, r.height / 2 + 14);
    };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const line = (a, b) => { g.globalCompositeOperation = 'destination-out'; g.lineWidth = 46; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
    const check = () => {
      const { data } = g.getImageData(0, 0, cv.width, cv.height); let clear = 0, n = 0;
      for (let i = 3; i < data.length; i += 64) { n++; if (data[i] < 40) clear++; }
      if (clear / n > 0.5) finish();
    };
    const finish = () => {
      if (done) return; done = true; box.classList.add('done');
      const burst = $('#burst');
      burst.innerHTML = Array.from({ length: 22 }, () => { const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 110; return `<i style="--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--r:${Math.random() * 540}deg"></i>`; }).join('');
    };
    cv.addEventListener('pointerdown', (e) => { if (done) return; drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); line(last, { x: last.x + 0.1, y: last.y }); });
    cv.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pos(e); line(last, p); last = p; });
    const up = () => { if (drawing) { drawing = false; check(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    document.fonts.ready.then(paint); addEventListener('resize', () => { if (!done) paint(); });
    $('#langBtn').addEventListener('click', () => { if (!done) setTimeout(paint, 30); });
  })();

  /* ---------------- gift flip + copy ---------------- */
  const flip = $('#flip');
  flip.addEventListener('click', (e) => { if (e.target.closest('#copyBtn')) return; flip.classList.toggle('on'); });
  flip.addEventListener('keydown', (e) => { if (e.key === 'Enter') flip.classList.toggle('on'); });
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1800); };
  $('#copyBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const txt = t('giftBank') + ' · ' + t('giftAcc');
    try { await navigator.clipboard.writeText(txt); } catch {}
    toast(t('copied') + ' ✓');
  });

  /* ---------------- RSVP ---------------- */
  const form = $('#rsvpForm'), sent = $('#sent');
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const inp = form.guests; inp.value = Math.min(10, Math.max(1, (+inp.value || 1) + +b.dataset.step));
  });
  const draft = store.get('draft', null);
  if (draft) Object.entries(draft).forEach(([k, v]) => { const el = form.elements[k]; if (!el) return; if (el instanceof RadioNodeList) el.value = v; else if (el.type === 'checkbox') el.checked = v; else el.value = v; });
  const collect = () => ({ name: form.name.value.trim(), phone: form.phone.value.trim(), attend: form.attend.value, guests: form.guests.value, diet: form.diet.value, coach: form.coach.checked, note: form.note.value.trim() });
  form.addEventListener('input', () => store.set('draft', collect()));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = collect();
    form.name.classList.toggle('err', !data.name);
    if (!data.name || !data.attend) { toast(lang === 'si' ? 'කරුණාකර නම සහ පැමිණීම තෝරන්න' : 'Please add your name and choose an option'); return; }
    const btn = form.querySelector('.btn'); btn.disabled = true;
    // DEMO: no backend — store locally. Replace with fetch(endpoint, {method:'POST', body: JSON.stringify(data)}) in production.
    setTimeout(() => { store.set('rsvp', { ...data, at: new Date().toISOString() }); form.hidden = true; sent.hidden = false; btn.disabled = false; }, 700);
  });
  $('#editRsvp').addEventListener('click', () => { sent.hidden = true; form.hidden = false; });
  if (store.get('rsvp', null)) { form.hidden = true; sent.hidden = false; }

  applyLang();
})();
