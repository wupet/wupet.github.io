/* Machine-learning demo: fit y = 3x + 2 with hand-written gradient descent.
   Mirrors first.py in the practice repo — MSE loss, analytic gradients, no autograd. */
(() => {
    'use strict';

    const dialog = document.getElementById('mlDialog');
    if (!dialog) return;
    const $ = (id) => document.getElementById(id);

    const TRUE_W = 3, TRUE_B = 2;
    const plot = $('mlPlot'), lossCanvas = $('mlLossCurve');
    const pctx = plot.getContext('2d'), lctx = lossCanvas.getContext('2d');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fixed training set so the picture is stable across resets
    const data = [];
    (function makeData() {
        let seed = 1337;
        const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        for (let i = 0; i < 80; i++) {
            const x = rand() * 20 - 10;
            const y = TRUE_W * x + TRUE_B + (rand() * 2 - 1) * 3;
            data.push({ x, y });
        }
    })();

    const X = { min: -11, max: 11 };
    const Y = { min: -36, max: 36 };

    let w, b, epoch, lossHist, running = false, raf = null, diverged = false;

    const lr = () => Number($('mlLr').value) / 1000;

    function reset() {
        w = (Math.random() * 2 - 1) * 1.5;
        b = (Math.random() * 2 - 1) * 4;
        epoch = 0; lossHist = []; diverged = false;
        stop();
        $('mlWarn').textContent = '';
        record();
        draw();
    }

    function loss() {
        let s = 0;
        for (const { x, y } of data) { const e = w * x + b - y; s += e * e; }
        return s / data.length;
    }

    function stepOnce() {
        let gw = 0, gb = 0;
        for (const { x, y } of data) {
            const e = w * x + b - y;
            gw += 2 * e * x; gb += 2 * e;
        }
        gw /= data.length; gb /= data.length;
        const a = lr();
        w -= a * gw; b -= a * gb;
        epoch++;
        if (!Number.isFinite(w) || !Number.isFinite(b) || loss() > 1e7) {
            diverged = true; stop();
            $('mlWarn').textContent = '⚠ the loss blew up — that learning rate is too high. Reset and try a smaller one.';
        }
    }

    function record() {
        const l = loss();
        lossHist.push(l);
        if (lossHist.length > 400) lossHist.shift();
        $('mlW').textContent = Number.isFinite(w) ? w.toFixed(3) : '∞';
        $('mlB').textContent = Number.isFinite(b) ? b.toFixed(3) : '∞';
        $('mlLoss').textContent = Number.isFinite(l) ? (l < 1e4 ? l.toFixed(3) : l.toExponential(1)) : '∞';
        $('mlEpoch').textContent = `epoch ${epoch}`;
    }

    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    function fit(canvas, ctx) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const r = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, r.width * dpr);
        canvas.height = Math.max(1, r.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return r;
    }

    function draw() {
        const r = fit(plot, pctx);
        const W = r.width, H = r.height, pad = 14;
        const col = { ink: css('--ink'), ink2: css('--ink-2'), line: css('--line'), accent: css('--accent'), accent2: css('--accent-2') };
        const px = (x) => pad + (x - X.min) / (X.max - X.min) * (W - 2 * pad);
        const py = (y) => pad + (Y.max - y) / (Y.max - Y.min) * (H - 2 * pad);
        pctx.clearRect(0, 0, W, H);

        // axes
        pctx.strokeStyle = col.line; pctx.lineWidth = 1;
        pctx.beginPath(); pctx.moveTo(px(X.min), py(0)); pctx.lineTo(px(X.max), py(0));
        pctx.moveTo(px(0), py(Y.min)); pctx.lineTo(px(0), py(Y.max)); pctx.stroke();

        // true line (faint target)
        pctx.strokeStyle = col.ink2; pctx.globalAlpha = 0.4; pctx.setLineDash([4, 5]); pctx.lineWidth = 1.5;
        pctx.beginPath(); pctx.moveTo(px(X.min), py(TRUE_W * X.min + TRUE_B)); pctx.lineTo(px(X.max), py(TRUE_W * X.max + TRUE_B)); pctx.stroke();
        pctx.setLineDash([]); pctx.globalAlpha = 1;

        // data points
        pctx.fillStyle = col.accent2;
        for (const { x, y } of data) {
            pctx.globalAlpha = 0.5;
            pctx.beginPath(); pctx.arc(px(x), py(y), 3, 0, Math.PI * 2); pctx.fill();
        }
        pctx.globalAlpha = 1;

        // current model line
        if (Number.isFinite(w) && Number.isFinite(b)) {
            const y0 = w * X.min + b, y1 = w * X.max + b;
            pctx.strokeStyle = col.accent; pctx.lineWidth = 2.5; pctx.lineCap = 'round';
            pctx.beginPath(); pctx.moveTo(px(X.min), py(Math.max(Y.min, Math.min(Y.max, y0)))); pctx.lineTo(px(X.max), py(Math.max(Y.min, Math.min(Y.max, y1)))); pctx.stroke();
        }
        drawLoss(col);
    }

    function drawLoss(col) {
        const r = fit(lossCanvas, lctx);
        const W = r.width, H = r.height, pad = 6;
        lctx.clearRect(0, 0, W, H);
        if (lossHist.length < 2) return;
        // log scale so the long tail stays visible
        const vals = lossHist.map((l) => Math.log10(Math.max(l, 1e-6)));
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const span = hi - lo || 1;
        lctx.strokeStyle = col.accent; lctx.lineWidth = 2; lctx.lineJoin = 'round';
        lctx.beginPath();
        vals.forEach((v, i) => {
            const x = pad + i / (vals.length - 1) * (W - 2 * pad);
            const y = pad + (hi - v) / span * (H - 2 * pad);
            i ? lctx.lineTo(x, y) : lctx.moveTo(x, y);
        });
        lctx.stroke();
        lctx.fillStyle = col.ink2; lctx.font = '10px ui-monospace, monospace';
        lctx.fillText('loss (log)', pad, H - pad);
    }

    function loop() {
        if (!running) return;
        const perFrame = reduced ? 1 : 3;
        for (let k = 0; k < perFrame && !diverged; k++) stepOnce();
        record(); draw();
        if (diverged) return;
        raf = requestAnimationFrame(loop);
    }

    function start() {
        if (diverged) return;
        running = true;
        $('mlTrain').textContent = 'Pause';
        loop();
    }
    function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf), raf = null;
        $('mlTrain').textContent = (w !== undefined && (Math.abs(w - TRUE_W) < 0.02 && Math.abs(b - TRUE_B) < 0.05)) ? 'Trained ✓' : 'Train';
    }

    $('mlTrain').addEventListener('click', () => (running ? stop() : start()));
    $('mlStep').addEventListener('click', () => { if (diverged) return; stop(); for (let k = 0; k < 5; k++) stepOnce(); record(); draw(); });
    $('mlReset').addEventListener('click', reset);
    $('mlLr').addEventListener('input', () => { $('mlLrVal').textContent = lr().toFixed(3); });

    let opened = false;
    function open() {
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        $('mlLrVal').textContent = lr().toFixed(3);
        if (!opened) { reset(); opened = true; }
        requestAnimationFrame(draw);
    }
    dialog.addEventListener('close', () => { stop(); document.body.style.overflow = ''; });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    addEventListener('resize', () => { if (dialog.open) draw(); });
    const btn = document.getElementById('openMl');
    if (btn) btn.addEventListener('click', open);

    window.site = Object.assign(window.site || {}, { openMl: open });
})();
