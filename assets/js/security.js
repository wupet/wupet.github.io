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
            title: 'Replayable session token → forced reboot (DoS)',
            right: 'operator',
            glyph: '#', // the per-session number
            verdict: { bad: 'Exposed — the session token is a bearer password in the clear', ok: 'Protected — the token is encrypted and bound to the session' },
            capture: {
                bad: 'At login the system hands back a unique session number, and that number <i>is</i> the password for every request after it. Copy it off the wire and you can act as that logged-in session — no username, no password needed.',
                ok: 'Only TLS ciphertext. The session number never crosses the wire in the clear, so there is nothing to copy and nothing to replay.',
            },
            why: 'Replaying the token against the system’s API triggers a force-reset: the camera reboots, drops offline for about a minute, and the real user is logged out. Do it again on each new login and the system never stays up — a denial of service that never needs the real password.',
            fix: 'Serve the portal over HTTPS so the token is never exposed, bind each session to more than a bearer number (client fingerprint + short expiry), and require a fresh challenge on state-changing calls like reboot instead of trusting the token alone.',
        },
    };

    let finding = 'stream';
    let encrypted = false;

    const svg = $('secSvg');
    const packet = $('secPacket'), copy = $('secCopy'), reset = $('secReset');

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
        svg.classList.remove('cam-down'); // clear transient reset state on any change
        reset.style.opacity = '0';
        $('secSwitchLabel').textContent = encrypted ? 'encrypted' : 'cleartext';
        $('secSwitch').setAttribute('aria-checked', String(encrypted));
        p = 0;
    }

    // Geometry of the straight wires / nodes in the SVG
    const M = { x0: 86, x1: 354, y: 70 };          // main wire, camera(left) .. right node
    const T = { x: 220, y0: 70, y1: 196 };          // tap down to the attacker
    const A = { x: 220, y: 196 };                    // attacker end of the tap
    const CAM = { x: 60, y: 66 };                    // camera / system node
    const lerp = (a, b, t) => a + (b - a) * t;

    let p = 0, raf = null;

    function placeStatic() {
        packet.setAttribute('transform', `translate(${(M.x0 + M.x1) / 2},${M.y})`);
        copy.setAttribute('transform', `translate(${A.x},${A.y})`);
        copy.style.opacity = '1';
        reset.style.opacity = '0';
    }

    // Finding 1: media flows camera -> viewer; attacker copies a packet down the tap
    function frameStream() {
        const x = lerp(M.x0, M.x1, p);
        packet.setAttribute('transform', `translate(${x},${M.y})`);
        if (p >= 0.5) {
            const cp = (p - 0.5) / 0.5;
            copy.setAttribute('transform', `translate(${T.x},${lerp(T.y0, T.y1, cp)})`);
            copy.style.opacity = String(0.4 + (1 - Math.abs(cp - 0.5) * 2) * 0.6);
        } else { copy.style.opacity = '0'; }
        reset.style.opacity = '0';
    }

    // Finding 2: login token travels operator -> system; attacker copies it, then
    // replays it as a reset, knocking the camera offline. Encryption blocks the replay.
    function frameReset() {
        // phase 1: token operator(right) -> system(left), attacker taps a copy
        if (p < 0.42) {
            const t = p / 0.42;
            packet.setAttribute('transform', `translate(${lerp(M.x1, M.x0, t)},${M.y})`);
            packet.style.opacity = '1';
            copy.style.opacity = t > 0.5 ? String((t - 0.5) / 0.5) : '0';
            copy.setAttribute('transform', `translate(${T.x},${lerp(T.y0, T.y1, Math.max(0, (t - 0.5) / 0.5))})`);
            reset.style.opacity = '0';
            svg.classList.remove('cam-down');
            return;
        }
        packet.style.opacity = '0';
        copy.setAttribute('transform', `translate(${A.x},${A.y})`);
        copy.style.opacity = '1';
        if (encrypted) {
            // captured token is ciphertext — the replay never fires, camera stays up
            reset.style.opacity = '0';
            svg.classList.remove('cam-down');
            return;
        }
        // phase 2: attacker replays a reset toward the system
        if (p < 0.64) {
            const t = (p - 0.42) / 0.22;
            reset.setAttribute('transform', `translate(${lerp(A.x, CAM.x, t)},${lerp(A.y, CAM.y, t)})`);
            reset.style.opacity = '1';
            svg.classList.remove('cam-down');
        } else { // phase 3: camera reboots, offline for ~a minute
            reset.style.opacity = '0';
            svg.classList.add('cam-down');
        }
    }

    function frame() {
        p += 0.0042; if (p > 1) p -= 1;
        (finding === 'cookie' ? frameReset : frameStream)();
        raf = requestAnimationFrame(frame);
    }
    function startAnim() {
        if (reduced) { placeStatic(); return; }
        if (!raf) raf = requestAnimationFrame(frame);
    }
    function stopAnim() { if (raf) cancelAnimationFrame(raf), raf = null; svg.classList.remove('cam-down'); }

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
