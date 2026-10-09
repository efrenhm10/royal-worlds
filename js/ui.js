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

// A tiny procedural portrait: no art assets, but every character gets a
// distinct, consistent face-stand-in instead of a wall of plain text. The
// background hue is hashed from the name+id (stable across re-renders),
// the ring color/weight reads their title tier at a glance.
const TIER_RING_COLORS = ["#8a7a5c", "#9a8560", "#b8923a", "#c9971a", "#d4af37", "#f0c23d", "#fff3c4"];

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function avatarSvg(person, size) {
    const s = size || 56;
    const initials = (person.name || "?").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    const hash = hashString((person.name || "") + "-" + person.id);
    const hue = hash % 360;
    const bg = `hsl(${hue}, 42%, 34%)`;
    const tier = Math.max(0, Math.min(person.tier || 0, TIER_RING_COLORS.length - 1));
    const ringColor = TIER_RING_COLORS[tier];
    const ringWidth = 2 + tier;
    const dead = person.alive === false;
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;${dead ? "filter:grayscale(1);opacity:0.6;" : ""}">
        <circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - ringWidth / 2}" fill="${bg}" stroke="${ringColor}" stroke-width="${ringWidth}" />
        <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Cinzel, Georgia, serif" font-size="${Math.round(s * 0.36)}" fill="#fdf6e6" font-weight="700">${initials}</text>
    </svg>`;
}

function avatarRow(person, labelHtml) {
    return `<div style="display:flex;align-items:center;gap:10px;">${avatarSvg(person, 40)}<div>${labelHtml}</div></div>`;
}
