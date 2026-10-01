/* Security demo: a defensive explainer for two camera-system findings.
   It visualises why cleartext transport leaks on an untrusted LAN and what
   encryption changes. No attack steps or payloads — concept and fix only. */
(() => {
    'use strict';

    const dialog = document.getElementById('secDialog');
    if (!dialog) return;
    const $ = (id) => document.getElementById(id);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const FINDINGS = {
        stream: {
            title: 'Unencrypted video stream (RTSP / RTP)',
            right: 'viewer',
            glyph: '▶', // ▶ media
            verdict: { bad: 'Exposed — the video is readable off the wire', ok: 'Protected — captured packets are just ciphertext' },
            capture: {
                bad: 'Raw RTP media packets. Put back in order they rebuild the H.265 video directly — no password needed, because the stream itself was never encrypted.',
                ok: 'Encrypted RTP. The attacker still receives the packets, but without the session keys the bytes never reassemble into anything watchable.',
            },
            why: 'A password only controls who may <i>start</i> a stream. It does nothing for a stream already flowing in the clear, so anyone who can see LAN traffic can watch whatever the camera sees.',
            fix: 'Carry the media over SRTP and the signaling over RTSPS (RTSP wrapped in TLS), or tunnel everything through a VPN. Then an on-path capture is just noise.',
        },
        cookie: {
            title: 'Plaintext session cookie (HTTP admin portal)',
            right: 'admin',
            glyph: '⌘', // ⌘ -> stands in for a session token
            verdict: { bad: 'Exposed — the session cookie rides in the clear', ok: 'Protected — the header is encrypted in transit' },
            capture: {
                bad: 'The session cookie, sitting in a plain-HTTP header. Whoever holds that value is treated as the logged-in admin, because the server trusts the cookie, not the person.',
                ok: 'Only TLS ciphertext. The cookie never appears on the wire, so there is nothing to lift and nothing to replay.',
            },
            why: 'A borrowed session can drive the admin API. This system exposes a reboot endpoint, so a single leaked cookie can take every camera offline — a denial of service — without ever learning the password.',
            fix: 'Serve the portal over HTTPS, mark cookies Secure + HttpOnly, keep digest (challenge–response) auth instead of basic, and bind each session tightly. Now there is no readable cookie to begin with.',
        },
    };

    let finding = 'stream';
    let encrypted = false;

    const svg = $('secSvg');
    const packet = $('secPacket'), copy = $('secCopy');

    function syncText() {
        const f = FINDINGS[finding];
        $('secRtTitle').textContent = f.title;
        $('secRightLabel').textContent = f.right;
        $('secRtVerdict').textContent = encrypted ? f.verdict.ok : f.verdict.bad;
        $('secRtVerdict').className = 'sec-rt-verdict mono ' + (encrypted ? 'ok' : 'bad');
        $('secRtCapture').innerHTML = encrypted ? f.capture.ok : f.capture.bad;
        $('secRtWhy').innerHTML = f.why;
        $('secRtFix').innerHTML = f.fix;
        const glyph = encrypted ? '🔒' : f.glyph; // 🔒 when encrypted
        $('secPacketGlyph').textContent = glyph;
        $('secCopyGlyph').textContent = glyph;
        svg.classList.toggle('encrypted', encrypted);
        $('secSwitchLabel').textContent = encrypted ? 'encrypted' : 'cleartext';
        $('secSwitch').setAttribute('aria-checked', String(encrypted));
    }

    // Geometry of the straight wires in the SVG
    const M = { x0: 86, x1: 354, y: 70 };
    const T = { x: 220, y0: 70, y1: 196 };

    let p = 0, raf = null;
    function placeStatic() {
        const mid = 0.5;
        packet.setAttribute('transform', `translate(${M.x0 + (M.x1 - M.x0) * mid},${M.y})`);
        copy.setAttribute('transform', `translate(${T.x},${T.y1})`);
        copy.style.opacity = '1';
    }
    function frame() {
        p += 0.0045; if (p > 1) p -= 1;
        const x = M.x0 + (M.x1 - M.x0) * p;
        packet.setAttribute('transform', `translate(${x},${M.y})`);
        if (p >= 0.5) {
            const cp = (p - 0.5) / 0.5;
            copy.setAttribute('transform', `translate(${T.x},${T.y0 + (T.y1 - T.y0) * cp})`);
            copy.style.opacity = String(0.25 + 0.75 * (1 - Math.abs(cp - 0.5) * 2) + 0.4);
        } else {
            copy.style.opacity = '0';
        }
        raf = requestAnimationFrame(frame);
    }
    function startAnim() {
        if (reduced) { placeStatic(); return; }
        if (!raf) raf = requestAnimationFrame(frame);
    }
    function stopAnim() { if (raf) cancelAnimationFrame(raf), raf = null; }

    $('secTabs').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-finding]');
        if (!btn) return;
        finding = btn.dataset.finding;
        [...$('secTabs').children].forEach((c) => c.classList.toggle('active', c === btn));
        syncText();
    });
    $('secSwitch').addEventListener('click', () => { encrypted = !encrypted; syncText(); });

    function open() {
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        syncText();
        startAnim();
    }
    dialog.addEventListener('close', () => { stopAnim(); document.body.style.overflow = ''; });
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    const btn = document.getElementById('openSec');
    if (btn) btn.addEventListener('click', open);

    window.site = Object.assign(window.site || {}, { openSec: open });
})();
