// ui_world.js — screen renderers for the pre-game flow (era → realm →
// character) and the live play screen's HUD. Reads data from realms.js /
// titles.js / attributes.js / engine.js; writes only to the DOM.

let _selectedEraKey = null;
let _selectedRealmKey = null;

function renderEraSelect() {
    const list = document.getElementById("eraList");
    clearEl(list);
    listEras().forEach(era => {
        const card = makeCard(era.label, era.available ? "" : '<p class="muted">Not built yet — coming in a later update.</p>');
        const btn = makeChoiceButton(era.available ? "Choose this era" : "Coming soon", () => {
            _selectedEraKey = era.key;
            renderRealmSelect(era.key);
            showScreen("realmSelect");
        }, !era.available);
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function renderRealmSelect(eraKey) {
    const era = getEra(eraKey);
    document.getElementById("realmSelectEraName").textContent = `Choose your realm — ${era.label}`;
    document.getElementById("realmSelectEraDesc").textContent =
        "Every realm here has a real ruler on its throne this year, and a real place in Europe's politics.";

    const list = document.getElementById("realmList");
    clearEl(list);
    listRealms().forEach(realm => {
        const rulerLine = `${realm.ruler.name}, ${realm.titleM === realm.titleF ? realm.titleM : (realm.ruler.gender === "F" ? realm.titleF : realm.titleM)} of ${realm.name} (age ${realm.ruler.age})`;
        const note = realm.note ? `<p class="muted">${realm.note}</p>` : "";
        const card = makeCard(realm.name, `<p class="muted">${rulerLine}</p>${note}`);
        const btn = makeChoiceButton(realm.startable ? "Choose this realm" : "Not a starting dynasty", () => {
            _selectedRealmKey = realm.key;
            renderCharacterCreate(eraKey, realm.key);
            showScreen("characterCreate");
        }, !realm.startable);
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function renderCharacterCreate(eraKey, realmKey) {
    const realm = getRealm(realmKey);
    document.getElementById("characterCreateIntro").textContent =
        `Four lives in ${realm.name}, any of which could be yours. Pick one to begin.`;

    const list = document.getElementById("characterList");
    clearEl(list);
    const candidates = generateCandidates(realmKey, 4);
    candidates.forEach(candidate => {
        const title = titleName(candidate.tier, candidate.gender, realmKey);
        const skillsLine = SKILL_KEYS.map(k => `${k[0].toUpperCase()}${k.slice(1)} ${candidate.skills[k]}`).join(" · ");
        const traitsLine = candidate.traits.join(", ");
        const body = `
            <p class="muted">${candidate.blurb}</p>
            <p><strong>${title} ${candidate.name}</strong>, age ${candidate.age}</p>
            <p class="muted">${skillsLine}</p>
            <p class="muted">Traits: ${traitsLine}</p>
        `;
        const card = makeCard(candidate.name, body);
        const btn = makeChoiceButton("Begin this life", () => {
            startNewGame(eraKey, realmKey, candidate);
            renderPlay();
            showScreen("play");
        });
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function renderPlay() {
    const realm = getRealm(gameState.realmKey);
    const player = gameState.player;
    const title = titleName(player.tier, player.gender, realm.key);

    const hud = document.getElementById("hud");
    clearEl(hud);
    hud.appendChild(el("h2", null, `${title} ${player.name}`));
    hud.appendChild(el("p", "muted", `${realm.name} — ${gameState.year} — age ${player.age}`));
    const stats = el("div", "grid");
    stats.appendChild(el("div", "stat", `<span>Health</span><span>${player.health}</span>`));
    stats.appendChild(el("div", "stat", `<span>Gold</span><span>${player.gold}</span>`));
    stats.appendChild(el("div", "stat", `<span>Prestige</span><span>${player.prestige}</span>`));
    stats.appendChild(el("div", "stat", `<span>Piety</span><span>${player.piety}</span>`));
    hud.appendChild(stats);

    const dock = document.getElementById("dock");
    clearEl(dock);
    dock.appendChild(makeChoiceButton("Advance a year", () => {
        advanceYear();
        saveGame();
        renderPlay();
    }, !player.alive));

    const view = document.getElementById("view");
    clearEl(view);
    const logCard = makeCard("Chronicle", "");
    const entries = gameState.log.slice(-10).reverse();
    entries.forEach(e => logCard.appendChild(el("p", "muted", `${e.year} — ${e.text}`)));
    view.appendChild(logCard);
}
