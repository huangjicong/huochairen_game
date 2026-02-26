# 音效-动画-武器系统 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为火柴人闯关游戏添加程序化音效系统、武侠风格骨骼动画、多武器战斗系统。

**Architecture:** 分三个独立模块实现：AudioManager 使用 Web Audio API 生成音效；SkeletonAnimator 实现8关节骨骼系统与动画状态机；WeaponSystem 管理三种武器（拳脚/剑/弓箭）及其特效。

**Tech Stack:** 纯 JavaScript + HTML5 Canvas + Web Audio API，无外部依赖。

---

## Task 1: AudioManager 基础架构

**Files:**
- Modify: `game.js:1-10` (在 CONFIG 后添加 AudioManager 类)

**Step 1: 添加 AudioManager 类框架和基础音效方法**

在 `game.js` 中 CONFIG 常量后，添加 AudioManager 类：

```javascript
// ==================== 音效管理器 ====================
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.6;
        this.isPlaying = false;
    }

    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // BGM 音量节点
        this.bgmGain = this.audioContext.createGain();
        this.bgmGain.gain.value = this.bgmVolume;
        this.bgmGain.connect(this.audioContext.destination);

        // SFX 音量节点
        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(this.audioContext.destination);
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 创建白噪声
    createNoise(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // 播放音符
    playNote(frequency, duration, type = 'sine', gainNode = this.sfxGain) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(gainNode);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }
}

const audioManager = new AudioManager();
```

**Step 2: 验证代码无语法错误**

在浏览器中打开 `index.html`，打开控制台，确认无报错。

**Step 3: Commit**

```bash
git add game.js
git commit -m "feat: add AudioManager base class with noise generator"
```

---

## Task 2: 实现背景音乐 (BGM)

**Files:**
- Modify: `game.js` (在 AudioManager 类中添加 BGM 方法)

**Step 1: 在 AudioManager 类中添加 BGM 相关属性和方法**

在 `playNote` 方法后添加：

```javascript
    // ==================== 背景音乐 ====================
    // 中国风五声音阶 (宫商角徵羽): C D E G A
    getScaleNotes(baseFreq) {
        return [
            baseFreq,           // 宫 (1)
            baseFreq * 9/8,     // 商 (2)
            baseFreq * 5/4,     // 角 (3)
            baseFreq * 3/2,     // 徵 (5)
            baseFreq * 5/3,     // 羽 (6)
            baseFreq * 2        // 高八度宫
        ];
    }

    playBGM() {
        if (!this.audioContext || this.isPlaying) return;
        this.isPlaying = true;

        const baseFreq = 261.63; // C4
        const scale = this.getScaleNotes(baseFreq);
        const melody = [
            { note: 0, dur: 0.5 },
            { note: 2, dur: 0.5 },
            { note: 4, dur: 0.75 },
            { note: 3, dur: 0.25 },
            { note: 2, dur: 0.5 },
            { note: 1, dur: 0.5 },
            { note: 0, dur: 1.0 },
            { note: 2, dur: 0.5 },
            { note: 3, dur: 0.5 },
            { note: 5, dur: 0.5 },
            { note: 4, dur: 0.5 },
            { note: 3, dur: 0.5 },
            { note: 2, dur: 0.5 },
            { note: 0, dur: 1.0 }
        ];

        let time = this.audioContext.currentTime;
        const loopDuration = melody.reduce((sum, n) => sum + n.dur, 0) + 0.5;

        const playLoop = () => {
            if (!this.isPlaying) return;

            let t = this.audioContext.currentTime;

            melody.forEach(note => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'triangle';
                osc.frequency.value = scale[note.note];

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(this.bgmVolume * 0.5, t + 0.05);
                gain.gain.setValueAtTime(this.bgmVolume * 0.5, t + note.dur * 0.7);
                gain.gain.linearRampToValueAtTime(0, t + note.dur);

                osc.connect(gain);
                gain.connect(this.bgmGain);

                osc.start(t);
                osc.stop(t + note.dur);

                t += note.dur;
            });

            this.bgmTimeout = setTimeout(playLoop, loopDuration * 1000);
        };

        playLoop();
    }

    stopBGM() {
        this.isPlaying = false;
        if (this.bgmTimeout) {
            clearTimeout(this.bgmTimeout);
            this.bgmTimeout = null;
        }
    }
```

**Step 2: 在 startGame 函数中启动 BGM**

找到 `startGame` 函数，在开头添加：

```javascript
function startGame() {
    audioManager.init();
    audioManager.resume();
    audioManager.playBGM();
    // ... 原有代码
```

**Step 3: 在 gameOver 函数中停止 BGM**

找到 `gameOver` 函数，在开头添加：

```javascript
function gameOver() {
    audioManager.stopBGM();
    // ... 原有代码
```

**Step 4: 验证 BGM 播放**

打开游戏，点击开始，确认听到中国风背景音乐循环播放。

**Step 5: Commit**

```bash
git add game.js
git commit -m "feat: add procedural BGM with Chinese pentatonic scale"
```

---

## Task 3: 实现攻击音效（拳脚/剑/弓箭）

**Files:**
- Modify: `game.js` (在 AudioManager 类中添加攻击音效方法)

**Step 1: 在 AudioManager 类 stopBGM 方法后添加攻击音效方法**

```javascript
    // ==================== 攻击音效 ====================
    playPunchSound() {
        if (!this.audioContext) return;
        this.resume();

        // 低频噪声 + 快速衰减 = "呼"声
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoise(0.15);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(this.sfxVolume * 0.8, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
        noise.stop(this.audioContext.currentTime + 0.15);
    }

    playSwordSound() {
        if (!this.audioContext) return;
        this.resume();

        // 高频噪声 + 带通滤波 = 金属"刷"声
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoise(0.25);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 2;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start();
        noise.stop(this.audioContext.currentTime + 0.25);
    }

    playBowSound() {
        if (!this.audioContext) return;
        this.resume();

        // 弓弦"崩"声
        const osc = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);

        gain1.gain.setValueAtTime(this.sfxVolume * 0.6, this.audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        osc.connect(gain1);
        gain1.connect(this.sfxGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.1);

        // 箭矢"嗖"声 (延迟)
        setTimeout(() => {
            const noise = this.audioContext.createBufferSource();
            noise.buffer = this.createNoise(0.3);

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1500;

            const gain2 = this.audioContext.createGain();
            gain2.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            noise.connect(filter);
            filter.connect(gain2);
            gain2.connect(this.sfxGain);

            noise.start();
            noise.stop(this.audioContext.currentTime + 0.3);
        }, 50);
    }
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add punch, sword, and bow attack sound effects"
```

---

## Task 4: 实现游戏事件音效（死亡/金币/跳跃/过关）

**Files:**
- Modify: `game.js` (在 AudioManager 类中添加事件音效方法)

**Step 1: 在 playBowSound 方法后添加事件音效方法**

```javascript
    // ==================== 事件音效 ====================
    playDeathSound() {
        if (!this.audioContext) return;
        this.resume();

        // 下坠音调 + 低沉撞击
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.8);

        gain.gain.setValueAtTime(this.sfxVolume * 0.7, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.8);
    }

    playCoinSound() {
        if (!this.audioContext) return;
        this.resume();

        // 清脆"叮"声 - 两个音符
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();

        osc1.type = 'sine';
        osc1.frequency.value = 880;

        gain1.gain.setValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

        osc1.connect(gain1);
        gain1.connect(this.sfxGain);

        osc1.start();
        osc1.stop(this.audioContext.currentTime + 0.1);

        // 第二个音符 (更高)
        setTimeout(() => {
            const osc2 = this.audioContext.createOscillator();
            const gain2 = this.audioContext.createGain();

            osc2.type = 'sine';
            osc2.frequency.value = 1320;

            gain2.gain.setValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            osc2.connect(gain2);
            gain2.connect(this.sfxGain);

            osc2.start();
            osc2.stop(this.audioContext.currentTime + 0.15);
        }, 80);
    }

    playJumpSound() {
        if (!this.audioContext) return;
        this.resume();

        // 轻微上升音调
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.15);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    playWinSound() {
        if (!this.audioContext) return;
        this.resume();

        // 欢快上升音阶
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        let time = this.audioContext.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, time + i * 0.12);
            gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.6, time + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.12 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(time + i * 0.12);
            osc.stop(time + i * 0.12 + 0.3);
        });
    }
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add death, coin, jump, and win sound effects"
```

---

## Task 5: 集成音效到游戏事件

**Files:**
- Modify: `game.js` (在各类中调用音效)

**Step 1: 在 StickMan 类的跳跃逻辑中添加跳跃音效**

找到 `StickMan` 类 `update` 方法中的跳跃部分（约第 59-63 行），修改为：

```javascript
        // 跳跃
        if (keys.up && this.onGround) {
            this.vy = CONFIG.jumpForce;
            this.onGround = false;
            audioManager.playJumpSound();
        }
```

**Step 2: 在 StickMan 类的 die 方法中添加死亡音效**

找到 `die` 方法（约第 147-157 行），在开头添加：

```javascript
    die() {
        if (this.isDead) return;
        audioManager.playDeathSound();
        this.isDead = true;
        // ... 其余代码不变
```

**Step 3: 在金币收集逻辑中添加金币音效**

找到 `gameLoop` 中的金币收集部分（约第 683-689 行），修改为：

```javascript
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
```

**Step 4: 在过关时添加过关音效**

找到 `gameWin` 函数（约第 645-651 行），修改为：

```javascript
function gameWin() {
    gameRunning = false;
    score += 500 * currentLevel;
    audioManager.playWinSound();
    updateUI();
    document.getElementById('winScore').textContent = score;
    document.getElementById('gameWin').style.display = 'block';
}
```

**Step 5: 验证所有音效**

打开游戏，测试：
- 开始游戏听到 BGM
- 跳跃听到跳跃音效
- 收集金币听到金币音效
- 死亡听到死亡音效
- 过关听到过关音效

**Step 6: Commit**

```bash
git add game.js
git commit -m "feat: integrate sound effects into game events"
```

---

## Task 6: SkeletonAnimator 基础架构

**Files:**
- Modify: `game.js` (在 AudioManager 后添加 SkeletonAnimator 类)

**Step 1: 在 audioManager 实例后添加 SkeletonAnimator 类**

```javascript
// ==================== 骨骼动画系统 ====================
class SkeletonAnimator {
    constructor() {
        // 动画状态
        this.state = 'idle';
        this.stateTimer = 0;
        this.stateDuration = 60; // 帧数

        // 关节角度 (弧度)
        this.joints = {
            shoulder: { left: 0, right: 0 },
            elbow: { left: 0, right: 0 },
            hip: { left: 0, right: 0 },
            knee: { left: 0, right: 0 }
        };

        // 目标角度 (用于平滑过渡)
        this.targetJoints = {
            shoulder: { left: 0, right: 0 },
            elbow: { left: 0, right: 0 },
            hip: { left: 0, right: 0 },
            knee: { left: 0, right: 0 }
        };

        // 肢体长度
        this.limbLengths = {
            upperArm: 12,
            lowerArm: 10,
            upperLeg: 14,
            lowerLeg: 12
        };
    }

    setState(newState, duration = 60) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
            this.stateDuration = duration;
        }
    }

    update() {
        this.stateTimer++;

        // 根据状态更新目标关节角度
        switch (this.state) {
            case 'idle': this.updateIdle(); break;
            case 'run': this.updateRun(); break;
            case 'jump': this.updateJump(); break;
            case 'attack_punch': this.updateAttackPunch(); break;
            case 'attack_sword': this.updateAttackSword(); break;
            case 'attack_bow': this.updateAttackBow(); break;
            case 'die': this.updateDie(); break;
        }

        // 平滑过渡到目标角度
        this.interpolateJoints();
    }

    interpolateJoints() {
        const speed = 0.15;
        for (let part of ['shoulder', 'elbow', 'hip', 'knee']) {
            for (let side of ['left', 'right']) {
                this.joints[part][side] += (this.targetJoints[part][side] - this.joints[part][side]) * speed;
            }
        }
    }

    // 获取动画进度 (0-1)
    getProgress() {
        return Math.min(this.stateTimer / this.stateDuration, 1);
    }

    // 武侠风格缓动函数
    wuxiaEasing(t) {
        // 0-30%: 蓄力 (慢)
        // 30-60%: 发力 (快)
        // 60-100%: 收招 (中)
        if (t < 0.3) {
            return t * 0.5; // 慢
        } else if (t < 0.6) {
            return 0.15 + (t - 0.3) * 2; // 快
        } else {
            return 0.75 + (t - 0.6) * 0.833; // 中
        }
    }
}
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add SkeletonAnimator base class with joint system"
```

---

## Task 7: 实现基础动画状态 (idle/run/jump)

**Files:**
- Modify: `game.js` (在 SkeletonAnimator 类中添加状态更新方法)

**Step 1: 在 SkeletonAnimator 类的 wuxiaEasing 方法后添加 idle/run/jump 状态**

```javascript
    // ==================== 动画状态更新 ====================
    updateIdle() {
        const t = (this.stateTimer % 120) / 120;
        const breath = Math.sin(t * Math.PI * 2) * 0.05;

        this.targetJoints.shoulder.left = -0.1 + breath;
        this.targetJoints.shoulder.right = 0.1 - breath;
        this.targetJoints.elbow.left = 0.1;
        this.targetJoints.elbow.right = -0.1;
        this.targetJoints.hip.left = 0.05;
        this.targetJoints.hip.right = -0.05;
        this.targetJoints.knee.left = 0.02;
        this.targetJoints.knee.right = -0.02;
    }

    updateRun() {
        const cycle = 8; // 步频
        const t = (this.stateTimer % cycle) / cycle;
        const swing = Math.sin(t * Math.PI * 2);

        // 手臂摆动 (与腿反向)
        this.targetJoints.shoulder.left = swing * 0.6;
        this.targetJoints.shoulder.right = -swing * 0.6;
        this.targetJoints.elbow.left = Math.abs(swing) * 0.4;
        this.targetJoints.elbow.right = Math.abs(swing) * 0.4;

        // 腿部交替迈步 (武侠跑姿 - 上身前倾)
        this.targetJoints.hip.left = -swing * 0.7;
        this.targetJoints.hip.right = swing * 0.7;
        this.targetJoints.knee.left = Math.max(0, swing) * 0.8;
        this.targetJoints.knee.right = Math.max(0, -swing) * 0.8;
    }

    updateJump() {
        const progress = this.getProgress();

        if (progress < 0.2) {
            // 起跳蓄力 - 下蹲
            const t = progress / 0.2;
            this.targetJoints.hip.left = -t * 0.6;
            this.targetJoints.hip.right = -t * 0.6;
            this.targetJoints.knee.left = t * 1.2;
            this.targetJoints.knee.right = t * 1.2;
        } else if (progress < 0.4) {
            // 蹬地发力
            const t = (progress - 0.2) / 0.2;
            this.targetJoints.hip.left = -0.6 + t * 0.8;
            this.targetJoints.hip.right = -0.6 + t * 0.8;
            this.targetJoints.knee.left = 1.2 - t * 1.4;
            this.targetJoints.knee.right = 1.2 - t * 1.4;
        } else if (progress < 0.8) {
            // 空中收腿
            const t = (progress - 0.4) / 0.4;
            this.targetJoints.hip.left = 0.2 + t * 0.4;
            this.targetJoints.hip.right = 0.2 + t * 0.4;
            this.targetJoints.knee.left = -0.2 + t * 0.8;
            this.targetJoints.knee.right = -0.2 + t * 0.8;
        } else {
            // 落地缓冲
            const t = (progress - 0.8) / 0.2;
            this.targetJoints.hip.left = 0.6 - t * 0.55;
            this.targetJoints.hip.right = 0.6 - t * 0.55;
            this.targetJoints.knee.left = 0.6 - t * 0.58;
            this.targetJoints.knee.right = 0.6 - t * 0.58;
        }

        // 手臂向上张开
        this.targetJoints.shoulder.left = -0.8;
        this.targetJoints.shoulder.right = 0.8;
        this.targetJoints.elbow.left = -0.3;
        this.targetJoints.elbow.right = 0.3;
    }
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add idle, run, and jump animation states"
```

---

## Task 8: 实现攻击动画状态 (punch/sword/bow)

**Files:**
- Modify: `game.js` (在 SkeletonAnimator 类中添加攻击状态)

**Step 1: 在 updateJump 方法后添加攻击动画状态**

```javascript
    updateAttackPunch() {
        const progress = this.wuxiaEasing(this.getProgress());

        if (progress < 0.3) {
            // 蓄力 - 扭腰收拳
            const t = progress / 0.3;
            this.targetJoints.shoulder.left = -0.3 - t * 0.5;
            this.targetJoints.shoulder.right = 0.5 - t * 0.8;
            this.targetJoints.elbow.right = 1.2;
            this.targetJoints.hip.left = -0.2 - t * 0.3;
            this.targetJoints.hip.right = 0.2 + t * 0.3;
        } else if (progress < 0.6) {
            // 发力 - 出拳
            const t = (progress - 0.3) / 0.3;
            this.targetJoints.shoulder.right = -0.3 + t * 1.5;
            this.targetJoints.elbow.right = 1.2 - t * 1.5;
            this.targetJoints.shoulder.left = -0.8 + t * 0.5;
            this.targetJoints.hip.left = -0.5 + t * 0.6;
            this.targetJoints.hip.right = 0.5 - t * 0.6;
        } else {
            // 收招
            const t = (progress - 0.6) / 0.4;
            this.targetJoints.shoulder.right = 1.2 - t * 1.1;
            this.targetJoints.elbow.right = -0.3 + t * 0.4;
            this.targetJoints.shoulder.left = -0.3 - t * 0.1;
            this.targetJoints.hip.left = 0.1 - t * 0.05;
            this.targetJoints.hip.right = -0.1 + t * 0.15;
        }

        // 腿部保持稳定
        this.targetJoints.knee.left = 0.1;
        this.targetJoints.knee.right = -0.1;
    }

    updateAttackSword() {
        const progress = this.wuxiaEasing(this.getProgress());

        if (progress < 0.3) {
            // 蓄力 - 拔剑后引
            const t = progress / 0.3;
            this.targetJoints.shoulder.right = 0.5 - t * 1.5;
            this.targetJoints.elbow.right = 0.8 + t * 0.7;
            this.targetJoints.shoulder.left = -0.3 - t * 0.5;
            this.targetJoints.elbow.left = 0.3 + t * 0.4;
        } else if (progress < 0.6) {
            // 发力 - 挥砍
            const t = (progress - 0.3) / 0.3;
            this.targetJoints.shoulder.right = -1.0 + t * 2.2;
            this.targetJoints.elbow.right = 1.5 - t * 1.8;
            this.targetJoints.shoulder.left = -0.8 + t * 0.9;
            this.targetJoints.elbow.left = 0.7 - t * 0.6;
        } else {
            // 收招
            const t = (progress - 0.6) / 0.4;
            this.targetJoints.shoulder.right = 1.2 - t * 1.1;
            this.targetJoints.elbow.right = -0.3 + t * 0.5;
            this.targetJoints.shoulder.left = 0.1 - t * 0.2;
            this.targetJoints.elbow.left = 0.1;
        }

        // 腿部弓步
        if (progress < 0.6) {
            const t = progress / 0.6;
            this.targetJoints.hip.left = -0.4 * t;
            this.targetJoints.hip.right = 0.3 * t;
            this.targetJoints.knee.left = 0.3 * t;
            this.targetJoints.knee.right = -0.2 * t;
        } else {
            const t = (progress - 0.6) / 0.4;
            this.targetJoints.hip.left = -0.4 + t * 0.35;
            this.targetJoints.hip.right = 0.3 - t * 0.25;
            this.targetJoints.knee.left = 0.3 - t * 0.2;
            this.targetJoints.knee.right = -0.2 + t * 0.1;
        }
    }

    updateAttackBow() {
        const progress = this.getProgress();

        if (progress < 0.5) {
            // 拉弓蓄力
            const t = progress / 0.5;
            this.targetJoints.shoulder.left = -0.3 - t * 1.2;
            this.targetJoints.elbow.left = -0.5 - t * 0.8;
            this.targetJoints.shoulder.right = 0.8 + t * 0.4;
            this.targetJoints.elbow.right = 0.3 + t * 0.5;
        } else if (progress < 0.6) {
            // 松手放箭
            const t = (progress - 0.5) / 0.1;
            this.targetJoints.shoulder.left = -1.5 + t * 0.8;
            this.targetJoints.elbow.left = -1.3 + t * 1.0;
            this.targetJoints.shoulder.right = 1.2 - t * 0.3;
            this.targetJoints.elbow.right = 0.8 - t * 0.5;
        } else {
            // 收弓
            const t = (progress - 0.6) / 0.4;
            this.targetJoints.shoulder.left = -0.7 + t * 0.6;
            this.targetJoints.elbow.left = -0.3 + t * 0.4;
            this.targetJoints.shoulder.right = 0.9 - t * 0.8;
            this.targetJoints.elbow.right = 0.3 - t * 0.2;
        }

        // 腿部站稳
        this.targetJoints.hip.left = -0.1;
        this.targetJoints.hip.right = 0.2;
        this.targetJoints.knee.left = 0.05;
        this.targetJoints.knee.right = -0.1;
    }
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add punch, sword, and bow attack animations with wuxia style"
```

---

## Task 9: 实现死亡动画和骨骼绘制

**Files:**
- Modify: `game.js` (在 SkeletonAnimator 类中添加死亡动画和绘制方法)

**Step 1: 在 updateAttackBow 方法后添加死亡动画**

```javascript
    updateDie() {
        const progress = Math.min(this.getProgress(), 1);

        if (progress < 0.4) {
            // 膝盖弯曲
            const t = progress / 0.4;
            this.targetJoints.hip.left = -0.3 - t * 0.5;
            this.targetJoints.hip.right = -0.3 - t * 0.5;
            this.targetJoints.knee.left = 0.3 + t * 1.0;
            this.targetJoints.knee.right = 0.3 + t * 1.0;
            this.targetJoints.shoulder.left = -0.2 - t * 0.3;
            this.targetJoints.shoulder.right = 0.2 + t * 0.3;
            this.targetJoints.elbow.left = 0.2 + t * 0.3;
            this.targetJoints.elbow.right = -0.2 - t * 0.3;
        } else if (progress < 0.8) {
            // 身体后仰倒地
            const t = (progress - 0.4) / 0.4;
            this.targetJoints.hip.left = -0.8 + t * 0.3;
            this.targetJoints.hip.right = -0.8 + t * 0.3;
            this.targetJoints.knee.left = 1.3 - t * 0.5;
            this.targetJoints.knee.right = 1.3 - t * 0.5;
            this.targetJoints.shoulder.left = -0.5 - t * 0.8;
            this.targetJoints.shoulder.right = 0.5 + t * 0.8;
            this.targetJoints.elbow.left = 0.5 + t * 0.5;
            this.targetJoints.elbow.right = -0.5 - t * 0.5;
        } else {
            // 倒地静止
            this.targetJoints.hip.left = -0.5;
            this.targetJoints.hip.right = -0.5;
            this.targetJoints.knee.left = 0.8;
            this.targetJoints.knee.right = 0.8;
            this.targetJoints.shoulder.left = -1.3;
            this.targetJoints.shoulder.right = 1.3;
            this.targetJoints.elbow.left = 1.0;
            this.targetJoints.elbow.right = -1.0;
        }
    }
```

**Step 2: 在 updateDie 方法后添加绘制方法**

```javascript
    // ==================== 骨骼绘制 ====================
    draw(ctx, x, y, facing, scale = 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(facing, 1);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 身体中心位置
        const bodyTop = 22;
        const bodyBottom = 45;
        const shoulderY = bodyTop + 6;
        const hipY = bodyBottom;

        // 绘制左臂
        this.drawLimb(ctx,
            0, shoulderY,
            this.joints.shoulder.left, this.limbLengths.upperArm,
            this.joints.elbow.left, this.limbLengths.lowerArm
        );

        // 绘制右臂
        this.drawLimb(ctx,
            0, shoulderY,
            this.joints.shoulder.right, this.limbLengths.upperArm,
            this.joints.elbow.right, this.limbLengths.lowerArm
        );

        // 绘制左腿
        this.drawLimb(ctx,
            0, hipY,
            this.joints.hip.left, this.limbLengths.upperLeg,
            this.joints.knee.left, this.limbLengths.lowerLeg
        );

        // 绘制右腿
        this.drawLimb(ctx,
            0, hipY,
            this.joints.hip.right, this.limbLengths.upperLeg,
            this.joints.knee.right, this.limbLengths.lowerLeg
        );

        // 绘制身体
        ctx.beginPath();
        ctx.moveTo(0, bodyTop);
        ctx.lineTo(0, bodyBottom);
        ctx.stroke();

        // 绘制头
        ctx.beginPath();
        ctx.arc(0, 12, 10 * scale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawLimb(ctx, startX, startY, joint1Angle, length1, joint2Angle, length2) {
        // 第一段 (大臂/大腿)
        const midX = startX + Math.sin(joint1Angle) * length1;
        const midY = startY + Math.cos(joint1Angle) * length1;

        // 第二段 (小臂/小腿)
        const totalAngle = joint1Angle + joint2Angle;
        const endX = midX + Math.sin(totalAngle) * length2;
        const endY = midY + Math.cos(totalAngle) * length2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
```

**Step 3: Commit**

```bash
git add game.js
git commit -m "feat: add death animation and skeleton drawing with joints"
```

---

## Task 10: 将 SkeletonAnimator 集成到 StickMan 类

**Files:**
- Modify: `game.js` (修改 StickMan 类使用骨骼动画)

**Step 1: 修改 StickMan 构造函数，添加 animator 属性**

找到 StickMan 类构造函数（约第 29-43 行），修改为：

```javascript
class StickMan {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 60;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.facing = 1;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackType = 'punch'; // 'punch', 'sword', 'bow'
        this.isDead = false;
        this.animator = new SkeletonAnimator();
    }
```

**Step 2: 修改 StickMan 的 update 方法，更新动画状态**

在 `update` 方法开头（`if (this.isDead) return;` 之后）添加动画状态更新逻辑：

```javascript
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
        } else if (!this.isAttacking) {
            this.animator.setState('idle', 120);
        }

        // 水平移动
        // ... 保持原有移动逻辑不变
```

**Step 3: 在攻击逻辑中设置攻击动画并播放音效**

找到攻击逻辑部分（约第 99-110 行），修改为：

```javascript
        // 攻击
        if (keys.attack && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = 30;

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
            }
        }

        if (this.isShooting) {
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.isShooting = false;
            }
        }
```

**Step 4: 在 die 方法中设置死亡动画**

修改 die 方法：

```javascript
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
```

**Step 5: Commit**

```bash
git add game.js
git commit -m "feat: integrate SkeletonAnimator into StickMan class"
```

---

## Task 11: 替换 StickMan 的 draw 方法使用骨骼动画

**Files:**
- Modify: `game.js` (替换 StickMan.draw 方法)

**Step 1: 替换 StickMan 类的 draw 方法**

找到 StickMan 类的 draw 方法（约第 168-234 行），完全替换为：

```javascript
    draw(ctx) {
        if (this.isDead && this.animator.state !== 'die') return;

        ctx.save();
        ctx.translate(-cameraX, 0);

        const x = this.x + this.width / 2;
        const y = this.y;

        // 更新动画器
        this.animator.update();

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
        const progress = (this.animator.getProgress() - 0.3) / 0.4;
        const alpha = 1 - progress;

        ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // 剑气弧线
        ctx.beginPath();
        ctx.arc(x, y, 50 * progress,
            -Math.PI / 3, Math.PI / 3, false);
        ctx.stroke();

        // 拖尾效果
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = `rgba(200, 200, 255, ${alpha * 0.3 / (i + 1)})`;
            ctx.beginPath();
            ctx.arc(x - this.facing * (i + 1) * 10, y, 50 * progress - i * 5,
                -Math.PI / 3, Math.PI / 3, false);
            ctx.stroke();
        }
    }

    drawPunchEffect(ctx, x, y) {
        const progress = (this.animator.getProgress() - 0.3) / 0.3;
        const alpha = 1 - progress;

        // 残影拳头
        for (let i = 0; i < 3; i++) {
            const offsetX = -this.facing * (i + 1) * 8;
            const trailAlpha = alpha * (1 - i * 0.3);

            ctx.fillStyle = `rgba(50, 50, 50, ${trailAlpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(x + offsetX, y, 8 - i * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: replace stick figure with skeleton animation and weapon effects"
```

---

## Task 12: 创建 WeaponSystem 类

**Files:**
- Modify: `game.js` (在 SkeletonAnimator 类后添加 WeaponSystem 和 Arrow 类)

**Step 1: 在 SkeletonAnimator 类后添加 WeaponSystem 和 Arrow 类**

```javascript
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
```

**Step 2: Commit**

```bash
git add game.js
git commit -m "feat: add WeaponSystem class with Arrow projectile"
```

---

## Task 13: 添加武器切换和射击按键处理

**Files:**
- Modify: `game.js` (修改输入处理和初始化)

**Step 1: 修改 keys 对象，添加 shoot 和 switchWeapon**

找到 keys 对象（约第 20-25 行），修改为：

```javascript
const keys = {
    left: false,
    right: false,
    up: false,
    attack: false,
    shoot: false,
    switchWeapon: false
};
```

**Step 2: 在 init 函数中添加新按键监听**

找到 init 函数中的键盘事件监听（约第 578-593 行），在 keydown 和 keyup 中添加：

```javascript
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
```

**Step 3: Commit**

```bash
git add game.js
git commit -m "feat: add weapon switch (Q) and shoot (K) key handlers"
```

---

## Task 14: 集成 WeaponSystem 到游戏循环

**Files:**
- Modify: `game.js` (修改游戏循环和关卡加载)

**Step 1: 在 loadLevel 函数中重置箭矢**

找到 loadLevel 函数（约第 596-606 行），在开头添加：

```javascript
function loadLevel(levelNum) {
    weaponSystem.resetArrows();
    weaponSystem.arrowList = [];

    const level = generateLevel(levelNum);
    // ... 其余代码不变
```

**Step 2: 在 gameLoop 中更新和绘制箭矢**

在 gameLoop 函数中，在 `player.update(platforms);` 之后添加：

```javascript
    // 更新武器系统
    weaponSystem.update(platforms, enemies);
```

在 `player.draw(ctx);` 之前添加：

```javascript
    // 绘制箭矢
    weaponSystem.draw(ctx);
```

**Step 3: Commit**

```bash
git add game.js
git commit -m "feat: integrate WeaponSystem into game loop"
```

---

## Task 15: 更新 UI 显示弹药和当前武器

**Files:**
- Modify: `index.html` (更新 UI 元素)
- Modify: `game.js` (更新 updateUI 函数)

**Step 1: 修改 index.html 添加武器和弹药显示**

找到 `<div class="ui-overlay">` 部分（约第 112-116 行），修改为：

```html
        <div class="ui-overlay">
            <div id="score">分数: 0</div>
            <div id="level">关卡: 1</div>
            <div id="lives">生命: ❤️❤️❤️</div>
            <div id="weapon">武器: 👊 拳脚</div>
            <div id="arrows">箭矢: 🏹 10</div>
        </div>
```

找到游戏开始界面的 controls 部分（约第 122-126 行），修改为：

```html
            <div class="controls">
                <p><span>←</span> <span>→</span> 或 <span>A</span> <span>D</span> 移动</p>
                <p><span>空格</span> 或 <span>W</span> 跳跃</p>
                <p><span>J</span> 近战攻击 | <span>K</span> 射箭 | <span>Q</span> 切换武器</p>
            </div>
```

**Step 2: 修改 game.js 中的 updateUI 函数**

找到 updateUI 函数（约第 653-659 行），修改为：

```javascript
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
```

**Step 3: Commit**

```bash
git add index.html game.js
git commit -m "feat: add weapon and arrow count to UI"
```

---

## Task 16: 修复攻击检测以支持新武器

**Files:**
- Modify: `game.js` (修改攻击检测逻辑)

**Step 1: 修改 StickMan 类的 attackHit 方法**

找到 attackHit 方法（约第 132-145 行），修改为：

```javascript
    attackHit(enemy) {
        if (!this.isAttacking) return false;

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
            enemy.health -= damage - 1; // takeDamage 会减 1，这里补上额外伤害
        }

        return hit;
    }
```

**Step 2: 修改 Enemy 类的 takeDamage 方法支持不同伤害**

找到 Enemy 类的 takeDamage 方法（约第 293-300 行），修改为：

```javascript
    takeDamage(damage = 1) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
            score += 100;
            updateUI();
            // 20% 概率掉落箭矢
            if (Math.random() < 0.2) {
                weaponSystem.addArrows(3);
                updateUI();
            }
        }
    }
```

**Step 3: Commit**

```bash
git add game.js
git commit -m "feat: update attack detection to support different weapons"
```

---

## Task 17: 最终测试和修复

**Files:**
- Modify: `game.js` (修复任何遗漏的问题)

**Step 1: 添加 isShooting 和 shootTimer 到 StickMan 构造函数**

确认 StickMan 构造函数包含：

```javascript
        this.isShooting = false;
        this.shootTimer = 0;
```

**Step 2: 确保 respawn 方法重置状态**

找到 respawn 方法（约第 159-166 行），确认包含：

```javascript
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
```

**Step 3: 在 restartGame 中重置武器系统**

找到 restartGame 函数（约第 619-628 行），在开头添加：

```javascript
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
```

**Step 4: 完整测试**

在浏览器中打开游戏，测试所有功能：
1. ✅ BGM 播放和循环
2. ✅ 跳跃音效
3. ✅ 拳脚攻击（J 键）- 音效 + 动画 + 残影特效
4. ✅ 切换武器（Q 键）- UI 更新
5. ✅ 剑攻击（J 键）- 音效 + 动画 + 剑气特效
6. ✅ 射箭（K 键）- 音效 + 动画 + 箭矢飞行
7. ✅ 金币收集音效
8. ✅ 死亡音效 + 动画
9. ✅ 过关音效
10. ✅ 箭矢数量显示和补充

**Step 5: Final Commit**

```bash
git add game.js index.html
git commit -m "feat: complete audio, skeleton animation, and weapon system"
```

---

## 完成检查清单

- [ ] AudioManager: BGM + 8种音效
- [ ] SkeletonAnimator: 8关节 + 7种动画状态
- [ ] WeaponSystem: 拳脚/剑/弓箭
- [ ] Arrow: 抛物线 + 碰撞检测
- [ ] UI: 武器显示 + 箭矢数量
- [ ] 按键: J/K/Q 正常工作
- [ ] 所有音效正常播放
- [ ] 所有动画流畅
