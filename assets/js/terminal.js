/* Terminal easter egg: press ` to open. */
(() => {
    'use strict';

    const term = document.getElementById('terminal');
    if (!term) return;
    const out = document.getElementById('termOut');
    const body = document.getElementById('termBody');
    const form = document.getElementById('termForm');
    const input = document.getElementById('termInput');
    const site = () => window.site || {};

    const LINKS = {
        github: 'https://github.com/wupet',
        linkedin: 'https://www.linkedin.com/in/peterwutamu/',
        cv: 'Wu_Peter_CV.pdf',
    };
    const SECTIONS = ['about', 'experience', 'work', 'service', 'contact'];
    const history = [];
    let histIdx = 0;
    let greeted = false;

    function line(text = '', cls = '') {
        const div = document.createElement('div');
        if (cls) div.className = cls;
        div.textContent = text;
        out.appendChild(div);
        return div;
    }
    function link(label, href) {
        const div = document.createElement('div');
        const a = document.createElement('a');
        a.href = href; a.textContent = label; a.target = '_blank'; a.rel = 'noopener';
        div.append('  ', a);
        out.appendChild(div);
    }
    const lines = (arr, cls) => arr.forEach((t) => line(t, cls));

    const COMMANDS = {
        help() {
            lines([
                'available commands:',
                '  about        who is peter?',
                '  ls [dir]     list files',
                '  cat <file>   read a file (try cat cv.txt)',
                '  projects     selected work',
                '  experience   research, industry, teaching',
                '  skills       tools and languages',
                '  courses      the tech tree, summarized',
                '  cd <section> jump to a section of the site',
                '  open <x>     github | linkedin | cv | rsa',
                '  email        copy my email',
                '  theme [x]    light | dark | toggle',
                '  neofetch     system info',
                '  clear, history, exit',
            ]);
            line('psst: there may be a sudo command worth trying.', 'dim');
        },
        whoami() {
            line('guest');
            line('(you were probably looking for peter. try `about`)', 'dim');
        },
        about() {
            lines([
                'Peter W. Wu: computer science @ Texas A&M, class of 2027 (in three years).',
                'Minors in mathematics and cybersecurity. 4.00 GPA.',
                'Undergraduate researcher at the SUCCESS Lab, measuring what AI agents',
                'can actually do in cybersecurity. TA for CSCE 110 and 120.',
            ]);
        },
        ls(args) {
            const dir = (args[0] || '').replace(/\/$/, '');
            if (!dir || dir === '~' || dir === '.') line('about.txt  contact.txt  cv.txt  projects/  experience/  courses/', 'acc');
            else if (dir === 'projects') line('rsa/  security/  ml/  horus/  hack-computer/  battleship-ai/  chess/', 'acc');
            else if (dir === 'experience') line('success-lab.md  netvine.md  teaching-assistant.md  tutoring.md', 'acc');
            else if (dir === 'courses') line('22 courses · run `courses` for the summary', 'acc');
            else line(`ls: cannot access '${dir}': No such file or directory`, 'warn');
        },
        cat(args) {
            const f = args[0] || '';
            if (f === 'about.txt') return COMMANDS.about();
            if (f === 'contact.txt') return COMMANDS.contact();
            if (f === 'cv.txt' || f === 'cv') {
                lines([
                    'PETER W. WU',
                    '',
                    'EDUCATION   Texas A&M · B.S. Computer Science · minors Math, Cybersecurity',
                    '            GPA 4.00 · Brown Engineering Honors · Cyber Operations Certificate',
                    'RESEARCH    SUCCESS Lab (Dr. Guofei Gu) · AI agents in cybersecurity',
                    'INDUSTRY    Netvine Technologies · IoT security + computer vision intern',
                    'TEACHING    Undergraduate TA, CSCE 110/120 · independent tutor since 2020',
                    'PROJECTS    RSA from scratch (C++/GMP) · Horus (Python, Claude API) · Hack computer',
                ]);
                line('full pdf:', 'dim'); link('Wu_Peter_CV.pdf', LINKS.cv);
                return;
            }
            if (!f) return line('cat: missing file operand', 'warn');
            if (f.endsWith('/')) return line(`cat: ${f}: Is a directory`, 'warn');
            line(`cat: ${f}: No such file or directory`, 'warn');
        },
        projects() {
            lines([
                'rsa/            RSA cryptosystem from first principles · C++, GMP · Fall 2025',
                'security/       camera-system security review, 2 findings · Wireshark, Python · 2025',
                'ml/             machine learning from scratch · Python, PyTorch · 2025–26',
                'horus/          LLM recommendation engine, 33-person team · Python, Claude API · 2026',
                'hack-computer/  a computer from NAND gates up · HDL, Hack Assembly · 2025',
                'battleship-ai/  density-map targeting AI · Java · 2025',
                'chess/          team-built chess with move validation · Python · 2024',
            ]);
            line('try `open rsa`, `open security`, or `open ml` for the interactive demos.', 'dim');
        },
        experience() {
            lines([
                '2026–      Undergraduate Researcher · SUCCESS Lab, Texas A&M',
                '2026       Intern, IoT Security & Computer Vision · Netvine, Nanjing',
                '             └─ found 2 vulns: unencrypted video feed, plaintext admin password',
                '2026–      Undergraduate TA · CSCE 110 (Python), CSCE 120 (C++)',
                '2020–      Independent tutor · physics, math, CS, SAT',
            ]);
        },
        skills() {
            lines([
                'security     ghidra, wireshark, pentesting, applied crypto',
                'ml/vision    pytorch, opencv, llm apis, prompt engineering',
                'languages    python, c++, java, javascript, sql, r, scheme, hdl',
                'systems      linux, git, google cloud, vercel, railway, latex',
            ]);
        },
        courses() {
            lines([
                '22 courses across CS, systems, security & math · all A\'s so far',
                'now:   CSCE 652 Software Reverse Engineering (graduate) · CSCE 464 Wireless & Mobile',
                'path:  CSCE 110 → 120 → 221 → 313 → 410 → 652',
            ]);
            line('explore it visually: cd tech-tree', 'dim');
        },
        contact() {
            line('email     wupet@tamu.edu');
            link('github.com/wupet', LINKS.github);
            link('linkedin.com/in/peterwutamu', LINKS.linkedin);
        },
        async email() {
            try {
                await navigator.clipboard.writeText('wupet@tamu.edu');
                line('copied wupet@tamu.edu to clipboard ✓', 'ok');
            } catch (e) {
                line('wupet@tamu.edu');
            }
        },
        open(args) {
            const what = (args[0] || '').toLowerCase();
            if (what === 'rsa' && site().openRsa) { line('launching rsa demo…', 'ok'); close(); site().openRsa(); return; }
            if ((what === 'security' || what === 'sec') && site().openSec) { line('launching security demo…', 'ok'); close(); site().openSec(); return; }
            if (what === 'ml' && site().openMl) { line('launching ml demo…', 'ok'); close(); site().openMl(); return; }
            if (LINKS[what]) { line(`opening ${what}…`, 'ok'); window.open(LINKS[what], '_blank', 'noopener'); return; }
            line('usage: open github | linkedin | cv | rsa | security | ml', 'warn');
        },
        cd(args) {
            const target = (args[0] || '~').replace(/^\/|\/$/g, '');
            if (target === '~' || target === '' || target === 'top') { go('top'); return; }
            if (target === '..') return line('you are already at the top of the tree.', 'dim');
            if (SECTIONS.includes(target) || target === 'tech-tree') { go(target); return; }
            line(`cd: no such section: ${target} (try ${SECTIONS.join(', ')})`, 'warn');
        },
        theme(args) {
            const cur = document.documentElement.getAttribute('data-theme');
            let next = (args[0] || 'toggle').toLowerCase();
            if (next === 'toggle') next = cur === 'dark' ? 'light' : 'dark';
            if (next !== 'light' && next !== 'dark') return line('usage: theme light | dark | toggle', 'warn');
            site().setTheme && site().setTheme(next);
            line(`theme set to ${next}`, 'ok');
        },
        neofetch() {
            const art = [
                '      /\\        ',
                '     /  \\       ',
                '    / /\\ \\      ',
                '   / ____ \\     ',
                '  /_/    \\_\\    ',
            ];
            const info = [
                'guest@wupet',
                'os      wupet.github.io (static, no database)',
                'shell   fake-sh 1.0',
                'theme   ' + document.documentElement.getAttribute('data-theme'),
                'uptime  since Aug 2024 @ Texas A&M',
            ];
            art.forEach((a, k) => line(a + (info[k] || ''), k === 0 ? 'acc' : ''));
        },
        sudo(args) {
            const cmd = args.join(' ').toLowerCase();
            if (cmd === 'hire peter' || cmd === 'hire peter wu') {
                line('[sudo] password for guest: ********', 'dim');
                setTimeout(() => {
                    line('access granted ✓', 'ok');
                    line('drafting offer letter… 100%');
                    line('great choice. finish the job at wupet@tamu.edu', 'acc');
                    scroll();
                }, 700);
                return;
            }
            line('guest is not in the sudoers file. This incident will be reported.', 'warn');
        },
        rm(args) {
            if (args.join(' ').includes('-rf')) line('nice try. this site is static, there\'s nothing to delete.', 'warn');
            else line('rm: permission denied', 'warn');
        },
        history() { history.forEach((h, k) => line(`${String(k + 1).padStart(4)}  ${h}`)); },
        date() { line(new Date().toString()); },
        pwd() { line('/home/guest'); },
        echo(args) { line(args.join(' ')); },
        ping() { line('pong'); },
        hello() { line('hey! type `help` to look around.'); },
        clear() { out.innerHTML = ''; },
        exit() { close(); },
    };
    COMMANDS.hi = COMMANDS.hello;
    COMMANDS.man = COMMANDS.help;

    function go(id) {
        const el = id === 'top' ? document.getElementById('top') : document.getElementById(id);
        if (!el) return;
        line(`→ ${id}`, 'ok');
        close();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const scroll = () => { body.scrollTop = body.scrollHeight; };

    function exec(raw) {
        const text = raw.trim();
        line(text, 'cmd');
        if (!text) return;
        history.push(text);
        histIdx = history.length;
        const [name, ...args] = text.split(/\s+/);
        const fn = COMMANDS[name.toLowerCase()];
        if (fn) fn(args);
        else line(`command not found: ${name}. type \`help\` for a list.`, 'warn');
    }

    function open() {
        term.hidden = false;
        if (!greeted) {
            line('fake-sh 1.0 · welcome to wupet.github.io', 'acc');
            line('type `help` to get started. press ` or esc to close.', 'dim');
            greeted = true;
        }
        input.focus();
        scroll();
    }
    function close() {
        term.hidden = true;
        input.blur();
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        exec(input.value);
        input.value = '';
        scroll();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (histIdx > 0) input.value = history[--histIdx];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            histIdx = Math.min(history.length, histIdx + 1);
            input.value = history[histIdx] || '';
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const v = input.value.trimStart();
            if (!v || v.includes(' ')) return;
            const matches = Object.keys(COMMANDS).filter((c) => c.startsWith(v));
            if (matches.length === 1) input.value = matches[0] + ' ';
            else if (matches.length > 1) { line(matches.join('  '), 'dim'); scroll(); }
        } else if (e.key === 'Escape' || e.key === '`') {
            e.preventDefault();
            close();
        }
    });
    body.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });
    document.getElementById('termClose').addEventListener('click', close);
    const hint = document.getElementById('openTerm');
    if (hint) hint.addEventListener('click', open);

    document.addEventListener('keydown', (e) => {
        if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t.closest && t.closest('input, textarea, [contenteditable="true"], dialog[open]')) return;
        e.preventDefault();
        term.hidden ? open() : close();
    });
})();
