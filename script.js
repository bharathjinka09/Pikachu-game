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
const levelConfigs = {
    1: { bg: "#87CEEB", ground: "#4a2c00", enemySpeed: -3, length: 5000, title: "Emerald Path" },
    2: { bg: "#2e1a47", ground: "#1a1a1a", enemySpeed: -5, length: 6000, title: "Shadow Cave" },
    3: { bg: "#e67e22", ground: "#d35400", enemySpeed: -7, length: 7000, title: "Volcano Ridge" },
    4: { bg: "#2c3e50", ground: "#ecf0f1", enemySpeed: -9, length: 8000, title: "Moonlight Peak" }
};

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
    // Adding the .catch() prevents unhandled promise errors
    sound.play().catch(error => {
        console.warn("Audio play blocked or interrupted:", error);
    });
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

// --- LEVEL GENERATION & RESET ---
let currentLevel = 1;

let isTransitioning = false;
function goToNextLevel() {
    if (isTransitioning) return; // Prevent double triggers
    isTransitioning = true;

    currentLevel++;
    
    // Check if we ran out of levels
    if (!levelConfigs[currentLevel]) {
        alert("CONGRATULATIONS! You are the Pokémon Champion!");
        currentLevel = 1; 
    }
    // Show Overlay
    const overlay = document.getElementById('level-overlay');
    const title = document.getElementById('level-title');
    const subtitle = document.getElementById('level-subtitle');
    
    title.innerText = `LEVEL ${currentLevel}`;
    subtitle.innerText = levelConfigs[currentLevel].title;
    overlay.style.display = 'flex';

    // Refresh game state
    resetGame(true);

    // Wait 2 seconds, then hide overlay and resume
    setTimeout(() => {
        overlay.style.display = 'none';
        isTransitioning = false;
    }, 2000);
}


function resetGame(isNewLevel = false) {
    const config = levelConfigs[currentLevel];
    
    // 1. Reset Player Position & State
    p.x = 100;
    p.y = canvas.height - 250; // Start slightly in the air
    p.dy = 0;
    p.isPikachu = false;
    p.grounded = false;
    cameraX = 0;
    
    if (!isNewLevel) {
        score = 0;
        scoreEl.innerText = score;
        msgEl.innerText = "Find the Lightning Bolt!";
    }

    // 2. Clear Arrays
    enemies.length = 0;
    bolts.length = 0;
    
    // 3. Re-generate platforms for the SPECIFIC level
    platforms = generateLevel(currentLevel);
    
    // 4. Reposition the Stone
    stone.active = true;
    if (platforms[2]) {
        stone.x = platforms[2].x + 50;
        stone.y = platforms[2].y - 60;
    }
}


function generateLevel(lvlNum) {
    const config = levelConfigs[lvlNum] || levelConfigs[1]; // Fallback to Level 1
    const generatedPlatforms = [
        { x: 0, y: canvas.height - 100, w: 1000, h: 100, color: config.ground }
    ];

    let currentX = 1200;
    let lastY = canvas.height - 100;

    while (currentX < config.length - 600) {
        let pWidth = Math.random() * 250 + 150;
        let maxJumpUp = 160; 
        let newY = lastY + (Math.random() * (maxJumpUp * 2) - maxJumpUp);

        // Keep platforms in screen bounds
        newY = Math.max(250, Math.min(newY, canvas.height - 100));

        generatedPlatforms.push({
            x: currentX,
            y: newY,
            w: pWidth,
            h: 20,
            color: config.ground
        });

        lastY = newY;
        currentX += pWidth + (Math.random() * 150 + 100);
    }

    // Final Goal Platform
    generatedPlatforms.push({ x: config.length - 300, y: canvas.height - 100, w: 400, h: 100, color: "#2ecc71" });
    return generatedPlatforms;
}
// --- GAME OBJECTS ---

let platforms = generateLevel();

let clouds = [
    {x: 200, y: 100, s: 0.2}, {x: 800, y: 50, s: 0.3}, {x: 1400, y: 150, s: 0.1}
];

class Player {
    constructor() {
        this.w = 60; this.h = 60;
        this.x = 100; this.y = 0;
        this.dy = 0; this.speed = 7; this.jump = -18;
        this.isPikachu = false; 
        this.grounded = true;
        this.canDoubleJump = false; // New property
    }

    update() {
        // Horizontal Movement
        if (keys.ArrowRight) this.x += this.speed;
        if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;

        // Jump Logic (Handled in the Event Listener now for better control)
        this.dy += gravity;
        this.y += this.dy;

        // Collision Logic
        this.grounded = false;
        platforms.forEach(plat => {
            if (this.x < plat.x + plat.w && this.x + this.w > plat.x &&
                this.y + this.h > plat.y && this.y + this.h < plat.y + plat.h && this.dy >= 0) {
                this.dy = 0; 
                this.grounded = true; 
                this.canDoubleJump = true; // Reset double jump when touching ground
                this.y = plat.y - this.h;
            }
        });

        if (this.x > canvas.width / 2) cameraX = this.x - canvas.width / 2;
        if (this.y > canvas.height) resetGame();
    }

    draw() {
        const img = this.isPikachu ? sprites.pikachu : sprites.pichu;
        ctx.drawImage(img, this.x - cameraX, this.y, this.w, this.h);
    }
}



class Enemy {
    constructor(x, y) {
        this.x = x; this.y = y; this.w = 50; this.h = 50;
        // Use currentLevel speed from config
        this.dx = levelConfigs[currentLevel].enemySpeed; 
    }
    update() { this.x += this.dx; }
    draw() { ctx.drawImage(sprites.enemy, this.x - cameraX, this.y, this.w, this.h); }
}

// --- INITIALIZATION ---
const p = new Player();
const enemies = [];
const bolts = [];
let stone = { x: 1300, y: canvas.height - 300, w: 40, h: 40, active: true };

// --- CONTROLS ---
window.onkeydown = (e) => { 
    keys[e.code] = true; 

    // JUMP LOGIC
    if (e.code === 'ArrowUp') {
        if (p.grounded) {
            // First Jump
            p.dy = p.jump;
            p.grounded = false;
            p.canDoubleJump = true; 
            playSound(sounds.jump);
        } else if (p.canDoubleJump) {
            // Double Jump
            p.dy = p.jump * 0.8; // Make the second jump slightly weaker for better feel
            p.canDoubleJump = false; // Use up the double jump
            playSound(sounds.jump);
        }
    }

    if (e.code === 'Space' && p.isPikachu) fireZap();
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
    e.preventDefault(); 
    if (p.grounded) {
        p.dy = p.jump; p.grounded = false; p.canDoubleJump = true; playSound(sounds.jump);
    } else if (p.canDoubleJump) {
        p.dy = p.jump * 0.8; p.canDoubleJump = false; playSound(sounds.jump);
    }
});

document.getElementById('btn-shoot').addEventListener('touchstart', (e) => {
    e.preventDefault(); if(p.isPikachu) fireZap();
});

// --- CORE LOOP ---
function animate() {

    if (isTransitioning) {
        // Just keep the loop alive but don't process logic
        requestAnimationFrame(animate);
        return;
    }
    // 1. CLEAR & BACKGROUND
    const config = levelConfigs[currentLevel];
    ctx.fillStyle = config.bg; // Use the level's background color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. WIN CONDITION (Check against the actual level length)
    
    const finishLine = levelConfigs[currentLevel].length - 300;
    
    if (p.x > finishLine) {
        p.x = 0; // Move player immediately so this IF doesn't trigger again
        playSound(sounds.level_complete);
        goToNextLevel();
        requestAnimationFrame(animate);
        return; // Stop this frame entirely
    }
    
    // 3. DRAW SCENERY
    ctx.fillStyle = "white";
    clouds.forEach(c => {
        let cx = (c.x - cameraX * c.s) % (canvas.width + 200);
        ctx.beginPath(); ctx.arc(cx, c.y, 30, 0, Math.PI*2); ctx.fill();
    });

    // 4. DRAW PLATFORMS
    platforms.forEach(plat => {
        ctx.fillStyle = plat.color || config.ground;
        ctx.fillRect(plat.x - cameraX, plat.y, plat.w, plat.h);
    });

    // 5. DRAW GOAL (Pokéball at the end of the level)
    ctx.drawImage(sprites.goal, finishLine - cameraX, canvas.height - 180, 80, 80);
    
    // 6. EVOLUTION STONE
    if (stone.active) {
        ctx.drawImage(sprites.stone, stone.x - cameraX, stone.y, stone.w, stone.h);
        if (p.x < stone.x + stone.w && p.x + p.w > stone.x && p.y < stone.y + stone.h) {
            stone.active = false; p.isPikachu = true;
            playSound(sounds.evolve);
            msgEl.innerText = "EVOLVED! Press SPACE to Zap!";
        }
    }

    // 7. PLAYER & ENEMIES
    p.update(); 
    p.draw();

    // Spawn logic
    if (p.x > 500 && p.x < finishLine - 600) {
        if (enemies.length < 5 && Math.random() < 0.01) {
            enemies.push(new Enemy(cameraX + canvas.width, canvas.height - 150));
        }
    }

    // Enemy/Bolt Loop
    for (let i = enemies.length - 1; i >= 0; i--) {
        let en = enemies[i]; 
        en.update(); 
        en.draw();

        if (en.x < cameraX - 100) { enemies.splice(i, 1); continue; }
        
        // Collision with Player
        if (p.x < en.x + en.w && p.x + p.w > en.x && p.y < en.y + en.h && p.y + p.h > en.y) {
            playSound(sounds.hit); 
            resetGame(); 
            return;
        }

        // Collision with Bolts
        bolts.forEach((b, bi) => {
            if (b.x < en.x + en.w && b.x + 40 > en.x && b.y < en.y + en.h && b.y + 20 > en.y) { 
                enemies.splice(i, 1); 
                bolts.splice(bi, 1);
                score += 50; 
                scoreEl.innerText = score;
            }
        });
    }

    // 8. DRAW THUNDERBOLTS
    bolts.forEach((b, i) => {
        b.x += 12;
        if (sprites.stone.complete) {
            ctx.shadowBlur = 15; ctx.shadowColor = "yellow";
            ctx.drawImage(sprites.stone, b.x - cameraX, b.y, 40, 20);
            ctx.shadowBlur = 0;
        } else {
            ctx.font = "30px Arial"; ctx.fillText("⚡", b.x - cameraX, b.y + 20);
        }
        if (b.x - cameraX > canvas.width) bolts.splice(i, 1);
    });

    requestAnimationFrame(animate);
}
// Start Game
document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-overlay').style.display = 'none';
    sounds.bgm.play().catch(e => console.log("BGM error:", e));
    animate();
};