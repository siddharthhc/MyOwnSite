/* ============================================
   sidd.zst — Cinematic Cyberpunk Portfolio
   Intro · Boot · Interface
   ============================================ */

(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const PERF = {
    mobile: false,
    reduced: false,
    hidden: false,
    particleCount: 55,
    matrixOpacity: 0.35,
  };

  function detectPerf() {
    PERF.mobile = window.matchMedia('(max-width: 900px)').matches
      || window.matchMedia('(hover: none)').matches
      || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    PERF.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    PERF.particleCount = PERF.mobile ? 18 : 55;
    if (PERF.reduced) PERF.particleCount = 0;
    document.documentElement.classList.toggle('is-mobile', PERF.mobile);
    document.documentElement.classList.toggle('reduced-motion', PERF.reduced);
  }
  detectPerf();
  window.addEventListener('resize', detectPerf, { passive: true });
  document.addEventListener('visibilitychange', () => {
    PERF.hidden = document.hidden;
  });


  function showToast(msg, duration = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), duration);
  }

  /* ============================================
     CINEMATIC INTRO ENGINE
     ============================================ */
  class CinematicIntro {
    constructor() {
      this.canvas = $('#intro-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.mEl = $('#intro-s');
      this.mWrap = $('#intro-s-wrap');
      this.mGlow = $('.intro-s-glow');
      this.mRefl = $('.intro-s-reflection');
      this.baMark = $('.intro-ba-mark');
      this.fade = $('#intro-fade');
      this.cinematic = $('#cinematic');
      this.w = 0;
      this.h = 0;
      this.ribbons = [];
      this.particles = [];
      this.phase = 0;
      this.progress = 0;
      this.camZ = 0;
      this.blur = 0;
      this.running = false;
      this.raf = null;
    }

    resize() {
      // Cap DPR on mobile — full retina canvas kills mid-range phones during intro
      this.dpr = PERF.mobile ? 1 : Math.min(devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      this.w = this.canvas.width = Math.floor(cssW * this.dpr);
      this.h = this.canvas.height = Math.floor(cssH * this.dpr);
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.cssW = cssW;
      this.cssH = cssH;
    }

    createRibbons(count = PERF.mobile ? 6 : 14) {
      this.ribbons = [];
      for (let i = 0; i < count; i++) {
        const pts = [];
        const segs = 24;
        const baseAngle = (i / count) * Math.PI * 2;
        for (let s = 0; s < segs; s++) {
          const t = s / (segs - 1);
          const r = 40 + t * 280 + Math.sin(t * 6 + i) * 30;
          pts.push({
            x: Math.cos(baseAngle + t * 1.2) * r,
            y: Math.sin(baseAngle + t * 0.8) * r * 0.7,
            z: t * 800 - 200,
          });
        }
        this.ribbons.push({
          pts,
          hue: 120 + (i % 5) * 8,
          alpha: 0.15 + Math.random() * 0.35,
          width: 1.5 + Math.random() * 2.5,
          speed: 0.3 + Math.random() * 0.7,
          offset: Math.random() * Math.PI * 2,
        });
      }
    }

    createParticles(count = PERF.mobile ? 28 : 90) {
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: (Math.random() - 0.5) * 900,
          y: (Math.random() - 0.5) * 600,
          z: Math.random() * 1000 - 200,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          vz: 1.5 + Math.random() * 3,
          size: 0.8 + Math.random() * 2.2,
          alpha: 0.2 + Math.random() * 0.6,
        });
      }
    }

    project(x, y, z) {
      const fov = 450;
      const scale = fov / (fov + z - this.camZ);
      const cw = this.cssW || this.w / (this.dpr || 1);
      const ch = this.cssH || this.h / (this.dpr || 1);
      return {
        x: cw / 2 + x * scale,
        y: ch / 2 + y * scale,
        s: scale,
      };
    }

    drawRibbons(time) {
      const ctx = this.ctx;
      for (const rib of this.ribbons) {
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < rib.pts.length; i++) {
          const p = rib.pts[i];
          const wave = Math.sin(time * 0.001 * rib.speed + rib.offset + i * 0.3) * 12;
          const proj = this.project(p.x + wave, p.y + wave * 0.5, p.z);
          if (proj.s <= 0) continue;
          if (first) {
            ctx.moveTo(proj.x, proj.y);
            first = false;
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        }
        const a = rib.alpha * Math.min(1, this.progress * 2);
        ctx.strokeStyle = 'hsla(' + rib.hue + ', 100%, 55%, ' + a + ')';
        ctx.lineWidth = rib.width * (0.5 + this.progress);
        if (!PERF.mobile) {
          ctx.shadowColor = 'hsla(' + rib.hue + ', 100%, 50%, ' + (a * 0.8) + ')';
          ctx.shadowBlur = 12 + this.blur * 20;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    drawParticles() {
      const ctx = this.ctx;
      for (const p of this.particles) {
        if (this.phase >= 3) {
          p.z -= p.vz * (1 + this.progress * 2.2);
          p.x += p.vx;
          p.y += p.vy;
          if (p.z < -200) {
            p.z = 900 + Math.random() * 200;
            p.x = (Math.random() - 0.5) * 900;
            p.y = (Math.random() - 0.5) * 600;
          }
        }
        const proj = this.project(p.x, p.y, p.z);
        if (proj.s <= 0) continue;
        const size = p.size * proj.s * (0.5 + this.progress);
        const a = p.alpha * Math.min(1, this.progress * 1.5);
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 65, ' + a + ')';
        ctx.fill();
        if (!PERF.mobile && size > 1.5) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 65, ' + (a * 0.15) + ')';
          ctx.fill();
        }
      }
    }

    drawLightStreaks(time) {
      if (this.phase < 2) return;
      if (PERF.mobile && this.progress < 0.2) return;
      const ctx = this.ctx;
      const cx = (this.cssW || this.w / (this.dpr || 1)) / 2;
      const cy = (this.cssH || this.h / (this.dpr || 1)) / 2;
      const count = PERF.mobile
        ? 3 + Math.floor(this.progress * 4)
        : 8 + Math.floor(this.progress * 12);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + time * 0.0003;
        const len = 80 + this.progress * 400 + Math.sin(time * 0.002 + i) * 40;
        const x1 = cx + Math.cos(angle) * 20;
        const y1 = cy + Math.sin(angle) * 15;
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len * 0.65;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        const a = 0.08 + this.progress * 0.25;
        grad.addColorStop(0, 'rgba(0, 255, 80, ' + a + ')');
        grad.addColorStop(0.5, 'rgba(0, 255, 100, ' + (a * 0.4) + ')');
        grad.addColorStop(1, 'rgba(0, 255, 65, 0)');
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 + this.progress * 3;
        if (!PERF.mobile) {
          ctx.shadowColor = 'rgba(0, 255, 65, 0.5)';
          ctx.shadowBlur = 8 + this.blur * 15;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    loop = (time) => {
      if (!this.running) return;
      const ctx = this.ctx;
      const vw = this.cssW || this.w / (this.dpr || 1);
      const vh = this.cssH || this.h / (this.dpr || 1);

      // Cheaper clear on mobile (less residual blur trail)
      const trail = PERF.mobile ? 0.22 : (0.12 + this.blur * 0.15);
      ctx.fillStyle = 'rgba(0, 0, 0, ' + trail + ')';
      ctx.fillRect(0, 0, vw, vh);

      this.drawRibbons(time);
      this.drawLightStreaks(time);
      this.drawParticles();

      if (this.phase >= 2 && !PERF.mobile) {
        const g = ctx.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, 200 + this.progress * 300);
        g.addColorStop(0, 'rgba(0, 255, 65, ' + (0.04 + this.progress * 0.08) + ')');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vw, vh);
      }

      this.raf = requestAnimationFrame(this.loop);
    };

    async run() {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.createRibbons();
      this.createParticles();
      this.running = true;
      this.raf = requestAnimationFrame(this.loop);

      // Scene 1 — pure black
      const mobile = PERF.mobile || PERF.reduced;
      this.phase = 0;
      await sleep(mobile ? 500 : 900);

      // Scene 2 — S appears
      this.phase = 1;
      this.mEl.classList.add('visible');
      if (this.baMark) this.baMark.classList.add('visible');
      this.mGlow.style.opacity = mobile ? '0.4' : '0.65';
      this.mRefl.style.opacity = mobile ? '0' : '0.4';
      await sleep(mobile ? 700 : 1200);

      // Scene 3 — S comes alive
      this.phase = 2;
      this.mEl.classList.add('alive');
      this.progress = 0.12;
      await sleep(mobile ? 600 : 1200);

      // Scene 4–5 — closer + orbit behind
      this.phase = 3;
      this.mEl.classList.add('orbiting');
      const orbitDuration = mobile ? 2400 : 3800;
      const start = performance.now();

      await new Promise((resolve) => {
        const animateOrbit = (now) => {
          const t = Math.min(1, (now - start) / orbitDuration);
          // ease-out — accelerates into the behind-pass
          const e = 1 - Math.pow(1 - t, 2.4);

          this.progress = 0.15 + e * 0.85;
          this.camZ = e * 480;
          this.blur = e * 0.45;

          // A: S comes nearer (front) · B: hard orbit left → behind
          let yaw, scale, zPush, xDrift, pitch;
          if (e < 0.32) {
            const a = e / 0.32;
            yaw = -22 * a;
            scale = 1 + a * 2.8;
            zPush = a * 160;
            xDrift = -24 * a;
            pitch = 3 * a;
          } else {
            const b = (e - 0.32) / 0.68;
            const bE = 1 - Math.pow(1 - b, 1.7);
            yaw = -22 + 195 * bE;   // end ~ +173° (clearly behind)
            scale = 3.8 + bE * 4.5;
            zPush = 160 + bE * 240;
            xDrift = -24 + 36 * bE;
            pitch = 3 - 8 * bE;
          }

          // Keep S sharp until we are behind; soft fade only at the end
          const opacity = e < 0.78 ? 1 : 1 - Math.pow((e - 0.78) / 0.22, 1.25);
          const blurPx = e > 0.85 ? (e - 0.85) * 8 : 0;

          this.mWrap.style.transform =
            'translateX(' + xDrift + 'px) translateZ(' + zPush + 'px) ' +
            'rotateY(' + yaw + 'deg) rotateX(' + pitch + 'deg)';

          this.mEl.style.transform = 'scale(' + scale + ')';
          this.mEl.style.opacity = String(Math.max(0, opacity));
          this.mEl.style.filter = blurPx > 0 ? 'blur(' + blurPx + 'px)' : 'none';
          this.mGlow.style.opacity = String(0.65 * Math.max(0, 1 - e * 0.8));
          this.mRefl.style.opacity = String(0.35 * Math.max(0, 1 - e * 1.15));
          if (this.baMark) {
            // Stay fixed in place — only fade out as camera passes the S
            const baOp = e < 0.55
              ? (PERF.mobile ? 0.4 : 0.55)
              : Math.max(0, (PERF.mobile ? 0.4 : 0.55) * (1 - (e - 0.55) / 0.45));
            this.baMark.style.opacity = String(baOp);
          }

          if (t < 1) {
            requestAnimationFrame(animateOrbit);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(animateOrbit);
      });

      // Scene 6 — fade to black
      this.phase = 5;
      this.fade.classList.add('active');
      await sleep(1000);

      this.running = false;
      cancelAnimationFrame(this.raf);
      this.cinematic.classList.add('done');
      await sleep(350);
    }
  }

  /* ============================================
     BOOT SEQUENCE
     ============================================ */
  const bootLines = [
    { text: 'BOOTING...', cls: 'info', delay: 400 },
    { text: '', cls: '', delay: 80 },
    { text: '[  0.000000] Linux version 6.8.0-blackarch (sid@build)', cls: 'dim', delay: 90 },
    { text: '[  0.000001] Command line: BOOT_IMAGE=/vmlinuz root=UUID=... ro quiet', cls: 'dim', delay: 70 },
    { text: '', cls: '', delay: 60 },
    { text: 'Loading Kernel...', cls: 'info', delay: 280 },
    { text: '[  OK  ] Started Kernel Cryptography Services', cls: 'ok', delay: 100 },
    { text: '[  OK  ] Mounted /sys/fs/cgroup', cls: 'ok', delay: 80 },
    { text: '', cls: '', delay: 50 },
    { text: 'Loading Drivers...', cls: 'info', delay: 260 },
    { text: '[  OK  ] Started Load Kernel Modules', cls: 'ok', delay: 90 },
    { text: '[  OK  ] Started udev Kernel Device Manager', cls: 'ok', delay: 80 },
    { text: '', cls: '', delay: 50 },
    { text: 'Loading Network...', cls: 'info', delay: 240 },
    { text: '[  OK  ] Reached target Network', cls: 'ok', delay: 90 },
    { text: '[  OK  ] Started Network Manager', cls: 'ok', delay: 80 },
    { text: '', cls: '', delay: 50 },
    { text: 'Loading Security Modules...', cls: 'info', delay: 260 },
    { text: '[  OK  ] Started AppArmor Initialization', cls: 'ok', delay: 90 },
    { text: '[  OK  ] Started Fail2Ban Service', cls: 'ok', delay: 80 },
    { text: '', cls: '', delay: 50 },
    { text: 'Privilege Escalation...', cls: 'warn', delay: 320 },
    { text: '[  OK  ] uid=0(root) gid=0(root) groups=0(root)', cls: 'ok', delay: 120 },
    { text: '', cls: '', delay: 60 },
    { text: 'Authentication Successful', cls: 'ok', delay: 300 },
    { text: 'Access Level : SUPERUSER', cls: 'ok', delay: 350 },
  ];

  async function typeLine(el, text, speed = 18) {
    el.textContent = '';
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await sleep(speed + Math.random() * 12);
    }
  }

  async function runBoot() {
    const bootScreen = $('#boot-screen');
    const log = $('#boot-log');
    const bar = $('#boot-bar');
    const percent = $('#boot-percent');
    const label = $('#boot-progress-label');
    const status = $('#boot-status');

    bootScreen.classList.remove('hidden');

    for (let i = 0; i < bootLines.length; i++) {
      const item = bootLines[i];
      const line = document.createElement('div');
      line.className = 'line ' + item.cls;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;

      const isHeadline =
        item.text === 'BOOTING...' ||
        item.text.startsWith('Loading') ||
        item.text.startsWith('Privilege') ||
        item.text.startsWith('Authentication') ||
        item.text.startsWith('Access Level');

      if (item.text && isHeadline) {
        await typeLine(line, item.text, 22);
      } else {
        line.textContent = item.text || '\u00A0';
      }

      const progress = ((i + 1) / bootLines.length) * 100;
      bar.style.width = progress + '%';
      percent.textContent = Math.round(progress) + '%';

      if (item.text.includes('Kernel')) label.textContent = 'KERNEL';
      else if (item.text.includes('Drivers')) label.textContent = 'DRIVERS';
      else if (item.text.includes('Network')) label.textContent = 'NETWORK';
      else if (item.text.includes('Security')) label.textContent = 'SECURITY';
      else if (item.text.includes('Privilege')) label.textContent = 'ESCALATION';
      else if (item.text.includes('Authentication')) label.textContent = 'AUTH';
      else if (item.text.includes('Access Level')) label.textContent = 'COMPLETE';

      if (item.text.includes('BOOTING')) status.textContent = 'BOOTING...';
      else if (item.text.includes('Loading')) status.textContent = item.text.toUpperCase();
      else if (item.text.includes('Privilege')) status.textContent = 'PRIVILEGE ESCALATION...';
      else if (item.text.includes('Authentication')) status.textContent = 'AUTHENTICATING...';
      else if (item.text.includes('Access Level')) status.textContent = 'ACCESS LEVEL : SUPERUSER';

      await sleep(item.delay);
    }

    await sleep(500);
    status.textContent = 'SYSTEM READY';
    await sleep(500);

    bootScreen.classList.add('hidden');
    await sleep(700);
  }

  /* ============================================
     SUPERUSER REVEAL
     ============================================ */
  async function runSUReveal() {
    const su = $('#su-reveal');
    su.classList.remove('hidden');

    await sleep(200);
    $('#su-title').classList.add('show');
    await sleep(100);
    $('#su-badge').classList.add('show');
    await sleep(50);
    $('#su-tags').classList.add('show');
    await sleep(50);
    $('#enter-system').classList.add('show');

    return new Promise((resolve) => {
      $('#enter-system').addEventListener('click', () => {
        su.classList.add('hidden');
        setTimeout(resolve, 700);
      }, { once: true });
    });
  }

  /* ============================================
     SITE SYSTEMS
     ============================================ */
  function initMatrix() {
    const canvas = $('#matrix-canvas');
    const ctx = canvas.getContext('2d');
    let w, h, cols, drops;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>{}[]#$%&*+/=@^';
    const fontSize = 14;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cols = Math.floor(w / fontSize);
      drops = Array(cols).fill(1);
    }

    function draw() {
      if (PERF.hidden) { requestAnimationFrame(draw); return; }
      ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#00ff41';
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.globalAlpha = 0.25 + Math.random() * 0.5;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener('resize', resize);
    draw();
  }

  function initParticles() {
    if (PERF.reduced || PERF.particleCount <= 0) {
      const c = $('#particle-canvas');
      if (c) c.style.display = 'none';
      return;
    }
    const canvas = $('#particle-canvas');
    const ctx = canvas.getContext('2d');
    let w, h;
    const particles = [];
    const COUNT = PERF.particleCount || 55;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.size = Math.random() * 2 + 0.4;
        this.alpha = Math.random() * 0.35 + 0.1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 65, ' + this.alpha + ')';
        ctx.fill();
      }
    }

    function init() {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) particles.push(new Particle());
    }

    function draw() {
      if (PERF.hidden) {
        requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) { p.update(); p.draw(); }
      if (!PERF.mobile && particles.length > 1) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = 'rgba(0, 255, 65, ' + (0.07 * (1 - dist / 110)) + ')';
              ctx.stroke();
            }
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize();
    init();
    window.addEventListener('resize', () => { resize(); init(); });
    draw();
  }

  function initMouseEffects() {
    if (PERF.mobile || PERF.reduced) {
      const c = $('#cursor');
      const tr = $('#cursor-trail');
      const g = $('#mouse-glow');
      if (c) c.style.display = 'none';
      if (tr) tr.style.display = 'none';
      if (g) g.style.display = 'none';
      return;
    }
    const glow = $('#mouse-glow');
    const cursor = $('#cursor');
    const trail = $('#cursor-trail');
    let mx = 0, my = 0, tx = 0, ty = 0;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      glow.style.left = mx + 'px';
      glow.style.top = my + 'px';
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
    });

    (function trailLoop() {
      tx += (mx - tx) * 0.15;
      ty += (my - ty) * 0.15;
      trail.style.left = tx + 'px';
      trail.style.top = ty + 'px';
      requestAnimationFrame(trailLoop);
    })();

    $$('a, button, .skill-card, .project-card, .contact-card, .nav-logo, input').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '28px';
        cursor.style.height = '28px';
        cursor.style.background = 'rgba(0, 255, 65, 0.15)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.background = 'transparent';
      });
    });
  }

  function typeWriter(el, texts, speed, pause) {
    speed = speed || 60;
    pause = pause || 2000;
    let textIdx = 0, charIdx = 0, deleting = false;
    function tick() {
      const current = texts[textIdx];
      if (!deleting) {
        el.innerHTML = current.slice(0, charIdx + 1) + '<span class="typed-cursor">|</span>';
        charIdx++;
        if (charIdx === current.length) {
          deleting = true;
          setTimeout(tick, pause);
          return;
        }
      } else {
        el.innerHTML = current.slice(0, charIdx) + '<span class="typed-cursor">|</span>';
        charIdx--;
        if (charIdx < 0) {
          deleting = false;
          textIdx = (textIdx + 1) % texts.length;
          charIdx = 0;
          setTimeout(tick, 400);
          return;
        }
      }
      setTimeout(tick, deleting ? speed / 2 : speed);
    }
    tick();
  }

  function initBinaryStream() {
    const el = $('#binary-stream');
    if (!el) return;
    function gen() {
      let s = '';
      for (let i = 0; i < 80; i++) s += Math.random() > 0.5 ? '1' : '0';
      el.textContent = s;
    }
    gen();
    setInterval(gen, 120);
  }

  function initHomeAscii() {
    const el = $('#home-ascii');
    if (!el) return;
    el.textContent = [
      '      ╔══════════════════════╗',
      '      ║  ▓▓▓ SUPERUSER ▓▓▓   ║',
      '      ║                      ║',
      '      ║  > root access: YES  ║',
      '      ║  > firewall: ACTIVE  ║',
      '      ║  > encryption: AES   ║',
      '      ║  > status: ONLINE    ║',
      '      ║                      ║',
      '      ║  sid@blackarch ~  ║',
      '      ╚══════════════════════╝'
    ].join('\n');
  }

  function initNav() {
    const toggle = $('#nav-toggle');
    const links = $('.nav-links');
    const navLinks = $$('.nav-link');
    const navbar = $('#navbar');

    toggle && toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      links.classList.toggle('open');
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('open');
        toggle && toggle.classList.remove('active');
      });
    });

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
      const sections = $$('.section');
      let current = '';
      sections.forEach((sec) => {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
      });
      navLinks.forEach((l) => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current);
      });
    });
  }

  function initReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    $$('.reveal').forEach((el) => observer.observe(el));
  }

  function initCounters() {
    const stats = $$('.stat-value');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.count, 10);
            let current = 0;
            const step = Math.ceil(target / 40);
            const timer = setInterval(() => {
              current += step;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              el.textContent = current + (target >= 100 ? '+' : '');
            }, 40);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    stats.forEach((s) => observer.observe(s));
  }

  function initTilt() {
    if (PERF.mobile || PERF.reduced) return;
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -8;
        const ry = ((x - cx) / cx) * 8;
        card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale3d(1.02,1.02,1.02)';
        card.style.setProperty('--mx', (x / rect.width) * 100 + '%');
        card.style.setProperty('--my', (y / rect.height) * 100 + '%');
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
      });
    });
  }

  const termCommands = {
    help: function() { return 'Available commands:\n  whoami      — display current user\n  uname -a    — system information\n  pwd         — print working directory\n  ls          — list directory contents\n  neofetch    — system summary\n  skills      — show skill set\n  projects    — list projects\n  contact     — contact information\n  clear       — clear terminal\n  help        — show this message'; },
    whoami: function() { return 'sid'; },
    'uname -a': function() { return 'Linux blackarch 6.8.0-arch1-1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux'; },
    pwd: function() { return '/home/sid'; },
    ls: function() { return 'drwxr-xr-x  skills/\ndrwxr-xr-x  projects/\ndrwxr-xr-x  tools/\n-rw-r--r--  README.md\n-rwxr-xr-x  sidd.zst\n-rw-r--r--  .bashrc\n-rw-r--r--  notes.txt'; },
    neofetch: function() {
      return '\n        sid@blackarch\n        ---------------\n        OS: BlackArch Linux x86_64\n        Host: Portfolio Interface\n        Kernel: 6.8.0-arch1-1\n        Uptime: ' + (Math.floor(Math.random() * 48) + 1) + ' hours\n        Shell: zsh 5.9\n        Resolution: ' + window.innerWidth + 'x' + window.innerHeight + '\n        DE: Cyberpunk WM\n        Terminal: sidd.zst\n        CPU: Neural Engine\n        Memory: Unlimited\n        Access: SUPERUSER\n';
    },
    skills: function() { return '┌─────────────────────────────────────┐\n│  Linux          ████████████░  95%  │\n│  Networking     ███████████░░  90%  │\n│  Cyber Security ███████████░░  88%  │\n│  Python         ███████████░░  92%  │\n│  JavaScript     ██████████░░░  85%  │\n│  Git            ███████████░░  90%  │\n│  HTML / CSS     ████████████░  94%  │\n└─────────────────────────────────────┘'; },
    projects: function() { return '  [PRJ-001] Network Scanner      — ACTIVE\n  [PRJ-002] WiFi Analysis        — ACTIVE\n  [PRJ-003] Portfolio Website    — LIVE\n  [PRJ-004] Future AI Project    — SOON\n\n  Scroll to #projects for details.'; },
    contact: function() { return '  GitHub   : github.com/sid\n  Email    : siddharth.tech26@gmail.com\n  Instagram: @sid\n\n  Use the CONTACT section or copy email button.'; },
    clear: null,
  };

  function initTerminal() {
    const output = $('#terminal-output');
    const input = $('#terminal-input');
    const body = $('#terminal-body');
    const clearBtn = $('#term-clear');

    function print(text, cls) {
      cls = cls || 'output-line';
      text.split('\n').forEach(function(l) {
        const div = document.createElement('div');
        div.className = 'line ' + cls;
        div.textContent = l || '\u00A0';
        output.appendChild(div);
      });
      body.scrollTop = body.scrollHeight;
    }

    function printCmd(cmd) {
      const div = document.createElement('div');
      div.className = 'line cmd-line';
      div.textContent = 'sid@blackarch:~$ ' + cmd;
      output.appendChild(div);
    }

    print('sidd.zst Terminal v2.0 — Type "help" for commands.', 'info-line');
    print('');

    function execute(cmd) {
      const trimmed = cmd.trim().toLowerCase();
      if (!trimmed) return;
      printCmd(cmd);
      if (trimmed === 'clear') {
        output.innerHTML = '';
        return;
      }
      let found = null;
      if (termCommands[trimmed] !== undefined) found = trimmed;
      else if (trimmed === 'uname' || trimmed.indexOf('uname ') === 0) found = 'uname -a';

      if (found && termCommands[found]) print(termCommands[found]());
      else {
        print('bash: ' + cmd + ': command not found', 'error-line');
        print('Type "help" for available commands.', 'info-line');
      }
      print('');
    }

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        execute(input.value);
        input.value = '';
      }
    });
    clearBtn && clearBtn.addEventListener('click', function() { output.innerHTML = ''; input.focus(); });
    body.addEventListener('click', function() { input.focus(); });
  }

  function initEasterEgg() {
    const logo = $('#logo');
    const secret = $('#secret-terminal');
    const secretOut = $('#secret-output');
    const secretIn = $('#secret-input');
    const closeBtn = $('#close-secret');
    let clicks = 0;
    let clickTimer = null;

    const secretCmds = {
      help: function() { return 'ROOT SHELL — Restricted Commands:\n  help      whoami    hack\n  neofetch  clear     projects\n  skills    contact'; },
      whoami: function() { return 'root (uid=0) — Privilege escalation successful.'; },
      hack: function() { return '\n[*] Initializing exploit framework...\n[*] Scanning target network...\n[*] 3 hosts discovered\n[*] Attempting buffer overflow on port 445...\n[+] Exploit successful\n[+] Meterpreter session opened\n[+] Dumping credentials...\n[+] Access Level: ROOT\n[!] This is a simulation. Stay ethical.'; },
      neofetch: function() { return '\n  root@sid\n  -----------\n  Role: Superuser\n  Clearance: MAXIMUM\n  Status: OVERRIDE ACTIVE'; },
      projects: function() { return termCommands.projects(); },
      skills: function() { return termCommands.skills(); },
      contact: function() { return termCommands.contact(); },
      clear: null,
    };

    function secretPrint(text, cls) {
      cls = cls || '';
      text.split('\n').forEach(function(l) {
        const div = document.createElement('div');
        div.className = 'line ' + cls;
        div.textContent = l || '\u00A0';
        secretOut.appendChild(div);
      });
      $('#secret-body').scrollTop = $('#secret-body').scrollHeight;
    }

    logo.addEventListener('click', function() {
      clicks++;
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(function() { clicks = 0; }, 2000);
      if (clicks >= 5) {
        clicks = 0;
        secret.classList.remove('hidden');
        secretOut.innerHTML = '';
        secretPrint('>>> KERNEL OVERRIDE INITIATED', 'error-line');
        secretPrint('>>> AUTHENTICATION BYPASSED', 'error-line');
        secretPrint('>>> ROOT SHELL ACTIVE', 'error-line');
        secretPrint('');
        secretPrint('Type "help" for commands.', 'info-line');
        secretPrint('');
        setTimeout(function() { secretIn.focus(); }, 100);
        showToast('ROOT ACCESS GRANTED');
      }
    });

    closeBtn.addEventListener('click', function() { secret.classList.add('hidden'); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !secret.classList.contains('hidden')) secret.classList.add('hidden');
    });

    secretIn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const cmd = secretIn.value.trim().toLowerCase();
        secretPrint('root@sid:~# ' + secretIn.value, 'cmd-line');
        secretIn.value = '';
        if (cmd === 'clear') { secretOut.innerHTML = ''; return; }
        if (secretCmds[cmd]) secretPrint(secretCmds[cmd]());
        else if (cmd) secretPrint('sh: ' + cmd + ': not found in restricted shell', 'error-line');
        secretPrint('');
      }
    });
  }

  function initContact() {
    const form = $('#contact-form');
    // Change this to your real Gmail to receive messages
    const CONTACT_EMAIL = 'siddharth.tech26@gmail.com';
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const name = $('#cf-name');
        const email = $('#cf-email');
        const msg = $('#cf-msg');
        const phone = $('#cf-phone');
        const submitBtn = $('#cf-submit');
        let ok = true;
        [name, email, msg].forEach(function (el) {
          if (!el) return;
          el.classList.remove('cf-error');
          if (!el.value.trim()) {
            el.classList.add('cf-error');
            ok = false;
          }
        });
        if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
          email.classList.add('cf-error');
          ok = false;
        }
        if (!ok) {
          showToast('FILL REQUIRED FIELDS');
          return;
        }

        const payload = {
          name: name.value.trim(),
          phone: (phone && phone.value.trim()) || '—',
          email: email.value.trim(),
          message: msg.value.trim(),
          _subject: 'sidd.zst — New contact / project request',
          _template: 'table',
          _captcha: 'false',
        };

        submitBtn.disabled = true;
        const label = submitBtn.querySelector('.cf-submit-text');
        if (label) label.textContent = 'TRANSMITTING...';

        fetch('https://formsubmit.co/ajax/' + CONTACT_EMAIL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (result.ok || (result.data && result.data.success === 'true') || (result.data && result.data.success === true)) {
              if (label) label.textContent = 'TRANSMISSION SENT';
              showToast('SENT TO ' + CONTACT_EMAIL.toUpperCase());
              form.reset();
            } else {
              throw new Error((result.data && result.data.message) || 'Send failed');
            }
          })
          .catch(function (err) {
            // Fallback: open mail client so message is not lost
            const body = [
              'Name: ' + payload.name,
              'Phone: ' + payload.phone,
              'Email: ' + payload.email,
              '',
              payload.message,
            ].join('\\n');
            window.location.href = 'mailto:' + CONTACT_EMAIL
              + '?subject=' + encodeURIComponent('sidd.zst — Project request from ' + payload.name)
              + '&body=' + encodeURIComponent(body);
            showToast('OPENING MAIL CLIENT (FALLBACK)');
            if (label) label.textContent = 'Initialize Project';
          })
          .finally(function () {
            setTimeout(function () {
              submitBtn.disabled = false;
              if (label) label.textContent = 'Initialize Project';
            }, 2000);
          });
      });
    }
    const btn = $('#copy-email');
    const email = 'siddharth.tech26@gmail.com';
    btn && btn.addEventListener('click', async function() {
      try {
        await navigator.clipboard.writeText(email);
        showToast('EMAIL COPIED TO CLIPBOARD');
        btn.textContent = 'COPIED';
        setTimeout(function() { btn.textContent = 'COPY'; }, 2000);
      } catch (err) {
        showToast('COPY FAILED — ' + email);
      }
    });
  }

  function initClock() {
    const el = $('#footer-clock');
    if (!el) return;
    function update() {
      const now = new Date();
      el.textContent =
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + ' UTC+5:30';
    }
    update();
    setInterval(update, 1000);
  }

  function initHackerFlicker() {
    const title = $('.main-title');
    if (!title) return;
    setInterval(function() {
      if (Math.random() > 0.92) {
        title.style.textShadow = '2px 0 #ff0040, -2px 0 #00f0ff, 0 0 20px #00ff41';
        setTimeout(function() { title.style.textShadow = ''; }, 80 + Math.random() * 120);
      }
    }, 3000);
  }

  function initApp() {
    document.body.classList.remove('intro-active');
    document.body.classList.add('site-active');

    initMatrix();
    initParticles();
    initMouseEffects();
    initNav();
    initReveal();
    initCounters();
    initTilt();
    initTerminal();
    initEasterEgg();
    initContact();
    initClock();
    initBinaryStream();
    initHomeAscii();
    initHackerFlicker();

    typeWriter($('#typing-subtitle'), [
      'Cyber Security Researcher',
      'BlackArch Linux Operator',
      'Ethical Hacking · Labs',
      'Network & Web Security',
      'Learn by Doing',
    ], 70, 2200);

    const enterTerm = $('#enter-terminal');
    enterTerm && enterTerm.addEventListener('click', function() {
      setTimeout(function() {
        const ti = $('#terminal-input');
        ti && ti.focus();
      }, 600);
    });

    const main = $('#main-content');
    main.classList.remove('hidden');
    requestAnimationFrame(function() { main.classList.add('visible'); });
  }

  /* ============================================
     MASTER SEQUENCE
     ============================================ */
  async function start() {
    const intro = new CinematicIntro();
    await intro.run();
    await runBoot();
    await runSUReveal();
    initApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
