// ui.js — small generic DOM helpers shared by every screen-renderer in
// ui_world.js. No game logic lives here, only element-building.

function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
}

function clearEl(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function makeCard(titleHtml, bodyHtml) {
    const card = el("div", "card");
    if (titleHtml) card.appendChild(el("h3", null, titleHtml));
    if (bodyHtml) card.appendChild(el("div", null, bodyHtml));
    return card;
}

function makeChoiceButton(label, onClick, disabled) {
    const btn = el("button", null, label);
    if (disabled) btn.disabled = true;
    btn.addEventListener("click", onClick);
    return btn;
}

// A tiny procedural PORTRAIT — not just initials in a circle, an actual
// little painted bust: skin tone, hair, simple features, and tier-coded
// headwear (a crown at the top of the ladder, a coronet or fillet below
// it), framed in a ring whose color/weight reads their rank at a glance.
// Everything is hashed from name+id, so it's stable across re-renders but
// distinct per character — no art assets, no network calls, just SVG.
const TIER_RING_COLORS = ["#8a7a5c", "#9a8560", "#b8923a", "#c9971a", "#d4af37", "#f0c23d", "#fff3c4"];
const SKIN_TONES = ["#f0d3b2", "#e8c39e", "#d9a873", "#c68642", "#9a6a3c", "#6b4226"];
const HAIR_COLORS = ["#1c130b", "#3a2416", "#5a3a1e", "#7a4e24", "#a86f2e", "#c9a227", "#d8cbb0"];
const CLOTH_COLORS = ["#4a2f1c", "#2f3f55", "#432f55", "#55302f", "#2f5540", "#3a3a3a"];
let _avatarSeq = 0;

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function avatarSvg(person, size) {
    const s = size || 56;
    const hash = hashString((person.name || "") + "-" + person.id);
    const tier = Math.max(0, Math.min(person.tier || 0, TIER_RING_COLORS.length - 1));
    const ringColor = TIER_RING_COLORS[tier];
    const ringWidth = Math.max(2, 1.5 + tier * 0.6);
    const dead = person.alive === false;
    const clipId = `avportrait-${person.id}-${s}-${_avatarSeq++}`;

    const bgHue = hash % 360;
    const bg = `hsl(${bgHue}, 32%, 88%)`;
    const skin = SKIN_TONES[hash % SKIN_TONES.length];
    const isOld = (person.age || 0) >= 55;
    const hairColor = isOld ? (hash % 2 === 0 ? "#d9d9d9" : "#a8a8a8") : HAIR_COLORS[(hash >> 3) % HAIR_COLORS.length];
    const isFemale = person.gender === "F";
    const clothColor = CLOTH_COLORS[(hash >> 5) % CLOTH_COLORS.length];

    const cx = s / 2, cy = s / 2;
    const faceR = s * 0.26;
    const faceCy = cy - s * 0.04;

    const hair = isFemale
        ? `<ellipse cx="${cx}" cy="${faceCy - faceR * 0.05}" rx="${faceR * 1.35}" ry="${faceR * 1.6}" fill="${hairColor}" />`
        : `<ellipse cx="${cx}" cy="${faceCy - faceR * 0.4}" rx="${faceR * 1.1}" ry="${faceR * 0.9}" fill="${hairColor}" />`;
    const shoulders = `<path d="M ${cx - s * 0.45} ${s} Q ${cx} ${s * 0.66} ${cx + s * 0.45} ${s} Z" fill="${clothColor}" />`;
    const face = `<ellipse cx="${cx}" cy="${faceCy}" rx="${faceR}" ry="${faceR * 1.12}" fill="${skin}" />`;
    const eyes = `<circle cx="${cx - faceR * 0.4}" cy="${faceCy - faceR * 0.02}" r="${Math.max(0.8, faceR * 0.09)}" fill="#2a1d14" />
        <circle cx="${cx + faceR * 0.4}" cy="${faceCy - faceR * 0.02}" r="${Math.max(0.8, faceR * 0.09)}" fill="#2a1d14" />`;
    const mouth = `<path d="M ${cx - faceR * 0.28} ${faceCy + faceR * 0.48} Q ${cx} ${faceCy + faceR * 0.62} ${cx + faceR * 0.28} ${faceCy + faceR * 0.48}" stroke="#7a3b2e" stroke-width="${Math.max(1, faceR * 0.08)}" fill="none" stroke-linecap="round" />`;

    let headwear = "";
    if (tier >= 5) {
        headwear = `<path d="M ${cx - faceR * 0.9} ${faceCy - faceR * 1.05} l ${faceR * 0.3} ${-faceR * 0.55} l ${faceR * 0.3} ${faceR * 0.35} l ${faceR * 0.3} ${-faceR * 0.55} l ${faceR * 0.3} ${faceR * 0.35} l ${faceR * 0.3} ${-faceR * 0.55} l ${faceR * 0.3} ${faceR * 0.55} Z" fill="#e8c23d" stroke="#a8791a" stroke-width="1" />`;
    } else if (tier === 4) {
        headwear = `<rect x="${cx - faceR * 0.85}" y="${faceCy - faceR * 1.0}" width="${faceR * 1.7}" height="${faceR * 0.26}" rx="${faceR * 0.1}" fill="#d4af37" stroke="#a8791a" stroke-width="0.6" />`;
    } else if (tier >= 2) {
        headwear = `<rect x="${cx - faceR * 0.8}" y="${faceCy - faceR * 0.95}" width="${faceR * 1.6}" height="${faceR * 0.16}" fill="#c9971a" />`;
    }

    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;${dead ? "filter:grayscale(1);opacity:0.6;" : ""}">
        <defs><clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${s / 2 - ringWidth / 2}" /></clipPath></defs>
        <circle cx="${cx}" cy="${cy}" r="${s / 2 - ringWidth / 2}" fill="${bg}" stroke="${ringColor}" stroke-width="${ringWidth}" />
        <g clip-path="url(#${clipId})">
            ${hair}
            ${shoulders}
            ${face}
            ${eyes}
            ${mouth}
            ${headwear}
        </g>
    </svg>`;
}

function avatarRow(person, labelHtml) {
    return `<div style="display:flex;align-items:center;gap:10px;">${avatarSvg(person, 40)}<div>${labelHtml}</div></div>`;
}

// Toasts: engine.js's logEvent calls this (once toasts are enabled, past
// initial game setup) so anything that happens — a death, a birth, a
// vassal's opinion crisis, a year advancing — is visible no matter which
// tab is open, not just when the player happens to be on Chronicle.
function showToast(text) {
    const container = document.getElementById("toasts");
    if (!container) return;
    const toast = el("div", "toast", text);
    container.appendChild(toast);
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
    raf(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}
