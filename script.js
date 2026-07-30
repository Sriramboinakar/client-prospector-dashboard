// ============================================================
// 2D CANVAS BACKGROUND — lightweight particles + connections
// ============================================================

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
}
resize();
addEventListener('resize', resize);

const particles = [];
const PCOUNT = 80;
const CONN_DIST = 120;

function rand(a, b) { return a + Math.random() * (b - a); }

for (let i = 0; i < PCOUNT; i++) {
  particles.push({
    x: rand(0, W), y: rand(0, H),
    vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2),
    r: rand(0.5, 2),
    alpha: rand(0.2, 0.6),
    hue: rand(220, 280),
  });
}

// Mouse parallax offset
let mx = 0, my = 0, tmx = 0, tmy = 0;
document.addEventListener('mousemove', e => {
  tmx = (e.clientX / W - 0.5) * 2;
  tmy = (e.clientY / H - 0.5) * 2;
});

let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) draw(); });

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);

  mx += (tmx - mx) * 0.03;
  my += (tmy - my) * 0.03;

  ctx.clearRect(0, 0, W, H);

  // Update and draw particles
  const par = mx * 8, offY = my * 5;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = W + 10;
    if (p.x > W + 10) p.x = -10;
    if (p.y < -10) p.y = H + 10;
    if (p.y > H + 10) p.y = -10;
  }

  // Draw connections first (behind)
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = (a.x + par) - (b.x + par);
      const dy = (a.y + offY) - (b.y + offY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONN_DIST) {
        const alpha = (1 - dist / CONN_DIST) * 0.15;
        ctx.beginPath();
        ctx.moveTo(a.x + par, a.y + offY);
        ctx.lineTo(b.x + par, b.y + offY);
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Draw particles
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x + par, p.y + offY, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.alpha})`;
    ctx.fill();
    // subtle glow
    ctx.beginPath();
    ctx.arc(p.x + par, p.y + offY, p.r * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.alpha * 0.1})`;
    ctx.fill();
  }
}

draw();

// ============================================================
// CLIENT DATA — empty, no fake leads
// ============================================================

const STORAGE_KEY = 'sriram-clients';
let clientIdCounter = 1;

function loadClients() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    if (d) { const p = JSON.parse(d); if (Array.isArray(p)) return p; }
  } catch {}
  return [];
}
function saveClients() { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }

let clients = loadClients();
if (clients.length) clientIdCounter = Math.max(...clients.map(c => c.id)) + 1;

// ============================================================
// RENDER PIPELINE
// ============================================================

const containers = {
  lead: document.getElementById('leadContainer'),
  active: document.getElementById('activeContainer'),
  completed: document.getElementById('completedContainer'),
};
const counters = {
  lead: document.getElementById('leadCount'),
  active: document.getElementById('activeCount'),
  completed: document.getElementById('completedCount'),
};
let dragId = null;

function render() {
  for (const stage of ['lead', 'active', 'completed']) {
    const c = containers[stage];
    const items = clients.filter(x => x.stage === stage);
    c.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'col-empty';
      e.textContent = 'Drop a client here';
      c.appendChild(e);
    } else for (const cl of items) {
      const card = document.createElement('div');
      card.className = 'client-card';
      card.draggable = true;
      card.dataset.id = cl.id;
      card.innerHTML = `<div class="card-name">${esc(cl.name)}</div><div class="card-project">${esc(cl.project)}</div><div class="card-value">$${cl.value.toLocaleString()}</div><button class="card-remove">×</button>`;
      card.querySelector('.card-remove').onclick = e => { e.stopPropagation(); remove(cl.id); };
      card.onmousemove = e => {
        const r = card.getBoundingClientRect();
        card.style.transform = `perspective(600px) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 6}deg) rotateX(${(-(e.clientY - r.top) / r.height + 0.5) * 6}deg) translateY(-2px)`;
      };
      card.onmouseleave = () => { card.style.transform = ''; };
      card.ondragstart = e => { dragId = cl.id; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; };
      card.ondragend = () => { dragId = null; card.classList.remove('dragging'); document.querySelectorAll('.col-body').forEach(el => el.classList.remove('drag-over')); };
      c.appendChild(card);
    }
    counters[stage].textContent = items.length;
  }
  updateStats();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

document.querySelectorAll('.col-body').forEach(el => {
  el.ondragover = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drag-over'); };
  el.ondragleave = () => el.classList.remove('drag-over');
  el.ondrop = e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    const stage = el.closest('.pipeline-col').dataset.stage;
    if (dragId !== null && stage) move(dragId, stage);
    dragId = null;
  };
});

// ============================================================
// CRUD
// ============================================================

function add(name, project, stage, value) {
  const cl = { id: clientIdCounter++, name, project, stage, value: Math.max(0, parseInt(value) || 0) };
  clients.push(cl);
  saveClients();
  render();
  const cards = containers[stage].querySelectorAll('.client-card');
  if (cards.length) cards[cards.length - 1].classList.add('adding');
  log('client', `${name} added → ${stage} ($${cl.value.toLocaleString()})`);
}

function remove(id) {
  const cl = clients.find(c => c.id === id);
  if (!cl) return;
  const card = document.querySelector(`.client-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => { clients = clients.filter(c => c.id !== id); saveClients(); render(); log('alert', `${cl.name} removed`); }, 250);
  } else { clients = clients.filter(c => c.id !== id); saveClients(); render(); log('alert', `${cl.name} removed`); }
}

function move(id, stage) {
  const cl = clients.find(c => c.id === id);
  if (!cl || cl.stage === stage) return;
  const old = cl.stage;
  cl.stage = stage;
  saveClients();
  render();
  log('client', `${cl.name}: ${old} → ${stage}`);
}

// ============================================================
// STATS
// ============================================================

const statEls = document.querySelectorAll('.stat-num');

function updateStats() {
  const total = clients.length;
  const revenue = clients.reduce((s, c) => s + c.value, 0);
  const active = clients.filter(c => c.stage === 'active').length;
  const sat = clients.length ? Math.min(98, 70 + Math.floor(Math.random() * 25)) : 0;
  const vals = [total, revenue, active, sat];
  const suffs = ['', '', '', '%'];
  statEls.forEach((el, i) => {
    const t = vals[i];
    el.textContent = '0' + suffs[i];
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / 1000, 1);
      const v = Math.floor((1 - Math.pow(1 - p, 3)) * t);
      el.textContent = v + suffs[i];
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = t + suffs[i];
    }
    requestAnimationFrame(tick);
  });
}

// ============================================================
// ACTIVITY LOG
// ============================================================

const logEl = document.getElementById('logContainer');
let logN = 0;

function log(type, msg) {
  const e = document.createElement('div');
  e.className = `log-entry ${type}`;
  const icons = { sys: '◆', client: '●', msg: '▶', rev: '◆', alert: '⚠' };
  const labels = { sys: 'System', client: 'Client', msg: 'Message', rev: 'Revenue', alert: 'Alert' };
  const m = Math.floor(logN * 0.3), s = Math.floor((logN * 0.3 - m) * 60);
  e.innerHTML = `<span class="log-icon">${icons[type] || '·'}</span><span class="log-time">${m}:${s.toString().padStart(2, '0')}</span><span class="log-agent">${labels[type] || 'System'}</span><span class="log-msg">${esc(msg)}</span>`;
  logEl.appendChild(e);
  logEl.scrollTop = logEl.scrollHeight;
  logN++;
  while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
}

function broadcast(text) {
  const targets = clients.filter(c => c.stage === 'active' || c.stage === 'lead');
  if (!targets.length) { log('alert', 'No clients to message'); return; }
  targets.forEach(c => log('msg', `→ ${c.name}: "${text}"`));
  log('sys', `Broadcast sent to ${targets.length} clients`);
}

let autoTimer;
function startAuto() {
  const msgs = ['Follow-up sent', 'Invoice reminder dispatched', 'Progress report generated', 'Survey sent', 'Milestone updated'];
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (!document.hidden && Math.random() > 0.5) log(['sys', 'msg', 'rev'][Math.floor(Math.random() * 3)], msgs[Math.floor(Math.random() * msgs.length)]);
  }, 8000);
}

// ============================================================
// EVENTS
// ============================================================

document.getElementById('addClientBtn').onclick = () => {
  const name = document.getElementById('clientName').value.trim();
  const proj = document.getElementById('projectName').value.trim();
  if (!name || !proj) { log('alert', 'Enter name + project'); return; }
  add(name, proj, document.getElementById('stageSelect').value, document.getElementById('clientValue').value);
  document.getElementById('clientName').value = ''; document.getElementById('projectName').value = ''; document.getElementById('clientValue').value = '';
};
document.getElementById('broadcastBtn').onclick = () => {
  const m = document.getElementById('msgInput').value.trim();
  if (!m) { log('alert', 'Enter a message'); return; }
  broadcast(m);
  document.getElementById('msgInput').value = '';
};
document.getElementById('clientName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('projectName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('msgInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('broadcastBtn').click(); };

const ro = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => ro.observe(el));
const so = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.2 });
document.querySelectorAll('.stat-card').forEach(el => so.observe(el));

// ============================================================
// INIT
// ============================================================

render();
setTimeout(() => {
  log('sys', clients.length ? `${clients.length} clients loaded` : 'Pipeline ready — add your first client');
  log('rev', 'Revenue tracker online');
  log('msg', 'Auto-messenger active');
  startAuto();
}, 400);
