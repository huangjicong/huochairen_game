// ==================== 音效管理器 ====================
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.bgmVolume = 0.3;
        this.sfxVolume = 0.6;
        this.isPlaying = false;
        this.bgmTimeout = null;
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

    // ==================== 背景音乐 ====================
    // 中国风五声音阶 (宫商角徵羽): C D E G A
    getScaleNotes(baseFreq) {
        return [
            baseFreq,           // 宫 (1)
            baseFreq * 9/8,     // 商 (2)
            baseFreq * 5/4,     // 角 (3)
            baseFreq * 3/2,     // 徵 (5)
            baseFreq * 5/3,     // 羽 (6)
            baseFreq * 2         // 高八度宫
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

    // 敌人死亡音效
    playEnemyDeathSound() {
        if (!this.audioContext) return;
        this.resume();

        // 尖锐的惨叫声 + 爆炸效果
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(600, this.audioContext.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.4);

        gain1.gain.setValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

        osc1.connect(gain1);
        gain1.connect(this.sfxGain);

        osc1.start();
        osc1.stop(this.audioContext.currentTime + 0.4);

        // 噪声爆炸效果
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoise(0.3);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

        const gain2 = this.audioContext.createGain();
        gain2.gain.setValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain2);
        gain2.connect(this.sfxGain);

        noise.start();
        noise.stop(this.audioContext.currentTime + 0.3);
    }
}

const audioManager = new AudioManager();
