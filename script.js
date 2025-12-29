const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- CONFIG & STATE ---
let cameraX = 0;
let score = 0;
const gravity = 0.8;
const goalX = 4800;
const keys = {};

// --- AUDIO ---
const sounds = {
    jump: new Audio('./assets/jump.mp3'),
    evolve: new Audio('./assets/evolve.mp3'),
    zap: new Audio('./assets/bullet.mp3'),
    hit: new Audio('./assets/hit.mp3'),
    level_complete: new Audio('./assets/level_complete.mp3'),
    bgm: new Audio('./assets/bgm.mp3')
};
sounds.bgm.loop = true;
sounds.bgm.volume = 0.4;

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

// --- ASSETS ---
const sprites = {
    pichu: new Image(),
    pikachu: new Image(),
    enemy: new Image(),
    stone: new Image(),
    goal: new Image()
};
sprites.pichu.src = './assets/pichu.png';
sprites.pikachu.src = './assets/pikachu.png';
sprites.enemy.src = './assets/meowth.png';
sprites.stone.src = './assets/lightning-bolt.png';
sprites.goal.src = './assets/pokeball.png';

// --- GAME OBJECTS ---
const platforms = [
    { x: 0, y: canvas.height - 100, w: 5000, h: 100 },
    { x: 400, y: canvas.height - 250, w: 200, h: 20 },
    { x: 800, y: canvas.height - 400, w: 200, h: 20 },
    { x: 1200, y: canvas.height - 250, w: 300, h: 20 }
];

let clouds = [
    {x: 200, y: 100, s: 0.2}, {x: 800, y: 50, s: 0.3}, {x: 1400, y: 150, s: 0.1}
];

class Player {
    constructor() {
        this.w = 60; this.h = 60;
        this.x = 100; this.y = platforms[0].y - 60;
        this.dy = 0; this.speed = 7; this.jump = -18;
        this.isPikachu = false; this.grounded = true;
    }

    update() {
        if (keys.ArrowRight) this.x += this.speed;
        if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;
        if (keys.ArrowUp && this.grounded) {
            this.dy = this.jump;
            this.grounded = false;
            playSound(sounds.jump);
        }
        this.dy += gravity;
        this.y += this.dy;

        this.grounded = false;
        platforms.forEach(plat => {
            if (this.x < plat.x + plat.w && this.x + this.w > plat.x &&
                this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h && this.dy >= 0) {
                this.dy = 0; this.grounded = true; this.y = plat.y - this.h;
            }
        });

        if (this.x > canvas.width / 2) cameraX = this.x - canvas.width / 2;
        if (this.y > canvas.height) location.reload();
    }

    draw() {
        const img = this.isPikachu ? sprites.pikachu : sprites.pichu;
        ctx.drawImage(img, this.x - cameraX, this.y, this.w, this.h);
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 50; this.h = 50; this.dx = -3;
    }
    update() { this.x += this.dx; }
    draw() { ctx.drawImage(sprites.enemy, this.x - cameraX, this.y, this.w, this.h); }
}

const p = new Player();
const enemies = [];
const bolts = [];
let stone = { x: 1300, y: canvas.height - 300, w: 40, h: 40, active: true };

// --- CONTROLS ---
window.onkeydown = (e) => { 
    keys[e.code] = true; 
    if(e.code === 'Space' && p.isPikachu) fireZap();
};
window.onkeyup = (e) => keys[e.code] = false;

function fireZap() {
    bolts.push({ x: p.x + 50, y: p.y + 20, w: 30, h: 10 });
    playSound(sounds.zap);
}

// Mobile Setup
const mobileBtn = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; if(id==='btn-jump') keys['ArrowUp']=true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; if(id==='btn-jump') keys['ArrowUp']=false; });
};
mobileBtn('btn-left', 'ArrowLeft');
mobileBtn('btn-right', 'ArrowRight');
document.getElementById('btn-jump').addEventListener('touchstart', (e) => { 
    e.preventDefault(); if(p.grounded) { p.dy = p.jump; p.grounded = false; playSound(sounds.jump); }
});
document.getElementById('btn-shoot').addEventListener('touchstart', (e) => {
    e.preventDefault(); if(p.isPikachu) fireZap();
});

// --- CORE LOOP ---
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = "white";
    clouds.forEach(c => {
        let cx = (c.x - cameraX * c.s) % (canvas.width + 200);
        ctx.beginPath(); ctx.arc(cx, c.y, 30, 0, Math.PI*2); ctx.fill();
    });

    platforms.forEach(plat => {
        ctx.fillStyle = "#4a2c00";
        ctx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h);
    });

    ctx.drawImage(sprites.goal, goalX - cameraX, canvas.height - 180, 80, 80);

    if (p.x > goalX) {
        playSound(sounds.level_complete);
        alert("Level Clear!");
        location.reload();
        return;
    }

    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x - cameraX, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h) {
            stone.active = false; p.isPikachu = true;
            playSound(sounds.evolve);
            msgEl.innerText = "EVOLVED! Press SPACE to Zap!";
        }
    }

    p.update(); p.draw();

    if (Math.random() < 0.01) enemies.push(new Enemy(cameraX + canvas.width, canvas.height - 150));

    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i]; en.update(); en.draw();
        if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
            playSound(sounds.hit); alert("Caught!"); location.reload(); return;
        }
        bolts.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h) {
                enemies.splice(i, 1); bolts.splice(bi, 1);
                score += 50; scoreEl.innerText = score;
            }
        });
    }

    bolts.forEach((b, i) => {
        b.x += 12; ctx.fillStyle = "yellow";
        ctx.fillRect(b.x - cameraX, b.y, b.w, b.h);
        if (b.x - cameraX > canvas.width) bolts.splice(i, 1);
    });

    requestAnimationFrame(animate);
}

// Start Game
document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-overlay').style.display = 'none';
    sounds.bgm.play();
    animate();
};