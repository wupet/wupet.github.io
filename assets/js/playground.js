/* RSA playground: pick primes, watch key generation, encryption and decryption. */
(() => {
    'use strict';

    const dialog = document.getElementById('rsaDialog');
    if (!dialog) return;
    const $ = (id) => document.getElementById(id);
    const pIn = $('pgP'), qIn = $('pgQ'), msgIn = $('pgMsg'), steps = $('pgSteps');
    const MIN = 11n, MAX = 1000000n;
    const BASES = [2n, 3n, 5n, 7n, 11n, 13n, 17n]; // deterministic for n < 3.4e14

    function modPow(b, e, m) {
        let r = 1n;
        b %= m;
        while (e > 0n) {
            if (e & 1n) r = (r * b) % m;
            b = (b * b) % m;
            e >>= 1n;
        }
        return r;
    }

    function millerRabin(n) {
        if (n < 2n) return false;
        for (const p of BASES) {
            if (n === p) return true;
            if (n % p === 0n) return false;
        }
        let d = n - 1n, s = 0;
        while ((d & 1n) === 0n) { d >>= 1n; s++; }
        outer: for (const a of BASES) {
            let x = modPow(a, d, n);
            if (x === 1n || x === n - 1n) continue;
            for (let i = 1; i < s; i++) {
                x = (x * x) % n;
                if (x === n - 1n) continue outer;
            }
            return false;
        }
        return true;
    }

    const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
    const fmt = (n) => n.toLocaleString('en-US');

    // Break n - 1 = 2^s · d and run the Miller–Rabin witnesses, keeping the trace
    function mrDetail(n) {
        let d = n - 1n, s = 0;
        while ((d & 1n) === 0n) { d >>= 1n; s++; }
        const checks = BASES.filter((a) => a < n).slice(0, 5).map((a) => {
            let x = modPow(a, d, n);
            let pass = (x === 1n || x === n - 1n);
            if (!pass) for (let i = 1; i < s; i++) { x = (x * x) % n; if (x === n - 1n) { pass = true; break; } }
            return { a, pass };
        });
        return { s, d, checks };
    }

    // Search upward from a random odd seed, logging every rejected candidate
    function generatePrimeTrace(lo, hi) {
        let c = (BigInt(lo + Math.floor(Math.random() * (hi - lo))) | 1n);
        const tried = [];
        while (!millerRabin(c)) {
            const f = smallFactor(c);
            tried.push({ c, reason: f ? `${fmt(f)} × ${fmt(c / f)}` : 'fails Miller–Rabin' });
            c += 2n;
            if (tried.length > 60) break;
        }
        return { prime: c, tried };
    }

    let genTrace = null; // {p, q} traces from the last "Generate primes" click, or null for manual entry

    function renderGen(tr, name, prime) {
        const n = tr.tried.length;
        const sample = tr.tried.slice(-3);
        return `<p class="eq">${name} = <b>${fmt(prime)}</b></p>
            <p class="why">Started at a random odd number and stepped up, rejecting ${n} composite${n === 1 ? '' : 's'} before this one passed.</p>
            <div class="gen-trace mono">${sample.map((t) => `<span class="rej">${fmt(t.c)} &mdash; ${t.reason}</span>`).join('')}<span class="acc-ok">${fmt(prime)} &mdash; prime &#10003;</span></div>`;
    }

    function renderWitness(prime) {
        const { s, d, checks } = mrDetail(prime);
        return `<p class="why">Miller–Rabin on ${fmt(prime)}: write ${fmt(prime)} − 1 = 2<sup>${s}</sup> · ${fmt(d)}, then test a few bases. A prime passes every one.</p>
            <div class="gen-trace mono">${checks.map((c) => `<span class="${c.pass ? 'acc-ok' : 'rej'}">a = ${c.a}: ${c.pass ? 'passes' : 'witness &mdash; composite'}</span>`).join('')}</div>`;
    }

    function smallFactor(n) {
        for (let k = 2n; k * k <= n && k < 5000n; k++) if (n % k === 0n) return k;
        return null;
    }

    function check(input, statusEl) {
        const raw = input.value.trim();
        let msg = '', ok = false, value = null;
        if (!/^\d+$/.test(raw)) msg = 'numbers only';
        else {
            value = BigInt(raw);
            if (value < MIN) msg = 'use ≥ 11';
            else if (value > MAX) msg = 'keep ≤ 10⁶';
            else if (!millerRabin(value)) {
                const f = smallFactor(value);
                msg = f ? `= ${f} × ${value / f}` : 'not prime';
            } else { ok = true; msg = '✓ prime'; }
        }
        statusEl.textContent = msg;
        statusEl.className = 'field-status mono ' + (ok ? 'ok' : 'bad');
        input.classList.toggle('bad', !ok);
        return ok ? value : null;
    }

    const liveCheck = () => { check(pIn, $('pgPStatus')); check(qIn, $('pgQStatus')); };
    [pIn, qIn].forEach((el) => el.addEventListener('input', () => { genTrace = null; liveCheck(); }));

    function extEuclid(phi, e) {
        const rows = [];
        let [r0, r1] = [phi, e];
        let [t0, t1] = [0n, 1n];
        while (r1 !== 0n) {
            const q = r0 / r1;
            rows.push({ q, r: r1, t: t1 });
            [r0, r1] = [r1, r0 - q * r1];
            [t0, t1] = [t1, t0 - q * t1];
        }
        return { d: ((t0 % phi) + phi) % phi, rows };
    }

    function step(i, title, body, cls = '') {
        const li = document.createElement('li');
        li.className = 'rsa-step ' + cls;
        li.style.setProperty('--delay', `${i * 0.22}s`);
        li.innerHTML = `<h3>${title}</h3>${body}`;
        steps.appendChild(li);
        return li;
    }

    function run() {
        steps.innerHTML = '';
        const p = check(pIn, $('pgPStatus'));
        const q = check(qIn, $('pgQStatus'));
        if (!p || !q) {
            step(0, 'Pick two primes', '<p class="why">Both p and q need to be primes between 11 and 1,000,000.</p>', 'err');
            return;
        }
        if (p === q) {
            step(0, 'Pick two different primes', '<p class="why">If p = q then n = p², and anyone can take the square root to recover p.</p>', 'err');
            return;
        }
        const n = p * q;
        const phi = (p - 1n) * (q - 1n);
        const e = [65537n, 257n, 17n, 5n, 3n].find((c) => c < phi && gcd(c, phi) === 1n)
            || (() => { let c = 3n; while (gcd(c, phi) !== 1n) c += 2n; return c; })();
        const { d, rows } = extEuclid(phi, e);

        const msg = msgIn.value || 'hi';
        const chars = [...msg];
        const codes = chars.map((c) => BigInt(c.codePointAt(0)));
        const tooBig = codes.find((m) => m >= n);

        let i = 0;
        if (genTrace) {
            step(i++, 'Generate two secret primes',
                `${renderGen(genTrace.p, 'p', p)}${renderGen(genTrace.q, 'q', q)}${renderWitness(p)}
                 <p class="why">Real keys use primes over 300 digits long; the search is the same, just slower.</p>`);
        } else {
            step(i++, 'Choose two secret primes',
                `<p class="eq">p = <b>${fmt(p)}</b> &nbsp; q = <b>${fmt(q)}</b></p>
                 ${renderWitness(p)}
                 <p class="why">Both are confirmed prime the same way my C++ build generates them. Real keys use primes over 300 digits long.</p>`);
        }
        step(i++, 'Compute the public modulus',
            `<p class="eq">n = p · q = ${fmt(p)} · ${fmt(q)} = <b>${fmt(n)}</b></p>
             <p class="why">Everyone sees n. RSA's security rests on how hard it is to factor n back into p and q.</p>`);
        step(i++, 'Compute Euler’s totient',
            `<p class="eq">φ(n) = (p − 1)(q − 1) = ${fmt(p - 1n)} · ${fmt(q - 1n)} = <b>${fmt(phi)}</b></p>
             <p class="why">It counts the numbers below n that share no factor with n. You can only compute it if you know p and q.</p>`);
        step(i++, 'Pick the public exponent',
            `<p class="eq">e = <b>${fmt(e)}</b> &nbsp;·&nbsp; gcd(${fmt(e)}, ${fmt(phi)}) = 1 ✓</p>
             <p class="why">e must be coprime to φ(n) so that it has an inverse. 65537 is the usual choice, and smaller values stand in when φ(n) is small.</p>`);
        const shown = rows.slice(0, 10);
        step(i++, 'Solve for the private exponent',
            `<p class="eq">d = e⁻¹ mod φ(n) = <b>${fmt(d)}</b> &nbsp;·&nbsp; (${fmt(e)} · ${fmt(d)}) mod ${fmt(phi)} = ${fmt((e * d) % phi)} ✓</p>
             <p class="why">Found with the extended Euclidean algorithm:</p>
             <div class="table-scroll"><table><tr><th>quotient</th><th>remainder</th><th>coefficient</th></tr>
             ${shown.map((r) => `<tr><td>${fmt(r.q)}</td><td>${fmt(r.r)}</td><td>${fmt(r.t)}</td></tr>`).join('')}
             ${rows.length > shown.length ? `<tr><td colspan="3">… ${rows.length - shown.length} more</td></tr>` : ''}</table></div>`);
        step(i++, 'Publish the public key, guard the private key',
            `<p class="eq">public (n, e) = (<b>${fmt(n)}</b>, <b>${fmt(e)}</b>) &nbsp;·&nbsp; private d = <b>${fmt(d)}</b></p>
             <p class="why">p, q and φ(n) can now be thrown away. Anyone holding them can rebuild d.</p>`);

        if (tooBig !== undefined) {
            step(i++, 'Message too large for this key',
                `<p class="why">A character’s code (${fmt(tooBig)}) is at least n. Pick bigger primes or use plain ASCII.</p>`, 'err');
            return;
        }
        const cipher = codes.map((m) => modPow(m, e, n));
        const plain = cipher.map((c) => modPow(c, d, n));
        const back = String.fromCodePoint(...plain.map(Number));
        const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
        step(i++, 'Encrypt: c = mᵉ mod n',
            `<div class="blocks">${chars.map((ch, k) => `<span><small>'${esc(ch)}' = ${codes[k]}</small>${fmt(cipher[k])}</span>`).join('')}</div>
             <p class="why">Each character is encrypted separately. That's fine for a demo, but real RSA pads the whole message, because textbook RSA is deterministic and leaks patterns.</p>`);
        step(i++, 'Decrypt: m = cᵈ mod n',
            `<div class="blocks">${cipher.map((c, k) => `<span><small>${fmt(c)} →</small>${plain[k]}</span>`).join('')}</div>
             <p class="eq">recovered: <b>"${esc(back)}"</b> ${back === msg ? '✓' : '✗'}</p>`, back === msg ? 'ok' : 'err');
    }

    $('pgRun').addEventListener('click', run);
    $('pgGen').addEventListener('click', () => {
        const tp = generatePrimeTrace(100, 60000);
        let tq;
        do { tq = generatePrimeTrace(100, 60000); } while (tq.prime === tp.prime);
        genTrace = { p: tp, q: tq };
        pIn.value = tp.prime; qIn.value = tq.prime;
        liveCheck();
        run();
    });
    [pIn, qIn, msgIn].forEach((el) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }));

    let ran = false;
    function open() {
        dialog.showModal();
        if (!ran) { run(); ran = true; }
        document.body.style.overflow = 'hidden';
    }
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    const btn = document.getElementById('openRsa');
    if (btn) btn.addEventListener('click', open);

    window.site = Object.assign(window.site || {}, { openRsa: open });
})();
