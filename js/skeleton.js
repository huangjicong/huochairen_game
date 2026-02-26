// ==================== 玩家骨骼动画系统 ====================
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

        // 肢体长度 (调整为正常人体比例)
        this.limbLengths = {
            upperArm: 12,
            lowerArm: 10,
            upperLeg: 14,  // 大腿
            lowerLeg: 11   // 小腿
        };

        // 身体倾斜
        this.bodyTilt = 0;
        this.targetBodyTilt = 0;

        // 身体垂直偏移（跳跃/下蹲）
        this.bodyOffsetY = 0;
        this.targetBodyOffsetY = 0;

        // 头部偏移
        this.headOffset = { x: 0, y: 0 };
        this.targetHeadOffset = { x: 0, y: 0 };

        // 动画速度系数
        this.animSpeed = 1;

        // 上一个状态（用于过渡）
        this.previousState = null;
        this.transitionProgress = 1;

        // 关节速度（用于弹簧效果）
        this.jointVelocities = {
            shoulder: { left: 0, right: 0 },
            elbow: { left: 0, right: 0 },
            hip: { left: 0, right: 0 },
            knee: { left: 0, right: 0 }
        };
    }

    setState(newState, duration = 60) {
        if (this.state !== newState) {
            // 记录上一个状态用于过渡
            this.previousState = this.state;
            this.transitionProgress = 0;
            this.state = newState;
            this.stateTimer = 0;
            this.stateDuration = duration;
        }
    }

    // 状态过渡权重 (0-1, 0表示完全旧状态，1表示完全新状态)
    getTransitionWeight() {
        return Math.min(this.transitionProgress / 10, 1); // 10帧过渡时间
    }

    update() {
        this.stateTimer++;

        // 更新状态过渡
        if (this.transitionProgress < 10) {
            this.transitionProgress++;
        }

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
        // 使用弹簧阻尼系统让动画更自然
        const speeds = { shoulder: 0.18, elbow: 0.15, hip: 0.14, knee: 0.12 };

        for (let part of ['shoulder', 'elbow', 'hip', 'knee']) {
            for (let side of ['left', 'right']) {
                const diff = this.targetJoints[part][side] - this.joints[part][side];
                // 弹簧效果
                this.jointVelocities[part][side] += diff * speeds[part];
                this.jointVelocities[part][side] *= 0.82; // 阻尼
                this.joints[part][side] += this.jointVelocities[part][side];
            }
        }

        // 平滑过渡身体效果
        this.bodyTilt += (this.targetBodyTilt - this.bodyTilt) * 0.12;
        this.bodyOffsetY += (this.targetBodyOffsetY - this.bodyOffsetY) * 0.15;
        this.headOffset.x += (this.targetHeadOffset.x - this.headOffset.x) * 0.1;
        this.headOffset.y += (this.targetHeadOffset.y - this.headOffset.y) * 0.1;
    }

    // 获取动画进度 (0-1)
    getProgress() {
        return Math.min(this.stateTimer / this.stateDuration, 1);
    }

    // 武侠风格缓动函数（增强版）
    wuxiaEasing(t) {
        // 0-25%: 蓄力（缓慢积蓄）
        // 25-50%: 爆发（快速释放）
        // 50-75%: 冲击（达到最强）
        // 75-100%: 收招（缓慢回归）
        if (t < 0.25) {
            return t * t * 2.5; // 蓄力
        } else if (t < 0.5) {
            const nt = (t - 0.25) / 0.25;
            return 0.156 + nt * 0.55; // 爆发
        } else if (t < 0.75) {
            const nt = (t - 0.5) / 0.25;
            return 0.706 + nt * 0.2; // 冲击
        } else {
            const nt = (t - 0.75) / 0.25;
            return 0.906 + nt * 0.094; // 收招
        }
    }

    // 贝塞尔缓动
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    // 弹性缓动
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 :
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    // 弹跳缓动
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    // 指数缓动
    easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    // ==================== 动画状态更新 ====================
    updateIdle() {
        const t = (this.stateTimer % 120) / 120;
        const breath = Math.sin(t * Math.PI * 2);
        const breathSmall = Math.sin(t * Math.PI * 4);

        // 呼吸动画
        this.targetJoints.shoulder.left = -0.08 + breath * 0.04;
        this.targetJoints.shoulder.right = 0.08 - breath * 0.04;
        this.targetJoints.elbow.left = 0.12 + breathSmall * 0.03;
        this.targetJoints.elbow.right = -0.12 - breathSmall * 0.03;
        this.targetJoints.hip.left = 0.03 + breath * 0.02;
        this.targetJoints.hip.right = -0.03 - breath * 0.02;
        this.targetJoints.knee.left = 0.02;
        this.targetJoints.knee.right = -0.02;

        // 轻微身体摆动
        this.targetBodyTilt = breath * 0.02;
        this.targetBodyOffsetY = Math.abs(breath) * 1;
        this.targetHeadOffset = { x: breathSmall * 1, y: breath * 0.5 };
    }

    updateRun() {
        // 写实跑步动画 - 基于真实步态周期
        const cycle = 22; // 步态周期
        const t = (this.stateTimer % cycle) / cycle;

        // 使用非对称的步态曲线
        // 前摆(0-50%)比后摆(50-100%)幅度大
        const phase = t * Math.PI * 2;

        // 左腿步态周期 (右腿相位相反)
        const leftLegT = t;
        const rightLegT = (t + 0.5) % 1;

        // 髋关节：前摆幅度(0.7)大于后摆(0.35)，模拟真实跑步
        // 使用非对称曲线
        const hipSwing = (phase) => {
            const s = Math.sin(phase);
            // 前摆时幅度更大
            return s > 0 ? s * 0.7 : s * 0.35;
        };

        this.targetJoints.hip.left = -hipSwing(phase);
        this.targetJoints.hip.right = -hipSwing(phase + Math.PI);

        // 膝关节：膝盖始终向后弯曲（负值 - 符合人体解剖学）
        // 摆动期最大弯曲约80度(1.4弧度)
        const kneeBend = (legT) => {
            // 摆动期: 0.5-1.0 (腿向前抬起)
            // 着地期+支撑期: 0-0.5 (腿向后蹬地)
            if (legT > 0.5) {
                // 摆动期 - 膝盖向后弯曲（负值）
                const swingPhase = (legT - 0.5) * 2; // 0-1
                // 最高点时弯曲最大
                return -Math.sin(swingPhase * Math.PI) * 1.4;
            } else {
                // 着地期和支撑期 - 膝盖大幅向后弯曲
                // 接近45度(0.78弧度)的夸张效果
                return -0.5 - Math.sin(legT * Math.PI) * 0.6;
            }
        };

        this.targetJoints.knee.left = kneeBend(leftLegT);
        this.targetJoints.knee.right = kneeBend(rightLegT);

        // 手臂：与腿反向摆动，保持约90度肘部弯曲
        this.targetJoints.shoulder.left = hipSwing(phase + Math.PI) * 0.8;
        this.targetJoints.shoulder.right = hipSwing(phase) * 0.8;

        // 肘部保持弯曲
        this.targetJoints.elbow.left = 0.9;
        this.targetJoints.elbow.right = 0.9;

        // 身体动态
        // 上下起伏：支撑期最低，摆动期最高
        const bounce = Math.abs(Math.sin(phase * 2)) * 4;
        this.targetBodyOffsetY = bounce;

        // 身体前倾
        this.targetBodyTilt = 0.12 + bounce * 0.01;

        // 头部微微前倾保持稳定
        this.targetHeadOffset = { x: -2, y: Math.sin(phase * 2) * 1 };
    }

    updateJump() {
        // 写实跳跃动画 - 三阶段：起跳、腾空、落地
        const progress = this.getProgress();

        // 阶段1: 起跳 (0-30%) - 下蹲蓄力到爆发蹬地
        if (progress < 0.15) {
            // 下蹲蓄力
            const t = this.easeInOutQuad(progress / 0.15);
            // 髋关节和膝盖同时弯曲
            this.targetJoints.hip.left = -0.5 * t;
            this.targetJoints.hip.right = -0.5 * t;
            this.targetJoints.knee.left = 1.7 * t;  // 约100度弯曲
            this.targetJoints.knee.right = 1.7 * t;
            // 手臂向后摆准备
            this.targetJoints.shoulder.left = 0.6 * t;
            this.targetJoints.shoulder.right = -0.6 * t;
            this.targetJoints.elbow.left = 0.4 * t;
            this.targetJoints.elbow.right = -0.4 * t;
            // 身体下蹲
            this.targetBodyOffsetY = 10 * t;
            this.targetBodyTilt = 0.05 * t;
            this.targetHeadOffset = { x: 0, y: 2 * t };
        } else if (progress < 0.3) {
            // 爆发蹬地
            const t = this.easeOutExpo((progress - 0.15) / 0.15);
            // 腿部快速伸直
            this.targetJoints.hip.left = -0.5 + t * 0.7;
            this.targetJoints.hip.right = -0.5 + t * 0.7;
            this.targetJoints.knee.left = 1.7 - t * 2.0;
            this.targetJoints.knee.right = 1.7 - t * 2.0;
            // 手臂向上摆
            this.targetJoints.shoulder.left = 0.6 - t * 1.6;
            this.targetJoints.shoulder.right = -0.6 + t * 1.6;
            this.targetJoints.elbow.left = 0.4 - t * 1.0;
            this.targetJoints.elbow.right = -0.4 + t * 1.0;
            // 身体弹起
            this.targetBodyOffsetY = 10 - t * 15;
            this.targetBodyTilt = 0.05 - t * 0.1;
            this.targetHeadOffset = { x: 0, y: 2 - t * 4 };
        }
        // 阶段2: 腾空 (30-70%) - 两腿向两边夸张打开
        else if (progress < 0.7) {
            const t = (progress - 0.3) / 0.4;
            const float = Math.sin(t * Math.PI); // 0->1->0
            // 两腿向两边打开 - 左腿向左，右腿向右（髋关节相反方向）
            this.targetJoints.hip.left = 0.6 + float * 0.4;  // 左腿向左打开
            this.targetJoints.hip.right = -0.6 - float * 0.4; // 右腿向右打开
            // 膝盖弯曲，小腿向后
            this.targetJoints.knee.left = -0.8 - float * 0.7;  // 夸张弯曲
            this.targetJoints.knee.right = -0.8 - float * 0.7;
            // 手臂向两边张开维持平衡
            this.targetJoints.shoulder.left = -0.8 - float * 0.5;
            this.targetJoints.shoulder.right = 0.8 + float * 0.5;
            this.targetJoints.elbow.left = -0.5 - float * 0.4;
            this.targetJoints.elbow.right = 0.5 + float * 0.4;
            // 身体略微后仰
            this.targetBodyOffsetY = -5 + float * 3;
            this.targetBodyTilt = -0.1 - float * 0.1;
            this.targetHeadOffset = { x: 0, y: -2 - float * 2 };
        }
        // 阶段3: 落地 (70-100%) - 腿部前伸准备着地，缓冲
        else {
            const t = this.easeInOutQuad((progress - 0.7) / 0.3);

            if (t < 0.3) {
                // 准备着地 - 腿部前伸
                const prep = t / 0.3;
                this.targetJoints.hip.left = 0.3 - prep * 0.5;
                this.targetJoints.hip.right = 0.3 - prep * 0.5;
                this.targetJoints.knee.left = -0.7 + prep * 0.9;
                this.targetJoints.knee.right = -0.7 + prep * 0.9;
                // 手臂前摆
                this.targetJoints.shoulder.left = -0.7 + prep * 0.3;
                this.targetJoints.shoulder.right = 0.7 - prep * 0.3;
                this.targetJoints.elbow.left = -0.4 + prep * 0.2;
                this.targetJoints.elbow.right = 0.4 - prep * 0.2;
                this.targetBodyOffsetY = -3 + prep * 3;
                this.targetBodyTilt = -0.05 + prep * 0.1;
            } else {
                // 着地缓冲
                const cushion = (t - 0.3) / 0.7;
                // 膝盖弯曲吸收冲击
                this.targetJoints.hip.left = -0.2 + cushion * 0.2;
                this.targetJoints.hip.right = -0.2 + cushion * 0.2;
                this.targetJoints.knee.left = 0.2 + cushion * 1.2; // 缓冲弯曲
                this.targetJoints.knee.right = 0.2 + cushion * 1.2;
                // 手臂维持平衡
                this.targetJoints.shoulder.left = -0.4 + cushion * 0.4;
                this.targetJoints.shoulder.right = 0.4 - cushion * 0.4;
                this.targetJoints.elbow.left = -0.2 + cushion * 0.3;
                this.targetJoints.elbow.right = 0.2 - cushion * 0.3;
                // 身体下蹲缓冲
                this.targetBodyOffsetY = 8 * cushion;
                this.targetBodyTilt = 0.05 * (1 - cushion);
                this.targetHeadOffset = { x: 0, y: cushion * 3 };
            }
        }
    }

    updateAttackPunch() {
        // 写实拳击动画 - 力量传递：脚→腿→腰→肩→臂
        const progress = this.getProgress();

        if (progress < 0.25) {
            // 蓄力：重心后移，身体扭转，拳头后拉
            const t = this.easeInOutQuad(progress / 0.25);
            // 右臂后拉蓄力，肘部弯曲
            this.targetJoints.shoulder.right = -0.2 - t * 0.8; // 后拉
            this.targetJoints.elbow.right = 1.2 * t; // 弯曲蓄力
            // 左臂护脸
            this.targetJoints.shoulder.left = 0.3 * t;
            this.targetJoints.elbow.left = 0.8 * t;
            // 身体扭转（右肩后转）
            this.targetJoints.hip.left = 0;
            this.targetJoints.hip.right = 0.2 * t;
            // 后腿弯曲，重心后移
            this.targetJoints.knee.left = 0.5 * t;
            this.targetJoints.knee.right = 0.2 * t;
            // 身体后仰蓄力
            this.targetBodyTilt = -0.1 * t;
            this.targetBodyOffsetY = 4 * t;
            this.targetHeadOffset = { x: -2 * t, y: 1 * t };
        } else if (progress < 0.55) {
            // 发力：后腿蹬地，腰部回转，手臂快速伸出
            const t = this.easeOutExpo((progress - 0.25) / 0.3);
            // 右臂快速伸出伸直（爆发）
            this.targetJoints.shoulder.right = -1.0 + t * 2.0; // 从后拉到前伸
            this.targetJoints.elbow.right = 1.2 - t * 1.4; // 从弯曲到伸直
            // 左臂回收护身
            this.targetJoints.shoulder.left = 0.3 - t * 0.2;
            this.targetJoints.elbow.left = 0.8 - t * 0.3;
            // 身体快速前转
            this.targetJoints.hip.left = 0.1 * t;
            this.targetJoints.hip.right = 0.2 - t * 0.3;
            // 前腿蹬直，重心前移
            this.targetJoints.knee.left = 0.5 - t * 0.4;
            this.targetJoints.knee.right = 0.2 + t * 0.1;
            // 身体前倾发力
            this.targetBodyTilt = -0.1 + t * 0.2;
            this.targetBodyOffsetY = 4 - t * 5;
            this.targetHeadOffset = { x: -2 + t * 5, y: 1 - t * 0.5 };
        } else {
            // 收招：恢复防守姿态
            const t = this.easeInOutQuad((progress - 0.55) / 0.45);
            // 双手回到护脸位置
            this.targetJoints.shoulder.right = 1.0 - t * 0.9;
            this.targetJoints.elbow.right = -0.2 + t * 0.5;
            this.targetJoints.shoulder.left = 0.1 - t * 0.1;
            this.targetJoints.elbow.left = 0.5 + t * 0.1;
            // 身体恢复
            this.targetJoints.hip.left = 0.1 * (1 - t);
            this.targetJoints.hip.right = -0.1 + t * 0.1;
            this.targetJoints.knee.left = 0.1 * (1 - t);
            this.targetJoints.knee.right = 0.3 - t * 0.25;
            // 恢复站姿
            this.targetBodyTilt = 0.1 * (1 - t);
            this.targetBodyOffsetY = -1 * (1 - t);
            this.targetHeadOffset = { x: 3 * (1 - t), y: 0.5 * (1 - t) };
        }
    }

    updateAttackSword() {
        // 写实剑攻击动画 - 挥砍弧线
        const progress = this.getProgress();

        if (progress < 0.25) {
            // 蓄力：剑举过头顶，身体侧转
            const t = this.easeInOutQuad(progress / 0.25);
            // 右臂举剑过头
            this.targetJoints.shoulder.right = -0.3 - t * 0.7;
            this.targetJoints.elbow.right = -0.8 * t; // 肘部弯曲举高
            // 左臂配合平衡
            this.targetJoints.shoulder.left = 0.2 * t;
            this.targetJoints.elbow.left = 0.5 * t;
            // 身体侧转蓄力
            this.targetJoints.hip.left = -0.3 * t;
            this.targetJoints.hip.right = 0.3 * t;
            // 后腿微曲
            this.targetJoints.knee.left = 0.4 * t;
            this.targetJoints.knee.right = 0.2 * t;
            // 身体后仰蓄力
            this.targetBodyTilt = -0.1 * t;
            this.targetBodyOffsetY = 3 * t;
            this.targetHeadOffset = { x: -2 * t, y: -2 * t };
        } else if (progress < 0.55) {
            // 发力：挥剑下劈，身体回转，弓步
            const t = this.easeOutExpo((progress - 0.25) / 0.3);
            // 右臂挥剑下劈（大弧度）
            this.targetJoints.shoulder.right = -1.0 + t * 2.2;
            this.targetJoints.elbow.right = -0.8 + t * 1.5; // 伸直挥砍
            // 左臂后摆平衡
            this.targetJoints.shoulder.left = 0.2 - t * 0.8;
            this.targetJoints.elbow.left = 0.5 - t * 0.3;
            // 身体快速回转
            this.targetJoints.hip.left = -0.3 + t * 0.5;
            this.targetJoints.hip.right = 0.3 - t * 0.4;
            // 弓步冲刺
            this.targetJoints.knee.left = 0.4 - t * 0.3;
            this.targetJoints.knee.right = 0.2 + t * 0.5;
            // 身体前倾发力
            this.targetBodyTilt = -0.1 + t * 0.2;
            this.targetBodyOffsetY = 3 - t * 4;
            this.targetHeadOffset = { x: -2 + t * 4, y: -2 + t * 3 };
        } else {
            // 收招：剑归位，恢复站姿
            const t = this.easeInOutQuad((progress - 0.55) / 0.45);
            // 剑收回到警戒位置
            this.targetJoints.shoulder.right = 1.2 - t * 1.0;
            this.targetJoints.elbow.right = 0.7 - t * 0.5;
            this.targetJoints.shoulder.left = -0.6 + t * 0.5;
            this.targetJoints.elbow.left = 0.2 + t * 0.1;
            // 身体恢复
            this.targetJoints.hip.left = 0.2 * (1 - t);
            this.targetJoints.hip.right = -0.1 * (1 - t);
            this.targetJoints.knee.left = 0.1 * (1 - t);
            this.targetJoints.knee.right = 0.7 - t * 0.6;
            // 恢复站姿
            this.targetBodyTilt = 0.1 * (1 - t);
            this.targetBodyOffsetY = -1 * (1 - t);
            this.targetHeadOffset = { x: 2 * (1 - t), y: 1 * (1 - t) };
        }
    }

    updateAttackBow() {
        // 写实射箭动画 - 搭箭→拉弓→放箭→回位
        const progress = this.getProgress();

        if (progress < 0.3) {
            // 搭箭准备：侧身站立，双手举起
            const t = this.easeInOutQuad(progress / 0.3);
            // 左手持弓前伸
            this.targetJoints.shoulder.left = -0.2 - t * 0.8;
            this.targetJoints.elbow.left = -0.2 - t * 0.3;
            // 右手握箭准备
            this.targetJoints.shoulder.right = 0.3 * t;
            this.targetJoints.elbow.right = 0.2 * t;
            // 身体侧转
            this.targetJoints.hip.left = -0.2 * t;
            this.targetJoints.hip.right = 0.25 * t;
            // 双腿站稳
            this.targetJoints.knee.left = 0.1 * t;
            this.targetJoints.knee.right = 0.1 * t;
            // 身体微后仰
            this.targetBodyTilt = -0.03 * t;
            this.targetBodyOffsetY = 2 * t;
            this.targetHeadOffset = { x: 0, y: -0.5 * t };
        } else if (progress < 0.6) {
            // 拉弓蓄力：后手拉弦至脸侧
            const t = this.easeInOutQuad((progress - 0.3) / 0.3);
            // 左手持弓稳定
            this.targetJoints.shoulder.left = -1.0;
            this.targetJoints.elbow.left = -0.5;
            // 右手拉弦后拉（拉距）
            this.targetJoints.shoulder.right = 0.3 + t * 0.9;
            this.targetJoints.elbow.right = 0.2 + t * 0.8;
            // 身体保持侧转稳定
            this.targetJoints.hip.left = -0.2;
            this.targetJoints.hip.right = 0.25;
            // 双腿微蹲稳住
            this.targetJoints.knee.left = 0.1 + t * 0.1;
            this.targetJoints.knee.right = 0.1 + t * 0.1;
            // 身体后仰抵消拉力
            this.targetBodyTilt = -0.03 - t * 0.05;
            this.targetBodyOffsetY = 2 + t * 2;
            this.targetHeadOffset = { x: 0, y: -0.5 - t * 0.5 };
        } else if (progress < 0.7) {
            // 放箭：后手快速松开
            const t = this.easeOutExpo((progress - 0.6) / 0.1);
            // 左手保持稳定
            this.targetJoints.shoulder.left = -1.0 + t * 0.2;
            this.targetJoints.elbow.left = -0.5 + t * 0.2;
            // 右手松开后顺势后摆
            this.targetJoints.shoulder.right = 1.2 + t * 0.3;
            this.targetJoints.elbow.right = 1.0 + t * 0.2;
            // 身体保持
            this.targetJoints.hip.left = -0.2;
            this.targetJoints.hip.right = 0.25;
            this.targetJoints.knee.left = 0.2;
            this.targetJoints.knee.right = 0.2;
            // 身体轻微前倾
            this.targetBodyTilt = -0.08 + t * 0.05;
            this.targetBodyOffsetY = 4 - t * 1;
            this.targetHeadOffset = { x: t * 1, y: -1 + t * 0.3 };
        } else {
            // 回位：放下弓箭
            const t = this.easeInOutQuad((progress - 0.7) / 0.3);
            // 双手放下
            this.targetJoints.shoulder.left = -0.8 + t * 0.6;
            this.targetJoints.elbow.left = -0.3 + t * 0.3;
            this.targetJoints.shoulder.right = 1.5 - t * 1.3;
            this.targetJoints.elbow.right = 1.2 - t * 1.0;
            // 身体恢复正对
            this.targetJoints.hip.left = -0.2 + t * 0.15;
            this.targetJoints.hip.right = 0.25 - t * 0.2;
            this.targetJoints.knee.left = 0.2 - t * 0.15;
            this.targetJoints.knee.right = 0.2 - t * 0.15;
            // 恢复站姿
            this.targetBodyTilt = -0.03 * (1 - t);
            this.targetBodyOffsetY = 3 * (1 - t);
            this.targetHeadOffset = { x: 1 * (1 - t), y: -0.7 * (1 - t) };
        }
    }

    updateDie() {
        // 写实死亡动画 - 向前倒地，三阶段
        const progress = this.getProgress();

        if (progress < 0.2) {
            // 阶段1：中击反应 - 身体后仰
            const t = progress / 0.2;
            this.targetJoints.hip.left = -0.3 * t;
            this.targetJoints.hip.right = -0.3 * t;
            this.targetJoints.knee.left = 0.4 * t;
            this.targetJoints.knee.right = 0.4 * t;
            this.targetJoints.shoulder.left = -0.8 * t;
            this.targetJoints.shoulder.right = 0.8 * t;
            this.targetJoints.elbow.left = -0.3 * t;
            this.targetJoints.elbow.right = 0.3 * t;
            this.targetBodyTilt = -0.2 * t;
            this.targetBodyOffsetY = 2 * t;
            this.targetHeadOffset = { x: 0, y: -2 * t };
        } else if (progress < 0.5) {
            // 阶段2：失去平衡 - 膝盖发软，开始前倾
            const t = (progress - 0.2) / 0.3;
            this.targetJoints.hip.left = -0.3 + t * 0.6;
            this.targetJoints.hip.right = -0.3 + t * 0.6;
            this.targetJoints.knee.left = 0.4 + t * 1.0;
            this.targetJoints.knee.right = 0.4 + t * 1.0;
            this.targetJoints.shoulder.left = -0.8 - t * 0.5;
            this.targetJoints.shoulder.right = 0.8 + t * 0.5;
            this.targetJoints.elbow.left = -0.3 + t * 0.8;
            this.targetJoints.elbow.right = 0.3 - t * 0.8;
            // 从后仰转到前倾
            this.targetBodyTilt = -0.2 + t * 0.4;
            this.targetBodyOffsetY = 2 + t * 10;
            this.targetHeadOffset = { x: 0, y: -2 + t * 5 };
        } else if (progress < 0.85) {
            // 阶段3：倒地 - 重重摔下
            const t = (progress - 0.5) / 0.35;
            const fall = t * t; // 加速效果
            this.targetJoints.hip.left = 0.3 + t * 0.1;
            this.targetJoints.hip.right = 0.3 + t * 0.1;
            this.targetJoints.knee.left = 1.4 - t * 0.4;
            this.targetJoints.knee.right = 1.4 - t * 0.4;
            this.targetJoints.shoulder.left = -1.3 - t * 0.2;
            this.targetJoints.shoulder.right = 1.3 + t * 0.2;
            this.targetJoints.elbow.left = 0.5 + t * 0.5;
            this.targetJoints.elbow.right = -0.5 - t * 0.5;
            // 继续前倾直到趴下
            this.targetBodyTilt = 0.2 + fall * 1.1;
            this.targetBodyOffsetY = 12 + fall * 13;
            this.targetHeadOffset = { x: 0, y: 3 + fall * 10 };
        } else {
            // 阶段4：静止趴在地上
            this.targetJoints.hip.left = 0.4;
            this.targetJoints.hip.right = 0.4;
            this.targetJoints.knee.left = 1.0;
            this.targetJoints.knee.right = 1.0;
            this.targetJoints.shoulder.left = -1.5;
            this.targetJoints.shoulder.right = 1.5;
            this.targetJoints.elbow.left = 1.0;
            this.targetJoints.elbow.right = -1.0;
            this.targetBodyTilt = 1.3;
            this.targetBodyOffsetY = 25;
            this.targetHeadOffset = { x: 0, y: 13 };
        }
    }

    // ==================== 骨骼绘制 ====================
    draw(ctx, x, y, facing, scale = 1, drawShadow = true) {
        ctx.save();

        // 计算脚部位置用于阴影
        // hipY = bodyBottom = 38, 腿总长约 25 (upperLeg=14 + lowerLeg=11)
        // 站立时脚大约在 y + 38 + 25 = y + 63 的位置
        const footBaseY = 63;

        // 绘制阴影 (在地面上)
        if (drawShadow) {
            const shadowOffsetY = footBaseY - this.bodyOffsetY * 0.3;
            const shadowScale = Math.max(0.3, 1 - Math.abs(this.bodyOffsetY) / 50);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath();
            ctx.ellipse(x, y + shadowOffsetY, 18 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 应用身体垂直偏移
        ctx.translate(x, y + this.bodyOffsetY);
        // 应用身体倾斜
        ctx.rotate(this.bodyTilt);
        ctx.scale(facing, 1);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 身体中心位置 (调整后的比例)
        // 总高度约 60: 头(10+10) + 脖子(2) + 躯干(16) + 腿(25) = 63 (略超出但视觉效果好)
        const bodyTop = 22;      // 脖子到躯干顶部
        const bodyBottom = 38;   // 躯干底部/臀部
        const shoulderY = bodyTop + 4;  // 肩膀位置
        const hipY = bodyBottom;        // 臀部位置

        // 绘制左臂 (后层)
        this.drawLimb(ctx,
            0, shoulderY,
            this.joints.shoulder.left, this.limbLengths.upperArm,
            this.joints.elbow.left, this.limbLengths.lowerArm
        );

        // 绘制左腿 (后层)
        this.drawLimb(ctx,
            0, hipY,
            this.joints.hip.left, this.limbLengths.upperLeg,
            this.joints.knee.left, this.limbLengths.lowerLeg
        );

        // 绘制身体
        ctx.beginPath();
        ctx.moveTo(0, bodyTop);
        ctx.lineTo(0, bodyBottom);
        ctx.stroke();

        // 绘制右腿 (前层)
        this.drawLimb(ctx,
            0, hipY,
            this.joints.hip.right, this.limbLengths.upperLeg,
            this.joints.knee.right, this.limbLengths.lowerLeg
        );

        // 绘制右臂 (前层)
        this.drawLimb(ctx,
            0, shoulderY,
            this.joints.shoulder.right, this.limbLengths.upperArm,
            this.joints.elbow.right, this.limbLengths.lowerArm
        );

        // 绘制头 (应用头部偏移)
        const headX = this.headOffset.x * facing;
        const headY = 12 + this.headOffset.y;
        ctx.beginPath();
        ctx.arc(headX, headY, 10 * scale, 0, Math.PI * 2);
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

        // 绘制肢体
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 绘制关节点
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(midX, midY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== 敌人骨骼动画系统 ====================
class EnemySkeletonAnimator {
    constructor() {
        // 动画状态
        this.state = 'idle';
        this.stateTimer = 0;

        // 关节角度 (弧度)
        this.joints = {
            shoulder: { left: 0, right: 0 },
            elbow: { left: 0, right: 0 },
            hip: { left: 0, right: 0 },
            knee: { left: 0, right: 0 }
        };

        // 目标角度
        this.targetJoints = {
            shoulder: { left: 0, right: 0 },
            elbow: { left: 0, right: 0 },
            hip: { left: 0, right: 0 },
            knee: { left: 0, right: 0 }
        };

        // 肢体长度 (敌人较小，但比例正常)
        this.limbLengths = {
            upperArm: 8,
            lowerArm: 7,
            upperLeg: 11,
            lowerLeg: 9
        };

        // 身体动态
        this.bodyTilt = 0;
        this.targetBodyTilt = 0;
    }

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
        }
    }

    update() {
        this.stateTimer++;

        // 更新动画
        if (this.state === 'walk') {
            this.updateWalk();
        } else if (this.state === 'die') {
            this.updateDie();
        } else {
            this.updateIdle();
        }

        // 平滑过渡
        this.interpolateJoints();
    }

    interpolateJoints() {
        for (let part of ['shoulder', 'elbow', 'hip', 'knee']) {
            for (let side of ['left', 'right']) {
                this.joints[part][side] += (this.targetJoints[part][side] - this.joints[part][side]) * 0.15;
            }
        }
        this.bodyTilt += (this.targetBodyTilt - this.bodyTilt) * 0.1;
    }

    updateIdle() {
        const t = (this.stateTimer % 90) / 90;
        const breath = Math.sin(t * Math.PI * 2);

        // 威胁姿态 - 手臂张开
        this.targetJoints.shoulder.left = -0.6 + breath * 0.1;
        this.targetJoints.shoulder.right = 0.6 - breath * 0.1;
        this.targetJoints.elbow.left = 0.4;
        this.targetJoints.elbow.right = -0.4;
        this.targetJoints.hip.left = 0.05;
        this.targetJoints.hip.right = -0.05;
        this.targetJoints.knee.left = 0.05;
        this.targetJoints.knee.right = -0.05;
        this.targetBodyTilt = breath * 0.03;
    }

    updateWalk() {
        const cycle = 18; // 放慢步频
        const t = (this.stateTimer % cycle) / cycle;
        const swing = Math.sin(t * Math.PI * 2);

        // 爪子摆动
        this.targetJoints.shoulder.left = -0.4 + swing * 0.4;
        this.targetJoints.shoulder.right = 0.4 - swing * 0.4;
        this.targetJoints.elbow.left = 0.3;
        this.targetJoints.elbow.right = -0.3;

        // 腿部摆动
        this.targetJoints.hip.left = -swing * 0.6;
        this.targetJoints.hip.right = swing * 0.6;
        // 膝盖向后弯曲(负值)
        this.targetJoints.knee.left = -Math.max(0, swing) * 0.8;
        this.targetJoints.knee.right = -Math.max(0, -swing) * 0.8;

        this.targetBodyTilt = 0.08 + Math.abs(swing) * 0.02;
    }

    updateDie() {
        // 写实死亡动画 - 向前倒地
        const progress = Math.min(this.stateTimer / 80, 1); // 80帧完成

        if (progress < 0.2) {
            // 阶段1：中击反应 - 身体后仰
            const t = progress / 0.2;
            this.targetJoints.hip.left = -0.3 * t;
            this.targetJoints.hip.right = -0.3 * t;
            this.targetJoints.knee.left = 0.3 * t;
            this.targetJoints.knee.right = 0.3 * t;
            this.targetJoints.shoulder.left = -0.6 * t;
            this.targetJoints.shoulder.right = 0.6 * t;
            this.targetJoints.elbow.left = 0.2 * t;
            this.targetJoints.elbow.right = -0.2 * t;
            this.targetBodyTilt = -0.15 * t;
        } else if (progress < 0.45) {
            // 阶段2：失去平衡 - 膝盖发软，开始前倾
            const t = (progress - 0.2) / 0.25;
            this.targetJoints.hip.left = -0.3 + t * 0.5;
            this.targetJoints.hip.right = -0.3 + t * 0.5;
            this.targetJoints.knee.left = 0.3 + t * 1.0;
            this.targetJoints.knee.right = 0.3 + t * 1.0;
            this.targetJoints.shoulder.left = -0.6 - t * 0.6;
            this.targetJoints.shoulder.right = 0.6 + t * 0.6;
            this.targetJoints.elbow.left = 0.2 + t * 0.6;
            this.targetJoints.elbow.right = -0.2 - t * 0.6;
            // 从后仰转到前倾
            this.targetBodyTilt = -0.15 + t * 0.5;
        } else if (progress < 0.8) {
            // 阶段3：倒地 - 重重摔下
            const t = (progress - 0.45) / 0.35;
            const fall = t * t; // 加速效果
            this.targetJoints.hip.left = 0.2 + t * 0.1;
            this.targetJoints.hip.right = 0.2 + t * 0.1;
            this.targetJoints.knee.left = 1.3 - t * 0.3;
            this.targetJoints.knee.right = 1.3 - t * 0.3;
            this.targetJoints.shoulder.left = -1.2 - t * 0.3;
            this.targetJoints.shoulder.right = 1.2 + t * 0.3;
            this.targetJoints.elbow.left = 0.8 + t * 0.4;
            this.targetJoints.elbow.right = -0.8 - t * 0.4;
            // 继续前倾直到趴下
            this.targetBodyTilt = 0.35 + fall * 0.95;
        } else {
            // 阶段4：静止趴在地上
            this.targetJoints.hip.left = 0.3;
            this.targetJoints.hip.right = 0.3;
            this.targetJoints.knee.left = 1.0;
            this.targetJoints.knee.right = 1.0;
            this.targetJoints.shoulder.left = -1.5;
            this.targetJoints.shoulder.right = 1.5;
            this.targetJoints.elbow.left = 1.2;
            this.targetJoints.elbow.right = -1.2;
            this.targetBodyTilt = 1.3;
        }
    }

    // 获取死亡动画进度
    getDieProgress() {
        return Math.min(this.stateTimer / 60, 1);
    }

    draw(ctx, x, y, facing, scale = 1) {
        ctx.save();

        // 绘制阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        // 敌人脚部位置: hipY=32 + 腿长20 = 52
        ctx.beginPath();
        ctx.ellipse(x, y + 52, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(x, y);
        ctx.rotate(this.bodyTilt);
        ctx.scale(facing, 1);

        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const bodyTop = 16;
        const bodyBottom = 32;
        const shoulderY = bodyTop + 4;
        const hipY = bodyBottom;

        // 绘制肢体 (先画后层)
        // 左臂
        this.drawLimb(ctx, 0, shoulderY,
            this.joints.shoulder.left, this.limbLengths.upperArm,
            this.joints.elbow.left, this.limbLengths.lowerArm);
        // 左腿
        this.drawLimb(ctx, 0, hipY,
            this.joints.hip.left, this.limbLengths.upperLeg,
            this.joints.knee.left, this.limbLengths.lowerLeg);

        // 身体
        ctx.beginPath();
        ctx.moveTo(0, bodyTop);
        ctx.lineTo(0, bodyBottom);
        ctx.stroke();

        // 右腿
        this.drawLimb(ctx, 0, hipY,
            this.joints.hip.right, this.limbLengths.upperLeg,
            this.joints.knee.right, this.limbLengths.lowerLeg);
        // 右臂
        this.drawLimb(ctx, 0, shoulderY,
            this.joints.shoulder.right, this.limbLengths.upperArm,
            this.joints.elbow.right, this.limbLengths.lowerArm);

        // 三角头
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-7, 18);
        ctx.lineTo(7, 18);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        // 眼睛
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(-3, 12, 2, 0, Math.PI * 2);
        ctx.arc(3, 12, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawLimb(ctx, startX, startY, joint1Angle, length1, joint2Angle, length2) {
        const midX = startX + Math.sin(joint1Angle) * length1;
        const midY = startY + Math.cos(joint1Angle) * length1;
        const totalAngle = joint1Angle + joint2Angle;
        const endX = midX + Math.sin(totalAngle) * length2;
        const endY = midY + Math.cos(totalAngle) * length2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 爪子末端
        ctx.beginPath();
        ctx.arc(endX, endY, 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}
