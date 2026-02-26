// ==================== 关卡生成 ====================
function generateLevel(levelNum) {
    const platforms = [];
    const enemies = [];
    const coins = [];
    let flag;

    const levelWidth = 3000 + levelNum * 500;

    // 地面
    platforms.push(new Platform(0, 450, levelWidth, 100, 'ground'));

    // 根据关卡生成不同的平台布局
    let platformX = 200;
    while (platformX < levelWidth - 300) {
        const platformWidth = 80 + Math.random() * 100;
        const platformY = 280 + Math.random() * 120;

        if (Math.random() > 0.3) {
            platforms.push(new Platform(platformX, platformY, platformWidth, 25, 'normal'));
        } else {
            platforms.push(new Platform(platformX, platformY, platformWidth, 20, 'stone'));
        }

        // 在平台上添加金币
        if (Math.random() > 0.5) {
            coins.push(new Coin(platformX + platformWidth / 2 - 10, platformY - 30));
        }

        platformX += platformWidth + 100 + Math.random() * 150;
    }

    // 添加敌人
    let enemyX = 400;
    while (enemyX < levelWidth - 400) {
        enemies.push(new Enemy(enemyX, 400, 'walker'));
        enemyX += 300 + Math.random() * 200;
    }

    // 终点旗帜
    flag = new Flag(levelWidth - 100, 350);

    return { platforms, enemies, coins, flag, levelWidth };
}
