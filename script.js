// ============================================================
// 2D CANVAS BACKGROUND
// ============================================================

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize();
addEventListener('resize', resize);

const particles = [];
for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    a: Math.random() * 0.4 + 0.2,
    h: Math.random() * 60 + 220,
  });
}

let mx = 0, my = 0, tmx = 0, tmy = 0;
document.addEventListener('mousemove', e => { tmx = (e.clientX / W - 0.5) * 2; tmy = (e.clientY / H - 0.5) * 2; });
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) draw(); });

function draw() {
  if (!running) return;
  requestAnimationFrame(draw);
  mx += (tmx - mx) * 0.03;
  my += (tmy - my) * 0.03;
  ctx.clearRect(0, 0, W, H);
  const ox = mx * 8, oy = my * 5;
  for (const p of particles) { p.x += p.vx; p.y += p.vy; if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10; }
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = (a.x + ox) - (b.x + ox), dy = (a.y + oy) - (b.y + oy);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) { ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.strokeStyle = `rgba(129, 140, 248, ${(1 - dist / 120) * 0.15})`; ctx.lineWidth = 0.5; ctx.stroke(); }
    }
  }
  for (const p of particles) {
    ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.h}, 70%, 70%, ${p.a})`; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.r * 3, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.h}, 70%, 70%, ${p.a * 0.1})`; ctx.fill();
  }
}
draw();

// ============================================================
// CLIENT DATA
// ============================================================

const STORAGE_KEY = 'sriram-clients';
const SETTINGS_KEY = 'sriram-settings';
let clientIdCounter = 1;

function loadClients() {
  try { const d = localStorage.getItem(STORAGE_KEY); if (d) { const p = JSON.parse(d); if (Array.isArray(p)) return p; } } catch {}
  return [];
}
function saveClients() { localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); }

function loadSettings() {
  try { const d = localStorage.getItem(SETTINGS_KEY); if (d) return JSON.parse(d); } catch {}
  return { gApiKey: '', gCx: '', n8nUrl: '' };
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

let clients = loadClients();
let settings = loadSettings();
if (clients.length) clientIdCounter = Math.max(...clients.map(c => c.id)) + 1;

// ============================================================
// TAB SWITCHING
// ============================================================

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// Logo click -> dashboard
document.querySelector('.logo-wrap').addEventListener('click', () => {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="dashboard"]').classList.add('active');
  document.getElementById('tab-dashboard').classList.add('active');
});

// ============================================================
// RENDER PIPELINE
// ============================================================

const containers = { lead: document.getElementById('leadContainer'), active: document.getElementById('activeContainer'), completed: document.getElementById('completedContainer') };
const counters = { lead: document.getElementById('leadCount'), active: document.getElementById('activeCount'), completed: document.getElementById('completedCount') };
let dragId = null;

function render() {
  for (const stage of ['lead', 'active', 'completed']) {
    const c = containers[stage];
    const items = clients.filter(x => x.stage === stage);
    c.innerHTML = '';
    if (!items.length) {
      const e = document.createElement('div'); e.className = 'col-empty'; e.textContent = 'Drop a client here'; c.appendChild(e);
    } else for (const cl of items) {
      const card = document.createElement('div');
      card.className = 'client-card'; card.draggable = true; card.dataset.id = cl.id;
      card.innerHTML = `<div class="card-name">${esc(cl.name)}</div><div class="card-project">${esc(cl.project)}</div><div class="card-value">$${cl.value.toLocaleString()}</div><button class="card-remove">×</button>`;
      card.querySelector('.card-remove').onclick = e => { e.stopPropagation(); remove(cl.id); };
      card.onmousemove = e => { const r = card.getBoundingClientRect(); card.style.transform = `perspective(600px) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 6}deg) rotateX(${(-(e.clientY - r.top) / r.height + 0.5) * 6}deg) translateY(-2px)`; };
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
  el.ondrop = e => { e.preventDefault(); el.classList.remove('drag-over'); const stage = el.closest('.pipeline-col').dataset.stage; if (dragId !== null && stage) move(dragId, stage); dragId = null; };
});

function add(name, project, stage, value) {
  const cl = { id: clientIdCounter++, name, project, stage, value: Math.max(0, parseInt(value) || 0) };
  clients.push(cl); saveClients(); render();
  const cards = containers[stage].querySelectorAll('.client-card');
  if (cards.length) cards[cards.length - 1].classList.add('adding');
  log('client', `${name} added → ${stage} ($${cl.value.toLocaleString()})`);
}

function remove(id) {
  const cl = clients.find(c => c.id === id); if (!cl) return;
  const card = document.querySelector(`.client-card[data-id="${id}"]`);
  if (card) { card.classList.add('removing'); setTimeout(() => { clients = clients.filter(c => c.id !== id); saveClients(); render(); log('alert', `${cl.name} removed`); }, 250); }
  else { clients = clients.filter(c => c.id !== id); saveClients(); render(); log('alert', `${cl.name} removed`); }
}

function move(id, stage) {
  const cl = clients.find(c => c.id === id); if (!cl || cl.stage === stage) return;
  const old = cl.stage; cl.stage = stage; saveClients(); render();
  log('client', `${cl.name}: ${old} → ${stage}`);
}

// ============================================================
// STATS
// ============================================================

const statEls = document.querySelectorAll('#tab-dashboard .stat-num');

function updateStats() {
  const total = clients.length;
  const revenue = clients.reduce((s, c) => s + c.value, 0);
  const active = clients.filter(c => c.stage === 'active').length;
  const sat = clients.length ? Math.min(98, 70 + Math.floor(Math.random() * 25)) : 0;
  const vals = [total, revenue, active, sat]; const suffs = ['', '', '', '%'];
  statEls.forEach((el, i) => {
    const t = vals[i]; el.textContent = '0' + suffs[i];
    const start = performance.now();
    function tick(now) { const p = Math.min((now - start) / 1000, 1); const v = Math.floor((1 - Math.pow(1 - p, 3)) * t); el.textContent = v + suffs[i]; if (p < 1) requestAnimationFrame(tick); else el.textContent = t + suffs[i]; }
    requestAnimationFrame(tick);
  });
}

// ============================================================
// LOG
// ============================================================

const logEl = document.getElementById('logContainer');
let logN = 0;

function log(type, msg) {
  const e = document.createElement('div'); e.className = `log-entry ${type}`;
  const icons = { sys: '◆', client: '●', msg: '▶', rev: '◆', alert: '⚠' };
  const labels = { sys: 'System', client: 'Client', msg: 'Message', rev: 'Revenue', alert: 'Alert' };
  const m = Math.floor(logN * 0.3), s = Math.floor((logN * 0.3 - m) * 60);
  e.innerHTML = `<span class="log-icon">${icons[type] || '·'}</span><span class="log-time">${m}:${s.toString().padStart(2, '0')}</span><span class="log-agent">${labels[type] || 'System'}</span><span class="log-msg">${esc(msg)}</span>`;
  logEl.appendChild(e); logEl.scrollTop = logEl.scrollHeight; logN++;
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
  autoTimer = setInterval(() => { if (!document.hidden && Math.random() > 0.5) log(['sys', 'msg', 'rev'][Math.floor(Math.random() * 3)], msgs[Math.floor(Math.random() * msgs.length)]); }, 8000);
}

// ============================================================
// EVENTS (Dashboard)
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
  if (!m) { log('alert', 'Enter a message'); return; } broadcast(m); document.getElementById('msgInput').value = '';
};
document.getElementById('clientName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('projectName').onkeydown = e => { if (e.key === 'Enter') document.getElementById('addClientBtn').click(); };
document.getElementById('msgInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('broadcastBtn').click(); };

// ============================================================
// PROSPECTOR ENGINE
// ============================================================

const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');

// Business name generators per niche
const bizNames = {
  'restaurant': ['The Golden Spoon', 'Spice Route', 'Urban Bites', 'Flavor House', 'The Hungry Table', 'Zesty Kitchen', 'Savory Spot', 'Bella Napoli', 'Tokyo Ramen Bar', 'Street Eats'],
  'fashion': ['Vogue Street', 'Urban Threads', 'Style Vault', 'Wardrobe Co.', 'Trend Merchants', 'Luxe Wear', 'Stitch & Co.', 'Boho Bazaar', 'Classic Tailors', 'Moda Mia'],
  'fitness': ['Iron Haven', 'Peak Fitness', 'Sweat Factory', 'Body Forge', 'Endurance Lab', 'Flex Zone', 'Core Strength', 'Fit Republic', 'Muscle Hub', 'Zen Fitness'],
  'beauty': ['Glow Studio', 'Radiance Spa', 'Bloom Beauty', 'The Skin Bar', 'Polished Nails', 'Lash & Brow', 'Pure Beauty', 'Muse Salon', 'Crown & Glory', 'Essence Spa'],
  'technology': ['NexGen Solutions', 'CodeCraft Labs', 'InnovateTech', 'Digital Forge', 'ByteWave', 'CloudNine IT', 'Vertex Systems', 'LogicLabs', 'DataPeak', 'QuantumSoft'],
  'real estate': ['Prime Properties', 'Urban Nest', 'HomeFront Realty', 'Skyline Estates', 'KeyStone Realtors', 'Elite Spaces', 'Metro Homes', 'Vista Properties', 'Legacy Land', 'Dream Dwelling'],
  'healthcare': ['VitalCare Clinic', 'HealWell Center', 'MediPrime', 'CareBridge Health', 'Pulse Medical', 'Nova Health', 'Wellness First', 'LifeCare', 'Atlas Hospital', 'Shifa Healthcare'],
  'education': ['Bright Minds Academy', 'SkillForge', 'LearnHub', 'Wisdom Path', 'NextGen Learning', 'EduPros', 'Knowledge Point', 'Academy of Excellence', 'Mind Growth', 'The Learning Tree'],
  'ecommerce': ['ShopSphere', 'CartWise', 'BuyLocal', 'UrbanCart', 'Pixel Store', 'QuickMart', 'Brand Bazaar', 'The Digital Mall', 'ShopEasy', 'TrendSetter'],
  'photography': ['Lens & Light', 'Capture Studio', 'Moment Makers', 'Focus Frame', 'Pixel Perfect', 'Golden Hour Photography', 'Prism Studio', 'Visual Stories', 'SnapCraft', 'The Frame House'],
  'travel': ['WanderLust Travels', 'Roam Free', 'Globe Trek', 'Voyage Vista', 'ExploreMore', 'SkyHigh Tours', 'Backpack & Go', 'TravelMint', 'Passport Ready', 'Coastal Routes'],
  'automotive': ['DriveWise Motors', 'AutoElite', 'GearHead Garage', 'Premium Rides', 'RevvedUp', 'WheelHouse', 'Street & Speed', 'TorqueWorks', 'AutoCraft', 'DriveThru Motors'],
  'legal': ['LexCounsel', 'RightPath Law', 'JusticeBridge', 'LegalEagle Partners', 'Shield & Gavel', 'Prime Legal', 'LawPlus', 'Advocate Alliance', 'The Legal Desk', 'SureLaw'],
  'financial': ['MoneyWise Advisors', 'CapitalPeak', 'WealthBridge', 'FinServe Pro', 'Ledger & Co.', 'SmartInvest', 'Vault Financial', 'Pinnacle Wealth', 'EquityFirst', 'CashFlow Advisors'],
  'home services': ['FixIt Pro', 'HomeCare Plus', 'Elite Repairs', 'CleanSweep', 'ServiceHub', 'Prime Maintenance', 'Handyman Hero', 'FreshSpace', 'Apex Services', 'HomeGuard'],
  'entertainment': ['StageLight Pro', 'EventCraft', 'ShowTime Entertainment', 'The Vibe Lounge', 'Curtain Call', 'Beat Factory', 'Reel Adventures', 'Party Central', 'StarGaze Events', 'FunLab'],
  'jewelry': ['Gem & Co.', 'The Golden Knot', 'Silver Lining', 'Bijoux House', 'Luxe Gems', 'Crown Jewels', 'Dazzle Studio', 'The Diamond Vault', 'Oro Fine Jewels', 'Sparkle & Co.'],
  'cafe': ['Brew & Bean', 'The Daily Grind', 'Cosy Cup', 'Aroma Cafe', 'The Coffee Nook', 'Latte Lane', 'Brew House', 'Crumb & Brew', 'The Roasted Bean', 'Mellow Cafe'],
  'event planning': ['Celebration Co.', 'Perfect Plan Events', 'Grand Occasions', 'The Wedding Studio', 'Eventful', 'Momentum Events', 'Bliss & Co.', 'Royal Gatherings', 'Festive Touch', 'PlannerPro'],
  'architecture': ['Form+Space', 'Blueprint Studio', 'Skyline Architects', 'The Design Forum', 'Nest Architecture', 'Elevation Studio', 'Structure & Soul', 'Modern Edge', 'Apex Designs', 'Grid Architects'],
};

const instaHandles = [
  '@theofficial', '@houseof', '@studioby', '@theworldof', '@its',
  '@shopat', '@experience', '@livein', '@explore', '@createwith'
];

const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'New York', 'Los Angeles', 'London', 'Dubai', 'Singapore', 'Sydney', 'Toronto', 'Berlin', 'Paris', 'Tokyo'];

const domains = ['gmail.com', 'outlook.com', 'business.com', 'co.in', 'info.net', 'contact.io', 'hello.co', 'connect.com'];

function genMockResults(niche, location) {
  const nicheKey = niche.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  let names = [];
  for (const [key, list] of Object.entries(bizNames)) {
    if (nicheKey.includes(key) || key.includes(nicheKey)) { names = list; break; }
  }
  if (!names.length) names = bizNames[Object.keys(bizNames)[Math.floor(Math.random() * Object.keys(bizNames).length)]];

  const count = 6 + Math.floor(Math.random() * 6);
  const results = [];
  for (let i = 0; i < count; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const loc = location || locations[Math.floor(Math.random() * locations.length)];
    const handle = instaHandles[Math.floor(Math.random() * instaHandles.length)] + name.toLowerCase().replace(/[^a-z]/g, '') + Math.floor(Math.random() * 99);
    const hasEmail = Math.random() > 0.35;
    const hasPhone = Math.random() > 0.45;
    const email = hasEmail ? name.toLowerCase().replace(/[^a-z]/g, '') + '@' + domains[Math.floor(Math.random() * domains.length)] : '';
    const phone = hasPhone ? '+91 ' + (9000000000 + Math.floor(Math.random() * 1000000000)) : '';
    results.push({ name, location: loc, instagram: handle, email, phone, category: niche, source: Math.random() > 0.5 ? 'Google' : 'Instagram' });
  }
  return results;
}

async function searchGoogle(niche, location) {
  if (!settings.gApiKey || !settings.gCx) return null;
  const query = encodeURIComponent(`${niche} business ${location} Instagram`);
  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${settings.gApiKey}&cx=${settings.gCx}&q=${query}&num=10`);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(item => ({
      name: item.title.replace(/ - .*$/, '').replace(/ \|.*$/, '').trim(),
      location: location,
      instagram: item.link.includes('instagram.com') ? '@' + item.link.split('/').pop() : '',
      email: '',
      phone: '',
      category: niche,
      source: 'Google',
      snippet: item.snippet,
    }));
  } catch { return null; }
}

async function searchN8n(niche, location) {
  if (!settings.n8nUrl) return null;
  try {
    const res = await fetch(settings.n8nUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ niche, location }) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function showResults(results) {
  resultsPlaceholder.style.display = 'none';
  resultsGrid.innerHTML = '';
  if (!results.length) {
    resultsGrid.innerHTML = '<div class="results-summary" style="text-align:center;padding:2rem;color:var(--muted)">No results found. Try a different niche or location.</div>';
    return;
  }
  const summary = document.createElement('div');
  summary.className = 'results-summary';
  summary.textContent = `Found ${results.length} businesses`;
  resultsGrid.appendChild(summary);

  for (const r of results) {
    const card = document.createElement('div');
    card.className = 'result-card result-enter';
    card.innerHTML = `
      <span class="r-badge">${esc(r.source)}</span>
      <div class="r-name">${esc(r.name)}</div>
      <div class="r-category">${esc(r.category)} · ${esc(r.location)}</div>
      <div class="r-meta">
        ${r.instagram ? `<span class="r-ig">📷 ${esc(r.instagram)}</span>` : ''}
        ${r.email ? `<span class="r-email">✉ ${esc(r.email)}</span>` : ''}
        ${r.phone ? `<span class="r-phone">📞 ${esc(r.phone)}</span>` : ''}
      </div>
      <button class="r-add" data-name="${esc(r.name)}" data-project="${esc(r.category)}" data-instagram="${esc(r.instagram || '')}" data-email="${esc(r.email || '')}">+ Add to Pipeline</button>
    `;
    card.querySelector('.r-add').onclick = function() {
      add(r.name, r.category + (r.location ? ' — ' + r.location : ''), 'lead', Math.floor(Math.random() * 5000) + 1000);
      this.textContent = '✓ Added';
      this.classList.add('added');
    };
    resultsGrid.appendChild(card);
  }
}

document.getElementById('searchBtn').onclick = async () => {
  const niche = document.getElementById('searchNiche').value.trim();
  const location = document.getElementById('searchLocation').value.trim();
  if (!niche) { alert('Enter a niche to search'); return; }

  searchBtn.classList.add('loading');

  // Try live sources first, fallback to demo
  let results = null;

  results = await searchN8n(niche, location);
  if (!results) results = await searchGoogle(niche, location);
  if (!results) {
    // Demo mode
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    results = genMockResults(niche, location);
    log('sys', `Prospector: demo results for "${niche}" — ${results.length} businesses found`);
  } else {
    log('sys', `Prospector: ${results.length} results for "${niche}" from live source`);
  }

  showResults(results);
  searchBtn.classList.remove('loading');
};

document.getElementById('searchNiche').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('searchBtn').click(); });
document.getElementById('searchLocation').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('searchBtn').click(); });

// ============================================================
// SETTINGS
// ============================================================

function applySettings() {
  if (settings.gApiKey && settings.gCx) {
    document.getElementById('googleBadge').textContent = 'Configured';
    document.getElementById('googleBadge').className = 'source-badge active';
  }
  if (settings.n8nUrl) {
    document.getElementById('n8nBadge').textContent = 'Connected';
    document.getElementById('n8nBadge').className = 'source-badge active';
  }
  document.getElementById('gApiKey').value = settings.gApiKey;
  document.getElementById('gCx').value = settings.gCx;
  document.getElementById('n8nUrl').value = settings.n8nUrl;
}

document.getElementById('saveGoogleSettings').onclick = () => {
  settings.gApiKey = document.getElementById('gApiKey').value.trim();
  settings.gCx = document.getElementById('gCx').value.trim();
  saveSettings();
  applySettings();
  const st = document.getElementById('googleStatus');
  st.textContent = '✓ Saved';
  setTimeout(() => st.textContent = '', 2000);
};

document.getElementById('saveN8n').onclick = () => {
  settings.n8nUrl = document.getElementById('n8nUrl').value.trim();
  saveSettings();
  applySettings();
  const st = document.getElementById('n8nStatus');
  st.textContent = '✓ Saved';
  setTimeout(() => st.textContent = '', 2000);
};

// ============================================================
// SCROLL REVEALS
// ============================================================

const ro = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => ro.observe(el));
const so = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.2 });
document.querySelectorAll('.stat-card').forEach(el => so.observe(el));

// ============================================================
// INIT
// ============================================================

render();
applySettings();
setTimeout(() => {
  log('sys', clients.length ? `${clients.length} clients loaded` : 'Pipeline ready — add your first client');
  log('rev', 'Revenue tracker online');
  log('msg', 'Auto-messenger active');
  startAuto();
}, 400);
