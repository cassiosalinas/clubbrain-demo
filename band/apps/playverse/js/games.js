/* Band Playverse · jogos em Phaser 3 (texturas geradas em código, sem imagens externas) */
(function(){
BP.Games = {
  start(kind, host, onEnd) {
    if (!window.Phaser) { host.innerHTML = `<div class="gfail">O motor de jogos (Phaser) não carregou. Verifique a conexão e tente de novo.</div>`; return { destroy() {} }; }
    const W = 340, H = 460;
    const scene = kind === "penalti" ? penalti(onEnd) : stock(onEnd);
    const game = new Phaser.Game({ type: Phaser.CANVAS, width: W, height: H, parent: host, backgroundColor: "#0b1020", scene, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY }, audio: { noAudio: true }, banner: false });
    return { destroy() { try { game.destroy(true); } catch (e) {} } };
  }
};

/* ---------- Pênalti do Craque ---------- */
function penalti(onEnd) {
  return class extends Phaser.Scene {
    constructor() { super("penalti"); }
    create() {
      const W = 340, H = 460, g = this.add.graphics();
      // gramado
      for (let i = 0; i < 12; i++) { g.fillStyle(i % 2 ? 0x13693c : 0x167a45); g.fillRect(0, 110 + i * 30, W, 30); }
      g.fillStyle(0x0b1020); g.fillRect(0, 0, W, 110);
      // placas de patrocínio
      g.fillStyle(0xff6a1a); g.fillRect(0, 2, W, 22);
      this.add.text(W / 2, 13, "PULSO ENERGY  ·  BAND PLAYVERSE  ·  PULSO ENERGY", { fontFamily: "Arial", fontSize: "12px", color: "#1a0d00", fontStyle: "bold" }).setOrigin(.5);
      // área
      g.lineStyle(2, 0xffffff, .7); g.strokeRect(40, 110, 260, 120); g.strokeRect(100, 110, 140, 50); g.fillStyle(0xffffff); g.fillCircle(170, 300, 3);
      // gol
      this.goal = { x: 80, y: 30, w: 180, h: 80 };
      const gg = this.add.graphics(); gg.lineStyle(1, 0xffffff, .25);
      for (let x = 80; x <= 260; x += 10) gg.lineBetween(x, 30, x, 110); for (let y = 30; y <= 110; y += 10) gg.lineBetween(80, y, 260, y);
      gg.lineStyle(6, 0xffffff, 1); gg.beginPath(); gg.moveTo(80, 112); gg.lineTo(80, 30); gg.lineTo(260, 30); gg.lineTo(260, 112); gg.strokePath();
      // goleiro
      const kg = this.make.graphics({ x: 0, y: 0, add: false }); kg.fillStyle(0xf5b82e); kg.fillRoundedRect(0, 14, 36, 34, 6); kg.fillStyle(0xf1c27d); kg.fillCircle(18, 9, 9); kg.fillStyle(0x111111); kg.fillRect(-10, 18, 10, 6); kg.fillRect(36, 18, 10, 6); kg.generateTexture("keeper", 46, 50); kg.destroy();
      this.keeper = this.add.image(170, 82, "keeper").setOrigin(.5);
      this.tweens.add({ targets: this.keeper, x: { from: 120, to: 220 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      // bola
      const bg = this.make.graphics({ add: false }); bg.fillStyle(0xffffff); bg.fillCircle(10, 10, 10); bg.fillStyle(0x111111); bg.fillCircle(10, 10, 3.5); bg.fillCircle(4, 6, 2); bg.fillCircle(16, 6, 2); bg.fillCircle(10, 17, 2); bg.generateTexture("ball", 20, 20); bg.destroy();
      this.ball = this.add.image(170, 300, "ball");
      this.mira = this.add.graphics();
      this.shots = 0; this.goals = 0; this.busy = false;
      this.hud = this.add.text(W / 2, 330, "", { fontFamily: "Arial", fontSize: "15px", color: "#fff", fontStyle: "bold" }).setOrigin(.5);
      this.msg = this.add.text(W / 2, 372, "Toque no gol para chutar", { fontFamily: "Arial", fontSize: "18px", color: "#ffd76a", fontStyle: "bold", align: "center" }).setOrigin(.5);
      this.dots = this.add.text(W / 2, 430, "", { fontFamily: "Arial", fontSize: "22px" }).setOrigin(.5);
      this.upd();
      this.input.on("pointermove", p => { this.mira.clear(); if (this.busy || p.y > 140) return; this.mira.lineStyle(2, 0xffd76a, .9); this.mira.strokeCircle(p.x, p.y, 10); });
      this.input.on("pointerdown", p => this.shoot(p.x, Math.min(p.y, 108)));
    }
    upd() { this.hud.setText(`Cobrança ${Math.min(this.shots + 1, 5)}/5   ·   Gols: ${this.goals}`); this.dots.setText((this.res || []).map(r => r ? "⚽" : "❌").join(" ")); }
    shoot(tx, ty) {
      if (this.busy || this.shots >= 5) return; this.busy = true; this.mira.clear();
      const G = this.goal; const inGoal = tx > G.x + 4 && tx < G.x + G.w - 4 && ty > G.y + 4;
      this.tweens.killTweensOf(this.keeper);
      // goleiro escolhe um lado (chute no canto é mais difícil de pegar)
      const guess = Phaser.Math.Between(95, 245); const diveX = Math.random() < .45 ? tx + Phaser.Math.Between(-25, 25) : guess;
      this.tweens.add({ targets: this.keeper, x: diveX, angle: diveX < 170 ? -60 : 60, duration: 380, ease: "Quad.out" });
      this.tweens.add({ targets: this.ball, x: tx, y: ty, scale: .6, duration: 420, ease: "Quad.out", onComplete: () => {
        const saved = Math.abs(this.keeper.x - tx) < 30 && ty > 40;
        const goal = inGoal && !saved; this.shots++; if (goal) this.goals++; (this.res = this.res || []).push(goal);
        this.msg.setText(goal ? "GOOOL!" : saved ? "Defendeu!" : "Pra fora!").setColor(goal ? "#22c55e" : "#ef4444");
        this.cameras.main.shake(goal ? 120 : 60, goal ? .008 : .003); this.upd();
        this.time.delayedCall(900, () => {
          if (this.shots >= 5) { this.msg.setText(`Fim: ${this.goals} de 5`).setColor("#ffd76a"); onEnd && onEnd(this.goals); return; }
          this.ball.setPosition(170, 300).setScale(1); this.keeper.setAngle(0).setPosition(170, 82);
          this.tweens.add({ targets: this.keeper, x: { from: 120, to: 220 }, duration: Math.max(500, 900 - this.shots * 90), yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.msg.setText("Toque no gol para chutar").setColor("#ffd76a"); this.busy = false;
        });
      } });
    }
  };
}

/* ---------- Stock Car · Reta Final ---------- */
function stock(onEnd) {
  return class extends Phaser.Scene {
    constructor() { super("stock"); }
    create() {
      const W = 340, H = 460; this.W = W; this.H = H; this.lanes = [110, 170, 230]; this.lane = 1; this.speed = 260; this.score = 0; this.lives = 3; this.t = 30; this.over = false;
      const car = (key, body, stripe) => { const g = this.make.graphics({ add: false }); g.fillStyle(body); g.fillRoundedRect(4, 0, 32, 60, 8); g.fillStyle(0x0b1020); g.fillRect(9, 12, 22, 12); g.fillRect(9, 40, 22, 8); g.fillStyle(stripe); g.fillRect(18, 0, 4, 60); g.fillStyle(0x111111); g.fillRect(0, 8, 5, 12); g.fillRect(35, 8, 5, 12); g.fillRect(0, 42, 5, 12); g.fillRect(35, 42, 5, 12); g.generateTexture(key, 40, 60); g.destroy(); };
      car("me", 0xf5b82e, 0x2f6bff); car("rival1", 0xe53935, 0xffffff); car("rival2", 0x2f6bff, 0xffffff); car("rival3", 0x22c55e, 0x111111);
      const c = this.make.graphics({ add: false }); c.fillStyle(0xffd76a); c.fillCircle(11, 11, 11); c.fillStyle(0x7a5200); c.fillRect(6, 9, 10, 4); c.generateTexture("coin", 22, 22); c.destroy();
      const r = this.add.graphics(); r.fillStyle(0x1f2937); r.fillRect(70, 0, 200, H); r.fillStyle(0x16a34a); r.fillRect(0, 0, 70, H); r.fillRect(270, 0, 70, H);
      // zebras
      this.zebra = this.add.graphics(); this.dash = this.add.graphics(); this.off = 0;
      this.add.text(35, H / 2, "ROTA BANK", { fontFamily: "Arial", fontSize: "14px", color: "#fff", fontStyle: "bold" }).setOrigin(.5).setAngle(-90).setAlpha(.8);
      this.add.text(305, H / 2, "STOCK CAR · BAND", { fontFamily: "Arial", fontSize: "13px", color: "#fff", fontStyle: "bold" }).setOrigin(.5).setAngle(90).setAlpha(.8);
      this.player = this.add.image(this.lanes[1], H - 70, "me");
      this.obs = []; this.coins = [];
      this.hud = this.add.text(78, 8, "", { fontFamily: "Arial", fontSize: "14px", color: "#fff", fontStyle: "bold" });
      this.info = this.add.text(W / 2, H / 2, "Toque à esquerda ou à direita\npara trocar de faixa", { fontFamily: "Arial", fontSize: "16px", color: "#ffd76a", align: "center", fontStyle: "bold" }).setOrigin(.5);
      this.time.delayedCall(1400, () => this.info.setText(""));
      this.input.on("pointerdown", p => this.move(p.x < W / 2 ? -1 : 1));
      this.input.keyboard && this.input.keyboard.on("keydown", e => { if (e.key === "ArrowLeft") this.move(-1); if (e.key === "ArrowRight") this.move(1); });
      this.spawnT = this.time.addEvent({ delay: 700, loop: true, callback: () => this.spawn() });
      this.clock = this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (this.over) return; this.t--; this.speed += 14; if (this.t <= 0) this.finish(); } });
    }
    move(d) { if (this.over) return; this.lane = Phaser.Math.Clamp(this.lane + d, 0, 2); this.tweens.add({ targets: this.player, x: this.lanes[this.lane], duration: 110 }); }
    spawn() { if (this.over) return; const l = Phaser.Math.Between(0, 2); if (Math.random() < .72) this.obs.push(this.add.image(this.lanes[l], -40, "rival" + Phaser.Math.Between(1, 3)).setAngle(180)); else this.coins.push(this.add.image(this.lanes[l], -20, "coin")); }
    update(_, dt) {
      if (this.over) return; const v = this.speed * dt / 1000; this.score += v * .5;
      this.off = (this.off + v) % 40; this.dash.clear(); this.dash.fillStyle(0xffffff, .6); for (let y = -40; y < this.H; y += 40) { this.dash.fillRect(138, y + this.off, 4, 20); this.dash.fillRect(198, y + this.off, 4, 20); }
      this.zebra.clear(); for (let y = -20; y < this.H; y += 20) { this.zebra.fillStyle(((y + this.off) / 20 | 0) % 2 ? 0xe53935 : 0xffffff); this.zebra.fillRect(64, y + this.off % 20, 6, 20); this.zebra.fillRect(270, y + this.off % 20, 6, 20); }
      const pb = this.player.getBounds();
      this.obs = this.obs.filter(o => { o.y += v * .75; if (Phaser.Geom.Intersects.RectangleToRectangle(pb, o.getBounds()) && !o.hit) { o.hit = true; this.lives--; this.cameras.main.shake(150, .012); this.player.setTint(0xff4444); this.time.delayedCall(250, () => this.player.clearTint()); if (this.lives <= 0) this.finish(); } if (o.y > this.H + 50) { o.destroy(); return false; } return true; });
      this.coins = this.coins.filter(c => { c.y += v * .75; if (Phaser.Geom.Intersects.RectangleToRectangle(pb, c.getBounds())) { this.score += 100; c.destroy(); return false; } if (c.y > this.H + 30) { c.destroy(); return false; } return true; });
      this.hud.setText(`⏱ ${this.t}s   ❤ ${"●".repeat(Math.max(0, this.lives))}   ${Math.round(this.score)} pts`);
    }
    finish() { if (this.over) return; this.over = true; this.spawnT.remove(); this.info.setText(`Bandeirada!\n${Math.round(this.score)} pontos`); onEnd && onEnd(Math.round(this.score)); }
  };
}
})();
