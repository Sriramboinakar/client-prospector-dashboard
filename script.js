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
  return { n8nUrl: '' };
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
// PROSPECTOR ENGINE — OpenStreetMap Overpass API (free, no key)
// ============================================================

const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Map niche to OSM tags
const osmTags = {
  'restaurant': '["amenity"="restaurant"]',
  'food': '["amenity"="restaurant"]',
  'fashion': '["shop"="clothes"]',
  'apparel': '["shop"="clothes"]',
  'clothing': '["shop"="clothes"]',
  'fitness': '["leisure"="fitness_centre"]',
  'gym': '["leisure"="fitness_centre"]',
  'beauty': '["shop"="beauty"]',
  'salon': '["shop"="hairdresser"]',
  'spa': '["amenity"="spa"]',
  'technology': '["shop"="computer"]',
  'it': '["shop"="computer"]',
  'real estate': '["office"="real_estate"]',
  'healthcare': '["amenity"="hospital"]',
  'hospital': '["amenity"="hospital"]',
  'medical': '["amenity"="clinic"]',
  'clinic': '["amenity"="clinic"]',
  'doctor': '["amenity"="doctors"]',
  'dentist': '["amenity"="dentist"]',
  'pharmacy': '["amenity"="pharmacy"]',
  'education': '["amenity"="school"]',
  'school': '["amenity"="school"]',
  'college': '["amenity"="college"]',
  'university': '["amenity"="university"]',
  'coaching': '["amenity"="tutoring"]',
  'photography': '["shop"="photo"]',
  'travel': '["shop"="travel_agency"]',
  'tourism': '["shop"="travel_agency"]',
  'automotive': '["shop"="car"]',
  'car': '["shop"="car"]',
  'legal': '["office"="lawyer"]',
  'law': '["office"="lawyer"]',
  'lawyer': '["office"="lawyer"]',
  'financial': '["office"="financial"]',
  'bank': '["amenity"="bank"]',
  'insurance': '["office"="insurance"]',
  'home services': '["shop"="hardware"]',
  'entertainment': '["amenity"="cinema"]',
  'jewelry': '["shop"="jewelry"]',
  'jewellery': '["shop"="jewelry"]',
  'cafe': '["amenity"="cafe"]',
  'bakery': '["shop"="bakery"]',
  'grocery': '["shop"="supermarket"]',
  'supermarket': '["shop"="supermarket"]',
  'pet': '["shop"="pet"]',
  'hardware': '["shop"="hardware"]',
  'furniture': '["shop"="furniture"]',
  'electronics': '["shop"="electronics"]',
  'book': '["shop"="books"]',
  'bar': '["amenity"="bar"]',
  'hair': '["shop"="hairdresser"]',
  'laundry': '["shop"="laundry"]',
  'hotel': '["tourism"="hotel"]',
  'lodging': '["tourism"="hotel"]',
  'parking': '["amenity"="parking"]',
  'gas': '["amenity"="fuel"]',
  'museum': '["tourism"="museum"]',
  'art': '["shop"="art"]',
  'gallery': '["tourism"="gallery"]',
  'nightclub': '["amenity"="nightclub"]',
  'temple': '["amenity"="place_of_worship"]["+religion"="hindu"]',
  'church': '["amenity"="place_of_worship"]["+religion"="christian"]',
  'mosque': '["amenity"="place_of_worship"]["+religion"="muslim"]',
};

async function searchOSM(niche, location, limit = 20) {
  const nicheLower = niche.toLowerCase().trim();
  let tag = osmTags[nicheLower];

  if (!tag) {
    for (const [key, val] of Object.entries(osmTags)) {
      if (nicheLower.includes(key) || key.includes(nicheLower)) { tag = val; break; }
    }
  }
  if (!tag) tag = '["shop"="yes"]';

  const tagClean = tag.replace(/\+"/g, '"');
  const q = location.trim();

  try {
    // Step 1: Geocode via Photon (CORS-friendly)
    let lat, lon, bbox;
    try {
      const geo = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
      const geoData = await geo.json();
      if (!geoData.features || !geoData.features.length) {
        console.warn('Photon: no results for', q);
        return [];
      }
      const coords = geoData.features[0].geometry.coordinates;
      lon = coords[0];
      lat = coords[1];
      bbox = geoData.features[0].properties.extent;
    } catch (e) {
      console.error('Photon geocode error:', e);
      return [];
    }

    // Step 2: Overpass query (use bbox if available, else around radius)
    let data;
    try {
      let locationFilter;
      if (bbox) {
        // bbox from Photon: [west, south, east, north]
        locationFilter = `(${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]})`;
      } else {
        locationFilter = `(around:50000,${lat},${lon})`;
      }
      const query = `[out:json][timeout:20];(node${tagClean}${locationFilter};way${tagClean}${locationFilter};);out ${limit} center;`;
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      data = await res.json();
    } catch (e) {
      console.error('Overpass fetch error:', e);
      return [];
    }

    if (!data.elements || !data.elements.length) {
      console.warn('Overpass: 0 results for', tagClean, 'near', q);
      return [];
    }

    const results = [];
    for (const el of data.elements) {
      const t = el.tags || {};
      if (!t.name) continue;
      const elat = el.lat || (el.center ? el.center.lat : null);
      const elon = el.lon || (el.center ? el.center.lon : null);
      const parts = [t['addr:housenumber'], t['addr:street'], t['addr:city'], t['addr:postcode']].filter(Boolean);
      const state = t['addr:state'] || t['addr:province'] || '';
      const country = t['addr:country'] || '';
      if (state && !parts.some(p => p.includes(state))) parts.push(state);
      if (country && !parts.some(p => p.includes(country))) parts.push(country);
      results.push({
        name: t.name,
        location: parts.join(', ') || q,
        phone: t.phone || t['contact:phone'] || t['mobile'] || '',
        website: t.website || t['contact:website'] || '',
        instagram: t['contact:instagram'] ? '@' + t['contact:instagram'] : '',
        email: t.email || t['contact:email'] || '',
        category: t.shop || t.amenity || t.office || t.leisure || t.tourism || niche,
        source: 'OpenStreetMap',
        lat: elat, lon: elon,
      });
      if (results.length >= limit) break;
    }

    if (!results.length) {
      console.warn('Overpass: all results had no name');
      return [];
    }
    return results;
  } catch (e) {
    console.error('searchOSM unexpected error:', e);
    return [];
  }
}


function genDemoResults(niche, location, min = 20) {
  const demo = [
    { name: 'Fifth Avenue Fashion', phone: '+1 212-555-0147', website: 'https://fifthavenuefashion.com', rating: 4.5 },
    { name: 'Broadway Styles', phone: '+1 212-555-0234', website: 'https://broadwaystyles.com', rating: 4.2 },
    { name: 'Urban Threads Boutique', phone: '+1 212-555-0345', website: 'https://urbanthreads.nyc', rating: 4.7 },
    { name: 'Madison Avenue Luxe', phone: '+1 212-555-0456', website: 'https://madisonluxe.com', rating: 4.8 },
    { name: 'SoHo Design House', phone: '+1 212-555-0567', website: 'https://sohodesign.nyc', rating: 4.4 },
    { name: 'Brooklyn Denim Co', phone: '+1 718-555-0678', website: 'https://brooklyndenim.co', rating: 4.1 },
    { name: 'Chelsea Fashion Studio', phone: '+1 212-555-0789', website: 'https://chelseafashion.co', rating: 4.6 },
    { name: 'East Village Vintage', phone: '+1 212-555-0890', website: 'https://evvintage.com', rating: 4.3 },
    { name: 'West Side Trends', phone: '+1 212-555-0901', website: 'https://westsidetrends.com', rating: 4.0 },
    { name: 'Garment District Outlet', phone: '+1 212-555-1012', website: 'https://garmentoutlet.nyc', rating: 3.9 },
    { name: 'Tribeca Tailoring', phone: '+1 212-555-1123', website: 'https://tribecatailor.com', rating: 4.9 },
    { name: 'Harlem Streetwear', phone: '+1 212-555-1234', website: 'https://harlemstreetwear.com', rating: 4.2 },
    { name: 'NoHo Lifestyle Store', phone: '+1 212-555-1345', website: 'https://nohostyle.com', rating: 4.4 },
    { name: 'Upper East Side Couture', phone: '+1 212-555-1456', website: 'https://uescouture.com', rating: 4.7 },
    { name: 'DUMBO Fashion Lab', phone: '+1 718-555-1567', website: 'https://dumbofashionlab.com', rating: 4.5 },
    { name: 'Park Avenue Bridal', phone: '+1 212-555-1678', website: 'https://parkavebridal.com', rating: 4.6 },
    { name: 'Bowery Street Co', phone: '+1 212-555-1789', website: 'https://bowery.co', rating: 4.0 },
    { name: 'Midtown Tailors', phone: '+1 212-555-1890', website: 'https://midtowntailors.com', rating: 4.3 },
    { name: 'Astoria Fashion', phone: '+1 718-555-1901', website: 'https://astoriafashion.com', rating: 4.1 },
    { name: 'LES Boutique', phone: '+1 212-555-2012', website: 'https://lesboutique.nyc', rating: 4.4 },
    { name: 'Flatiron Style Lab', phone: '+1 212-555-2123', website: 'https://flatironstyle.com', rating: 4.8 },
    { name: 'Greenwich Village Vintage', phone: '+1 212-555-2234', website: 'https://gvvintage.com', rating: 4.5 },
    { name: 'Murray Hill Apparel', phone: '+1 212-555-2345', website: 'https://murrayhillapparel.com', rating: 4.2 },
    { name: 'Times Square Fashion', phone: '+1 212-555-2456', website: 'https://timessquarefashion.com', rating: 3.8 },
    { name: 'Wall Street Suits', phone: '+1 212-555-2567', website: 'https://wallstreetsuits.com', rating: 4.6 },
    { name: 'Union Square Active', phone: '+1 212-555-2678', website: 'https://unionsquareactive.com', rating: 4.3 },
    { name: 'Long Island City Denim', phone: '+1 718-555-2789', website: 'https://licdenim.com', rating: 4.1 },
    { name: 'Hudson Yards Luxury', phone: '+1 212-555-2890', website: 'https://hudsonyardsluxe.com', rating: 4.9 },
    { name: 'Battery Park Surf', phone: '+1 212-555-2901', website: 'https://batterypark.surf', rating: 4.0 },
    { name: 'Rockefeller Center Style', phone: '+1 212-555-3012', website: 'https://rockcentstyle.com', rating: 4.4 },
    { name: 'Chelsea Market Fashion', phone: '+1 212-555-3123', website: 'https://chelseamarketfashion.com', rating: 4.5 },
    { name: 'Staten Island Apparel', phone: '+1 718-555-3234', website: 'https://statenislandapparel.com', rating: 4.2 },
    { name: 'Bronx Streetwear Co', phone: '+1 718-555-3345', website: 'https://bronxstreetwear.com', rating: 4.3 },
    { name: 'Jamaica Fashion Hub', phone: '+1 718-555-3456', website: 'https://jamaicafashion.com', rating: 4.0 },
    { name: 'Flushing Trends', phone: '+1 718-555-3567', website: 'https://flushingtrends.com', rating: 4.1 },
    { name: 'Brooklyn Bridge Boutique', phone: '+1 718-555-3678', website: 'https://brooklynbridgeboutique.com', rating: 4.7 },
    { name: 'World Trade Center Style', phone: '+1 212-555-3789', website: 'https://wtcstyle.com', rating: 4.5 },
    { name: 'Central Park Activewear', phone: '+1 212-555-3890', website: 'https://centralparkactive.com', rating: 4.4 },
    { name: 'Grand Central Fashion', phone: '+1 212-555-3901', website: 'https://grandcentralfashion.com', rating: 4.3 },
    { name: 'Penn Station Styles', phone: '+1 212-555-4012', website: 'https://pennstationstyles.com', rating: 4.1 },
    { name: 'Morningside Heights Couture', phone: '+1 212-555-4123', website: 'https://morningsidecouture.com', rating: 4.6 },
    { name: 'Washington Heights Fashion', phone: '+1 212-555-4234', website: 'https://waheightsfashion.com', rating: 4.2 },
    { name: 'Inwood Boutique', phone: '+1 212-555-4345', website: 'https://inwoodboutique.com', rating: 4.3 },
    { name: 'Riverdale Style Co', phone: '+1 718-555-4456', website: 'https://riverdalestyle.com', rating: 4.4 },
    { name: 'City Hall Apparel', phone: '+1 212-555-4567', website: 'https://cityhallapparel.com', rating: 4.0 },
  ];
  const count = Math.max(min, Math.min(demo.length, 8 + Math.floor(Math.random() * 4)));
  return demo.slice(0, count).map(d => ({
    ...d,
    location: location || 'New York',
    category: niche,
    source: 'Demo',
  }));
}

async function enrichViaN8n(results) {
  if (!settings.n8nUrl || !results.length) return results;
  try {
    const res = await fetch(settings.n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businesses: results.map(r => ({ name: r.name, website: r.website, location: r.location })) }),
    });
    if (res.ok) {
      const enriched = await res.json();
      if (Array.isArray(enriched)) {
        enriched.forEach((e, i) => {
          if (results[i]) {
            if (e.instagram) results[i].instagram = e.instagram;
            if (e.email) results[i].email = e.email;
          }
        });
      }
    }
  } catch {}
  return results;
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
  const avgRating = results.filter(r => r.rating).reduce((s, r) => s + r.rating, 0) / results.filter(r => r.rating).length || 0;
  summary.textContent = `Found ${results.length} businesses  ·  Avg rating: ${avgRating.toFixed(1)} ★`;
  resultsGrid.appendChild(summary);

  for (const r of results) {
    const card = document.createElement('div');
    card.className = 'result-card result-enter';
    const stars = r.rating ? '★'.repeat(Math.round(r.rating)) + '☆'.repeat(5 - Math.round(r.rating)) : '';
    card.innerHTML = `
      <span class="r-badge">${esc(r.source)}</span>
      <div class="r-name">${esc(r.name)}</div>
      <div class="r-category">${esc(r.category)}${r.rating ? ' · ' + stars + ' ' + r.rating : ''}</div>
      <div class="r-meta">
        ${r.phone ? `<span class="r-phone">📞 ${esc(r.phone)}</span>` : ''}
        ${r.website ? `<span class="r-ig">🌐 ${esc(r.website.replace('https://', '').replace('http://', ''))}</span>` : ''}
        ${r.instagram ? `<span class="r-ig">📷 ${esc(r.instagram)}</span>` : ''}
        ${r.email ? `<span class="r-email">✉ ${esc(r.email)}</span>` : ''}
      </div>
      <div class="r-addr">${esc(r.location || r.address || '')}</div>
      <button class="r-add">+ Add to Pipeline</button>
    `;
    card.querySelector('.r-add').onclick = function() {
      add(r.name, r.category + (r.location ? ' — ' + r.location : ''), 'lead', Math.floor(Math.random() * 5000) + 2000);
      this.textContent = '✓ Added to Leads';
      this.classList.add('added');
    };
    resultsGrid.appendChild(card);
  }
}

document.getElementById('searchBtn').onclick = async () => {
  const niche = document.getElementById('searchNiche').value.trim();
  const location = document.getElementById('searchLocation').value.trim();
  const limit = parseInt(document.getElementById('searchLimit').value) || 20;
  if (!niche) { alert('Enter a niche to search'); return; }

  searchBtn.classList.add('loading');
  let results = null;
  let source = '';

  // 1. Try OpenStreetMap (free, no key, real data)
  results = await searchOSM(niche, location, limit);
  if (results) source = 'OpenStreetMap';

  // 2. Enrich with n8n if available
  if (results && results.length) {
    results = await enrichViaN8n(results);
  }

  // 3. Fallback to demo if OSM fails
  if (!results || !results.length) {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    results = genDemoResults(niche, location, limit);
    source = 'Demo';
    log('sys', `Prospector: showing demo — OSM returned no results for "${niche}"`);
  } else {
    log('sys', `Prospector: ${results.length} real businesses from ${source} for "${niche}"`);
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
  document.getElementById('n8nUrl').value = settings.n8nUrl;
  if (settings.n8nUrl) {
    document.getElementById('n8nBadge').textContent = 'Connected';
    document.getElementById('n8nBadge').className = 'source-badge active';
  }
}

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
