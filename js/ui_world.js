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
    const title = player.churchTier != null ? churchRankName(player.churchTier) : titleName(player.tier, player.gender, realm.key);

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
    dock.appendChild(makeChoiceButton("Church", () => { _playViewTab = "church"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Intrigue", () => { _playViewTab = "intrigue"; renderPlay(); }));

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

        if (!gameState.gameOver && player.churchTier == null && isAvailableToMarry(gameState, player.id)) {
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
        const council = getCouncil(gameState);
        const roleKeys = Object.keys(council);
        const councilCard = makeCard("Your council", roleKeys.length ? "" : '<p class="muted">No formal council yet — that comes with a landed title.</p>');
        roleKeys.forEach(roleKey => {
            const advisor = council[roleKey];
            const role = COUNCIL_ROLES.find(r => r.key === roleKey);
            const row = el("div", "stat", `<span>${role.name}: ${advisor.name}</span><span>Skill ${advisor.skill} · Opinion ${Math.round(advisor.opinion)}</span>`);
            const btn = makeChoiceButton("Replace", () => {
                replaceAdvisor(gameState, roleKey);
                saveGame();
                renderPlay();
            }, !!gameState.gameOver);
            row.appendChild(btn);
            councilCard.appendChild(row);
        });
        view.appendChild(councilCard);

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

    if (_playViewTab === "church") {
        if (player.churchTier == null) {
            const canEnter = canEnterChurch(gameState);
            const reasons = [];
            if (player.age < 16) reasons.push("too young to take orders");
            const spouse = getSpouse(gameState, player.id);
            if (spouse && spouse.alive) reasons.push("married — the Church asks celibacy of its clergy");
            const body = `<p class="muted">Renounce marriage and any secular inheritance of your own, and climb from priest to bishop to cardinal — and, rarely, to the Papacy itself. A churchman's real power is what it lets you do for your family: blessings, petitions, and papal favor for the relatives who still carry the family's secular fortunes.</p>${reasons.length ? `<p class="muted">Not available: ${reasons.join("; ")}.</p>` : ""}`;
            const card = makeCard("Take Holy Orders", body);
            if (!gameState.gameOver) {
                card.appendChild(makeChoiceButton("Take Holy Orders", () => {
                    enterChurch(gameState);
                    saveGame();
                    renderPlay();
                }, !canEnter));
            }
            view.appendChild(card);
            return;
        }

        const rankCard = makeCard(churchRankName(player.churchTier), `<p class="muted">Church piety: ${player.churchPiety || 0}</p>`);
        view.appendChild(rankCard);

        const relatives = [
            ...getChildren(gameState, player.id),
            ...getSiblings(gameState, player.id),
            ...getNiecesNephews(gameState, player.id),
            ...getCousins(gameState, player.id),
            ...getAuntsUncles(gameState, player.id),
        ].filter(p => p.alive);

        availableChurchActions(gameState).forEach(action => {
            const actionCard = makeCard(action.name, `<p class="muted">${action.desc} (costs ${action.pietyCost} piety)</p>`);
            if (action.key === "shield") {
                actionCard.appendChild(makeChoiceButton(action.name, () => {
                    performChurchAction(gameState, action.key, null);
                    saveGame();
                    renderPlay();
                }, !!gameState.gameOver));
            } else if (relatives.length) {
                relatives.forEach(relative => {
                    const row = el("div", "stat", `<span>${relative.name}</span>`);
                    const btn = makeChoiceButton(`Use on ${relative.name}`, () => {
                        performChurchAction(gameState, action.key, relative.id);
                        saveGame();
                        renderPlay();
                    }, !!gameState.gameOver);
                    row.appendChild(btn);
                    actionCard.appendChild(row);
                });
            } else {
                actionCard.appendChild(el("p", "muted", "No living relative to use this on right now."));
            }
            view.appendChild(actionCard);
        });
        return;
    }

    if (_playViewTab === "intrigue") {
        const otherRealms = listRealms().filter(r => r.key !== gameState.realmKey);

        const claimsCard = makeCard("Fabricate a claim", '<p class="muted">A fabricated claim is what makes a future war justified, rather than naked conquest.</p>');
        otherRealms.forEach(realm => {
            const already = hasClaim(gameState, realm.key);
            const row = el("div", "stat", `<span>${realm.name}${already ? " — claim already held" : ""}</span>`);
            const btn = makeChoiceButton("Fabricate claim", () => {
                fabricateClaim(gameState, realm.key);
                saveGame();
                renderPlay();
            }, already || !!gameState.gameOver);
            row.appendChild(btn);
            claimsCard.appendChild(row);
        });
        view.appendChild(claimsCard);

        const underminCard = makeCard("Undermine a rival realm", '<p class="muted">Sown unrest weakens a rival\'s stability — and, later, their ability to resist you.</p>');
        otherRealms.forEach(realm => {
            const stability = effectiveStability(gameState, realm.key);
            const row = el("div", "stat", `<span>${realm.name} — stability ${stability}</span>`);
            const btn = makeChoiceButton("Undermine", () => {
                undermineRivalStability(gameState, realm.key);
                saveGame();
                renderPlay();
            }, !!gameState.gameOver);
            row.appendChild(btn);
            underminCard.appendChild(row);
        });
        view.appendChild(underminCard);

        const targets = [
            ...getSiblings(gameState, player.id),
            ...getNiecesNephews(gameState, player.id),
            ...getCousins(gameState, player.id),
            ...getAuntsUncles(gameState, player.id),
        ].filter(p => p.alive);
        const deathCard = makeCard("Arrange a convenient death", '<p class="muted">Dangerous, and not easily undone if it goes wrong.</p>');
        if (targets.length) {
            targets.forEach(t => {
                const row = el("div", "stat", `<span>${t.name}, age ${t.age}</span>`);
                const btn = makeChoiceButton("Arrange", () => {
                    arrangeConvenientDeath(gameState, t.id);
                    saveGame();
                    renderPlay();
                }, !!gameState.gameOver);
                row.appendChild(btn);
                deathCard.appendChild(row);
            });
        } else {
            deathCard.appendChild(el("p", "muted", "No one in reach right now."));
        }
        view.appendChild(deathCard);
        return;
    }
}
