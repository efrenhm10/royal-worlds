// Generates js/realm_shapes.js — real-ish territory polygons for the
// Theater map. 15 realms come from aourednik/historical-basemaps'
// world_1492.geojson (nearest available year to 1461); 7 (Burgundy,
// Austria, Bohemia, Milan, Florence, Naples, Wallachia) aren't present
// as separate shapes in that dataset (it lumps them into one "Holy
// Roman Empire" blob or omits the Italian city-states), so they're
// hand-approximated lon/lat boxes run through the exact same
// projection, so everything lines up in one coordinate space.
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../mapdata/world_1492.geojson'), 'utf8'));

function findFeature(name) {
    const f = data.features.find(f => f.properties.NAME === name);
    if (!f) throw new Error(`Feature not found: ${name}`);
    return f;
}

// Extract rings as arrays of [lon, lat] from a Polygon or MultiPolygon.
function ringsOf(geometry) {
    if (geometry.type === 'Polygon') return geometry.coordinates;
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
    throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

// Simple distance-based decimation: keep a point only if it's moved far
// enough (in degrees) from the last kept point. Caps ring size so the
// SVG stays light, while keeping the silhouette recognizable.
function simplifyRing(ring, minDelta) {
    if (ring.length <= 4) return ring;
    const out = [ring[0]];
    let last = ring[0];
    for (let i = 1; i < ring.length - 1; i++) {
        const [x, y] = ring[i];
        const [lx, ly] = last;
        if (Math.hypot(x - lx, y - ly) >= minDelta) {
            out.push(ring[i]);
            last = ring[i];
        }
    }
    out.push(ring[ring.length - 1]);
    return out;
}

const REALM_SOURCES = {
    england: { from: ['England'] },
    scotland: { from: ['Scotland'] },
    france: { from: ['France'] },
    portugal: { from: ['Portugal'] },
    castile: { from: ['Castille'] },
    aragon: { from: ['Aragón'] },
    brittany: { from: ['Britany'] },
    poland: { from: ['Poland-Lithuania'] },
    hungary: { from: ['Imperial Hungary'] },
    ottoman: { from: ['Ottoman Empire'] },
    rome: { from: ['Papal States'] },
    venice: { from: ['Venice'] },
    teutonic: { from: ['Teutonic Knights'] },
    kalmar: { from: ['Denmark-Norway', 'Sweden'] },
    muscovy: { from: ['Grand Duchy of Moscow'] },
};

const allRings = {}; // realmKey -> array of rings (each ring: array of [lon,lat])

Object.keys(REALM_SOURCES).forEach(key => {
    const rings = [];
    REALM_SOURCES[key].from.forEach(name => {
        const f = findFeature(name);
        ringsOf(f.geometry).forEach(ring => rings.push(ring));
    });
    allRings[key] = rings;
});

// Hand-approximated boxes (lon/lat) for the 7 realms the dataset doesn't
// carry separately. Deliberately simple — rough rectangles/pentagons in
// the right place and of the right rough size, not surveyed borders.
// Burgundy is genuinely two disconnected pieces (the Low Countries and
// the Burgundian heartland) — real, not an artifact.
const HAND_DRAWN = {
    burgundy: [
        [[2.3, 50.2], [3.0, 53.3], [5.8, 53.5], [6.4, 51.8], [5.5, 50.3], [3.5, 49.8], [2.3, 50.2]], // Low Countries
        [[3.3, 48.6], [3.6, 47.9], [5.0, 46.6], [6.9, 46.3], [7.0, 47.6], [5.8, 48.4], [4.5, 48.9], [3.3, 48.6]], // Burgundian heartland
    ],
    austria: [
        [[9.5, 47.5], [9.7, 49.0], [13.0, 48.9], [16.9, 48.8], [17.1, 47.5], [15.0, 46.5], [12.5, 46.4], [10.5, 46.9], [9.5, 47.5]],
    ],
    bohemia: [
        [[12.0, 50.3], [12.1, 51.1], [14.8, 51.0], [16.6, 50.4], [16.2, 48.6], [14.3, 48.6], [12.5, 49.5], [12.0, 50.3]],
    ],
    milan: [
        [[7.9, 46.0], [8.0, 46.5], [9.5, 46.1], [10.5, 45.6], [10.2, 44.8], [8.9, 44.8], [7.9, 45.3], [7.9, 46.0]],
    ],
    florence: [
        [[9.9, 44.4], [10.0, 44.1], [11.9, 44.2], [12.3, 43.5], [11.7, 42.6], [10.5, 42.8], [9.8, 43.6], [9.9, 44.4]],
    ],
    naples: [
        [[13.4, 42.0], [15.9, 42.0], [18.5, 40.1], [17.2, 38.1], [15.6, 38.0], [14.0, 40.0], [13.4, 42.0]],
    ],
    wallachia: [
        [[22.2, 45.6], [23.0, 46.2], [26.9, 45.5], [27.9, 44.9], [27.0, 43.6], [24.0, 43.7], [22.4, 44.5], [22.2, 45.6]],
    ],
};
Object.keys(HAND_DRAWN).forEach(key => { allRings[key] = HAND_DRAWN[key]; });

// --- Projection: simple equirectangular, lon/lat -> our SVG space. ---
let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
Object.values(allRings).forEach(rings => rings.forEach(ring => ring.forEach(([x, y]) => {
    if (x < minLon) minLon = x; if (x > maxLon) maxLon = x;
    if (y < minLat) minLat = y; if (y > maxLat) maxLat = y;
})));
// Pad slightly.
minLon -= 1; maxLon += 1; minLat -= 1; maxLat += 1;
const SVG_W = 100, SVG_H = 100 * (maxLat - minLat) / (maxLon - minLon) * 1.55; // 1.55 ~ equirectangular latitude compression at ~50N
function project([lon, lat]) {
    const x = (lon - minLon) / (maxLon - minLon) * SVG_W;
    const y = (maxLat - lat) / (maxLat - minLat) * SVG_H;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
}

function ringToPath(ring) {
    const simplified = simplifyRing(ring, 0.12);
    const pts = simplified.map(project);
    return 'M' + pts.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
}

const centroidsOut = {};
const pathsOut = {};
Object.keys(allRings).forEach(key => {
    const rings = allRings[key];
    // Use the largest ring (by point count, a rough proxy for area) as
    // the one whose centroid anchors the label; render every ring.
    pathsOut[key] = rings.map(ringToPath).join(' ');
    let best = rings[0], bestLen = 0;
    rings.forEach(r => { if (r.length > bestLen) { bestLen = r.length; best = r; } });
    const projected = best.map(project);
    const cx = projected.reduce((s, p) => s + p[0], 0) / projected.length;
    const cy = projected.reduce((s, p) => s + p[1], 0) / projected.length;
    centroidsOut[key] = { x: Math.round(cx * 10) / 10, y: Math.round(cy * 10) / 10 };
});

console.log('viewBox:', `0 0 ${Math.round(SVG_W)} ${Math.round(SVG_H)}`);
let totalChars = 0;
Object.keys(pathsOut).forEach(k => { totalChars += pathsOut[k].length; });
console.log('total path data chars:', totalChars);

const out = `// realm_shapes.js — generated territory outlines for The Theater's
// map. 15 realms' shapes come from a real historical-borders dataset
// (aourednik/historical-basemaps, the nearest available snapshot year
// to 1461); 7 (Burgundy, Austria, Bohemia, Milan, Florence, Naples,
// Wallachia) aren't present as separate shapes in that source, so
// they're hand-approximated boxes run through the same projection —
// roughly right place and size, not surveyed borders. Regenerate with
// mapgen/generate.js if the realm roster changes.
const REALM_SHAPE_PATHS = ${JSON.stringify(pathsOut, null, 4)};

const REALM_SHAPE_CENTROIDS = ${JSON.stringify(centroidsOut, null, 4)};

const REALM_MAP_VIEWBOX = "0 0 ${Math.round(SVG_W)} ${Math.round(SVG_H)}";

function shapePathFor(realmKey) {
    return REALM_SHAPE_PATHS[realmKey] || null;
}

function shapeCentroidFor(realmKey) {
    return REALM_SHAPE_CENTROIDS[realmKey] || null;
}
`;

fs.writeFileSync(path.join(__dirname, '../realm_shapes.js'), out);
console.log('wrote', path.join(__dirname, '../realm_shapes.js'));
