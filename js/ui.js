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
