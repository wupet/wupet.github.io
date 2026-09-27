(() => {
    'use strict';

    const root = document.documentElement;
    const body = document.body;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ------------------------------------------------------------------
       Theme
       ------------------------------------------------------------------ */
    const themeListeners = [];
    const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable */ }
        themeListeners.forEach((fn) => fn(theme));
    }

    $('#themeToggle').addEventListener('click', (e) => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        if (!document.startViewTransition || reducedMotion) {
            setTheme(next);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const transition = document.startViewTransition(() => setTheme(next));
        transition.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.7, 0, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        });
    });

    /* ------------------------------------------------------------------
       Mobile menu
       ------------------------------------------------------------------ */
    const menuToggle = $('#menuToggle');
    const mobileMenu = $('#mobileMenu');
    function setMenu(open) {
        body.classList.toggle('menu-open', open);
        body.style.overflow = open ? 'hidden' : '';
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        mobileMenu.setAttribute('aria-hidden', String(!open));
    }
    menuToggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
    $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    /* ------------------------------------------------------------------
       Text scramble ("decrypting" effect)
       ------------------------------------------------------------------ */
    const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEF$%&';
    function scramble(el, duration = 1400) {
        const text = el.dataset.text || el.textContent;
        el.setAttribute('aria-label', text);
        if (reducedMotion) { el.textContent = text; return; }
        const frames = Math.round(duration / 16);
        // Each character resolves at its own random frame
        const queue = [...text].map((ch) => ({ ch, end: Math.floor(frames * (0.3 + Math.random() * 0.7)) }));
        let frame = 0;
        cancelAnimationFrame(el._scrambleRaf);
        const tick = () => {
            let out = '';
            let done = 0;
            for (const q of queue) {
                if (q.ch === ' ' || frame >= q.end) { out += q.ch; done++; }
                else out += `<span class="glyph">${GLYPHS[Math.floor(Math.random() * GLYPHS.length)]}</span>`;
            }
            el.innerHTML = out;
            if (done < queue.length) { frame++; el._scrambleRaf = requestAnimationFrame(tick); }
        };
        tick();
    }
    $$('.scramble').forEach((el) => {
        setTimeout(() => scramble(el), 250);
        el.addEventListener('mouseenter', () => scramble(el, 900));
    });

    /* ------------------------------------------------------------------
       Reveal on scroll (staggered per batch)
       ------------------------------------------------------------------ */
    const revealObserver = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        visible.forEach((el, i) => {
            el.style.transitionDelay = `${i * 90}ms`;
            el.classList.add('in');
            revealObserver.unobserve(el);
            // Clear the delay so hover transitions afterwards feel instant
            setTimeout(() => { el.style.transitionDelay = ''; }, 1100 + i * 90);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el) => revealObserver.observe(el));

    /* ------------------------------------------------------------------
       Animated counters
       ------------------------------------------------------------------ */
    function runCounter(el) {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (reducedMotion) { el.textContent = fmt(target); return; }
        const duration = 1800;
        const t0 = performance.now();
        const step = (now) => {
            const t = clamp((now - t0) / duration, 0, 1);
            const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            el.textContent = fmt(target * eased);
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) { runCounter(e.target); counterObserver.unobserve(e.target); }
        });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => counterObserver.observe(el));

    /* ------------------------------------------------------------------
       Scroll-driven: progress bar, nav, timeline, parallax
       ------------------------------------------------------------------ */
    const nav = $('#nav');
    const timeline = $('.timeline');
    const tlItems = $$('.tl-item');
    const serviceBg = $('.service-bg');
    let lastY = scrollY;
    let scrollTicking = false;

    function onScroll() {
        const y = scrollY;
        const max = document.documentElement.scrollHeight - innerHeight;
        root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);

        nav.classList.toggle('scrolled', y > 20);
        if (!body.classList.contains('menu-open')) {
            nav.classList.toggle('hidden', y > lastY && y > 500);
        }
        lastY = y;

        if (timeline) {
            const r = timeline.getBoundingClientRect();
            const mid = innerHeight * 0.6;
            timeline.style.setProperty('--tl', clamp((mid - r.top) / r.height, 0, 1).toFixed(4));
            tlItems.forEach((item) => {
                const node = item.querySelector('.tl-node').getBoundingClientRect();
                item.classList.toggle('lit', node.top < mid);
            });
        }

        if (serviceBg && !reducedMotion) {
            const r = serviceBg.parentElement.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight) {
                const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
                serviceBg.style.setProperty('--py', `${(p * -60).toFixed(1)}px`);
            }
        }
        scrollTicking = false;
    }
    addEventListener('scroll', () => {
        if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    /* ------------------------------------------------------------------
       Nav: active section + sliding indicator
       ------------------------------------------------------------------ */
    const navLinks = $$('.nav-links a');
    const indicator = $('.nav-indicator');
    let activeLink = null;

    function moveIndicator(link) {
        if (!link) { indicator.style.opacity = '0'; return; }
        indicator.style.opacity = '1';
        indicator.style.width = `${link.offsetWidth}px`;
        indicator.style.transform = `translateX(${link.offsetLeft}px)`;
    }
    navLinks.forEach((link) => {
        link.addEventListener('mouseenter', () => moveIndicator(link));
        link.addEventListener('focus', () => moveIndicator(link));
    });
    $('.nav-links').addEventListener('mouseleave', () => moveIndicator(activeLink));

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            activeLink = navLinks.find((l) => l.dataset.section === e.target.id) || null;
            navLinks.forEach((l) => l.classList.toggle('active', l === activeLink));
            moveIndicator(activeLink);
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('section[id]').forEach((s) => sectionObserver.observe(s));

    /* ------------------------------------------------------------------
       Local time + year
       ------------------------------------------------------------------ */
    const timeEl = $('#localTime');
    const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
    const updateTime = () => { timeEl.textContent = `${timeFmt.format(new Date())} CT`; };
    updateTime();
    setInterval(updateTime, 30000);
    $('#year').textContent = new Date().getFullYear();

    /* ------------------------------------------------------------------
       Copy email
       ------------------------------------------------------------------ */
    const toast = $('#toast');
    let toastTimer;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
    }
    $('#copyEmail').addEventListener('click', async (e) => {
        const email = e.currentTarget.dataset.email;
        try {
            await navigator.clipboard.writeText(email);
            showToast('Email copied to clipboard ✓');
        } catch (err) {
            window.location.href = `mailto:${email}`;
        }
    });

    /* ------------------------------------------------------------------
       RSA toy demo (p = 61, q = 53)
       ------------------------------------------------------------------ */
    const RSA = { n: 3233, e: 17, d: 2753 };
    function modPow(base, exp, mod) {
        let result = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) result = (result * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return result;
    }
    const rsaInput = $('#rsaInput');
    const rsaOut = $('#rsaOut');
    const rsaKeys = $('#rsaKeys');
    let rsaRaf;
    function encryptDemo() {
        const codes = [...rsaInput.value].map((c) => c.codePointAt(0) % RSA.n);
        const cipher = codes.map((m) => modPow(m, RSA.e, RSA.n));
        const hex = cipher.map((c) => c.toString(16).padStart(3, '0')).join(' ');
        const back = String.fromCodePoint(...cipher.map((c) => modPow(c, RSA.d, RSA.n)));
        rsaKeys.textContent = codes.length
            ? `n=3233 · e=17 · decrypts back to "${back}" ✓`
            : 'n=3233 · e=17 · d=2753 (toy key)';
        if (!hex) { rsaOut.textContent = '—'; return; }
        if (reducedMotion) { rsaOut.textContent = hex; return; }
        // brief scramble into the final ciphertext
        let f = 0;
        cancelAnimationFrame(rsaRaf);
        const tick = () => {
            const reveal = Math.floor((f / 14) * hex.length);
            rsaOut.textContent = [...hex].map((ch, i) => (i < reveal || ch === ' ' ? ch : '0123456789abcdef'[Math.floor(Math.random() * 16)])).join('');
            if (f++ < 14) rsaRaf = requestAnimationFrame(tick);
            else rsaOut.textContent = hex;
        };
        tick();
    }
    rsaInput.addEventListener('input', encryptDemo);
    encryptDemo();

    /* ------------------------------------------------------------------
       Horus eye follows the pointer and blinks
       ------------------------------------------------------------------ */
    const eyeSvg = $('.horus-eye');
    const pupil = $('#eyePupil');
    const eyelid = $('#eyelid');
    addEventListener('pointermove', (e) => {
        const r = eyeSvg.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(dist / 12, 1) * 34;
        pupil.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach * 0.55}px)`;
    }, { passive: true });
    function blink() {
        eyelid.classList.add('blink');
        setTimeout(() => eyelid.classList.remove('blink'), 140);
    }
    if (!reducedMotion) {
        (function scheduleBlink() {
            setTimeout(() => { blink(); scheduleBlink(); }, 2500 + Math.random() * 4000);
        })();
    }
    eyeSvg.closest('.project').addEventListener('click', blink);

    /* ------------------------------------------------------------------
       Interactive NAND gate
       ------------------------------------------------------------------ */
    const inA = $('#inA'), inB = $('#inB'), outQ = $('#outQ');
    const nandState = { a: false, b: false };
    function renderNand() {
        const q = !(nandState.a && nandState.b);
        [[inA, nandState.a, '#wireA'], [inB, nandState.b, '#wireB'], [outQ, q, '#wireOut']].forEach(([g, on, wire]) => {
            g.classList.toggle('on', on);
            g.querySelector('text').textContent = on ? '1' : '0';
            if (g.hasAttribute('aria-checked')) g.setAttribute('aria-checked', String(on));
            $(wire).classList.toggle('on', on);
        });
    }
    [[inA, 'a'], [inB, 'b']].forEach(([g, key]) => {
        const toggle = () => { nandState[key] = !nandState[key]; renderNand(); };
        g.addEventListener('click', toggle);
        g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
    });
    renderNand();

    /* ------------------------------------------------------------------
       Spotlight glow (all devices) — follows pointer inside cards
       ------------------------------------------------------------------ */
    $$('.spotlight').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--x', `${e.clientX - r.left}px`);
            el.style.setProperty('--y', `${e.clientY - r.top}px`);
        });
    });

    /* ------------------------------------------------------------------
       Pointer-only flourishes: cursor, magnetic, tilt, dot grid, previews
       ------------------------------------------------------------------ */
    if (finePointer && !reducedMotion) {
        // Dot grid follows cursor
        addEventListener('pointermove', (e) => {
            root.style.setProperty('--mx', `${e.clientX}px`);
            root.style.setProperty('--my', `${e.clientY}px`);
        }, { passive: true });

        // Custom cursor
        const ring = $('.cursor-ring');
        const dot = $('.cursor-dot');
        const label = $('.cursor-label');
        const pos = { x: innerWidth / 2, y: innerHeight / 2 };
        const ringPos = { ...pos };
        addEventListener('pointermove', (e) => {
            pos.x = e.clientX; pos.y = e.clientY;
            body.classList.add('has-cursor');
            dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
        }, { passive: true });
        document.addEventListener('pointerleave', () => body.classList.remove('has-cursor'));
        (function loop() {
            ringPos.x = lerp(ringPos.x, pos.x, 0.18);
            ringPos.y = lerp(ringPos.y, pos.y, 0.18);
            ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px)`;
            requestAnimationFrame(loop);
        })();
        document.addEventListener('pointerover', (e) => {
            const t = e.target;
            const labelled = t.closest('[data-cursor]');
            const interactive = t.closest('a, button, input, [role="switch"], .archive-row, #polyCanvas');
            if (labelled && (!interactive || interactive === labelled)) {
                label.textContent = labelled.dataset.cursor;
                body.classList.add('cursor-label-on');
                body.classList.remove('cursor-hover');
            } else {
                body.classList.remove('cursor-label-on');
                body.classList.toggle('cursor-hover', !!interactive);
            }
        });

        // Magnetic buttons
        $$('.magnetic').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - (r.left + r.width / 2);
                const y = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${x * 0.28}px, ${y * 0.38}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });

        // 3D tilt
        $$('.tilt').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                if (!el.classList.contains('in')) return;
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                el.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });

        // Archive hover image preview
        const preview = $('.archive-preview');
        const previewImg = $('img', preview);
        const pp = { x: 0, y: 0, tx: 0, ty: 0 };
        let previewRaf = null;
        const previewLoop = () => {
            pp.x = lerp(pp.x, pp.tx, 0.15);
            pp.y = lerp(pp.y, pp.ty, 0.15);
            preview.style.left = `${pp.x}px`;
            preview.style.top = `${pp.y}px`;
            previewRaf = requestAnimationFrame(previewLoop);
        };
        $$('.archive-row').forEach((row) => {
            row.addEventListener('pointerenter', (e) => {
                previewImg.src = row.dataset.img;
                if (!preview.classList.contains('show')) { pp.x = e.clientX + 140; pp.y = e.clientY; }
                preview.classList.add('show');
                if (!previewRaf) previewLoop();
            });
            row.addEventListener('pointermove', (e) => { pp.tx = e.clientX + 140; pp.ty = e.clientY; });
        });
        $('.archive-list').addEventListener('pointerleave', () => {
            preview.classList.remove('show');
            setTimeout(() => {
                if (!preview.classList.contains('show')) { cancelAnimationFrame(previewRaf); previewRaf = null; }
            }, 400);
        });
    }

    /* ------------------------------------------------------------------
       Hero: interactive wireframe icosahedron (canvas 2D)
       ------------------------------------------------------------------ */
    const canvas = $('#polyCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const PHI = (1 + Math.sqrt(5)) / 2;
        const raw = [
            [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
            [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
            [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
        ];
        const norm = Math.hypot(1, PHI);
        const verts = raw.map((v) => v.map((c) => c / norm));
        const edges = [];
        for (let i = 0; i < raw.length; i++) {
            for (let j = i + 1; j < raw.length; j++) {
                const d = Math.hypot(raw[i][0] - raw[j][0], raw[i][1] - raw[j][1], raw[i][2] - raw[j][2]);
                if (Math.abs(d - 2) < 0.01) edges.push([i, j]);
            }
        }
        // Geodesic midpoints give the inner shell a finer mesh
        const inner = edges.map(([i, j]) => {
            const m = verts[i].map((c, k) => (c + verts[j][k]) / 2);
            const l = Math.hypot(...m);
            return m.map((c) => c / l);
        });
        const innerEdges = [];
        for (let i = 0; i < inner.length; i++) {
            for (let j = i + 1; j < inner.length; j++) {
                const d = Math.hypot(inner[i][0] - inner[j][0], inner[i][1] - inner[j][1], inner[i][2] - inner[j][2]);
                if (d < 0.66) innerEdges.push([i, j]);
            }
        }
        // Orbiting particles on a tilted ring
        const particles = Array.from({ length: 90 }, (_, i) => ({
            a: (i / 90) * Math.PI * 2,
            r: 1.45 + Math.random() * 0.22,
            s: 0.6 + Math.random() * 0.8,
            y: (Math.random() - 0.5) * 0.08,
        }));

        let colors = {};
        const readColors = () => { colors = { ink: cssVar('--ink'), accent: cssVar('--accent'), accent2: cssVar('--accent-2') }; };
        readColors();
        themeListeners.push(() => requestAnimationFrame(readColors));

        let W = 0, H = 0, dpr = 1;
        const resize = () => {
            dpr = Math.min(devicePixelRatio || 1, 2);
            const r = canvas.getBoundingClientRect();
            W = r.width; H = r.height;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        addEventListener('resize', resize);

        const rot = { x: -0.35, y: 0.4, vx: 0, vy: 0.0035 };
        const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
        let dragging = false, last = null;

        addEventListener('pointermove', (e) => {
            tilt.tx = (e.clientY / innerHeight - 0.5) * 0.6;
            tilt.ty = (e.clientX / innerWidth - 0.5) * 0.6;
            if (dragging && last) {
                rot.vy = (e.clientX - last.x) * 0.0022;
                rot.vx = (e.clientY - last.y) * 0.0022;
                last = { x: e.clientX, y: e.clientY };
            }
        }, { passive: true });
        canvas.addEventListener('pointerdown', (e) => {
            dragging = true; last = { x: e.clientX, y: e.clientY };
            canvas.classList.add('dragging');
        });
        addEventListener('pointerup', () => { dragging = false; last = null; canvas.classList.remove('dragging'); });

        const rotate = ([x, y, z], ax, ay) => {
            const cy = Math.cos(ay), sy = Math.sin(ay);
            let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
            const cx = Math.cos(ax), sx = Math.sin(ax);
            const y1 = y * cx - z1 * sx;
            z1 = y * sx + z1 * cx;
            return [x1, y1, z1];
        };

        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

        let t = 0;
        function frame() {
            if (visible && !document.hidden) draw();
            if (!reducedMotion) requestAnimationFrame(frame);
        }
        function draw() {
            t += 1;
            rot.x += rot.vx; rot.y += rot.vy;
            if (!dragging) {
                rot.vx *= 0.95;
                rot.vy = lerp(rot.vy, 0.0035, 0.02);
            }
            tilt.x = lerp(tilt.x, tilt.tx, 0.05);
            tilt.y = lerp(tilt.y, tilt.ty, 0.05);

            ctx.clearRect(0, 0, W, H);
            const R = Math.min(W, H) * 0.3;
            const cx = W / 2, cy = H / 2;
            const breathe = 1 + Math.sin(t * 0.012) * 0.025;
            const project = (p, scale) => {
                const persp = 3.2 / (3.2 + p[2]);
                return [cx + p[0] * R * scale * persp, cy + p[1] * R * scale * persp, p[2]];
            };
            const ax = rot.x + tilt.x, ay = rot.y + tilt.y;

            // particles (behind + in front, depth-shaded)
            ctx.fillStyle = colors.accent;
            particles.forEach((p) => {
                const a = p.a + t * 0.002 * p.s;
                let pt = [Math.cos(a) * p.r, p.y, Math.sin(a) * p.r];
                pt = rotate(pt, 1.15 + tilt.x * 0.5, tilt.y * 0.5);
                const [x, y, z] = project(pt, 1);
                ctx.globalAlpha = clamp(0.55 - z * 0.3, 0.08, 0.8);
                ctx.beginPath();
                ctx.arc(x, y, clamp(1.6 - z * 0.6, 0.5, 2.4), 0, Math.PI * 2);
                ctx.fill();
            });

            // inner geodesic shell, counter-rotating
            const innerP = inner.map((v) => project(rotate(v, -ax * 0.8, -ay * 1.3 + t * 0.002), 0.62 * breathe));
            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.accent;
            innerEdges.forEach(([i, j]) => {
                const z = (innerP[i][2] + innerP[j][2]) / 2;
                ctx.globalAlpha = clamp(0.35 - z * 0.25, 0.06, 0.55);
                ctx.beginPath();
                ctx.moveTo(innerP[i][0], innerP[i][1]);
                ctx.lineTo(innerP[j][0], innerP[j][1]);
                ctx.stroke();
            });

            // outer icosahedron
            const P = verts.map((v) => project(rotate(v, ax, ay), breathe));
            ctx.strokeStyle = colors.ink;
            ctx.lineWidth = 1.4;
            edges.forEach(([i, j]) => {
                const z = (P[i][2] + P[j][2]) / 2;
                ctx.globalAlpha = clamp(0.62 - z * 0.45, 0.1, 0.95);
                ctx.beginPath();
                ctx.moveTo(P[i][0], P[i][1]);
                ctx.lineTo(P[j][0], P[j][1]);
                ctx.stroke();
            });
            P.forEach(([x, y, z], i) => {
                ctx.globalAlpha = clamp(0.9 - z * 0.5, 0.2, 1);
                ctx.fillStyle = i % 4 === 0 ? colors.accent2 : colors.ink;
                ctx.beginPath();
                ctx.arc(x, y, clamp(3.4 - z * 1.4, 1.4, 5), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
        frame();
        if (reducedMotion) themeListeners.push(() => requestAnimationFrame(draw));
    }
})();
