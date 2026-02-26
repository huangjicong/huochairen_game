// ==================== 游戏配置 ====================
const CONFIG = {
    gravity: 0.6,
    friction: 0.8,
    playerSpeed: 5,
    jumpForce: -14,
    attackRange: 60,
    attackDamage: 1
};

// ==================== 游戏状态 ====================
let canvas, ctx;
let gameRunning = false;
let score = 0;
let currentLevel = 1;
let lives = 3;
let cameraX = 0;

// ==================== 游戏对象 ====================
let player;
let platforms = [];
let enemies = [];
let coins = [];
let flag;
let levelWidth;

// ==================== 输入处理 ====================
const keys = {
    left: false,
    right: false,
    up: false,
    attack: false,
    shoot: false,
    switchWeapon: false
};

// ==================== 初始化 ====================
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = true;
        if (e.key === ' ') { keys.up = true; e.preventDefault(); }
        if (e.key === 'j' || e.key === 'J') keys.attack = true;
        if (e.key === 'k' || e.key === 'K') keys.shoot = true;
        if (e.key === 'q' || e.key === 'Q') {
            if (!keys.switchWeapon) {
                keys.switchWeapon = true;
                weaponSystem.switchMelee();
                updateUI();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
        if (e.key === ' ') keys.up = false;
        if (e.key === 'j' || e.key === 'J') keys.attack = false;
        if (e.key === 'k' || e.key === 'K') keys.shoot = false;
        if (e.key === 'q' || e.key === 'Q') keys.switchWeapon = false;
    });
}

// ==================== 关卡加载 ====================
function loadLevel(levelNum) {
    weaponSystem.resetArrows();
    weaponSystem.arrowList = [];

    const level = generateLevel(levelNum);
    platforms = level.platforms;
    enemies = level.enemies;
    coins = level.coins;
    flag = level.flag;
    levelWidth = level.levelWidth;

    player = new StickMan(100, 300);
    cameraX = 0;
}

// ==================== 游戏控制 ====================
function startGame() {
    audioManager.init();
    audioManager.resume();
    // audioManager.playBGM(); // 背景音乐已禁用
    document.getElementById('gameStart').style.display = 'none';
    score = 0;
    lives = 3;
    currentLevel = 1;
    weaponSystem.currentMeleeIndex = 0;
    updateUI();
    loadLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    score = 0;
    lives = 3;
    currentLevel = 1;
    weaponSystem.resetArrows();
    weaponSystem.arrowList = [];
    weaponSystem.currentMeleeIndex = 0;
    updateUI();
    loadLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

function nextLevel() {
    document.getElementById('gameWin').style.display = 'none';
    currentLevel++;
    updateUI();
    loadLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

function gameOver() {
    audioManager.stopBGM();
    gameRunning = false;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

function gameWin() {
    gameRunning = false;
    score += 500 * currentLevel;
    audioManager.playWinSound();
    updateUI();
    document.getElementById('winScore').textContent = score;
    document.getElementById('gameWin').style.display = 'block';
}

// ==================== 游戏主循环 ====================
function gameLoop() {
    if (!gameRunning) return;

    // 更新
    player.update(platforms);

    // 更新武器系统（箭矢）
    weaponSystem.update(platforms, enemies);

    enemies.forEach(enemy => {
        enemy.update(platforms);

        // 玩家攻击敌人
        player.attackHit(enemy);

        // 敌人攻击玩家 (死亡中的敌人不会伤害玩家)
        if (enemy.alive && !enemy.dying && player.collidesWith(enemy) && !player.isDead) {
            player.die();
        }
    });

    // 金币收集
    coins.forEach(coin => {
        coin.update();
        if (!coin.collected && player.collidesWith(coin)) {
            coin.collected = true;
            score += 50;
            audioManager.playCoinSound();
            updateUI();
        }
    });

    // 终点检测
    flag.update();
    if (player.collidesWith(flag)) {
        gameWin();
        return;
    }

    // 相机跟随
    const targetCameraX = player.x - canvas.width / 3;
    cameraX = Math.max(0, Math.min(targetCameraX, levelWidth - canvas.width));

    // 绘制
    drawBackground();
    platforms.forEach(p => p.draw(ctx));
    coins.forEach(c => c.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    flag.draw(ctx);
    weaponSystem.draw(ctx);
    player.draw(ctx);

    requestAnimationFrame(gameLoop);
}

// 初始化游戏
init();
