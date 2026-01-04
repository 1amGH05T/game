
import * as THREE from 'three';

// --- Constants ---
const LANE_WIDTH = 3;
const CAMERA_OFFSET_Z = 8;
const CAMERA_OFFSET_Y = 5;
const GRAVITY = -40;
const JUMP_FORCE = 15;
const SPEED_START = 15;
const FOG_DIST = 60;

// --- State ---
let scene, camera, renderer;
let player;
let obstacles = [];
let coins = [];
let floorParts = [];
let clock;
let speed = SPEED_START;
let score = 0;
let coinCount = 0;
let isPlaying = false;
let isPaused = false;
let lanes = [-1, 0, 1];

// Player State
let playerLane = 0; // -1, 0, 1
let playerY = 0;
let playerVelocityY = 0;
let isJumping = false;
let isRolling = false;
let rollTimer = 0;

// --- DOM ---
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');

// --- Initialization ---
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, FOG_DIST);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, CAMERA_OFFSET_Y, CAMERA_OFFSET_Z);
  camera.lookAt(0, 0, -10);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  scene.add(dirLight);

  // Floor
  createFloor();

  // Player
  createPlayer();

  clock = new THREE.Clock();

  // Listeners
  window.addEventListener('resize', onResize);
  setupInputs();

  // Loops
  renderer.setAnimationLoop(animate);
}

function createFloor() {
  // Infinite floor trick
  const geo = new THREE.PlaneGeometry(30, 100);
  const mat = new THREE.MeshStandardMaterial({ color: 0x22c55e });

  for (let i = 0; i < 3; i++) {
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -50 - (i * 100);
    floor.receiveShadow = true;
    scene.add(floor);
    floorParts.push(floor);
  }
}

function createPlayer() {
  const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
  player = new THREE.Mesh(geo, mat);
  player.position.y = 0.9;
  player.castShadow = true;
  scene.add(player);
}

function resetGame() {
  speed = SPEED_START;
  score = 0;
  coinCount = 0;
  playerLane = 0;
  player.position.x = 0;
  player.position.z = 0;
  playerY = 0.9;
  playerVelocityY = 0;
  isJumping = false;
  isRolling = false;

  // Clear objects
  obstacles.forEach(o => scene.remove(o.mesh));
  coins.forEach(c => scene.remove(c.mesh));
  obstacles = [];
  coins = [];

  updateUI();
  isPlaying = true;
  isPaused = false;

  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
}

// --- Game Logic ---

function spawnObstacle(z) {
  const lane = lanes[Math.floor(Math.random() * 3)];
  const x = lane * LANE_WIDTH;

  const type = Math.random();
  let mesh;
  let oType;

  if (type < 0.3) {
    // Train
    const geo = new THREE.BoxGeometry(2.2, 3, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1.5, z);
    oType = 'TRAIN';
  } else if (type < 0.6) {
    // Low Barrier
    const geo = new THREE.BoxGeometry(2.2, 0.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xeab308 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.4, z);
    oType = 'LOW';
  } else {
    // High Barrier
    const group = new THREE.Group();
    const legGeo = new THREE.BoxGeometry(0.3, 3, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
    const l1 = new THREE.Mesh(legGeo, legMat); l1.position.set(-0.9, 1.5, 0);
    const l2 = new THREE.Mesh(legGeo, legMat); l2.position.set(0.9, 1.5, 0);

    const topGeo = new THREE.BoxGeometry(2.2, 0.8, 0.5);
    const top = new THREE.Mesh(topGeo, legMat); top.position.set(0, 2.6, 0);

    l1.castShadow = true; l2.castShadow = true; top.castShadow = true;

    group.add(l1, l2, top);
    group.position.set(x, 0, z);
    mesh = group;
    oType = 'HIGH';
  }

  if (oType !== 'HIGH') {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  scene.add(mesh);

  obstacles.push({ mesh, type: oType });
}

function spawnCoins(z) {
  const lane = lanes[Math.floor(Math.random() * 3)];
  const x = lane * LANE_WIDTH;

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2, emissive: 0xaa8800, emissiveIntensity: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.8, z - (i * 2));
    mesh.rotation.y = Math.PI / 2; // Face player

    scene.add(mesh);
    coins.push({ mesh });
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.1);

  if (isPlaying && !isPaused) {
    // Move Player Forward (Logic world shift)
    player.position.z -= speed * dt;
    camera.position.z = player.position.z + CAMERA_OFFSET_Z;

    // Lane Lerp
    const targetX = playerLane * LANE_WIDTH;
    player.position.x += (targetX - player.position.x) * 10 * dt;

    // Physics
    playerVelocityY += GRAVITY * dt;
    playerY += playerVelocityY * dt;

    // Ground Check
    const groundLevel = isRolling ? 0.45 : 0.9;
    if (playerY <= groundLevel) {
      playerY = groundLevel;
      playerVelocityY = 0;
      isJumping = false;
    }

    player.position.y = playerY;

    // Floor Looping
    floorParts.forEach(f => {
      if (f.position.z > player.position.z + 50) {
        f.position.z -= 300;
      }
    });

    // Rolling Timer
    if (isRolling) {
      player.scale.y = 0.5;
      rollTimer -= dt;
      if (rollTimer <= 0) {
        isRolling = false;
        player.scale.y = 1;
        playerY = 0.9;
      }
    }

    // Spawning
    if (Math.random() < 0.05) {
      const spawnZ = player.position.z - 60 - Math.random() * 20;
      if (Math.random() > 0.4) spawnObstacle(spawnZ);
      else spawnCoins(spawnZ);
    }

    // Check Collisions
    // Player Box
    const pBox = new THREE.Box3().setFromObject(player);
    // Shrink box slightly for forgiveness
    pBox.min.x += 0.2; pBox.max.x -= 0.2;
    pBox.min.z += 0.2; pBox.max.z -= 0.2;

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.mesh.position.z > player.position.z + 10) {
        scene.remove(o.mesh);
        obstacles.splice(i, 1);
        continue;
      }

      const oBox = new THREE.Box3().setFromObject(o.mesh);
      if (pBox.intersectsBox(oBox)) {
        // Collision!
        let safe = false;
        // Specific checks if we wanted refined hitboxes, but Box3 intersection is strict.
        // For High barriers, the group collision might include the legs.
        // If rolling, we are smaller, so pBox is smaller.
        // If jumping, we are higher.
        // Box3 handles this automatically based on mesh current position/scale.

        if (!safe) gameOver();
      }
    }

    // Coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.mesh.rotation.y += 3 * dt;

      if (c.mesh.position.z > player.position.z + 10) {
        scene.remove(c.mesh);
        coins.splice(i, 1);
        continue;
      }

      const cBox = new THREE.Box3().setFromObject(c.mesh);
      if (pBox.intersectsBox(cBox)) {
        scene.remove(c.mesh);
        coins.splice(i, 1);
        coinCount++;
        updateUI();
      }
    }

    speed += 0.2 * dt;
    score += speed * dt;
    updateUI();
  }

  renderer.render(scene, camera);
}

function updateUI() {
  scoreEl.innerText = Math.floor(score);
  coinsEl.innerText = coinCount;
}

function gameOver() {
  isPlaying = false;
  finalScoreEl.innerText = Math.floor(score);
  gameOverScreen.classList.remove('hidden');
}

function togglePause() {
  if (!isPlaying) return;
  isPaused = !isPaused;
  pauseScreen.classList.toggle('hidden', !isPaused);
}

// --- Inputs ---
function setupInputs() {
  window.addEventListener('keydown', (e) => {
    if (!isPlaying) return;
    if (isPaused) {
      if (e.key === "Escape") togglePause();
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "a") if (playerLane > -1) playerLane--;
    if (e.key === "ArrowRight" || e.key === "d") if (playerLane < 1) playerLane++;
    if (e.key === "ArrowUp" || e.key === " " || e.key === "w") {
      if (!isJumping && !isRolling) {
        playerVelocityY = JUMP_FORCE;
        isJumping = true;
      }
    }
    if (e.key === "ArrowDown" || e.key === "s") {
      if (!isRolling) {
        isRolling = true;
        rollTimer = 0.8;
        playerVelocityY = -20; // Fast drop
      }
    }
    if (e.key === "Escape") togglePause();
  });

  document.getElementById('startBtn').addEventListener('click', resetGame);
  document.getElementById('restartBtn').addEventListener('click', resetGame);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  document.getElementById('quitBtn').addEventListener('click', () => {
    location.reload();
  });

  // Swipe
  let tsx = 0, tsy = 0;
  window.addEventListener('touchstart', e => {
    tsx = e.changedTouches[0].screenX;
    tsy = e.changedTouches[0].screenY;
  });
  window.addEventListener('touchend', e => {
    if (!isPlaying || isPaused) return;
    const tex = e.changedTouches[0].screenX;
    const tey = e.changedTouches[0].screenY;
    const dx = tex - tsx;
    const dy = tey - tsy;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx > 0 && playerLane < 1) playerLane++;
      if (dx < 0 && playerLane > -1) playerLane--;
    } else if (Math.abs(dy) > 30) {
      if (dy < 0 && !isJumping && !isRolling) {
        playerVelocityY = JUMP_FORCE;
        isJumping = true;
      }
      if (dy > 0 && !isRolling) {
        isRolling = true;
        rollTimer = 0.8;
        playerVelocityY = -20;
      }
    }
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Kickoff
init();
