/**
 * 极简生成式音效。正心落点添一个音符，音高随连击上行（玩得越顺，乐越完整）；
 * 柔性下沉给一记温柔的下行音。WebAudio 纯合成，无音频文件。
 * 浏览器自动播放策略：首次用户手势后 resume。
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  // A 小调五声音阶，向上延展
  private scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 784];

  private ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** 首次手势时调用以解锁音频。 */
  unlock() {
    this.ensure();
  }

  perfect(combo: number) {
    this.ensure();
    const i = Math.min(this.scale.length - 1, Math.max(0, combo - 1));
    const f = this.scale[i];
    this.note(f, 0.6, 'triangle', 0.9);
    this.note(f * 1.5, 0.5, 'sine', 0.35); // 柔和五度
  }

  sink() {
    this.ensure();
    this.glide(180, 120, 0.5);
  }

  private note(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private glide(from: number, to: number, dur: number) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
}
