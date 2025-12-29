const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let cameraX = 0;
let score = 0;
const gravity = 0.8;

// --- ASSET LOADING ---
const sprites = {
    pichu: new Image(),
    pikachu: new Image(),
    enemy: new Image(),
    stone: new Image()
};

// Reliable URLs
sprites.pichu.src = './assets/pichu.png';
sprites.pikachu.src = './assets/pikachu.png';
sprites.enemy.src = './assets/meowth.png';
sprites.stone.src = './assets/lightning-bolt.png';

const platforms = [
    { x: 0, y: canvas.height - 100, w: 5000, h: 100 }, // Floor
    { x: 400, y: canvas.height - 250, w: 200, h: 20 },
    { x: 800, y: canvas.height - 400, w: 200, h: 20 },
    { x: 1200, y: canvas.height - 250, w: 300, h: 20 }
];

class Player {
    constructor() {
        this.w = 60;
        this.h = 60;
        this.x = 100;
        // Start exactly on the floor to prevent falling through at start
        this.y = platforms[0].y - this.h;
        this.dy = 0;
        this.speed = 7;
        this.jump = -18;
        this.isPikachu = false;
        this.grounded = true;
    }

    draw() {
        const img = this.isPikachu ? sprites.pikachu : sprites.pichu;
        if (img.complete && img.naturalHeight !== 0) {
            ctx.drawImage(img, this.x - cameraX, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = this.isPikachu ? "#F08030" : "#FFDE00";
            ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
        }
    }

    update() {
        if (keys.ArrowRight) this.x += this.speed;
        if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;

        if (keys.ArrowUp && this.grounded) {
            this.dy = this.jump;
            this.grounded = false;
        }

        this.dy += gravity;
        this.y += this.dy;

        // Collision Logic
        this.grounded = false;
        platforms.forEach(plat => {
            if (this.x < plat.x + plat.w &&
                this.x + this.w > plat.x &&
                this.y + this.h > plat.y &&
                this.y + this.h < plat.y + plat.h &&
                this.dy >= 0) { // Only collide while falling
                this.dy = 0;
                this.grounded = true;
                this.y = plat.y - this.h;
            }
        });

        // Camera follow
        if (this.x > canvas.width / 2) {
            cameraX = this.x - canvas.width / 2;
        }

        // Death condition (Falling off the world)
        if (this.y > canvas.height) {
            this.reset();
        }
    }

    reset() {
        this.x = 100;
        this.y = platforms[0].y - this.h;
        this.dy = 0;
        cameraX = 0;
        score = 0;
        scoreEl.innerText = score;
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
let stone = { x: 1300, y: canvas.height - 300, w: 40, h: 40, active: true };
const keys = {};

window.onkeydown = (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' && p.isPikachu) {
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
        ctx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h);
    });

    // Stone
    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x - cameraX, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h && p.y + p.h > stone.y) {
            stone.active = false;
            p.isPikachu = true;
            msgEl.innerText = "EVOLVED! Press SPACE to Thunderbolt!";
        }
    }

    // Update & Draw Player
    p.update();
    p.draw();

    // Bolts
    bolts.forEach((b, i) => {
        b.x += 12;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x - cameraX, b.y, b.w, b.h);
        if (b.x - cameraX > canvas.width) bolts.splice(i, 1);
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

    requestAnimationFrame(animate);
}

animate();