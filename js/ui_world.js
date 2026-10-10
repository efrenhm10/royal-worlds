// ui_world.js — screen renderers for the pre-game flow (era → realm →
// character) and the live play screen's HUD. Reads data from realms.js /
// titles.js / attributes.js / engine.js; writes only to the DOM.

let _selectedEraKey = null;
let _selectedRealmKey = null;
let _marriageTargetId = null;
let _marriageRealmKey = null;
let _marriageCategory = null; // "royal" | "noble"

function resetMarriageFlow() {
    _marriageTargetId = null;
    _marriageRealmKey = null;
    _marriageCategory = null;
}

// Propose a marriage for the player, or arrange one for a child: pick a
// realm, then its royal family or its noble line, then a specific match —
// with the real cost of marrying above or beneath station shown before
// it's committed to, not after. The player always pays the cost and
// bears the shame, even when it's a child's match being arranged.
function renderMarriageSection(view, gameState, targetPerson) {
    const player = gameState.player;
    const target = targetPerson || player;
    const isSelf = target.id === player.id;
    const heading = isSelf ? "Propose a marriage" : `Arrange ${target.name}'s marriage`;

    if (!_marriageRealmKey) {
        const card = makeCard(heading, '<p class="muted">Choose a realm to seek a match in.</p>');
        if (!isSelf) {
            card.appendChild(makeChoiceButton("← Back to family overview", () => { resetMarriageFlow(); renderPlay(); }));
        }
        listRealms().forEach(realm => {
            const row = el("div", "stat", `<span>${realm.name}</span>`);
            row.appendChild(makeChoiceButton("Choose", () => { _marriageTargetId = target.id; _marriageRealmKey = realm.key; renderPlay(); }));
            card.appendChild(row);
        });
        view.appendChild(card);
        return;
    }

    const realm = getRealm(_marriageRealmKey);

    if (!_marriageCategory) {
        const card = makeCard(`${isSelf ? "A match" : `A match for ${target.name}`} in ${realm.name}`, '<p class="muted">The royal house itself, or the wider noble line?</p>');
        card.appendChild(makeChoiceButton("← Choose a different realm", () => { _marriageRealmKey = null; renderPlay(); }));
        card.appendChild(makeChoiceButton("Royal family", () => { _marriageCategory = "royal"; renderPlay(); }));
        card.appendChild(makeChoiceButton("Noble line", () => { _marriageCategory = "noble"; renderPlay(); }));
        view.appendChild(card);
        return;
    }

    const card = makeCard(`${_marriageCategory === "royal" ? "Royal family" : "Noble line"} of ${realm.name}`, "");
    card.appendChild(makeChoiceButton("← Choose a different kind of match", () => { _marriageCategory = null; renderPlay(); }));
    const candidates = generateMarriageCandidatesForRealm(gameState, _marriageRealmKey, _marriageCategory, target);
    candidates.forEach(candidate => {
        const title = titleName(candidate.tier, candidate.gender, _marriageRealmKey);
        const cost = marriageCost(target.tier, candidate.tier);
        const shame = marriageShame(target.tier, candidate.tier);
        let note = "A fitting match.";
        if (cost > 0) note = `Above ${isSelf ? "your" : "their"} station — costs ${cost} gold in dowry${isSelf ? "" : " (paid by you)"}.`;
        else if (shame > 0) note = `Beneath ${isSelf ? "your" : "their"} station — costs ${shame} prestige at court.`;
        const row = el("div", "stat", avatarRow(candidate, `<strong>${title} ${candidate.name}</strong>, age ${candidate.age}<br><span class="muted">${note}</span>`));
        const btn = makeChoiceButton(isSelf ? "Marry" : "Arrange", () => {
            if (arrangeMarriage(gameState, target, candidate)) {
                resetMarriageFlow();
            }
            saveGame();
            renderPlay();
        }, cost > 0 && player.gold < cost);
        row.appendChild(btn);
        card.appendChild(row);
    });
    view.appendChild(card);
}

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

function candidateCard(eraKey, realmKey, candidate) {
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
    return card;
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

    // At the crown itself, offer to play the realm's actual ruler or a
    // real relative of theirs (sibling/child) instead of only generated
    // nobles — realms.js's historical figures are playable, not just
    // flavor text on the realm-select screen.
    if (tier === 5) {
        list.appendChild(candidateCard(eraKey, realmKey, createRulerCharacter(realmKey)));
        list.appendChild(candidateCard(eraKey, realmKey, createRulerRelativeCandidate(realmKey, "sibling")));
        list.appendChild(candidateCard(eraKey, realmKey, createRulerRelativeCandidate(realmKey, "child")));
    }

    const candidates = generateCandidatesForTier(realmKey, tier, 4);
    candidates.forEach(candidate => list.appendChild(candidateCard(eraKey, realmKey, candidate)));
}

let _playViewTab = "chronicle";

// Court standing isn't tracked as its own number — it's what vassals and
// councillors actually think of you, averaged, the same "respect" a real
// court would gossip about.
function courtStanding(gameState) {
    const people = [...getVassals(gameState), ...Object.values(getCouncil(gameState))];
    if (!people.length) return null;
    return Math.round(people.reduce((s, p) => s + p.opinion, 0) / people.length);
}

function safetyStatus(gameState) {
    if (gameState.war) return { label: "At War", bad: true };
    if (gameState.faction) return { label: "Revolt", bad: true };
    if (isExcommunicationRisk(gameState, gameState.realmKey)) return { label: "Excommunication risk", bad: true };
    const standing = courtStanding(gameState);
    if (standing != null && standing < 35) return { label: "Court unrest", bad: true };
    return { label: "Safe", bad: false };
}

const DOCK_VIEWS = [
    { key: "chronicle", name: "Chronicle", icon: "📜" },
    { key: "domain", name: "Domain", icon: "🏰" },
    { key: "military", name: "Military", icon: "⚔️" },
    { key: "family", name: "Family", icon: "👪" },
    { key: "court", name: "Court", icon: "🏛️" },
    { key: "church", name: "Church", icon: "⛪" },
    { key: "intrigue", name: "Intrigue", icon: "🗡️" },
];

function dockBadge(gameState, key) {
    if (key === "court" && gameState.faction) return "!";
    if (key === "court" && typeof canBecomeFavorite === "function" && canBecomeFavorite(gameState)) return "★";
    if (key === "church" && isExcommunicationRisk(gameState, gameState.realmKey)) return "!";
    if (key === "intrigue" && gameState.war) return "⚔";
    if (key === "military" && standingUpkeep(gameState) > (gameState.player.gold || 0) && standingUpkeep(gameState) > 0) return "!";
    if (key === "family" && canTryForChild(gameState)) return "♥";
    return null;
}

function renderPlay() {
    const realm = getRealm(gameState.realmKey);
    const player = gameState.player;
    const title = player.churchTier != null ? churchRankName(player.churchTier) : titleName(player.tier, player.gender, realm.key);

    const hud = document.getElementById("hud");
    clearEl(hud);
    hud.appendChild(el("div", null, `<div style="display:flex;align-items:center;gap:14px;">${avatarSvg(player, 64)}<div>
        <h2 style="margin:0;">${title} ${player.name}</h2>
        <p class="muted" style="margin:2px 0 0;">${realm.name} — ${gameState.year} — age ${player.age}${player.traits && player.traits.length ? ` · ${player.traits.join(", ")}` : ""}</p>
        <p class="muted" style="margin:2px 0 0;"><em>${sceneDescription(gameState)}</em></p>
    </div></div>`));
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

    const standing = courtStanding(gameState);
    const safety = safetyStatus(gameState);
    const power = playerMilitaryPower(gameState);
    const stats = el("div", "hud-stats");
    const tile = (label, value, meterPct, extraClass) => `<div class="hs ${extraClass || ""}"><span>${label}</span><b>${value}</b>${meterPct != null ? `<div class="meter"><span style="width:${Math.max(0, Math.min(100, meterPct))}%"></span></div>` : ""}</div>`;
    stats.innerHTML =
        tile("Health", player.health, player.health) +
        tile("Wealth", player.gold) +
        tile("Prestige", player.prestige) +
        tile("Piety", player.piety) +
        tile("Power", power.toLocaleString()) +
        tile("Standing", standing != null ? `${standing}%` : "—", standing) +
        tile("Safety", safety.label);
    hud.appendChild(stats);

    const dock = document.getElementById("dock");
    clearEl(dock);
    const advanceBtn = el("button", "dock-btn", "⏭ <span>Advance a year</span>");
    advanceBtn.disabled = !player.alive || gameState.gameOver;
    advanceBtn.addEventListener("click", () => {
        advanceYear();
        saveGame();
        renderPlay();
    });
    dock.appendChild(advanceBtn);
    DOCK_VIEWS.forEach(v => {
        const badge = dockBadge(gameState, v.key);
        const btn = el("button", `dock-btn${_playViewTab === v.key ? " active" : ""}`, `${v.icon} <span>${v.name}</span>${badge ? `<em class="dock-badge">${badge}</em>` : ""}`);
        btn.addEventListener("click", () => { _playViewTab = v.key; renderPlay(); });
        dock.appendChild(btn);
    });

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

    if (_playViewTab === "military") {
        const summary = makeCard("Your forces", `
            <div class="stat"><span>Vassal levies</span><span>${totalLevies(gameState).toLocaleString()}</span></div>
            <div class="stat"><span>Personal levies (from in-hand keeps)</span><span>${(player.personalLevies || 0).toLocaleString()}</span></div>
            <div class="stat"><span>Standing army + mercenaries</span><span>${standingPower(gameState).toLocaleString()}</span></div>
            <div class="stat"><span><strong>Total military power</strong></span><span><strong>${playerMilitaryPower(gameState).toLocaleString()}</strong></span></div>
            <div class="stat"><span>Upkeep (standing army + mercenaries, per year)</span><span>${standingUpkeep(gameState)} gold</span></div>
        `);
        view.appendChild(summary);

        TROOP_TYPES.forEach(type => {
            const count = getTroopCount(gameState, type.key);
            const card = makeCard(`${type.name} — ${count.toLocaleString()}`, `<p class="muted">${type.desc} Quality ${type.quality} · ${type.upkeep} gold upkeep each per year.</p>`);
            if (!gameState.gameOver) {
                [10, 50, 200].forEach(amount => {
                    const cost = recruitTroopCost(gameState, type.key, amount);
                    card.appendChild(makeChoiceButton(`Recruit ${amount} (${cost} gold)`, () => {
                        recruitTroops(gameState, type.key, amount);
                        saveGame();
                        renderPlay();
                    }, player.gold < cost));
                });
                if (count > 0) {
                    card.appendChild(makeChoiceButton(`Disband ${Math.min(50, count)}`, () => {
                        disbandTroops(gameState, type.key, Math.min(50, count));
                        saveGame();
                        renderPlay();
                    }));
                }
            }
            view.appendChild(card);
        });

        const mercCard = makeCard("Mercenary companies", '<p class="muted">Expensive, loyal only to gold, and ready now — a burst of strength no muster can match on short notice.</p>');
        if (!gameState.gameOver) {
            mercCard.appendChild(makeChoiceButton("Hire a mercenary company", () => {
                hireMercenaries(gameState);
                saveGame();
                renderPlay();
            }));
        }
        (gameState.military.mercenaries || []).forEach((m, i) => {
            const row = el("div", "stat", `<span>${m.name} — ${m.count.toLocaleString()} troops, quality ${m.quality}</span><span>${m.costPerYear} gold/yr</span>`);
            if (!gameState.gameOver) {
                row.appendChild(makeChoiceButton("Dismiss", () => {
                    dismissMercenaries(gameState, i);
                    saveGame();
                    renderPlay();
                }));
            }
            mercCard.appendChild(row);
        });
        view.appendChild(mercCard);
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

        const minorChildren = children.filter(c => canSetEducation(c));
        if (minorChildren.length) {
            const eduCard = makeCard("Their upbringing", "");
            minorChildren.forEach(c => {
                const focusKey = getEducationFocus(gameState, c.id);
                const focus = EDUCATION_FOCI.find(f => f.key === focusKey);
                const row = el("div", null, avatarRow(c, `<strong>${c.name}</strong>, age ${c.age} — ${focus ? `being raised in ${focus.name.toLowerCase()}` : "no course of education set"}`));
                if (!gameState.gameOver) {
                    const selectRow = el("div", null, "");
                    selectRow.style.display = "flex";
                    selectRow.style.gap = "8px";
                    selectRow.style.alignItems = "center";
                    selectRow.style.margin = "6px 0 12px";
                    const select = document.createElement("select");
                    EDUCATION_FOCI.forEach(f => {
                        const opt = document.createElement("option");
                        opt.value = f.key;
                        opt.textContent = f.name;
                        if (f.key === focusKey) opt.selected = true;
                        select.appendChild(opt);
                    });
                    selectRow.appendChild(select);
                    selectRow.appendChild(makeChoiceButton("Set", () => {
                        setEducationFocus(gameState, c.id, select.value);
                        saveGame();
                        renderPlay();
                    }));
                    row.appendChild(selectRow);
                }
                eduCard.appendChild(row);
            });
            view.appendChild(eduCard);
        }

        if (!gameState.gameOver && player.churchTier == null) {
            let target = player;
            if (_marriageTargetId && _marriageTargetId !== player.id) {
                const candidate = getPerson(gameState, _marriageTargetId);
                if (candidate && isAvailableToMarry(gameState, candidate.id)) {
                    target = candidate;
                } else {
                    resetMarriageFlow();
                }
            }
            if (isAvailableToMarry(gameState, target.id)) {
                renderMarriageSection(view, gameState, target);
            }

            if (target.id === player.id) {
                const marriageableChildren = children.filter(c => c.alive && isAvailableToMarry(gameState, c.id));
                if (marriageableChildren.length) {
                    const childCard = makeCard("Arrange a child's marriage", "");
                    marriageableChildren.forEach(c => {
                        const row = el("div", "stat", avatarRow(c, `<strong>${c.name}</strong>, age ${c.age}`));
                        row.appendChild(makeChoiceButton("Arrange a marriage", () => {
                            resetMarriageFlow();
                            _marriageTargetId = c.id;
                            renderPlay();
                        }));
                        childCard.appendChild(row);
                    });
                    view.appendChild(childCard);
                }
            }
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

        // Not the sovereign yourself? There's a real choice every year:
        // stay home and run your own lands, or go to the realm's actual
        // royal court and build closeness with the crown.
        if (canAttendRoyalCourt(gameState)) {
            const realm = getRealm(gameState.realmKey);
            const rc = gameState.royalCourt;
            const atCourt = isAtRoyalCourt(gameState);
            const rcCard = makeCard(`The court of ${realm.ruler.name}`, `
                <div class="stat"><span>Currently</span><span>${atCourt ? `At court` : `On your own lands`}</span></div>
                <div class="stat"><span>Favor with ${realm.ruler.name}</span><span>${rc.favor}</span></div>
                ${rc.status ? `<div class="stat"><span>Standing</span><span>${rc.status}</span></div>` : ""}
                <p class="muted">Being away from home costs real domain income — there's no managing your lands from the capital.</p>
            `);
            if (!gameState.gameOver) {
                if (atCourt) {
                    rcCard.appendChild(makeChoiceButton("Return to your own lands", () => {
                        returnHome(gameState);
                        saveGame();
                        renderPlay();
                    }));
                    rcCard.appendChild(makeChoiceButton("Pay your respects", () => {
                        payRespects(gameState);
                        saveGame();
                        renderPlay();
                    }));
                    rcCard.appendChild(makeChoiceButton("Seek closer favor (50 gold)", () => {
                        seekCloserFavor(gameState);
                        saveGame();
                        renderPlay();
                    }, player.gold < 50));
                    if (!rc.status) {
                        rcCard.appendChild(makeChoiceButton(`Become ${royalFavoriteTitle(gameState)}`, () => {
                            becomeFavorite(gameState);
                            saveGame();
                            renderPlay();
                        }, !canBecomeFavorite(gameState)));
                    }
                } else {
                    rcCard.appendChild(makeChoiceButton(`Travel to ${realm.ruler.name}'s court`, () => {
                        travelToCourt(gameState);
                        saveGame();
                        renderPlay();
                    }));
                }
            }
            view.appendChild(rcCard);
        }
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
