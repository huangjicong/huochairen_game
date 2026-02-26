// ==================== 火柴人类 ====================
class StickMan {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 60;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.facing = 1; // 1 = 右, -1 = 左
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackType = 'punch'; // 'punch', 'sword', 'bow'
        this.hasHitEnemy = false; // 防止重复伤害
        this.isShooting = false;
        this.shootTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.isDead = false;
        this.animator = new SkeletonAnimator();
    }

    update(platforms) {
        if (this.isDead) {
            this.animator.update();
            return;
        }

        // 更新动画状态
        if (!this.onGround) {
            this.animator.setState('jump', 40);
        } else if (Math.abs(this.vx) > 0.5) {
            this.animator.setState('run', 60);
        } else if (!this.isAttacking && !this.isShooting) {
            this.animator.setState('idle', 120);
        }

        // 水平移动
        if (keys.left) {
            this.vx = -CONFIG.playerSpeed;
            this.facing = -1;
        } else if (keys.right) {
            this.vx = CONFIG.playerSpeed;
            this.facing = 1;
        } else {
            this.vx *= CONFIG.friction;
        }

        // 跳跃
        if (keys.up && this.onGround) {
            this.vy = CONFIG.jumpForce;
            this.onGround = false;
            audioManager.playJumpSound();
        }

        // 重力
        this.vy += CONFIG.gravity;

        // 更新位置
        this.x += this.vx;
        this.y += this.vy;

        // 边界检查
        if (this.x < 0) this.x = 0;

        // 平台碰撞检测
        this.onGround = false;
        for (let platform of platforms) {
            if (this.collidesWith(platform)) {
                // 从上方落下
                if (this.vy > 0 && this.y + this.height - this.vy <= platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
                // 从下方撞击
                else if (this.vy < 0 && this.y - this.vy >= platform.y + platform.height) {
                    this.y = platform.y + platform.height;
                    this.vy = 0;
                }
                // 从侧面撞击
                else if (this.vx > 0) {
                    this.x = platform.x - this.width;
                } else if (this.vx < 0) {
                    this.x = platform.x + platform.width;
                }
            }
        }

        // 攻击
        if (keys.attack && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = 30;
            this.hasHitEnemy = false; // 重置伤害标志

            // 根据当前武器设置动画
            const currentMelee = weaponSystem.getCurrentMelee();
            this.attackType = currentMelee;

            if (currentMelee === 'punch') {
                this.animator.setState('attack_punch', 30);
                audioManager.playPunchSound();
            } else {
                this.animator.setState('attack_sword', 35);
                audioManager.playSwordSound();
            }
        }

        // 射箭
        if (keys.shoot && !this.isShooting && weaponSystem.arrows > 0) {
            this.isShooting = true;
            this.shootTimer = 40;
            this.animator.setState('attack_bow', 40);
            audioManager.playBowSound();
            weaponSystem.shootArrow(this);
        }

        if (this.isAttacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.hasHitEnemy = false;
            }
        }

        if (this.isShooting) {
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.isShooting = false;
            }
        }

        // 动画帧更新
        this.animTimer++;
        if (this.animTimer > 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // 掉落死亡
        if (this.y > canvas.height + 100) {
            this.die();
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    attackHit(enemy) {
        // 不能攻击已经死亡或正在死亡的敌人
        if (!this.isAttacking || this.hasHitEnemy || enemy.dying || !enemy.alive) return false;

        const currentMelee = weaponSystem.getCurrentMelee();
        let range, damage;

        if (currentMelee === 'punch') {
            range = 50;
            damage = 1;
        } else {
            range = 80;
            damage = 2;
        }

        const attackX = this.facing === 1 ? this.x + this.width : this.x - range;
        const attackBox = {
            x: attackX,
            y: this.y + 15,
            width: range,
            height: 30
        };

        const hit = attackBox.x < enemy.x + enemy.width &&
                    attackBox.x + attackBox.width > enemy.x &&
                    attackBox.y < enemy.y + enemy.height &&
                    attackBox.y + attackBox.height > enemy.y;

        if (hit) {
            enemy.takeDamage(damage);
            this.hasHitEnemy = true; // 标记已造成伤害
        }

        return hit;
    }

    die() {
        if (this.isDead) return;
        audioManager.playDeathSound();
        this.isDead = true;
        this.animator.setState('die', 80);
        lives--;
        updateUI();
        if (lives <= 0) {
            setTimeout(() => gameOver(), 1500);
        } else {
            setTimeout(() => this.respawn(), 1500);
        }
    }

    respawn() {
        this.x = 100;
        this.y = 300;
        this.vx = 0;
        this.vy = 0;
        this.isDead = false;
        this.isAttacking = false;
        this.isShooting = false;
        this.animator = new SkeletonAnimator();
        cameraX = 0;
    }

    draw(ctx) {
        if (this.isDead && this.animator.state !== 'die') return;

        ctx.save();
        ctx.translate(-cameraX, 0);

        const x = this.x + this.width / 2;
        const y = this.y;

        // 更新动画器
        this.animator.update();

        // 攻击时添加能量光晕
        if (this.isAttacking || this.isShooting) {
            const progress = this.animator.getProgress();
            const glowIntensity = progress < 0.5 ? progress * 2 : 2 - progress * 2;
            const glowColor = this.attackType === 'sword'
                ? `rgba(180, 180, 255, ${glowIntensity * 0.3})`
                : `rgba(255, 200, 150, ${glowIntensity * 0.25})`;

            // 身体光晕
            ctx.fillStyle = glowColor;
            ctx.beginPath();
            ctx.ellipse(x, y + 30, 35, 45, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 绘制骨骼
        this.animator.draw(ctx, x, y, this.facing);

        // 绘制武器
        if (this.isAttacking || this.isShooting) {
            this.drawWeapon(ctx, x, y);
        }

        ctx.restore();
    }

    drawWeapon(ctx, x, y) {
        ctx.save();

        const shoulderY = this.y + 28;
        const elbowAngle = this.animator.joints.elbow[this.facing === 1 ? 'right' : 'left'];
        const shoulderAngle = this.animator.joints.shoulder[this.facing === 1 ? 'right' : 'left'];

        // 计算手的位置
        const armLength = this.animator.limbLengths.upperArm + this.animator.limbLengths.lowerArm;
        const handX = x + this.facing * Math.sin(shoulderAngle + elbowAngle) * armLength;
        const handY = shoulderY + Math.cos(shoulderAngle + elbowAngle) * armLength;

        if (this.attackType === 'sword' && this.isAttacking) {
            // 绘制剑
            this.drawSword(ctx, handX, handY);

            // 绘制剑气
            if (this.animator.getProgress() > 0.3 && this.animator.getProgress() < 0.7) {
                this.drawSwordSlash(ctx, handX, handY);
            }
        } else if (this.attackType === 'punch' && this.isAttacking) {
            // 绘制拳风残影
            if (this.animator.getProgress() > 0.3 && this.animator.getProgress() < 0.6) {
                this.drawPunchEffect(ctx, handX, handY);
            }
        }

        ctx.restore();
    }

    drawSword(ctx, x, y) {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        const slashAngle = this.animator.getProgress() * Math.PI - Math.PI / 4;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x + this.facing * Math.cos(slashAngle) * 45,
            y + Math.sin(slashAngle) * 45
        );
        ctx.stroke();

        // 剑柄
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x - this.facing * 5, y - 3);
        ctx.lineTo(x + this.facing * 5, y + 3);
        ctx.stroke();
    }

    drawSwordSlash(ctx, x, y) {
        const progress = Math.max(0, Math.min(1, (this.animator.getProgress() - 0.3) / 0.4));
        const alpha = 1 - progress;

        ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // 剑气弧线 - 确保半径为正数
        const mainRadius = Math.max(1, 50 * progress);
        ctx.beginPath();
        ctx.arc(x, y, mainRadius,
            -Math.PI / 3, Math.PI / 3, false);
        ctx.stroke();

        // 拖尾效果 - 确保半径为正数
        for (let i = 0; i < 3; i++) {
            const trailRadius = Math.max(1, 50 * progress - i * 5);
            ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * 0.3 / (i + 1)})`;
            ctx.beginPath();
            ctx.arc(x - this.facing * (i + 1) * 10, y, trailRadius,
                -Math.PI / 3, Math.PI / 3, false);
            ctx.stroke();
        }
    }

    drawPunchEffect(ctx, x, y) {
        const progress = Math.max(0, Math.min(1, (this.animator.getProgress() - 0.3) / 0.3));
        const alpha = 1 - progress;

        // 残影拳头
        for (let i = 0; i < 3; i++) {
            const offsetX = -this.facing * (i + 1) * 8;
            const trailAlpha = alpha * (1 - i * 0.3);
            const radius = Math.max(1, 8 - i * 2);

            ctx.fillStyle = `rgba(50, 50, 50, ${trailAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ==================== 敌人类 ====================
class Enemy {
    constructor(x, y, type = 'walker') {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 50;
        this.type = type;
        this.vx = type === 'walker' ? 1.5 : 0;
        this.vy = 0;
        this.health = 1;
        this.startX = x;
        this.patrolRange = 100;
        this.alive = true;
        this.dying = false; // 正在播放死亡动画
        this.facing = 1;
        this.animator = new EnemySkeletonAnimator();
    }

    update(platforms) {
        // 正在播放死亡动画
        if (this.dying) {
            this.animator.update();
            // 死亡动画完成后标记为可移除
            if (this.animator.getDieProgress() >= 1) {
                this.alive = false;
                this.dying = false;
            }
            return;
        }

        if (!this.alive) return;

        if (this.type === 'walker') {
            // 巡逻移动
            this.x += this.vx;
            this.facing = this.vx > 0 ? 1 : -1;
            if (Math.abs(this.x - this.startX) > this.patrolRange) {
                this.vx *= -1;
            }
            this.animator.setState('walk');
        } else {
            this.animator.setState('idle');
        }

        // 重力
        this.vy += CONFIG.gravity * 0.8;
        this.y += this.vy;

        // 平台碰撞
        for (let platform of platforms) {
            if (this.collidesWith(platform) && this.vy > 0) {
                this.y = platform.y - this.height;
                this.vy = 0;
            }
        }

        // 更新动画
        this.animator.update();
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    takeDamage(damage = 1) {
        this.health -= damage;
        if (this.health <= 0) {
            // 开始死亡动画
            this.dying = true;
            this.animator.setState('die');
            audioManager.playEnemyDeathSound();
            score += 100;
            updateUI();
            // 20% 概率掉落箭矢
            if (Math.random() < 0.2) {
                weaponSystem.addArrows(3);
                updateUI();
            }
        }
    }

    draw(ctx) {
        // 死亡动画播放完毕后不再绘制
        if (!this.alive && !this.dying) return;

        ctx.save();
        ctx.translate(-cameraX, 0);

        const x = this.x + this.width / 2;
        const y = this.y;

        // 使用骨骼动画绘制
        this.animator.draw(ctx, x, y, this.facing);

        ctx.restore();
    }
}

// ==================== 平台类 ====================
class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-cameraX, 0);

        if (this.type === 'normal') {
            // 草地平台
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y + 10, this.width, this.height - 10);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x, this.y, this.width, 10);

            // 草地纹理
            ctx.fillStyle = '#2E8B2E';
            for (let i = 0; i < this.width; i += 15) {
                ctx.beginPath();
                ctx.arc(this.x + i + 7, this.y + 5, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'stone') {
            // 石头平台
            ctx.fillStyle = '#666';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#888';
            ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 5);
        } else if (this.type === 'ground') {
            // 地面
            ctx.fillStyle = '#654321';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x, this.y, this.width, 8);
        }

        ctx.restore();
    }
}

// ==================== 终点旗帜 ====================
class Flag {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 100;
        this.waveTimer = 0;
    }

    update() {
        this.waveTimer++;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(-cameraX, 0);

        // 旗杆
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x, this.y, 8, this.height);

        // 旗帜 (飘动效果)
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y);
        const wave = Math.sin(this.waveTimer * 0.1) * 5;
        ctx.quadraticCurveTo(this.x + 35 + wave, this.y + 15, this.x + 50 + wave, this.y);
        ctx.quadraticCurveTo(this.x + 35 + wave, this.y + 20, this.x + 8, this.y + 35);
        ctx.closePath();
        ctx.fill();

        // 星星装饰
        ctx.fillStyle = '#f1c40f';
        ctx.font = '20px Arial';
        ctx.fillText('⭐', this.x + 18, this.y + 22);

        ctx.restore();
    }
}

// ==================== 金币类 ====================
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.collected = false;
        this.animTimer = Math.random() * 100;
    }

    update() {
        this.animTimer++;
    }

    draw(ctx) {
        if (this.collected) return;

        ctx.save();
        ctx.translate(-cameraX, 0);

        const scale = 0.7 + Math.sin(this.animTimer * 0.1) * 0.3;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(this.x + 10, this.y + 10, 10 * scale, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('$', this.x + 5, this.y + 15);

        ctx.restore();
    }
}
