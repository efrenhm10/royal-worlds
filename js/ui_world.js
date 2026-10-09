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

let _playViewTab = "chronicle";

function renderPlay() {
    const realm = getRealm(gameState.realmKey);
    const player = gameState.player;
    const title = titleName(player.tier, player.gender, realm.key);

    const hud = document.getElementById("hud");
    clearEl(hud);
    hud.appendChild(el("h2", null, `${title} ${player.name}`));
    hud.appendChild(el("p", "muted", `${realm.name} — ${gameState.year} — age ${player.age}`));
    if (gameState.gameOver) {
        hud.appendChild(el("p", null, `<strong>${gameState.gameOverReason}</strong>`));
    }
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
    }, !player.alive || gameState.gameOver));
    dock.appendChild(makeChoiceButton("Chronicle", () => { _playViewTab = "chronicle"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Family", () => { _playViewTab = "family"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Court", () => { _playViewTab = "court"; renderPlay(); }));

    renderPlayView();
}

function personLine(person, relation) {
    const alive = person.alive ? `age ${person.age}` : `died at ${person.age}`;
    return `<p><strong>${person.name}</strong> — ${relation}, ${alive}</p>`;
}

function renderPlayView() {
    const view = document.getElementById("view");
    clearEl(view);
    const player = gameState.player;

    if (_playViewTab === "chronicle") {
        const logCard = makeCard("Chronicle", "");
        const entries = gameState.log.slice(-10).reverse();
        entries.forEach(e => logCard.appendChild(el("p", "muted", `${e.year} — ${e.text}`)));
        view.appendChild(logCard);
        return;
    }

    if (_playViewTab === "family") {
        const card = makeCard("Your family", "");
        const spouse = getSpouse(gameState, player.id);
        const parents = getParents(gameState, player.id);
        const siblings = getSiblings(gameState, player.id);
        const children = getChildren(gameState, player.id);
        const auntsUncles = getAuntsUncles(gameState, player.id);
        const niecesNephews = getNiecesNephews(gameState, player.id);
        const cousins = getCousins(gameState, player.id);

        if (spouse && spouse.alive) {
            card.appendChild(el("div", null, personLine(spouse, "spouse")));
        } else if (spouse && !spouse.alive) {
            card.appendChild(el("div", null, `<p>Widowed — ${spouse.name} died at ${spouse.age}.</p>`));
        }
        parents.forEach(p => card.appendChild(el("div", null, personLine(p, p.gender === "F" ? "mother" : "father"))));
        if (children.length) {
            card.appendChild(el("h3", null, "Children"));
            children.forEach(c => card.appendChild(el("div", null, personLine(c, c.gender === "F" ? "daughter" : "son"))));
        }
        card.appendChild(el("h3", null, `Siblings (${siblings.length})`));
        siblings.forEach(s => card.appendChild(el("div", null, personLine(s, s.gender === "F" ? "sister" : "brother"))));
        card.appendChild(el("h3", null, `Nieces & nephews (${niecesNephews.length})`));
        niecesNephews.forEach(n => card.appendChild(el("div", null, personLine(n, n.gender === "F" ? "niece" : "nephew"))));
        card.appendChild(el("h3", null, `Aunts & uncles (${auntsUncles.length})`));
        auntsUncles.forEach(a => card.appendChild(el("div", null, personLine(a, a.gender === "F" ? "aunt" : "uncle"))));
        card.appendChild(el("h3", null, `Cousins (${cousins.length})`));
        cousins.forEach(c => card.appendChild(el("div", null, personLine(c, "cousin"))));
        view.appendChild(card);

        if (!gameState.gameOver && isAvailableToMarry(gameState, player.id)) {
            const marriageCard = makeCard("Propose a marriage", "");
            generateMarriageCandidates(gameState, 3).forEach(candidate => {
                const candidateRealm = getRealm(candidate.sourceRealmKey);
                const row = el("div", "stat", `<span>${candidate.name}, age ${candidate.age} (${candidateRealm.name})</span>`);
                const btn = makeChoiceButton("Marry", () => {
                    marryPlayerTo(gameState, candidate);
                    saveGame();
                    renderPlay();
                });
                row.appendChild(btn);
                marriageCard.appendChild(row);
            });
            view.appendChild(marriageCard);
        }
        return;
    }

    if (_playViewTab === "court") {
        const vassals = getVassals(gameState);
        const card = makeCard("Your court", vassals.length ? "" : '<p class="muted">You command no vassals of your own yet — a higher title will bring them.</p>');
        vassals.forEach(v => {
            const vTitle = titleName(v.tier, v.gender, gameState.realmKey);
            card.appendChild(el("div", "stat", `<span>${vTitle} ${v.name}</span><span>Opinion ${v.opinion} · Levies ${v.levies}</span>`));
        });

        const lawCard = makeCard("Succession", "");
        const currentLaw = SUCCESSION_LAWS[gameState.succession.lawKey];
        lawCard.appendChild(el("p", null, `<strong>${currentLaw.name}</strong>`));
        lawCard.appendChild(el("p", "muted", currentLaw.desc));
        if (!gameState.gameOver && canChangeSuccessionLaw(gameState)) {
            Object.values(SUCCESSION_LAWS).forEach(law => {
                if (law.key === currentLaw.key) return;
                const btn = makeChoiceButton(`Proclaim ${law.name}`, () => {
                    changeSuccessionLaw(gameState, law.key);
                    saveGame();
                    renderPlay();
                });
                lawCard.appendChild(btn);
            });
        } else if (!gameState.gameOver) {
            lawCard.appendChild(el("p", "muted", "Changing the law of succession requires Absolute Crown Authority."));
        }
        view.appendChild(lawCard);
        view.appendChild(card);
        return;
    }
}
