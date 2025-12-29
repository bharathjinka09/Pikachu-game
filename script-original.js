const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- ASSET LOADING ---
// To use real images, replace these URLs with your local file paths
const sprites = {
    pikachu: new Image(),
    raichu: new Image(),
    enemy: new Image(),
    stone: new Image()
};
sprites.pikachu.src = './assets/pikachu.png'; 
sprites.raichu.src = './assets/raichu.png';
sprites.enemy.src = './assets/meowth.png';
sprites.stone.src = './assets/stone.png';

let score = 0;
const gravity = 0.7;

class Player {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.w = 60;
        this.h = 60;
        this.dy = 0;
        this.speed = 7;
        this.jump = -16;
        this.isRaichu = false;
        this.grounded = false;
    }
    draw() {
        const img = this.isRaichu ? sprites.raichu : sprites.pikachu;
        ctx.drawImage(img, this.x, this.y, this.w, this.h);
    }
    update() {
        if (keys.ArrowRight) this.x += this.speed;
        if (keys.ArrowLeft) this.x -= this.speed;
        if (keys.ArrowUp && this.grounded) {
            this.dy = this.jump;
            this.grounded = false;
        }
        this.dy += gravity;
        this.y += this.dy;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 50;
        this.h = 50;
        this.dx = -2;
    }
    draw() {
        ctx.drawImage(sprites.enemy, this.x, this.y, this.w, this.h);
    }
    update() {
        this.x += this.dx;
    }
}

const p = new Player();
const enemies = [];
const bolts = [];
let stone = { x: 1200, y: canvas.height - 150, w: 40, h: 40, active: true };
const platforms = [
    { x: 0, y: canvas.height - 50, w: 2000, h: 50 },
    { x: 400, y: canvas.height - 200, w: 200, h: 20 },
    { x: 800, y: canvas.height - 300, w: 200, h: 20 },
    { x: 1150, y: canvas.height - 100, w: 100, h: 20 }
];

const keys = {};
window.onkeydown = (e) => {
    keys[e.code] = true;
    if(e.code === 'Space' && p.isRaichu) {
        bolts.push({ x: p.x + 50, y: p.y + 20, w: 30, h: 10 });
    }
};
window.onkeyup = (e) => keys[e.code] = false;

function spawnEnemy() {
    if (Math.random() < 0.01) {
        enemies.push(new Enemy(canvas.width, canvas.height - 100));
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Platforms
    ctx.fillStyle = "#4a2c00";
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        // Collision
        if (p.y + p.h <= plat.y && p.y + p.h + p.dy >= plat.y &&
            p.x + p.w > plat.x && p.x < plat.x + plat.w) {
            p.dy = 0;
            p.grounded = true;
            p.y = plat.y - p.h;
        }
    });

    // Stone Logic
    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h) {
            stone.active = false;
            p.isRaichu = true;
            msgEl.innerText = "EVOLVED! Press SPACE to use Thunderbolt!";
        }
    }

    // Thunderbolt Logic
    bolts.forEach((b, i) => {
        b.x += 12;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Kill enemies
        enemies.forEach((en, ei) => {
            if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h) {
                enemies.splice(ei, 1);
                bolts.splice(i, 1);
                score += 50;
                scoreEl.innerText = score;
            }
        });
    });

    // Enemy Logic
    enemies.forEach((en, i) => {
        en.update();
        en.draw();
        if (p.x < en.x + en.w && p.x + p.w > en.x && p.y + p.h > en.y) {
            alert("Game Over! Score: " + score);
            // location.reload();
        }
    });

    p.update();
    p.draw();
    spawnEnemy();
    requestAnimationFrame(animate);
}

animate();