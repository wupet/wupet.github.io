/* Shared icosahedron geometry for the hero and the 404 page. */
(() => {
    'use strict';

    const PHI = (1 + Math.sqrt(5)) / 2;
    const raw = [
        [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
        [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
        [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
    ];
    const norm = Math.hypot(1, PHI);
    const verts = raw.map((v) => v.map((c) => c / norm));

    // Vertices of a regular icosahedron are adjacent when their raw distance is 2
    const adjacent = (i, j) => Math.abs(Math.hypot(
        raw[i][0] - raw[j][0], raw[i][1] - raw[j][1], raw[i][2] - raw[j][2]) - 2) < 0.01;

    const edges = [];
    const faces = [];
    for (let i = 0; i < 12; i++) {
        for (let j = i + 1; j < 12; j++) {
            if (!adjacent(i, j)) continue;
            edges.push([i, j]);
            for (let k = j + 1; k < 12; k++) {
                if (adjacent(i, k) && adjacent(j, k)) faces.push([i, j, k]);
            }
        }
    }
    // Which two faces share each edge (used to decide if an edge is visible)
    const edgeFaces = edges.map(([a, b]) =>
        faces.reduce((acc, f, fi) => (f.includes(a) && f.includes(b) ? acc.concat(fi) : acc), []));

    function rotate([x, y, z], ax, ay) {
        const cy = Math.cos(ay), sy = Math.sin(ay);
        const x1 = x * cy + z * sy;
        let z1 = -x * sy + z * cy;
        const cx = Math.cos(ax), sx = Math.sin(ax);
        const y1 = y * cx - z1 * sx;
        z1 = y * sx + z1 * cx;
        return [x1, y1, z1];
    }

    window.Icosa = { verts, edges, faces, edgeFaces, rotate };
})();
