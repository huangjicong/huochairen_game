// ==================== UI 更新 ====================
function updateUI() {
    document.getElementById('score').textContent = `分数: ${score}`;
    document.getElementById('level').textContent = `关卡: ${currentLevel}`;
    let heartsStr = '生命: ';
    for (let i = 0; i < lives; i++) heartsStr += '❤️';
    document.getElementById('lives').textContent = heartsStr;

    // 更新武器显示
    const currentMelee = weaponSystem.getCurrentMelee();
    const weaponEmoji = currentMelee === 'punch' ? '👊' : '⚔️';
    const weaponName = currentMelee === 'punch' ? '拳脚' : '剑';
    document.getElementById('weapon').textContent = `武器: ${weaponEmoji} ${weaponName}`;

    // 更新箭矢显示
    document.getElementById('arrows').textContent = `箭矢: 🏹 ${weaponSystem.arrows}`;
}

// ==================== 背景绘制 ====================
function drawBackground() {
    // 天空渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#E0F6FF');
    gradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 云朵 (视差效果)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const clouds = [
        { x: 100, y: 60, size: 40 },
        { x: 300, y: 100, size: 30 },
        { x: 600, y: 50, size: 50 },
        { x: 850, y: 80, size: 35 }
    ];

    clouds.forEach(cloud => {
        const px = (cloud.x - cameraX * 0.3) % (canvas.width + 200);
        drawCloud(px, cloud.y, cloud.size);
    });

    // 远山 (视差效果)
    ctx.fillStyle = '#a8d5a2';
    for (let i = 0; i < 5; i++) {
        const mx = (i * 300 - cameraX * 0.2) % (canvas.width + 600) - 100;
        drawMountain(mx, canvas.height - 150, 200 + i * 20, 150);
    }
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.5, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawMountain(x, baseY, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width / 2, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
}
