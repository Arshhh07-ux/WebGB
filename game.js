// Game State & Lanes Configuration
const LANES = [-3.8, 0, 3.8];
let currentLane = 1;
let targetX = LANES[currentLane];
let score = 0;
let baseSpeed = 0.85;
let currentSpeed = baseSpeed;
let nitroAmount = 100;
let isNitroActive = false;
let isGameActive = false;
let obstacles = [];
let particles = [];

// Three.js Scene, Camera, Renderer Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010103, 0.011);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 3.2, 8.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
container.appendChild(renderer.domElement);

// Lighting Engine
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// Neon Glow Point Lights
const cyanPoint = new THREE.PointLight(0x00f0ff, 5, 50);
cyanPoint.position.set(-8, 4, -30);
scene.add(cyanPoint);

const pinkPoint = new THREE.PointLight(0xff0055, 5, 50);
pinkPoint.position.set(8, 4, -60);
scene.add(pinkPoint);

// Player 3D Vehicle Creation
const playerGroup = new THREE.Group();

const carBodyMat = new THREE.MeshStandardMaterial({
    color: 0x07080d,
    metalness: 0.95,
    roughness: 0.1
});

const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 3.6), carBodyMat);
chassis.position.y = 0.45;
chassis.castShadow = true;
playerGroup.add(chassis);

const cabinMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1.0, roughness: 0.0 });
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.7), cabinMat);
cabin.position.set(0, 0.8, -0.2);
playerGroup.add(cabin);

const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 3.4),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
);
underglow.rotation.x = Math.PI / 2;
underglow.position.y = 0.05;
playerGroup.add(underglow);

scene.add(playerGroup);

// Environment Construction
const roadGroup = new THREE.Group();
const roadMat = new THREE.MeshStandardMaterial({ color: 0x05070e, roughness: 0.5, metalness: 0.4 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 500), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.z = -200;
road.receiveShadow = true;
roadGroup.add(road);

const railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
[-6.6, 6.6].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 500), railMat);
    rail.position.set(x, 0.2, -200);
    roadGroup.add(rail);
});

const dashMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
for (let z = 50; z > -450; z -= 12) {
    [-1.9, 1.9].forEach(x => {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 5), dashMat);
        dash.position.set(x, 0.02, z);
        roadGroup.add(dash);
    });
}
scene.add(roadGroup);

const neonColors = [0x00f0ff, 0xff0055, 0x7928ca, 0xfacc15];
function createCity() {
    for (let z = 50; z > -450; z -= 22) {
        [-20, 20].forEach(x => {
            const h = 20 + Math.random() * 50;
            const b = new THREE.Mesh(
                new THREE.BoxGeometry(10, h, 14),
                new THREE.MeshStandardMaterial({ color: 0x030408, roughness: 0.5 })
            );
            b.position.set(x, h / 2, z);

            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(10.2, 1.2, 10.2),
                new THREE.MeshBasicMaterial({ color: neonColors[Math.floor(Math.random() * neonColors.length)] })
            );
            stripe.position.set(x, Math.random() * h * 0.7 + 4, z);

            scene.add(b);
            scene.add(stripe);
        });
    }
}
createCity();

// Obstacles & Particle Effects
function spawnTraffic() {
    const laneIdx = Math.floor(Math.random() * 3);
    const obstacleGroup = new THREE.Group();

    const obsMat = new THREE.MeshStandardMaterial({
        color: neonColors[Math.floor(Math.random() * neonColors.length)],
        metalness: 0.8, roughness: 0.2
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 3.2), obsMat);
    body.position.y = 0.45;
    body.castShadow = true;
    obstacleGroup.add(body);

    obstacleGroup.position.set(LANES[laneIdx], 0, -220);
    scene.add(obstacleGroup);
    obstacles.push(obstacleGroup);
}

function createExhaustParticle() {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: isNitroActive ? 0xff0055 : 0x00f0ff, transparent: true, opacity: 0.9 })
    );
    p.position.set(
        playerGroup.position.x + (Math.random() - 0.5) * 0.5,
        0.3,
        playerGroup.position.z + 1.8
    );
    scene.add(p);
    particles.push({ mesh: p, life: 1.0 });
}

// Input Controllers
function moveLeft() {
    if (isGameActive && currentLane > 0) { currentLane--; targetX = LANES[currentLane]; }
}
function moveRight() {
    if (isGameActive && currentLane < 2) { currentLane++; targetX = LANES[currentLane]; }
}

window.addEventListener('keydown', (e) => {
    if (!isGameActive) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
    if (e.key === ' ' || e.key === 'w' || e.key === 'W') isNitroActive = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'w' || e.key === 'W') isNitroActive = false;
});

// Mobile Controls
document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); });
document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); });

const nitroTouchBtn = document.getElementById('nitro-touch-btn');
nitroTouchBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isNitroActive = true; });
nitroTouchBtn.addEventListener('touchend', (e) => { e.preventDefault(); isNitroActive = false; });

// Main Animation & Render Loop
const clock = new THREE.Clock();
let spawnTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    if (!isGameActive) {
        renderer.render(scene, camera);
        return;
    }

    const delta = clock.getDelta();
    spawnTimer += delta;

    if (isNitroActive && nitroAmount > 0) {
        currentSpeed = THREE.MathUtils.lerp(currentSpeed, baseSpeed * 1.65, 0.1);
        nitroAmount = Math.max(0, nitroAmount - delta * 40);
    } else {
        currentSpeed = THREE.MathUtils.lerp(currentSpeed, baseSpeed, 0.05);
        if (nitroAmount < 100) nitroAmount += delta * 12;
    }
    document.getElementById('nitro-bar').style.width = `${nitroAmount}%`;

    baseSpeed += 0.00007;
    score += Math.floor(currentSpeed * 20);
    document.getElementById('score-val').innerText = score;
    document.getElementById('speed-val').innerHTML = `${Math.floor(currentSpeed * 220)} <span style="font-size: 0.8rem;">KM/H</span>`;

    playerGroup.position.x += (targetX - playerGroup.position.x) * 0.18;
    playerGroup.rotation.z = (playerGroup.position.x - targetX) * 0.08;
    camera.position.x = playerGroup.position.x * 0.25;
    camera.fov = THREE.MathUtils.lerp(camera.fov, isNitroActive ? 76 : 65, 0.1);
    camera.updateProjectionMatrix();

    if (spawnTimer > Math.max(0.45, 1.8 - baseSpeed)) {
        spawnTraffic();
        spawnTimer = 0;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.position.z += currentSpeed * 45 * delta;

        const dz = Math.abs(obs.position.z - playerGroup.position.z);
        const dx = Math.abs(obs.position.x - playerGroup.position.x);

        if (dz < 2.5 && dx < 1.2) {
            triggerCrash();
            return;
        }

        if (obs.position.z > 15) {
            scene.remove(obs);
            obstacles.splice(i, 1);
        }
    }

    createExhaustParticle();
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.z += 0.5;
        p.mesh.scale.multiplyScalar(0.92);
        p.life -= delta * 2.5;
        p.mesh.material.opacity = p.life;

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    cyanPoint.position.z = (cyanPoint.position.z + currentSpeed * 20 * delta) % 100 - 100;
    pinkPoint.position.z = (pinkPoint.position.z + currentSpeed * 20 * delta) % 100 - 100;

    renderer.render(scene, camera);
}

// Game Flow State
function startGame() {
    obstacles.forEach(o => scene.remove(o));
    obstacles = [];

    score = 0;
    baseSpeed = 0.85;
    currentSpeed = baseSpeed;
    nitroAmount = 100;
    currentLane = 1;
    targetX = LANES[currentLane];
    playerGroup.position.set(0, 0, 0);

    document.getElementById('overlay').classList.add('hidden');
    isGameActive = true;
    clock.start();
}

function triggerCrash() {
    isGameActive = false;
    
    const flash = document.getElementById('flash-screen');
    flash.style.opacity = '0.8';
    setTimeout(() => flash.style.opacity = '0', 150);

    document.getElementById('main-title').innerText = "CRASHED!";
    document.getElementById('sub-title').innerHTML = `Final Score: <strong>${score}</strong>`;
    document.getElementById('start-btn').innerText = "Try Again";
    document.getElementById('overlay').classList.remove('hidden');
}

document.getElementById('start-btn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

