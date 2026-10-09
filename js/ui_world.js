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
        const rulerTitle = realm.titleM === realm.titleF ? realm.titleM : (realm.ruler.gender === "F" ? realm.titleF : realm.titleM);
        const rulerLine = `${realm.ruler.name}, ${rulerTitle} of ${realm.name} (age ${realm.ruler.age})`;
        const attitudeLine = realm.ruler.traits ? `<p class="muted">Known to be ${realm.ruler.traits.join(" and ")}.</p>` : "";
        const note = realm.note ? `<p class="muted">${realm.note}</p>` : "";
        const card = makeCard(realm.name, avatarRow(realm.ruler, `<p class="muted">${rulerLine}</p>${attitudeLine}${note}`));
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
        `Choose your rank in ${realm.name} — gentry through the crown itself — then pick which life to live.`;

    const list = document.getElementById("characterList");
    clearEl(list);
    TITLE_LADDER.filter(t => t.tier <= 5).forEach(tierInfo => {
        const name = titleName(tierInfo.tier, "M", realmKey);
        const nameF = titleName(tierInfo.tier, "F", realmKey);
        const label = name === nameF ? name : `${name} / ${nameF}`;
        const card = makeCard(label, `<p class="muted">${TIER_BLURBS[tierInfo.tier]}</p>`);
        const btn = makeChoiceButton(`Play a ${label}`, () => {
            renderCandidatesForTier(eraKey, realmKey, tierInfo.tier);
        });
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function renderCandidatesForTier(eraKey, realmKey, tier) {
    const realm = getRealm(realmKey);
    document.getElementById("characterCreateIntro").textContent =
        `Four lives at this rank in ${realm.name}, any of which could be yours. Pick one to begin.`;

    const list = document.getElementById("characterList");
    clearEl(list);

    const backCard = makeCard("", "");
    backCard.appendChild(makeChoiceButton("← Choose a different rank", () => {
        renderCharacterCreate(eraKey, realmKey);
    }));
    list.appendChild(backCard);

    const candidates = generateCandidatesForTier(realmKey, tier, 4);
    candidates.forEach(candidate => {
        const title = titleName(candidate.tier, candidate.gender, realmKey);
        const skillsLine = SKILL_KEYS.map(k => `${k[0].toUpperCase()}${k.slice(1)} ${candidate.skills[k]}`).join(" · ");
        const traitsLine = candidate.traits.join(", ");
        const body = avatarRow(candidate, `
            <p><strong>${title} ${candidate.name}</strong>, age ${candidate.age}</p>
            <p class="muted">${skillsLine}</p>
            <p class="muted">Traits: ${traitsLine}</p>
        `) + `<p class="muted">${candidate.blurb}</p>`;
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
    hud.appendChild(el("div", null, `<div style="display:flex;align-items:center;gap:14px;">${avatarSvg(player, 64)}<div>
        <h2 style="margin:0;">${title} ${player.name}</h2>
        <p class="muted" style="margin:2px 0 0;">${realm.name} — ${gameState.year} — age ${player.age}</p>
    </div></div>`));
    hud.appendChild(el("p", "muted", `<em>${sceneDescription(gameState)}</em>`));
    if (player.traits && player.traits.length) {
        hud.appendChild(el("p", "muted", `Known to be ${player.traits.join(" and ")}.`));
    }
    if (gameState.war) {
        const warRealm = getRealm(gameState.war.targetRealmKey);
        const yearsAtWar = gameState.year - gameState.war.startYear;
        hud.appendChild(el("p", null, `⚔ <strong>At war with ${warRealm.name}</strong> — ${yearsAtWar} year${yearsAtWar === 1 ? "" : "s"} in, war score ${gameState.war.warScore}.`));
    }
    if (gameState.faction) {
        hud.appendChild(el("p", null, `⚠ <strong>A faction of vassals is in open revolt</strong>, demanding ${gameState.faction.type === "depose" ? "your abdication" : "independence"}.`));
    }
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
    dock.appendChild(makeChoiceButton("Domain", () => { _playViewTab = "domain"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Family", () => { _playViewTab = "family"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Court", () => { _playViewTab = "court"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Church", () => { _playViewTab = "church"; renderPlay(); }));
    dock.appendChild(makeChoiceButton("Intrigue", () => { _playViewTab = "intrigue"; renderPlay(); }));

    renderPlayView();
}

function personLine(person, relation) {
    const alive = person.alive ? `age ${person.age}` : `died at ${person.age}`;
    const traitsLine = person.traits && person.traits.length ? ` <span class="muted">(${person.traits.join(", ")})</span>` : "";
    return avatarRow(person, `<strong>${person.name}</strong> — ${relation}, ${alive}${traitsLine}`);
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

    if (_playViewTab === "domain") {
        const holdings = getDomain(gameState);
        const vassals = getVassals(gameState);

        if (!holdings.length) {
            view.appendChild(makeCard("Your demesne", '<p class="muted">No holdings of your own yet — that comes with a landed title.</p>'));
        }

        holdings.forEach(holding => {
            const typeInfo = HOLDING_TYPES.find(t => t.key === holding.type);
            const vassal = holding.grantedToVassalId ? vassals.find(v => v.id === holding.grantedToVassalId) : null;
            const status = vassal ? `granted to ${vassal.name}` : "in hand";
            const card = makeCard(`${typeInfo.name} (level ${holding.level}) — ${status}`, `<p class="muted">${typeInfo.desc}</p>`);
            if (!gameState.gameOver) {
                if (vassal) {
                    card.appendChild(makeChoiceButton("Revoke", () => {
                        revokeHolding(gameState, holding.id);
                        saveGame();
                        renderPlay();
                    }, !crownAuthorityInfo(gameState.crownAuthority[gameState.realmKey] || 0).canRevokeTitlesFreely));
                } else {
                    card.appendChild(makeChoiceButton(`Develop (${holding.level * 40} gold)`, () => {
                        developHolding(gameState, holding.id);
                        saveGame();
                        renderPlay();
                    }, player.gold < holding.level * 40));
                    if (vassals.length) {
                        const grantRow = el("div", null, "");
                        grantRow.style.display = "flex";
                        grantRow.style.gap = "8px";
                        grantRow.style.alignItems = "center";
                        grantRow.style.marginTop = "6px";
                        const select = document.createElement("select");
                        vassals.forEach(v => {
                            const opt = document.createElement("option");
                            opt.value = v.id;
                            opt.textContent = v.name;
                            select.appendChild(opt);
                        });
                        grantRow.appendChild(select);
                        grantRow.appendChild(makeChoiceButton("Grant", () => {
                            grantHolding(gameState, holding.id, Number(select.value));
                            saveGame();
                            renderPlay();
                        }));
                        card.appendChild(grantRow);
                    }
                }
            }
            view.appendChild(card);
        });

        const max = DOMAIN_MAX_BY_TIER[player.tier] || 0;
        if (max > 0) {
            const cost = buyHoldingCost(gameState);
            const buyCard = makeCard("Buy more land", `<p class="muted">${holdings.length} of ${max} holdings a title at your rank could plausibly absorb. Next purchase: ${cost} gold.</p>`);
            if (!gameState.gameOver) {
                HOLDING_TYPES.forEach(type => {
                    buyCard.appendChild(makeChoiceButton(`Buy a ${type.name.toLowerCase()}`, () => {
                        buyHolding(gameState, type.key);
                        saveGame();
                        renderPlay();
                    }, !canBuyHolding(gameState)));
                });
            }
            view.appendChild(buyCard);
        }
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
            if (!gameState.gameOver) {
                const tryBtn = makeChoiceButton("Try for a child", () => {
                    tryForChild(gameState);
                    saveGame();
                    renderPlay();
                }, !canTryForChild(gameState));
                card.appendChild(tryBtn);
            }
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
            const row = el("div", "stat", avatarRow(advisor, `
                <strong>${role.name}: ${advisor.name}</strong><br>
                <span class="muted">Skill ${advisor.skill} · Opinion ${Math.round(advisor.opinion)} · ${advisor.traits.join(", ")}</span>
            `));
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
            card.appendChild(el("div", "stat", avatarRow(v, `
                <strong>${vTitle} ${v.name}</strong><br>
                <span class="muted">Opinion ${Math.round(v.opinion)} · Levies ${v.levies} · ${v.traits.join(", ")}</span>
            `)));
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
        const caLevel = gameState.crownAuthority[gameState.realmKey] || 0;
        const caInfo = crownAuthorityInfo(caLevel);
        const caCard = makeCard("Crown Authority", `<p><strong>${caInfo.name}</strong></p><p class="muted">${caInfo.desc}</p>`);
        if (!gameState.gameOver) {
            caCard.appendChild(makeChoiceButton("Raise Crown Authority", () => {
                raiseCrownAuthority(gameState);
                saveGame();
                renderPlay();
            }, !canRaiseCrownAuthority(gameState)));
        }
        view.appendChild(caCard);

        if (gameState.faction) {
            const factionCard = makeCard("A faction stirs", `<p class="muted">Formed ${gameState.faction.formedYear}, demanding ${gameState.faction.type === "depose" ? "your abdication" : "independence"}.</p>`);
            view.appendChild(factionCard);
        }

        view.appendChild(lawCard);
        view.appendChild(card);
        return;
    }

    if (_playViewTab === "church") {
        const standing = getStanding(gameState, gameState.realmKey);
        const reform = reformLevel(gameState);
        const pressureCard = makeCard("Rome and the realm", `
            <div class="stat"><span>Standing with Rome</span><span>${Math.round(standing)}${isExcommunicationRisk(gameState, gameState.realmKey) ? " — excommunication risk" : ""}</span></div>
            <div class="stat"><span>Reform pressure</span><span>${Math.round(reform)}${gameState.reform.schismed ? " — SCHISM" : ""}</span></div>
        `);
        if (!gameState.gameOver && !gameState.reform.schismed) {
            pressureCard.appendChild(makeChoiceButton("Suppress reformist preaching (50 gold)", () => {
                suppressReform(gameState);
                saveGame();
                renderPlay();
            }, player.gold < 50));
            pressureCard.appendChild(makeChoiceButton("Tolerate reformist preaching", () => {
                embraceReform(gameState);
                saveGame();
                renderPlay();
            }));
        }
        view.appendChild(pressureCard);

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

        const warCard = makeCard("War");
        if (gameState.war) {
            const warRealm = getRealm(gameState.war.targetRealmKey);
            const yearsAtWar = gameState.year - gameState.war.startYear;
            warCard.appendChild(el("p", null, `At war with <strong>${warRealm.name}</strong> — ${yearsAtWar} year${yearsAtWar === 1 ? "" : "s"} in.`));
            warCard.appendChild(el("p", "muted", `War score: ${gameState.war.warScore} (settles at +60 victory, -60 defeat, or white peace after 7 years)`));
        } else {
            const pressableClaims = (gameState.claims || []).filter(c => c.realmKey !== gameState.realmKey);
            if (pressableClaims.length) {
                pressableClaims.forEach(c => {
                    const claimRealm = getRealm(c.realmKey);
                    const row = el("div", "stat", `<span>${claimRealm.name} (${c.type} claim)</span>`);
                    const btn = makeChoiceButton("Declare war", () => {
                        declareWar(gameState, c.realmKey);
                        saveGame();
                        renderPlay();
                    }, !canDeclareWar(gameState));
                    row.appendChild(btn);
                    warCard.appendChild(row);
                });
            } else {
                warCard.appendChild(el("p", "muted", "No claims to press into a war yet."));
            }
        }
        view.appendChild(warCard);

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
