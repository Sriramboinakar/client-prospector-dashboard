import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ============================================================
// THREE.JS 3D SCENE
// ============================================================

const container = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.25, 0.5, 0.1
);
composer.addPass(bloomPass);

// Lights
const ambient = new THREE.AmbientLight(0x222244, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0x818cf8, 1.2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const dirLight2 = new THREE.DirectionalLight(0x22d3ee, 0.6);
dirLight2.position.set(-5, -3, 5);
scene.add(dirLight2);

const pointLight = new THREE.PointLight(0xfbbf24, 0.4, 20);
pointLight.position.set(0, 2, 3);
scene.add(pointLight);

// Main Torus Knot
const tkGeo = new THREE.TorusKnotGeometry(1.2, 0.35, 180, 24);
const tkMat = new THREE.MeshPhysicalMaterial({
  color: 0x818cf8,
  metalness: 0.7,
  roughness: 0.15,
  wireframe: false,
  transparent: true,
  opacity: 0.6,
  emissive: 0x4444aa,
  emissiveIntensity: 0.15,
});
const torusKnot = new THREE.Mesh(tkGeo, tkMat);
torusKnot.position.y = 0.3;
scene.add(torusKnot);

// Secondary torus knot (wireframe)
const tkGeo2 = new THREE.TorusKnotGeometry(1.5, 0.45, 120, 16);
const tkMat2 = new THREE.MeshPhysicalMaterial({
  color: 0x22d3ee,
  metalness: 0.3,
  roughness: 0.6,
  wireframe: true,
  transparent: true,
  opacity: 0.12,
});
const torusKnot2 = new THREE.Mesh(tkGeo2, tkMat2);
torusKnot2.position.y = 0.3;
scene.add(torusKnot2);

// Floating icosahedrons
const icoGeo = new THREE.IcosahedronGeometry(0.2, 0);
const icoMat = new THREE.MeshPhysicalMaterial({
  color: 0xfbbf24,
  metalness: 0.8,
  roughness: 0.2,
  emissive: 0xfbbf24,
  emissiveIntensity: 0.1,
});

const icos = [];
const icoCount = 5;
for (let i = 0; i < icoCount; i++) {
  const mesh = new THREE.Mesh(icoGeo, icoMat.clone());
  const theta = (i / icoCount) * Math.PI * 2;
  const radius = 2.8 + Math.random() * 0.5;
  mesh.position.set(
    Math.cos(theta) * radius,
    (Math.random() - 0.5) * 2,
    Math.sin(theta) * radius
  );
  mesh.userData = {
    theta,
    radius,
    speed: 0.002 + Math.random() * 0.003,
    yOff: (Math.random() - 0.5) * 2,
    ySpeed: 0.005 + Math.random() * 0.005,
    rotSpeed: 0.005 + Math.random() * 0.005,
  };
  scene.add(mesh);
  icos.push(mesh);
}

// Particle field
const particleCount = 1200;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;
  const r = 5 + Math.random() * 15;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  positions[i3] = Math.sin(phi) * Math.cos(theta) * r;
  positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r * 0.5;
  positions[i3 + 2] = Math.cos(phi) * r;

  const c = new THREE.Color().setHSL(0.65 + Math.random() * 0.15, 0.5, 0.4 + Math.random() * 0.3);
  colors[i3] = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  sizes[i] = 0.02 + Math.random() * 0.06;
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.PointsMaterial({
  size: 0.06,
  transparent: true,
  opacity: 0.8,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});
const particleMesh = new THREE.Points(particleGeo, particleMat);
scene.add(particleMesh);

// Mouse tracking
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
document.addEventListener('mousemove', (e) => {
  mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Cursor glow
const cursorGlow = document.getElementById('cursorGlow');
let cursorX = 0, cursorY = 0;
document.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
});

// Resize
function resizeScene() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
}
window.addEventListener('resize', resizeScene);

// Scene animation
let sceneTime = 0;

function animateScene() {
  requestAnimationFrame(animateScene);
  sceneTime++;

  // Smooth mouse
  mouse.x += (mouse.targetX - mouse.x) * 0.05;
  mouse.y += (mouse.targetY - mouse.y) * 0.05;

  // Camera follow
  camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.02;
  camera.position.y += (-mouse.y * 0.25 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);

  // Rotate torus knots
  torusKnot.rotation.x += 0.004;
  torusKnot.rotation.y += 0.006;
  torusKnot2.rotation.x += 0.003;
  torusKnot2.rotation.y += 0.005;
  torusKnot2.rotation.z += 0.002;

  // Animate icosahedrons
  for (const ico of icos) {
    const ud = ico.userData;
    ud.theta += ud.speed;
    ico.position.x = Math.cos(ud.theta) * ud.radius;
    ico.position.z = Math.sin(ud.theta) * ud.radius;
    ico.position.y = ud.yOff + Math.sin(sceneTime * ud.ySpeed) * 0.5;
    ico.rotation.x += ud.rotSpeed;
    ico.rotation.y += ud.rotSpeed * 0.7;
  }

  // Rotate particle field slowly
  particleMesh.rotation.y += 0.0003;
  particleMesh.rotation.x += 0.0001;

  // Cursor glow
  cursorGlow.style.left = cursorX + 'px';
  cursorGlow.style.top = cursorY + 'px';

  composer.render();
}

animateScene();

// ============================================================
// CLIENT DATA
// ============================================================

const STORAGE_KEY = 'sriram-clients';
let clientIdCounter = 100;

const defaultClients = [
  { id: 1, name: 'Sarah Johnson', project: 'Web App Redesign', stage: 'lead', value: 5000 },
  { id: 2, name: 'Mike Reynolds', project: 'Mobile App', stage: 'lead', value: 8000 },
  { id: 3, name: 'Acme Corp', project: 'Analytics Dashboard', stage: 'active', value: 15000 },
  { id: 4, name: 'TechCo', project: 'API Integration Suite', stage: 'active', value: 12000 },
  { id: 5, name: 'Beta LLC', project: 'Website Overhaul', stage: 'completed', value: 7000 },
  { id: 6, name: 'Gamma Inc', project: 'Branding Package', stage: 'completed', value: 6000 },
];

function loadClients() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...defaultClients];
}

function saveClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

let clients = loadClients();
if (clients.length > 0) {
  clientIdCounter = Math.max(...clients.map(c => c.id)) + 1;
}

// ============================================================
// PIPELINE RENDERING
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

let dragClientId = null;

function renderPipeline() {
  for (const stage of ['lead', 'active', 'completed']) {
    const container = containers[stage];
    const stageClients = clients.filter(c => c.stage === stage);
    container.innerHTML = '';

    if (stageClients.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'col-empty';
      empty.textContent = 'No clients here';
      container.appendChild(empty);
    } else {
      for (const client of stageClients) {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.draggable = true;
        card.dataset.id = client.id;

        const nameSpan = document.createElement('div');
        nameSpan.className = 'card-name';
        nameSpan.textContent = client.name;

        const projSpan = document.createElement('div');
        projSpan.className = 'card-project';
        projSpan.textContent = client.project;

        const valSpan = document.createElement('div');
        valSpan.className = 'card-value';
        valSpan.textContent = '$' + client.value.toLocaleString();

        const rmBtn = document.createElement('button');
        rmBtn.className = 'card-remove';
        rmBtn.textContent = '× remove';
        rmBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeClient(client.id);
        });

        card.appendChild(nameSpan);
        card.appendChild(projSpan);
        card.appendChild(valSpan);
        card.appendChild(rmBtn);

        // 3D tilt on hover
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-3px)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
        });

        // Drag events
        card.addEventListener('dragstart', (e) => {
          dragClientId = client.id;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          dragClientId = null;
          document.querySelectorAll('.col-body').forEach(el => el.classList.remove('drag-over'));
        });

        container.appendChild(card);
      }
    }

    counters[stage].textContent = stageClients.length;
  }
  updateStats();
}

// Drop zones
document.querySelectorAll('.col-body').forEach(el => {
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => {
    el.classList.remove('drag-over');
  });
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    const stage = el.closest('.pipeline-col').dataset.stage;
    if (dragClientId !== null && stage) {
      moveClient(dragClientId, stage);
    }
    dragClientId = null;
  });
});

// ============================================================
// CLIENT OPERATIONS
// ============================================================

function addClient(name, project, stage, value) {
  const client = {
    id: clientIdCounter++,
    name,
    project,
    stage,
    value: Math.max(0, parseInt(value) || 0),
  };
  clients.push(client);
  saveClients();
  renderPipeline();

  // Add with pop animation
  const container = containers[stage];
  const lastCard = container.querySelector('.client-card:last-child');
  if (lastCard) lastCard.classList.add('adding');

  addLog('client', `${name} added as ${stage} — $${client.value.toLocaleString()}`);
  updateStats();
  return client;
}

function removeClient(id) {
  const client = clients.find(c => c.id === id);
  if (!client) return;
  const card = document.querySelector(`.client-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    setTimeout(() => {
      clients = clients.filter(c => c.id !== id);
      saveClients();
      renderPipeline();
      addLog('alert', `${client.name} removed from pipeline`);
      updateStats();
    }, 300);
  } else {
    clients = clients.filter(c => c.id !== id);
    saveClients();
    renderPipeline();
    addLog('alert', `${client.name} removed from pipeline`);
    updateStats();
  }
}

function moveClient(id, newStage) {
  const client = clients.find(c => c.id === id);
  if (!client || client.stage === newStage) return;
  const oldStage = client.stage;
  client.stage = newStage;
  saveClients();
  renderPipeline();
  addLog('client', `${client.name} moved: ${oldStage} → ${newStage}`);
  updateStats();
}

// ============================================================
// STATS
// ============================================================

const statEls = document.querySelectorAll('.stat-num');

function computeStats() {
  const total = clients.length;
  const revenue = clients.reduce((sum, c) => sum + c.value, 0);
  const active = clients.filter(c => c.stage === 'active').length;
  const satisfaction = Math.min(98, 75 + Math.floor(Math.random() * 20));
  return { total, revenue, active, satisfaction };
}

function updateStats() {
  const stats = computeStats();
  const targets = [stats.total, stats.revenue, stats.active, stats.satisfaction];
  const suffixes = ['', '', '', '%'];

  statEls.forEach((el, i) => {
    const target = targets[i];
    el.dataset.target = target;
    el.dataset.suffix = suffixes[i];
    el.textContent = suffixes[i] === '%' ? '0%' : '0';
    animateCounter(el, target, suffixes[i], 1200);
  });
}

function animateCounter(el, target, suffix, duration) {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.floor(eased * target);
    el.textContent = suffix ? current + suffix : current;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = suffix ? target + suffix : target;
  }
  requestAnimationFrame(tick);
}

// ============================================================
// ACTIVITY LOG
// ============================================================

const logContainer = document.getElementById('logContainer');
let logCount = 0;

function addLog(type, msg) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const icon = document.createElement('span');
  icon.className = 'log-icon';
  const icons = { sys: '◆', client: '●', msg: '▶', rev: '◆', alert: '⚠' };
  icon.textContent = icons[type] || '·';

  const time = document.createElement('span');
  time.className = 'log-time';
  const mins = Math.floor(logCount * 0.4);
  const secs = Math.floor((logCount * 0.4 - mins) * 60);
  time.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  const agent = document.createElement('span');
  agent.className = 'log-agent';
  const labels = { sys: 'System', client: 'Client', msg: 'Message', rev: 'Revenue', alert: 'Alert' };
  agent.textContent = labels[type] || 'System';

  const msgSpan = document.createElement('span');
  msgSpan.className = 'log-msg';
  msgSpan.textContent = msg;

  entry.appendChild(icon);
  entry.appendChild(time);
  entry.appendChild(agent);
  entry.appendChild(msgSpan);

  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
  logCount++;

  // Keep last 50 entries
  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

// ============================================================
// AUTO-MESSAGES (Automation Simulation)
// ============================================================

const autoMessages = [
  'Follow-up sent to active clients',
  'Invoice reminder dispatched',
  'Weekly progress report generated',
  'Client satisfaction survey sent',
  'Payment receipt forwarded',
  'Project milestone update delivered',
  'Quarterly review scheduled',
  'New lead assigned to pipeline',
  'Contract renewal reminder sent',
  'Welcome package delivered to new client',
];

function broadcastMessage(text) {
  const activeClients = clients.filter(c => c.stage === 'active' || c.stage === 'lead');
  if (activeClients.length === 0) {
    addLog('alert', 'No clients to message');
    return;
  }
  for (const client of activeClients) {
    addLog('msg', `→ ${client.name}: "${text}"`);
  }
  addLog('sys', `Broadcast sent to ${activeClients.length} clients`);
}

function randomAutoEvent() {
  const msg = autoMessages[Math.floor(Math.random() * autoMessages.length)];
  const type = ['sys', 'msg', 'rev'][Math.floor(Math.random() * 3)];
  addLog(type, msg);
}

let autoInterval = null;

function startAutoEvents() {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    if (document.hidden) return;
    if (Math.random() > 0.4) randomAutoEvent();
  }, 5000 + Math.random() * 4000);
}

// ============================================================
// EVENT HANDLERS
// ============================================================

document.getElementById('addClientBtn').addEventListener('click', () => {
  const name = document.getElementById('clientName').value.trim();
  const project = document.getElementById('projectName').value.trim();
  const stage = document.getElementById('stageSelect').value;
  const value = document.getElementById('clientValue').value;

  if (!name || !project) {
    addLog('alert', 'Please enter both client name and project');
    return;
  }

  addClient(name, project, stage, value);

  document.getElementById('clientName').value = '';
  document.getElementById('projectName').value = '';
  document.getElementById('clientValue').value = '';
});

document.getElementById('broadcastBtn').addEventListener('click', () => {
  const msg = document.getElementById('msgInput').value.trim();
  if (!msg) {
    addLog('alert', 'Enter a message to broadcast');
    return;
  }
  broadcastMessage(msg);
  document.getElementById('msgInput').value = '';
});

// Enter key support
document.getElementById('clientName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addClientBtn').click();
});
document.getElementById('projectName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addClientBtn').click();
});
document.getElementById('msgInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('broadcastBtn').click();
});

// ============================================================
// SCROLL REVEAL
// ============================================================

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const statObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  }
}, { threshold: 0.3 });

document.querySelectorAll('.stat-card').forEach(el => statObserver.observe(el));

// ============================================================
// INIT
// ============================================================

renderPipeline();
updateStats();

// Start with a few log entries
setTimeout(() => {
  addLog('sys', 'Pipeline loaded — ' + clients.length + ' clients');
  addLog('rev', 'Revenue tracker initialized');
  addLog('msg', 'Auto-messenger active');
  startAutoEvents();
}, 500);
