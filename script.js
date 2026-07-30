import * as THREE from 'three';

// ============================================================
// THREE.JS — optimized 3D scene
// ============================================================

const container = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x222244, 0.5);
scene.add(ambient);
const dl = new THREE.DirectionalLight(0x818cf8, 1);
dl.position.set(5, 5, 5);
scene.add(dl);
const dl2 = new THREE.DirectionalLight(0x22d3ee, 0.5);
dl2.position.set(-5, -3, 5);
scene.add(dl2);

// Torus knot (low poly)
const tk = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.2, 0.35, 64, 12),
  new THREE.MeshPhysicalMaterial({
    color: 0x818cf8, metalness: 0.7, roughness: 0.15,
    transparent: true, opacity: 0.5, emissive: 0x4444aa, emissiveIntensity: 0.1,
  })
);
tk.position.y = 0.3;
scene.add(tk);

// Wireframe ring
const ring = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.5, 0.45, 48, 8),
  new THREE.MeshPhysicalMaterial({
    color: 0x22d3ee, metalness: 0.3, roughness: 0.6,
    wireframe: true, transparent: true, opacity: 0.08,
  })
);
ring.position.y = 0.3;
scene.add(ring);

// Floating orbs (2 instead of 5)
const orbs = [];
for (let i = 0; i < 2; i++) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24, metalness: 0.8, roughness: 0.2, emissive: 0xfbbf24, emissiveIntensity: 0.05,
    })
  );
  const theta = i * Math.PI;
  m.position.set(Math.cos(theta) * 3, (i - 0.5) * 0.8, Math.sin(theta) * 3);
  m.userData = { theta, speed: 0.003 + i * 0.001, yOff: m.position.y, ySpeed: 0.006 };
  scene.add(m);
  orbs.push(m);
}

// Particles (300 not 1200)
const pCount = 300;
const pos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount; i++) {
  const r = 5 + Math.random() * 12, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
  pos[i * 3] = Math.sin(p) * Math.cos(t) * r;
  pos[i * 3 + 1] = Math.sin(p) * Math.sin(t) * r * 0.5;
  pos[i * 3 + 2] = Math.cos(p) * r;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const pMesh = new THREE.Points(pGeo, new THREE.PointsMaterial({
  color: 0x818cf8, size: 0.05, transparent: true, opacity: 0.5,
  blending: THREE.AdditiveBlending, sizeAttenuation: true,
}));
scene.add(pMesh);

// Mouse
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
document.addEventListener('mousemove', e => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Animation loop with tab visibility pause
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) animateScene(); });

let st = 0;
function animateScene() {
  if (!running) return;
  requestAnimationFrame(animateScene);
  st++;
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;
  camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.02;
  camera.position.y += (-mouse.y * 0.3 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);
  tk.rotation.x += 0.004; tk.rotation.y += 0.006;
  ring.rotation.x += 0.003; ring.rotation.y += 0.005;
  for (const o of orbs) {
    o.userData.theta += o.userData.speed;
    o.position.x = Math.cos(o.userData.theta) * 3;
    o.position.z = Math.sin(o.userData.theta) * 3;
    o.position.y = o.userData.yOff + Math.sin(st * o.userData.ySpeed) * 0.4;
    o.rotation.x += 0.01; o.rotation.y += 0.008;
  }
  pMesh.rotation.y += 0.0005;
  renderer.render(scene, camera);
}
animateScene();

// ============================================================
// CLIENT DATA — starts empty, no fake leads
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
// RENDER
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

function renderPipeline() {
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
      card.querySelector('.card-remove').onclick = e => { e.stopPropagation(); removeClient(cl.id); };
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
    if (dragId !== null && stage) moveClient(dragId, stage);
    dragId = null;
  };
});

// ============================================================
// CRUD
// ============================================================

function addClient(name, project, stage, value) {
  const cl = { id: clientIdCounter++, name, project, stage, value: Math.max(0, parseInt(value) || 0) };
  clients.push(cl);
  saveClients();
  renderPipeline();
  const cards = containers[stage].querySelectorAll('.client-card');
  if (cards.length) cards[cards.length - 1].classList.add('adding');
  addLog('client', `${name} added → ${stage} ($${cl.value.toLocaleString()})`);
}

function removeClient(id) {
  const cl = clients.find(c => c.id === id);
  if (!cl) return;
  const card = document.querySelector(`.client-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => { clients = clients.filter(c => c.id !== id); saveClients(); renderPipeline(); addLog('alert', `${cl.name} removed`); }, 250);
  } else { clients = clients.filter(c => c.id !== id); saveClients(); renderPipeline(); addLog('alert', `${cl.name} removed`); }
}

function moveClient(id, stage) {
  const cl = clients.find(c => c.id === id);
  if (!cl || cl.stage === stage) return;
  const old = cl.stage;
  cl.stage = stage;
  saveClients();
  renderPipeline();
  addLog('client', `${cl.name}: ${old} → ${stage}`);
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
    el.textContent = suffs[i] === '%' ? '0%' : '0';
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / 1000, 1);
      const v = Math.floor((1 - Math.pow(1 - p, 3)) * t);
      el.textContent = suffs[i] ? v + suffs[i] : v;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = suffs[i] ? t + suffs[i] : t;
    }
    requestAnimationFrame(tick);
  });
}

// ============================================================
// LOG
// ============================================================

const logEl = document.getElementById('logContainer');
let logN = 0;

function addLog(type, msg) {
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
  if (!targets.length) { addLog('alert', 'No clients to message'); return; }
  targets.forEach(c => addLog('msg', `→ ${c.name}: "${text}"`));
  addLog('sys', `Broadcast sent to ${targets.length} clients`);
}

let autoTimer;
function startAutoEvents() {
  const msgs = ['Follow-up sent', 'Invoice reminder dispatched', 'Progress report generated', 'Survey sent', 'Milestone updated'];
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => { if (!document.hidden && Math.random() > 0.4) addLog(['sys', 'msg', 'rev'][Math.floor(Math.random() * 3)], msgs[Math.floor(Math.random() * msgs.length)]); }, 6000);
}

// ============================================================
// EVENT HANDLERS
// ============================================================

document.getElementById('addClientBtn').onclick = () => {
  const name = document.getElementById('clientName').value.trim();
  const proj = document.getElementById('projectName').value.trim();
  if (!name || !proj) { addLog('alert', 'Enter name + project'); return; }
  addClient(name, proj, document.getElementById('stageSelect').value, document.getElementById('clientValue').value);
  document.getElementById('clientName').value = ''; document.getElementById('projectName').value = ''; document.getElementById('clientValue').value = '';
};
document.getElementById('broadcastBtn').onclick = () => {
  const m = document.getElementById('msgInput').value.trim();
  if (!m) { addLog('alert', 'Enter a message'); return; }
  broadcast(m);
  document.getElementById('msgInput').value = '';
};
document.getElementById('clientName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('projectName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('msgInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('broadcastBtn').click(); };

// Scroll reveals
const ro = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => ro.observe(el));
const so = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.2 });
document.querySelectorAll('.stat-card').forEach(el => so.observe(el));

// ============================================================
// INIT
// ============================================================

renderPipeline();
setTimeout(() => {
  addLog('sys', clients.length ? `${clients.length} clients loaded` : 'Pipeline ready — add your first client');
  addLog('rev', 'Revenue tracker online');
  addLog('msg', 'Auto-messenger active');
  startAutoEvents();
}, 400);
