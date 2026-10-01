/* Course "tech tree": a semester-by-semester graph of what built on what. */
(() => {
    'use strict';

    const TERMS = ['Before A&M', "Fall '24", "Spring '25", "Summer '25", "Fall '25", "Spring '26", "Fall '26"];

    // term = index into TERMS. Links describe how material builds, not official prereqs.
    const COURSES = [
        { id: '110', code: 'CSCE 110', name: 'Programming I', term: 0, track: 'core', exam: true, note: 'Credit by exam. I now TA this course.' },
        { id: 'calc', code: 'MATH 151–152', name: 'Calculus I & II', term: 0, track: 'math', exam: true },

        { id: '222', code: 'CSCE 222', name: 'Discrete Structures', term: 1, track: 'core', note: 'Proofs, logic and counting, the math side of CS.' },
        { id: '251', code: 'MATH 251', name: 'Multivariable Calculus', term: 1, track: 'math' },

        { id: '120', code: 'CSCE 120', name: 'Program Design & Concepts', term: 2, track: 'core', note: 'C++ fundamentals. I now TA this course too.' },
        { id: '304', code: 'MATH 304', name: 'Linear Algebra', term: 2, track: 'math' },
        { id: '308', code: 'MATH 308', name: 'Differential Equations', term: 2, track: 'math' },
        { id: '211', code: 'STAT 211', name: 'Principles of Statistics', term: 2, track: 'math' },

        // Order within each term is tuned top-to-bottom to keep edges from crossing:
        // core trunk on top, systems in the middle, security along the bottom.
        { id: '221', code: 'CSCE 221', name: 'Data Structures & Algorithms', term: 3, track: 'core', note: 'The trunk of the tree. Most later courses branch from here.' },
        { id: '314', code: 'CSCE 314', name: 'Programming Languages', term: 3, track: 'core' },
        { id: '312', code: 'CSCE 312', name: 'Computer Organization', term: 3, track: 'systems', note: 'Where I built the Hack computer, from NAND gates up.' },

        { id: '331', code: 'CSCE 331', name: 'Foundations of Software Engineering', term: 4, track: 'core' },
        { id: '411', code: 'CSCE 411', name: 'Design & Analysis of Algorithms', term: 4, track: 'core' },
        { id: '313', code: 'CSCE 313', name: 'Intro to Computer Systems', term: 4, track: 'systems', note: 'Processes, threads, IPC and networking in C++.' },
        { id: '470', code: 'MATH 470', name: 'Communications & Cryptography I', term: 4, track: 'security', note: 'The number theory behind RSA, the same term I implemented it.' },

        { id: '430', code: 'CSCE 430', name: 'Problem Solving Strategies', term: 5, track: 'core', note: 'Competitive-programming-style algorithmic problem solving.' },
        { id: '410', code: 'CSCE 410', name: 'Operating Systems', term: 5, track: 'systems' },
        { id: '449', code: 'CSCE 449', name: 'Applied Cryptography', term: 5, track: 'security' },
        { id: '471', code: 'MATH 471', name: 'Communications & Cryptography II', term: 5, track: 'security' },
        { id: '402', code: 'CSCE 402', name: 'Cybersecurity Law & Policy', term: 5, track: 'security', note: 'The legal and policy side of security work.' },

        { id: '464', code: 'CSCE 464', name: 'Wireless & Mobile Systems', term: 6, track: 'systems', wip: true },
        { id: '652', code: 'CSCE 652', name: 'Software Reverse Engineering', term: 6, track: 'security', wip: true, grad: true, note: 'A graduate course, taken as an undergrad.' },
    ];

    const LINKS = [
        ['110', '120'], ['120', '221'], ['222', '221'],
        ['221', '312'], ['221', '314'], ['221', '313'], ['312', '313'], ['221', '331'],
        ['221', '411'], ['222', '411'], ['222', '470'], ['304', '470'],
        ['313', '410'], ['411', '430'], ['470', '449'], ['313', '449'], ['470', '471'],
        ['313', '464'], ['410', '652'], ['312', '652'],
        ['calc', '251'], ['calc', '304'], ['calc', '211'], ['251', '308'],
    ];

    const tree = document.getElementById('tree');
    if (!tree) return;
    const svg = document.getElementById('treeEdges');
    const nodesEl = document.getElementById('treeNodes');
    const colsEl = document.getElementById('treeCols');
    const info = document.getElementById('treeInfo');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const byId = Object.fromEntries(COURSES.map((c) => [c.id, c]));
    const parents = {}, children = {};
    COURSES.forEach((c) => { parents[c.id] = []; children[c.id] = []; });
    LINKS.forEach(([a, b]) => { children[a].push(b); parents[b].push(a); });

    // Build node buttons once
    const nodeEls = {};
    COURSES.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tree-node' + (c.wip ? ' wip' : '');
        b.dataset.track = c.track;
        b.dataset.id = c.id;
        b.setAttribute('role', 'listitem');
        b.setAttribute('aria-label', `${c.code}, ${c.name}, ${TERMS[c.term]}${c.wip ? ', in progress' : ''}`);
        b.innerHTML = `<span class="code">${c.code}${c.grad ? ' <b class="grad-badge">GRAD</b>' : ''}</span><span class="name">${c.name}</span>`;
        b.style.setProperty('--delay', `${0.15 + c.term * 0.1}s`);
        nodesEl.appendChild(b);
        nodeEls[c.id] = b;
    });

    const walk = (id, map, out = new Set()) => {
        map[id].forEach((n) => { if (!out.has(n)) { out.add(n); walk(n, map, out); } });
        return out;
    };

    let edgeEls = [];
    let pinned = null;

    function layout() {
        const W = tree.clientWidth;
        const horizontal = W >= 900;
        const gap = 12;
        colsEl.innerHTML = '';
        colsEl.classList.toggle('rows', !horizontal);
        const pos = {};

        if (horizontal) {
            const padX = 18, top = 52;
            const colW = (W - padX * 2) / TERMS.length;
            const nw = Math.min(168, colW - 20);
            tree.style.setProperty('--nw', `${nw}px`);
            // measure after width is known
            const heights = {};
            COURSES.forEach((c) => { heights[c.id] = nodeEls[c.id].offsetHeight; });
            const cols = TERMS.map((_, i) => COURSES.filter((c) => c.term === i));
            const colH = cols.map((col) => col.reduce((s, c) => s + heights[c.id], 0) + gap * Math.max(0, col.length - 1));
            const maxH = Math.max(...colH);
            cols.forEach((col, i) => {
                const x = padX + i * colW + (colW - nw) / 2;
                let y = top + (maxH - colH[i]) / 2;
                col.forEach((c) => {
                    pos[c.id] = { x, y, w: nw, h: heights[c.id] };
                    y += heights[c.id] + gap;
                });
                const label = document.createElement('span');
                label.textContent = TERMS[i];
                label.style.left = `${padX + i * colW + colW / 2}px`;
                label.style.top = '20px';
                colsEl.appendChild(label);
                if (i > 0) {
                    const rule = document.createElement('i');
                    rule.style.left = `${padX + i * colW}px`;
                    rule.style.top = '18px';
                    rule.style.bottom = '18px';
                    colsEl.appendChild(rule);
                }
            });
            tree.style.height = `${top + maxH + 28}px`;
        } else {
            const padX = 16, minW = 138;
            const perLine = Math.max(1, Math.floor((W - padX * 2 + gap) / (minW + gap)));
            const nw = (W - padX * 2 - gap * (perLine - 1)) / perLine;
            tree.style.setProperty('--nw', `${nw}px`);
            let y = 18;
            TERMS.forEach((term, i) => {
                const col = COURSES.filter((c) => c.term === i);
                if (i > 0) {
                    const rule = document.createElement('i');
                    rule.style.left = `${padX}px`; rule.style.right = `${padX}px`; rule.style.top = `${y - 14}px`;
                    colsEl.appendChild(rule);
                }
                const label = document.createElement('span');
                label.textContent = term;
                label.style.left = `${padX}px`;
                label.style.top = `${y}px`;
                colsEl.appendChild(label);
                y += 26;
                for (let k = 0; k < col.length; k += perLine) {
                    const line = col.slice(k, k + perLine);
                    const lineH = Math.max(...line.map((c) => nodeEls[c.id].offsetHeight));
                    line.forEach((c, j) => {
                        pos[c.id] = { x: padX + j * (nw + gap), y, w: nw, h: nodeEls[c.id].offsetHeight };
                    });
                    y += lineH + gap;
                }
                y += 22;
            });
            tree.style.height = `${y}px`;
        }

        COURSES.forEach((c) => {
            const p = pos[c.id];
            nodeEls[c.id].style.left = `${p.x}px`;
            nodeEls[c.id].style.top = `${p.y}px`;
        });

        // Edges
        svg.innerHTML = '';
        edgeEls = LINKS.map(([a, b]) => {
            const pa = pos[a], pb = pos[b];
            let d;
            if (horizontal) {
                const x1 = pa.x + pa.w, y1 = pa.y + pa.h / 2, x2 = pb.x, y2 = pb.y + pb.h / 2;
                const dx = Math.max(30, (x2 - x1) * 0.5);
                d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
            } else {
                const x1 = pa.x + pa.w / 2, y1 = pa.y + pa.h, x2 = pb.x + pb.w / 2, y2 = pb.y;
                const dy = Math.max(24, (y2 - y1) * 0.5);
                d = `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
            }
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.dataset.track = byId[b].track;
            svg.appendChild(path);
            const len = Math.ceil(path.getTotalLength());
            path.style.setProperty('--len', len);
            path.style.setProperty('--delay', `${0.25 + byId[a].term * 0.12}s`);
            return { a, b, path };
        });
        if (pinned) focus(pinned);
    }

    function focus(id) {
        const up = walk(id, parents);
        const down = walk(id, children);
        const lineage = new Set([id, ...up, ...down]);
        tree.classList.add('focus');
        COURSES.forEach((c) => {
            nodeEls[c.id].classList.toggle('lit', lineage.has(c.id));
            nodeEls[c.id].classList.toggle('active', c.id === id);
        });
        const upSet = new Set([id, ...up]), downSet = new Set([id, ...down]);
        edgeEls.forEach(({ a, b, path }) => {
            path.classList.toggle('lit', (upSet.has(a) && upSet.has(b)) || (downSet.has(a) && downSet.has(b)));
        });
        showInfo(byId[id]);
    }

    function clear() {
        tree.classList.remove('focus');
        COURSES.forEach((c) => nodeEls[c.id].classList.remove('lit', 'active'));
        edgeEls.forEach(({ path }) => path.classList.remove('lit'));
        info.dataset.track = '';
        info.innerHTML = '<p class="mono muted">Select a course to see details.</p>';
    }

    function showInfo(c) {
        const status = c.wip ? 'In progress · Fall 2026' : c.exam ? 'Credit by exam' : `Grade: A · ${TERMS[c.term]}`;
        const names = (ids) => ids.map((i) => byId[i].code).join(', ') || '—';
        info.dataset.track = c.track;
        info.innerHTML = `
            <div class="ti-top"><span class="ti-code">${c.code}${c.grad ? ' · GRADUATE' : ''}</span><span class="mono muted">${status}</span></div>
            <h4>${c.name}</h4>
            ${c.note ? `<p class="ti-note">${c.note}</p>` : '<p class="ti-note"></p>'}
            <div class="ti-links"><span><b>Builds on:</b> ${names(parents[c.id])}</span><span><b>Led to:</b> ${names(children[c.id])}</span></div>`;
    }

    nodesEl.addEventListener('pointerover', (e) => {
        const n = e.target.closest('.tree-node');
        if (n && e.pointerType === 'mouse' && !pinned) focus(n.dataset.id);
    });
    nodesEl.addEventListener('focusin', (e) => {
        const n = e.target.closest('.tree-node');
        if (n && !pinned) focus(n.dataset.id);
    });
    tree.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned) clear(); });
    nodesEl.addEventListener('focusout', () => {
        setTimeout(() => { if (!pinned && !tree.contains(document.activeElement) && !tree.matches(':hover')) clear(); });
    });
    nodesEl.addEventListener('click', (e) => {
        const n = e.target.closest('.tree-node');
        if (!n) return;
        if (pinned === n.dataset.id) { pinned = null; clear(); return; }
        pinned = n.dataset.id;
        focus(pinned);
    });
    // Clicking empty space in the tree releases a pinned course
    tree.addEventListener('click', (e) => {
        if (!e.target.closest('.tree-node') && pinned) { pinned = null; clear(); }
    });

    const init = () => {
        layout();
        new IntersectionObserver(([e], obs) => {
            if (!e.isIntersecting) return;
            tree.classList.add('drawn');
            obs.disconnect();
            setTimeout(() => tree.classList.add('settled'), reduced ? 0 : 2600);
        }, { threshold: 0.2 }).observe(tree);
    };
    // Wait for fonts so node heights are measured with the real typeface
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);

    let resizeTimer;
    let lastW = 0;
    addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (tree.clientWidth !== lastW) { lastW = tree.clientWidth; layout(); }
        }, 150);
    });
})();
