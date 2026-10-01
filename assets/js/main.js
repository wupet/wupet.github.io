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
    $$('.scramble').forEach((el) => setTimeout(() => scramble(el), 250));

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
       Pointer-only flourishes: magnetic buttons, tilt
       ------------------------------------------------------------------ */
    if (finePointer && !reducedMotion) {
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
    }

    /* ------------------------------------------------------------------
       Hero: shaded icosahedron (canvas 2D)
       Solid front faces + faint back edges remove the wireframe
       "which way is it spinning?" ambiguity.
       ------------------------------------------------------------------ */
    const canvas = $('#polyCanvas');
    if (canvas && window.Icosa) {
        const { verts, edges, faces, edgeFaces, rotate } = window.Icosa;
        const ctx = canvas.getContext('2d');
        const LIGHT = (() => { const l = [-0.45, -0.6, -0.65]; const m = Math.hypot(...l); return l.map((c) => c / m); })();
        const SPIN = 0.004;

        const particles = Array.from({ length: 64 }, (_, i) => ({
            a: (i / 64) * Math.PI * 2,
            r: 1.5 + Math.random() * 0.18,
            s: 0.7 + Math.random() * 0.6,
            y: (Math.random() - 0.5) * 0.06,
        }));

        let colors = {};
        const readColors = () => { colors = { ink: cssVar('--ink'), accent: cssVar('--accent'), accent2: cssVar('--accent-2') }; };
        readColors();
        themeListeners.push(() => requestAnimationFrame(readColors));

        let W = 0, H = 0;
        const resize = () => {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            const r = canvas.getBoundingClientRect();
            W = r.width; H = r.height;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        addEventListener('resize', resize);

        /* Orientation is a rotation matrix rather than Euler angles. Drags
           rotate around the screen's axes, so left/right stays left/right
           even after the solid has been flipped upside down. */
        const mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
        const apply = (M, v) => M.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
        // Positive angles move the face nearest the viewer right (Y) or down (X)
        const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, -s], [0, 1, 0], [s, 0, c]]; };
        const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
        const axisAngle = ([x, y, z], a) => {
            const c = Math.cos(a), s = Math.sin(a), k = 1 - c;
            return [
                [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
                [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
                [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
            ];
        };
        const orthonormalize = (M) => {
            // Re-orthogonalize the columns so rounding error never skews the solid
            const col = (j) => [M[0][j], M[1][j], M[2][j]];
            const unit = (v) => { const m = Math.hypot(...v); return v.map((c) => c / m); };
            const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            const a = unit(col(0));
            let b = col(1); const d = dot(a, b); b = unit(b.map((c, i) => c - d * a[i]));
            const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
            return [0, 1, 2].map((i) => [a[i], b[i], c[i]]);
        };

        const basis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => rotate(e, -0.35, 0.4));
        let orient = [0, 1, 2].map((i) => basis.map((v) => v[i]));
        const restUp = rotate([0, 1, 0], -0.35, 0);
        const vel = { x: 0, y: 0 };
        let spin = -SPIN, spinDir = -1;
        const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
        let dragging = false, last = null;

        addEventListener('pointermove', (e) => {
            tilt.tx = (e.clientY / innerHeight - 0.5) * 0.3;
            tilt.ty = (e.clientX / innerWidth - 0.5) * 0.3;
            if (dragging && last) {
                vel.y = (e.clientX - last.x) * 0.002;
                vel.x = (e.clientY - last.y) * 0.002;
                last = { x: e.clientX, y: e.clientY };
            }
        }, { passive: true });
        canvas.addEventListener('pointerdown', (e) => {
            dragging = true; last = { x: e.clientX, y: e.clientY };
            vel.x = vel.y = spin = 0;
            canvas.classList.add('dragging');
        });
        addEventListener('pointerup', () => {
            if (!dragging) return;
            dragging = false; last = null;
            // Keep spinning the way it was thrown instead of snapping back
            if (Math.abs(vel.y) > 0.001) spinDir = Math.sign(vel.y);
            canvas.classList.remove('dragging');
        });

        let visible = true;
        new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

        let t = 0;
        function frame() {
            if (visible && !document.hidden) draw();
            if (!reducedMotion) requestAnimationFrame(frame);
        }

        function draw() {
            t += 1;
            orient = mul(mul(rotX(vel.x), rotY(vel.y)), orient);
            if (!dragging) {
                vel.x *= 0.94;
                vel.y *= 0.97;
                // Idle spin around the solid's own axis, which slowly rights itself
                spin = lerp(spin, SPIN * spinDir, 0.03);
                orient = mul(orient, rotY(spin));
                const up = apply(orient, [0, 1, 0]);
                const axis = [up[1] * restUp[2] - up[2] * restUp[1], up[2] * restUp[0] - up[0] * restUp[2], up[0] * restUp[1] - up[1] * restUp[0]];
                const sin = Math.hypot(...axis);
                if (sin > 1e-4) {
                    const angle = Math.atan2(sin, up[0] * restUp[0] + up[1] * restUp[1] + up[2] * restUp[2]);
                    orient = mul(axisAngle(axis.map((c) => c / sin), angle * 0.01), orient);
                }
            }
            orient = orthonormalize(orient);
            tilt.x = lerp(tilt.x, tilt.tx, 0.04);
            tilt.y = lerp(tilt.y, tilt.ty, 0.04);

            ctx.clearRect(0, 0, W, H);
            const R = Math.min(W, H) * 0.3;
            const cx = W / 2, cy = H / 2;
            const project = (p) => {
                const persp = 3 / (3 + p[2]);
                return [cx + p[0] * R * persp, cy + p[1] * R * persp, p[2]];
            };
            const view = mul(mul(rotX(tilt.x), rotY(tilt.y)), orient);

            const R3 = verts.map((v) => apply(view, v));
            const P = R3.map(project);
            const faceInfo = faces.map((f) => {
                const c = [0, 1, 2].map((k) => (R3[f[0]][k] + R3[f[1]][k] + R3[f[2]][k]) / 3);
                const m = Math.hypot(...c);
                const n = c.map((v) => v / m);
                return { f, front: n[2] < 0, light: Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]), z: c[2] };
            });

            // Orbiting particles, split so the solid occludes the far half
            const ring = particles.map((p) => {
                const a = p.a + t * 0.0022 * p.s;
                return project(rotate([Math.cos(a) * p.r, p.y, Math.sin(a) * p.r], 1.2 + tilt.x * 0.4, tilt.y * 0.4));
            });
            const drawParticles = (behind) => {
                ctx.fillStyle = colors.accent;
                ring.forEach(([x, y, z]) => {
                    if ((z > 0) !== behind) return;
                    ctx.globalAlpha = behind ? 0.18 : 0.6;
                    ctx.beginPath();
                    ctx.arc(x, y, behind ? 1 : 1.8, 0, Math.PI * 2);
                    ctx.fill();
                });
            };
            drawParticles(true);

            // Hidden edges: very faint and dashed
            ctx.lineWidth = 1;
            ctx.strokeStyle = colors.ink;
            ctx.setLineDash([2, 5]);
            ctx.globalAlpha = 0.12;
            edges.forEach(([i, j], ei) => {
                if (edgeFaces[ei].some((fi) => faceInfo[fi].front)) return;
                ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
            });
            ctx.setLineDash([]);

            // Front faces, lit by a soft key light
            ctx.fillStyle = colors.accent;
            faceInfo.filter((fi) => fi.front).sort((a, b) => b.z - a.z).forEach(({ f, light }) => {
                ctx.globalAlpha = 0.05 + light * 0.22;
                ctx.beginPath();
                ctx.moveTo(P[f[0]][0], P[f[0]][1]);
                ctx.lineTo(P[f[1]][0], P[f[1]][1]);
                ctx.lineTo(P[f[2]][0], P[f[2]][1]);
                ctx.closePath();
                ctx.fill();
            });

            // Visible edges
            ctx.lineWidth = 1.4;
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8;
            edges.forEach(([i, j], ei) => {
                if (!edgeFaces[ei].some((fi) => faceInfo[fi].front)) return;
                ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
            });

            // Visible vertices
            const seen = new Set();
            faceInfo.forEach((fi) => { if (fi.front) fi.f.forEach((v) => seen.add(v)); });
            seen.forEach((i) => {
                ctx.globalAlpha = 1;
                ctx.fillStyle = i % 4 === 0 ? colors.accent2 : colors.ink;
                ctx.beginPath();
                ctx.arc(P[i][0], P[i][1], 2.8, 0, Math.PI * 2);
                ctx.fill();
            });

            drawParticles(false);
            ctx.globalAlpha = 1;
        }
        frame();
        if (reducedMotion) themeListeners.push(() => requestAnimationFrame(draw));
    }

    // Small API for the other modules (tree, playground, terminal)
    window.site = { setTheme, showToast, scramble, reducedMotion, onTheme: (fn) => themeListeners.push(fn) };
})();
