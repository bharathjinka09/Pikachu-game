const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('message');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// --- AUDIO SECTION ---
const sounds = {
    jump: new Audio("data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAD//wIAAAAAAP//AgAAAA=="), // Short Beep
    evolve: new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YAgAAAAAAAD//wIA"), // Power up
    zap: new Audio("data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAD//wIAAAAAAP//AgAAAA=="), // Zap
    hit: new Audio("data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAD//wIAAAAAAP//AgAAAA==") // Death
};

// Helper function to play sounds from the start even if triggered rapidly
function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Sound blocked until user interacts with page."));
}

let cameraX = 0;
let score = 0;
const gravity = 0.8;
const goalX = 4800; // Near the end of the floor

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

sprites.goal = new Image();
sprites.goal.src = './assets/pokeball.png';

// --- GAME OBJECTS ---
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
            playSound(sounds.jump);
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
        if (sprites.enemy.complete && sprites.enemy.naturalHeight !== 0) {
            ctx.drawImage(sprites.enemy, this.x - cameraX, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
        }
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
        playSound(sounds.zap);
    }
};
window.onkeyup = (e) => keys[e.code] = false;


function spawnEnemy() {
    // 0.01 is about 1 enemy every 1.5 seconds at 60fps
    if (Math.random() < 0.01) {
        // Spawn them just off the right edge of the current screen
        let spawnX = cameraX + canvas.width; 
        enemies.push(new Enemy(spawnX, canvas.height - 150));
    }
}


let clouds = [
    {x: 200, y: 100, s: 0.2}, 
    {x: 600, y: 50, s: 0.3}, 
    {x: 1000, y: 120, s: 0.25}
];

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- 1. DRAW PARALLAX BACKGROUND (CLOUDS) ---
    ctx.fillStyle = "white";
    clouds.forEach(c => {
        // Clouds move at a fraction of cameraX
        let cloudX = (c.x - cameraX * c.s) % (canvas.width + 200);
        if (cloudX < -100) cloudX += canvas.width + 200; 
        ctx.beginPath();
        ctx.arc(cloudX, c.y, 30, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- 2. DRAW PLATFORMS ---
    ctx.fillStyle = "#4a2c00";
    platforms.forEach(plat => {
        ctx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h);
    });

    // --- 3. DRAW GOAL (POKÉBALL) ---
    ctx.drawImage(sprites.goal, goalX - cameraX, canvas.height - 180, 80, 80);
    
    // Win Check
    if (p.x > goalX) {
        alert("You Won! Final Score: " + score);
        p.reset();
        return; 
    }

    // --- 4. STONE LOGIC ---
    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x - cameraX, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h && p.y + p.h > stone.y) {
            stone.active = false;
            p.isPikachu = true;
            playSound(sounds.evolve);
            msgEl.innerText = "EVOLVED! Press SPACE to Thunderbolt!";
        }
    }

    // --- 5. UPDATE & DRAW PLAYER ---
    p.update();
    p.draw();

    // --- 6. ENEMY SPAWNING & LOGIC ---
    spawnEnemy();
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i];
        en.update();
        en.draw();

        // Player Hit Enemy
        if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
            playSound(sounds.hit);                
            alert("Game Over! Score: " + score);
            p.reset();
            enemies.length = 0; 
            return;
        }

        // Bolt Hit Enemy
        bolts.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
                enemies.splice(i, 1);
                bolts.splice(bi, 1);
                score += 50;
                scoreEl.innerText = score;
            }
        });
    }

    // --- 7. THUNDERBOLTS ---
    bolts.forEach((b, i) => {
        b.x += 12;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x - cameraX, b.y, b.w, b.h);
        if (b.x - cameraX > canvas.width) bolts.splice(i, 1);
    });

    requestAnimationFrame(animate);
}
animate();