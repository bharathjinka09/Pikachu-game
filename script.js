const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

// --- HIGH SCORE LOGIC ---
const highScoreEl = document.getElementById('high-score');
const maxLevelEl = document.getElementById('max-level');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- CONFIG & STATE ---
let cameraX = 0;
let score = 0;
let currentLevel = 1;
let isTransitioning = false;
const gravity = 0.8;
const keys = {};

const levelConfigs = {
    1: { bg: "#87CEEB", ground: "#4a2c00", enemySpeed: -3, length: 5000, title: "Emerald Path" },
    2: { bg: "#2e1a47", ground: "#1a1a1a", enemySpeed: -5, length: 6000, title: "Shadow Cave" },
    3: { bg: "#e67e22", ground: "#d35400", enemySpeed: -7, length: 7000, title: "Volcano Ridge" },
    4: { bg: "#2c3e50", ground: "#ecf0f1", enemySpeed: -9, length: 8000, title: "Moonlight Peak" }
};

// --- HIGH SCORE PERSISTENCE ---
let highScore = localStorage.getItem('pichuHighScore') || 0;
let maxLevelStore = localStorage.getItem('pichuMaxLevel') || 1;
highScoreEl.innerText = highScore;
maxLevelEl.innerText = maxLevelStore;

function updateHighScores() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('pichuHighScore', highScore);
        highScoreEl.innerText = highScore;
        highScoreEl.style.color = "#FFD700";
    }
    if (currentLevel > maxLevelStore) {
        maxLevelStore = currentLevel;
        localStorage.setItem('pichuMaxLevel', maxLevelStore);
        maxLevelEl.innerText = maxLevelStore;
    }
}

// --- ASSETS ---
const sounds = {
    jump: new Audio('./assets/jump.mp3'),
    evolve: new Audio('./assets/evolve.mp3'),
    zap: new Audio('./assets/bullet.mp3'),
    hit: new Audio('./assets/hit.mp3'),
    level_complete: new Audio('./assets/level_complete.mp3'),
    bgm: new Audio('./assets/bgm.mp3')
};
sounds.bgm.loop = true;

const sprites = {
    pichu: new Image(), pikachu: new Image(),
    enemy: new Image(), stone: new Image(), goal: new Image()
};
sprites.pichu.src = './assets/pichu.png';
// sprites.pikachu.src = './assets/pikachu.png';
sprites.pikachu.src = './assets/pikachu.gif';
sprites.enemy.src = './assets/meowth.png';
sprites.stone.src = './assets/lightning-bolt.png';
sprites.goal.src = './assets/pokeball.png';

function playSound(s) { s.currentTime = 0; s.play().catch(() => {}); }

// --- PLAYER CLASS ---
class Player {
    constructor() {
        this.w = 60; this.h = 60;
        this.x = 100; this.y = 0;
        this.dy = 0; this.speed = 7; this.jump = -18;
        this.isPikachu = false;
        this.grounded = false;
        this.canDoubleJump = false;
        this.facingLeft = false;
    }

    update() {
        if (keys.ArrowRight) { this.x += this.speed; this.facingLeft = false; }
        if (keys.ArrowLeft && this.x > 0) { this.x -= this.speed; this.facingLeft = true; }

        this.dy += gravity;
        this.y += this.dy;

        this.grounded = false;
        platforms.forEach(plat => {
            if (this.x < plat.x + plat.w && this.x + this.w > plat.x &&
                this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h && this.dy >= 0) {
                this.dy = 0; this.grounded = true; this.canDoubleJump = true; this.y = plat.y - this.h;
            }
        });

        if (this.x > canvas.width / 2) cameraX = this.x - canvas.width / 2;
        if (this.y > canvas.height) resetGame();
    }

    draw() {
        const img = this.isPikachu ? sprites.pikachu : sprites.pichu;
        ctx.save();
        if (this.facingLeft) {
            ctx.translate(this.x - cameraX + this.w / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(this.x - cameraX + this.w / 2), 0);
        }
        let bounce = (keys.ArrowRight || keys.ArrowLeft) && this.grounded ? Math.abs(Math.sin(Date.now() / 100)) * 8 : 0;
        ctx.drawImage(img, this.x - cameraX, this.y - bounce, this.w, this.h);
        ctx.restore();
    }
}

// --- ENEMY CLASS ---
class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 50; this.h = 50;
        this.dx = levelConfigs[currentLevel].enemySpeed;
    }
    update() { this.x += this.dx; }
    draw() { ctx.drawImage(sprites.enemy, this.x - cameraX, this.y, this.w, this.h); }
}

// --- LEVEL LOGIC ---
function generateLevel(lvlNum) {
    const config = levelConfigs[lvlNum];
    const generated = [{ x: 0, y: canvas.height - 100, w: 1000, h: 100, color: config.ground }];
    let curX = 1200, lastY = canvas.height - 100;
    while (curX < config.length - 600) {
        let pW = Math.random() * 250 + 150;
        let nY = Math.max(250, Math.min(lastY + (Math.random() * 320 - 160), canvas.height - 100));
        generated.push({ x: curX, y: nY, w: pW, h: 20, color: config.ground });
        lastY = nY; curX += pW + (Math.random() * 150 + 100);
    }
    generated.push({ x: config.length - 300, y: canvas.height - 100, w: 400, h: 100, color: "#2ecc71" });
    return generated;
}

function resetGame(isNewLevel = false) {
    updateHighScores();
    if (!isNewLevel) { score = 0; scoreEl.innerText = score; msgEl.innerText = "Find the Lightning Bolt!"; }
    p.x = 100; p.y = canvas.height - 250; p.dy = 0; p.isPikachu = false; cameraX = 0;
    enemies.length = 0; bolts.length = 0;
    platforms = generateLevel(currentLevel);
    stone.active = true; stone.x = platforms[2].x + 50; stone.y = platforms[2].y - 60;
}

function goToNextLevel() {
    if (isTransitioning) return;
    isTransitioning = true;
    currentLevel++;
    if (!levelConfigs[currentLevel]) { alert("Champion!"); currentLevel = 1; }
    const overlay = document.getElementById('level-overlay');
    document.getElementById('level-title').innerText = `LEVEL ${currentLevel}`;
    document.getElementById('level-subtitle').innerText = levelConfigs[currentLevel].title;
    overlay.style.display = 'flex';
    resetGame(true);
    setTimeout(() => { overlay.style.display = 'none'; isTransitioning = false; }, 2000);
}

// --- INITIALIZE & LOOP ---
const p = new Player();
const enemies = [], bolts = [];
let platforms = generateLevel(1);
let stone = { x: 0, y: 0, w: 40, h: 40, active: true };
let clouds = [{x: 200, y: 100, s: 0.2}, {x: 800, y: 50, s: 0.3}];

window.onkeydown = (e) => {
    keys[e.code] = true;
    if (e.code === 'ArrowUp') {
        if (p.grounded) { p.dy = p.jump; p.grounded = false; p.canDoubleJump = true; playSound(sounds.jump); }
        else if (p.canDoubleJump) { p.dy = p.jump * 0.8; p.canDoubleJump = false; playSound(sounds.jump); }
    }
    if (e.code === 'Space' && p.isPikachu) {
        let dir = p.facingLeft ? -1 : 1;
        bolts.push({ x: p.facingLeft ? p.x : p.x + p.w, y: p.y + 20, dx: 12 * dir });
        playSound(sounds.zap);
    }
};
window.onkeyup = (e) => keys[e.code] = false;

function animate() {
    if (isTransitioning) { requestAnimationFrame(animate); return; }
    const config = levelConfigs[currentLevel];
    ctx.fillStyle = config.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finishLine = config.length - 300;
    if (p.x > finishLine) { p.x = -1000; playSound(sounds.level_complete); goToNextLevel(); requestAnimationFrame(animate); return; }

    ctx.fillStyle = "white";
    clouds.forEach(c => {
        let cx = (c.x - cameraX * c.s) % (canvas.width + 200);
        ctx.beginPath(); ctx.arc(cx, c.y, 30, 0, Math.PI*2); ctx.fill();
    });

    platforms.forEach(plat => { ctx.fillStyle = plat.color; ctx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h); });
    ctx.drawImage(sprites.goal, finishLine - cameraX, canvas.height - 180, 80, 80);

    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x - cameraX, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h) {
            stone.active = false; p.isPikachu = true; playSound(sounds.evolve);
            msgEl.innerText = "EVOLVED! Press SPACE to Zap!";
        }
    }

    p.update(); p.draw();

    if (p.x > 500 && p.x < finishLine - 600 && enemies.length < 5 && Math.random() < 0.01) {
        enemies.push(new Enemy(cameraX + canvas.width, canvas.height - 150));
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i]; en.update(); en.draw();
        if (en.x < cameraX - 100) { enemies.splice(i, 1); continue; }
        if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) { playSound(sounds.hit); resetGame(); return; }
        bolts.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + 40 > en.x && b.y < en.y + en.h && b.y + 20 > en.y) {
                enemies.splice(i, 1); bolts.splice(bi, 1); score += 50; scoreEl.innerText = score;
            }
        });
    }

    bolts.forEach((b, i) => {
        b.x += b.dx;
        ctx.save();
        if (b.dx < 0) { ctx.translate(b.x - cameraX + 20, 0); ctx.scale(-1, 1); ctx.translate(-(b.x - cameraX + 20), 0); }
        ctx.shadowBlur = 15; ctx.shadowColor = "yellow";
        ctx.drawImage(sprites.stone, b.x - cameraX, b.y, 40, 20);
        ctx.restore();
        if (b.x - cameraX > canvas.width || b.x - cameraX < -100) bolts.splice(i, 1);
    });

    requestAnimationFrame(animate);
}

document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-overlay').style.display = 'none';
    sounds.bgm.play().catch(() => {});
    resetGame(); animate();
};