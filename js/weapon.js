// ==================== 武器系统 ====================
class WeaponSystem {
    constructor() {
        this.meleeWeapons = ['punch', 'sword'];
        this.currentMeleeIndex = 0;
        this.arrows = 10;
        this.maxArrows = 10;

        this.arrowList = [];
    }

    getCurrentMelee() {
        return this.meleeWeapons[this.currentMeleeIndex];
    }

    switchMelee() {
        this.currentMeleeIndex = (this.currentMeleeIndex + 1) % this.meleeWeapons.length;
    }

    resetArrows() {
        this.arrows = this.maxArrows;
    }

    addArrows(count) {
        this.arrows = Math.min(this.arrows + count, this.maxArrows * 2);
    }

    shootArrow(player) {
        if (this.arrows <= 0) return null;

        this.arrows--;

        const arrow = new Arrow(
            player.x + player.width / 2,
            player.y + 25,
            player.facing
        );
        this.arrowList.push(arrow);

        return arrow;
    }

    update(platforms, enemies) {
        // 更新所有箭矢
        for (let i = this.arrowList.length - 1; i >= 0; i--) {
            const arrow = this.arrowList[i];
            arrow.update();

            // 检测与平台碰撞
            for (let platform of platforms) {
                if (arrow.collidesWith(platform)) {
                    arrow.active = false;
                    break;
                }
            }

            // 检测与敌人碰撞
            for (let enemy of enemies) {
                if (enemy.alive && arrow.collidesWith(enemy)) {
                    enemy.takeDamage();
                    arrow.active = false;
                    // 20% 概率掉落箭矢
                if (Math.random() < 0.2) {
                    this.addArrows(3);
                }
                break;
            }
        }

            // 移除无效箭矢
            if (!arrow.active) {
                this.arrowList.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (let arrow of this.arrowList) {
            arrow.draw(ctx);
        }
    }
}

// ==================== 箭矢类 ====================
class Arrow {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 6;
        this.direction = direction;
        this.vx = direction * 15;
        this.vy = -3;
        this.active = true;
        this.rotation = Math.atan2(this.vy, this.vx);
        this.trail = [];
    }

    update() {
        if (!this.active) return;

        // 保存轨迹
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 5) {
            this.trail.shift();
        }

        // 更新透明度
        this.trail.forEach((t, i) => {
            t.alpha = (i + 1) / this.trail.length * 0.5;
        });

        // 抛物线运动
        this.vy += 0.3;
        this.x += this.vx;
        this.y += this.vy;

        // 更新旋转角度
        this.rotation = Math.atan2(this.vy, this.vx);

        // 边界检测
        if (this.x < cameraX - 100 || this.x > cameraX + canvas.width + 100 ||
            this.y > canvas.height + 100) {
            this.active = false;
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(-cameraX, 0);

        // 绘制拖尾
        this.trail.forEach((t) => {
            ctx.strokeStyle = `rgba(139, 90, 43, ${t.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(t.x, t.y);
            ctx.lineTo(t.x - this.direction * 15, t.y);
            ctx.stroke();
        });

        // 绘制箭身
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // 箭杆
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(10, 0);
        ctx.stroke();

        // 箭头
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(8, -4);
        ctx.lineTo(8, 4);
        ctx.closePath();
        ctx.fill();

        // 箭羽
        ctx.fillStyle = '#D2691E';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-12, -5);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-12, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

const weaponSystem = new WeaponSystem();
