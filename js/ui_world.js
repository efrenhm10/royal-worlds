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

// Leaves the current line (dead or not) and returns to the boot screen —
// the save already on disk (saveGame() runs after every action) is left
// in place so "Continue" can still pick it back up.
function goToMainMenu() {
    returnToMainMenu();
    resetMarriageFlow();
    _playViewTab = "chronicle";
    _selectedEraKey = null;
    _selectedRealmKey = null;
    const continueBtn = document.getElementById("continueBtn");
    if (continueBtn) {
        continueBtn.disabled = !hasSavedGame();
        continueBtn.textContent = hasSavedGame() ? "Continue" : "Continue (no save yet)";
    }
    showScreen("boot");
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
    // Not every realm has a king or queen to marry into — Burgundy and
    // Brittany stop at Duke, Florence at Signore — so the category is
    // labeled with whatever this realm's ruling house actually is,
    // rather than always implying a crown.
    const rulingFamilyLabel = realmTopTier(_marriageRealmKey) >= 5 ? "Royal family" : "Ruling family";

    if (!_marriageCategory) {
        const card = makeCard(`${isSelf ? "A match" : `A match for ${target.name}`} in ${realm.name}`, `<p class="muted">The ${rulingFamilyLabel.toLowerCase()} itself, or the wider noble line?</p>`);
        card.appendChild(makeChoiceButton("← Choose a different realm", () => { _marriageRealmKey = null; renderPlay(); }));
        card.appendChild(makeChoiceButton(rulingFamilyLabel, () => { _marriageCategory = "royal"; renderPlay(); }));
        card.appendChild(makeChoiceButton("Noble line", () => { _marriageCategory = "noble"; renderPlay(); }));
        view.appendChild(card);
        return;
    }

    const card = makeCard(`${_marriageCategory === "royal" ? rulingFamilyLabel : "Noble line"} of ${realm.name}`, "");
    card.appendChild(makeChoiceButton("← Choose a different kind of match", () => { _marriageCategory = null; renderPlay(); }));
    const candidates = generateMarriageCandidatesForRealm(gameState, _marriageRealmKey, _marriageCategory, target);
    candidates.forEach(candidate => {
        const title = personDisplayTitle(candidate);
        const cost = marriageCost(effectiveStation(target), effectiveStation(candidate));
        const shame = marriageShame(effectiveStation(target), effectiveStation(candidate));
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
    const topTier = realmTopTier(realmKey);
    const topLabel = realm.titleM === realm.titleF ? realm.titleM : `${realm.titleM}/${realm.titleF}`;
    document.getElementById("characterCreateIntro").textContent =
        `Choose your rank in ${realm.name} — gentry through ${topLabel} — then pick which life to live.`;

    const list = document.getElementById("characterList");
    clearEl(list);
    // Not every realm's ladder tops out at King/Queen (Burgundy and
    // Brittany stop at Duke, Florence at Signore) — the picker only goes
    // as high as this realm's own rank actually reaches, and names that
    // top rank the way this realm actually names it (Archduke, Doge,
    // Voivode, Pope, Sultan...), not the generic ladder word.
    TITLE_LADDER.filter(t => t.tier <= topTier).forEach(tierInfo => {
        const isTop = tierInfo.tier === topTier;
        const name = isTop ? realmTopTitle(realmKey, "M") : titleName(tierInfo.tier, "M", realmKey);
        const nameF = isTop ? realmTopTitle(realmKey, "F") : titleName(tierInfo.tier, "F", realmKey);
        const label = name === nameF ? name : `${name} / ${nameF}`;
        const card = makeCard(label, `<p class="muted">${TIER_BLURBS[tierInfo.tier] || ""}</p>`);
        const btn = makeChoiceButton(`Play a ${label}`, () => {
            renderCandidatesForTier(eraKey, realmKey, tierInfo.tier);
        });
        card.appendChild(btn);
        list.appendChild(card);
    });
}

function candidateCard(eraKey, realmKey, candidate) {
    const title = personDisplayTitle(candidate);
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
    if (tier === realmTopTier(realmKey)) {
        list.appendChild(candidateCard(eraKey, realmKey, createRulerCharacter(realmKey)));
        list.appendChild(candidateCard(eraKey, realmKey, createRulerRelativeCandidate(realmKey, "sibling")));
        list.appendChild(candidateCard(eraKey, realmKey, createRulerRelativeCandidate(realmKey, "child")));
    }

    const candidates = generateCandidatesForTier(realmKey, tier, 4);
    candidates.forEach(candidate => list.appendChild(candidateCard(eraKey, realmKey, candidate)));
}

let _playViewTab = "chronicle";
// Which half of the center log card is showing: your own court life, or
// the wider world's history. Both read the same gameState.log — only the
// [World] tag (set by canon.js for entries with no direct stakeholder)
// decides which side an entry lands on.
let _chronicleSubTab = "personal";
// Which realm's dossier is showing on The Theater's map — defaults to
// the player's own home realm on first visit.
let _selectedTheaterRealm = null;

// Court standing isn't tracked as its own number — it's what vassals
// actually think of you, averaged, the same "respect" a real court would
// gossip about.
function courtStanding(gameState) {
    const people = getVassals(gameState);
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

// The people actually around the player right now, described the way a
// real court would talk about them — not a roster, a cast. This is the
// first thing the player sees: who you can trust, who's circling you,
// what your own marriage actually feels like — before any number does.
function renderCastOfCharacters(gameState) {
    const player = gameState.player;
    const people = [];

    const spouse = getSpouse(gameState, player.id);
    if (spouse && spouse.alive) {
        people.push({
            person: spouse,
            role: "your spouse",
            line: `${personalityFlavor(spouse)}.`,
            relative: true,
        });
    }

    const courtiers = getVassals(gameState);
    if (courtiers.length) {
        const ally = [...courtiers].sort((a, b) => b.opinion - a.opinion)[0];
        const rival = [...courtiers].sort((a, b) => a.opinion - b.opinion)[0];
        if (ally && ally.opinion >= 55) {
            people.push({ person: ally, role: "closest to you at court", line: `${relationshipLabel(ally.opinion)} — ${personalityFlavor(ally)}.` });
        }
        if (rival && rival.opinion < 45 && rival !== ally) {
            people.push({ person: rival, role: "a name to watch", line: `${relationshipLabel(rival.opinion)} — ${personalityFlavor(rival)}.` });
        }
    }

    if (gameState.faction) {
        const leader = gameState.vassals[gameState.faction.memberIds[0]];
        if (leader) {
            people.push({ person: leader, role: "openly scheming against you", line: `demanding ${gameState.faction.type === "depose" ? "your abdication" : "independence"} — and not alone in it.` });
        }
    }

    if (gameState.royalCourt && gameState.royalCourt.status) {
        const realm = getRealm(gameState.realmKey);
        people.push({ person: { name: realm.ruler.name, gender: realm.ruler.gender, tier: realmTopTier(gameState.realmKey), alive: true, id: "ruler-" + gameState.realmKey }, role: `the ${realmTopTitle(gameState.realmKey, realm.ruler.gender)} you serve`, line: `you are ${gameState.royalCourt.status} — favor ${gameState.royalCourt.favor}.` });
    }

    const children = getChildren(gameState, player.id).filter(c => c.alive);
    children.slice(0, 2).forEach(child => {
        const grown = child.age >= 16;
        const focusKey = grown ? null : getEducationFocus(gameState, child.id);
        const focus = focusKey && EDUCATION_FOCI.find(f => f.key === focusKey);
        const line = child.spouseId
            ? `married now, and making their own way${child.royalHouseKey ? ` with royal blood of ${getRealm(child.royalHouseKey).name} in their children to come` : ""}.`
            : grown
                ? `of an age to be married off, if the right match can be found.`
                : focus
                    ? `being raised for ${focus.name.toLowerCase()}, still too young to know what it will make of them.`
                    : `still a child, growing up watching everything you do.`;
        people.push({ person: child, role: `your ${child.gender === "F" ? "daughter" : "son"}, age ${child.age}`, line, relative: true });
    });

    const parents = getParents(gameState, player.id).filter(p => p.alive);
    parents.forEach(parent => {
        people.push({ person: parent, role: parent.gender === "F" ? "your mother" : "your father", line: `${personalityFlavor(parent)}, and still watching how you carry the family name.`, relative: true });
    });

    if (!people.length) return null;

    const card = makeCard("Your Circle", "");
    people.forEach(({ person, role, line, relative }) => {
        const row = el("div", "stat", avatarRow(person, `<strong>${person.name}</strong> <span class="muted">— ${role}</span><br><span class="muted">${line}</span>`));
        card.appendChild(row);
        if (relative && !gameState.gameOver) appendRelativeActions(card, gameState, person.id);
    });
    return card;
}

// The thing the earlier version of this game had and this one didn't:
// family isn't just something you read about, it's loyalty you actively
// work at — ask for gold, ask for political support, send a gift, or
// simply spend real time with someone. Shared by the Your World cast and
// the Family tab's own lists.
function appendRelativeActions(container, gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive) return;
    const wrap = el("div", null, "");
    wrap.style.margin = "4px 0 14px";
    const loyalty = relativeLoyalty(person);
    wrap.appendChild(el("div", null, `<span class="muted" style="font-size:12px;">Loyalty to you: ${Math.round(loyalty)}/100</span><div class="meter" style="margin:3px 0 8px;"><span style="width:${loyalty}%"></span></div>`));
    const btnRow = el("div", null, "");
    btnRow.style.display = "flex";
    btnRow.style.flexWrap = "wrap";
    btnRow.style.gap = "6px";

    if (person.age >= 16) {
        btnRow.appendChild(makeChoiceButton("Ask for gold", () => {
            askRelativeForGold(gameState, personId);
            saveGame();
            renderPlay();
        }, !canAskRelativeForGold(gameState, personId)));

        btnRow.appendChild(makeChoiceButton("Ask for support", () => {
            askRelativeForSupport(gameState, personId);
            saveGame();
            renderPlay();
        }, !canAskRelativeForSupportSeparately(gameState, personId)));
    }

    btnRow.appendChild(makeChoiceButton("Send a gift (20 gold)", () => {
        sendGiftToRelative(gameState, personId, 20);
        saveGame();
        renderPlay();
    }, (gameState.player.gold || 0) < 20));

    btnRow.appendChild(makeChoiceButton("Spend time together", () => {
        spendTimeWithRelative(gameState, personId);
        saveGame();
        renderPlay();
    }, !canSpendTimeWithRelative(gameState, personId)));

    wrap.appendChild(btnRow);
    container.appendChild(wrap);
}

const DOCK_VIEWS = [
    { key: "chronicle", name: "Your World", icon: "🎭" },
    { key: "realms", name: "The Theater", icon: "🗺️" },
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
    if (key === "intrigue" && gameState.hostileScheme && gameState.hostileScheme.discovered) return "⚠";
    if (key === "intrigue" && gameState.war) return "⚔";
    if (key === "military" && standingUpkeep(gameState) > (gameState.player.gold || 0) && standingUpkeep(gameState) > 0) return "!";
    if (key === "family" && canTryForChild(gameState)) return "♥";
    return null;
}

function renderPlay() {
    const realm = getRealm(gameState.realmKey);
    const player = gameState.player;
    const title = player.churchTier != null ? churchRankName(player.churchTier) : fullPersonTitle(player);

    const hud = document.getElementById("hud");
    clearEl(hud);
    hud.appendChild(el("div", null, `<div style="display:flex;align-items:center;gap:14px;"><div class="player-portrait-frame">${avatarSvg(player, 76)}</div><div>
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

    // Procedural Drama Director — the succession scene is the one moment
    // the whole game hinges on, so it blocks and reads as a real scene,
    // not a log line: a bold obituary with a reign highlight, the heir's
    // declaration, and an honest, live-computed read of what they're
    // actually inheriting.
    if (gameState.pendingSuccessionScene) {
        const scene = gameState.pendingSuccessionScene;
        const sceneCard = el("div", "card decision-card succession-scene");
        sceneCard.appendChild(el("h3", null, `${scene.deceasedName} has died`));
        sceneCard.appendChild(el("p", null, `${scene.deceasedName} has passed away at age ${scene.deceasedAge}, after ${scene.highlight}.`));
        sceneCard.appendChild(el("p", null, `<strong>${scene.heirName}</strong> now succeeds as ${scene.title} of ${scene.realmName}.`));
        sceneCard.appendChild(el("p", "muted", `You inherit a realm that is ${scene.assessment}.`));
        sceneCard.appendChild(makeChoiceButton("Continue the family's story", () => {
            gameState.pendingSuccessionScene = null;
            saveGame();
            renderPlay();
        }));
        hud.appendChild(sceneCard);
    } else if (gameState.pendingDecision) {
        const decisionCard = el("div", "card decision-card");
        decisionCard.appendChild(el("h3", null, gameState.pendingDecision.title));
        decisionCard.appendChild(el("p", null, gameState.pendingDecision.text));
        gameState.pendingDecision.options.forEach((option, index) => {
            const btn = makeChoiceButton(option.label, () => {
                resolveDecision(gameState, index);
                saveGame();
                renderPlay();
            });
            decisionCard.appendChild(btn);
        });
        hud.appendChild(decisionCard);
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
        tile("Stress", stressLabel(player.stress || 0), null, (player.stress || 0) >= STRESS_BREAKING_POINT - 15 ? "hs-danger" : "") +
        tile("Safety", safety.label);
    hud.appendChild(stats);

    const dock = document.getElementById("dock");
    clearEl(dock);
    const hasPendingDecision = !!gameState.pendingDecision;
    const hasPendingScene = !!gameState.pendingSuccessionScene;
    const advanceBtn = el("button", "dock-btn", hasPendingScene ? "⏭ <span>Read what comes next, above</span>" : hasPendingDecision ? "⏭ <span>Resolve the decision below first</span>" : "⏭ <span>Advance a year</span>");
    advanceBtn.disabled = !player.alive || gameState.gameOver || hasPendingDecision || hasPendingScene;
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

    // There was never a way out of a dead line, or simply back to the
    // menu to start over — this is always available, not just on game
    // over, so no one is ever stuck.
    const menuBtn = el("button", `dock-btn back-btn${gameState.gameOver ? " btn-primary" : ""}`, gameState.gameOver ? "🏠 <span>Return to the main menu</span>" : "🏠 <span>Main Menu</span>");
    menuBtn.addEventListener("click", () => { goToMainMenu(); });
    dock.appendChild(menuBtn);

    renderPlayView();
}

// Whichever title actually applies right now: a consort tie (your
// spouse just became king, you're queen) outranks a generic land-tier
// title, which outranks nothing at all. Recomputed live every render,
// so a succession elsewhere updates everyone's title the moment it
// happens, with no separate step needed.
function fullPersonTitle(person) {
    const royalTitle = royalRelationTitle(gameState, person);
    if (royalTitle) return royalTitle;
    return personDisplayTitle(person);
}

function personLine(person, relation) {
    const alive = person.alive ? `age ${person.age}` : `died at ${person.age}`;
    const traitsLine = person.traits && person.traits.length ? ` <span class="muted">(${person.traits.join(", ")})</span>` : "";
    const title = fullPersonTitle(person);
    return avatarRow(person, `<strong>${title} ${person.name}</strong> — ${relation}, ${alive}${traitsLine}`);
}

// The Royal Diary — who you ARE right now, not the kingdom. Your own
// profile, the way a Sims panel would show it, with the people closest
// to you right below it, each with their real loyalty, not a trait tag.
function renderDiaryColumn(gameState) {
    const player = gameState.player;
    const realm = getRealm(gameState.realmKey);
    const title = player.churchTier != null ? churchRankName(player.churchTier) : fullPersonTitle(player);
    const col = el("div", "col-diary", "");

    const card = makeCard("Royal Diary", "");
    card.appendChild(el("div", null, `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;">
            <div class="player-portrait-frame">${avatarSvg(player, 88)}</div>
            <h3 style="margin:6px 0 0;">${title} ${player.name}</h3>
            <p class="muted" style="margin:0;">${realm.name} — age ${player.age}</p>
            <p class="muted" style="margin:0;">${player.traits && player.traits.length ? player.traits.join(" · ") : ""}</p>
        </div>
    `));
    const stress = player.stress || 0;
    card.appendChild(el("div", null, `<p style="margin:12px 0 2px;font-size:13px;"><strong>Stress</strong> — ${stressLabel(stress)}</p><div class="meter"><span style="width:${stress}%;background:linear-gradient(90deg,var(--vert-bright),var(--gilt) 60%,var(--gules-bright));"></span></div>`));
    col.appendChild(card);

    const spouse = getSpouse(gameState, player.id);
    const children = getChildren(gameState, player.id).filter(c => c.alive);
    if ((spouse && spouse.alive) || children.length) {
        const relCard = makeCard("Closest to you", "");
        if (spouse && spouse.alive) {
            const loyalty = Math.round(relativeLoyalty(spouse));
            relCard.appendChild(el("div", "stat", avatarRow(spouse, `<strong>${spouse.name}</strong><br><span class="muted">spouse — loyalty ${loyalty}</span>`)));
        }
        children.slice(0, 3).forEach(c => {
            const loyalty = Math.round(relativeLoyalty(c));
            relCard.appendChild(el("div", "stat", avatarRow(c, `<strong>${c.name}</strong><br><span class="muted">${c.gender === "F" ? "daughter" : "son"}, age ${c.age} — loyalty ${loyalty}</span>`)));
        });
        col.appendChild(relCard);
    }
    return col;
}

function renderPlayView() {
    const view = document.getElementById("view");
    clearEl(view);
    const player = gameState.player;

    if (_playViewTab === "chronicle") {
        const grid = el("div", "cols3", "");

        grid.appendChild(renderDiaryColumn(gameState));

        const dramaCol = el("div", "col-drama", "");
        const logCard = makeCard("", "");
        // Personal Court Chronicles vs. Geopolitical Chronicles — the same
        // gameState.log, split by the "[World]" tag canon.js already
        // applies to entries with no direct stakeholder. Your own life is
        // the default view; the wider world's history is one click away
        // rather than hidden entirely.
        const tabRow = el("div", "sub-tab-row", "");
        const personalBtn = el("button", `sub-tab-btn${_chronicleSubTab === "personal" ? " active" : ""}`, "Personal Court Chronicles");
        personalBtn.addEventListener("click", () => { _chronicleSubTab = "personal"; renderPlay(); });
        const worldBtn = el("button", `sub-tab-btn${_chronicleSubTab === "geopolitical" ? " active" : ""}`, "Geopolitical Chronicles");
        worldBtn.addEventListener("click", () => { _chronicleSubTab = "geopolitical"; renderPlay(); });
        tabRow.appendChild(personalBtn);
        tabRow.appendChild(worldBtn);
        logCard.appendChild(tabRow);

        const isWorld = _chronicleSubTab === "geopolitical";
        const entries = gameState.log.filter(e => isWorld === e.text.startsWith("[World]")).slice(-12).reverse();
        if (!entries.length) {
            logCard.appendChild(el("p", "muted", isWorld
                ? "The wider world holds still, for now — no great news has reached here yet."
                : "Nothing has happened yet — the story starts now."));
        }
        entries.forEach(e => logCard.appendChild(el("p", "muted", `${e.year} — ${isWorld ? e.text.replace(/^\[World\] /, "") : e.text}`)));
        dramaCol.appendChild(logCard);
        grid.appendChild(dramaCol);

        const socialCol = el("div", "col-social", "");
        const castCard = renderCastOfCharacters(gameState);
        if (castCard) socialCol.appendChild(castCard);
        else socialCol.appendChild(makeCard("Your circle", '<p class="muted">No one close to you yet, or standing out at court. That will change.</p>'));
        grid.appendChild(socialCol);

        view.appendChild(grid);
        return;
    }

    // The Theater's shared status read — one realm's live situation,
    // reused by both the map node's color and the dossier panel's status
    // line so the two never disagree.
    function theaterRealmStatus(gs, realm) {
        const isHome = realm.key === gs.realmKey;
        const atWar = gs.war && gs.war.targetRealmKey === realm.key;
        const tied = (gs.claims || []).some(c => c.realmKey === realm.key && c.type === "marriage");
        const tracked = gs.foreignRoyals && gs.foreignRoyals[realm.key];
        const ruler = tracked ? getPerson(gs, tracked) : null;
        const rulerAlive = ruler && ruler.alive;
        const stability = effectiveStability(gs, realm.key);

        if (isHome) return { fill: "var(--gilt-bright)", statusLine: "Your own realm" };
        if (atWar) return { fill: "var(--gules-bright)", statusLine: "At war with you" };
        if (tracked && !rulerAlive) return { fill: "var(--gules)", statusLine: "The throne stands empty" };
        if (tied) return { fill: "var(--gilt)", statusLine: "Bound to your family by marriage" };
        if (stability < 35) return { fill: "#8a6a4a", statusLine: `Stability ${stability} — unstable` };
        return { fill: "var(--panel-border)", statusLine: `Stability ${stability}` };
    }

    // A real territory map — realm_shapes.js's actual historical-border
    // outlines (15 of 22 from a real 1492-snapshot dataset, the nearest
    // year available; 7 hand-approximated where that source doesn't
    // carry them separately), filled by each realm's live status.
    // Clicking a territory selects it for the dossier panel; it updates
    // every render, so a war, a marriage tie, or a throne falling empty
    // shows up here the moment it happens.
    function renderTheaterMapSvg(gs) {
        const realms = listRealms();
        const shapes = realms.map(realm => {
            const d = REALM_SHAPE_PATHS[realm.key];
            if (!d) return "";
            const status = theaterRealmStatus(gs, realm);
            const selected = realm.key === _selectedTheaterRealm;
            return `<path class="theater-node" data-realm="${realm.key}" d="${d}" fill="${status.fill}" fill-opacity="0.82" stroke="${selected ? "var(--ink)" : "var(--bg-deep)"}" stroke-width="${selected ? 0.45 : 0.18}" />`;
        }).join("");

        const labels = realms.map(realm => {
            const c = REALM_SHAPE_CENTROIDS[realm.key];
            if (!c) return "";
            return `<text class="theater-node" data-realm="${realm.key}" x="${c.x}" y="${c.y}" font-size="2.3" fill="var(--ink)" text-anchor="middle" paint-order="stroke" stroke="var(--bg-deep)" stroke-width="0.35">${realm.name}</text>`;
        }).join("");

        return `<svg viewBox="${REALM_MAP_VIEWBOX}" style="width:100%;height:auto;display:block;" preserveAspectRatio="xMidYMid meet">${shapes}${labels}</svg>`;
    }

    // The click-through dossier — everything The Theater's old flat card
    // grid showed (ruler, status, relations) plus the realm's real
    // historical texture (realms.js's dossier field): government,
    // institutions, industries, resources, the peoples who actually live
    // there, the real political fault lines, and what's actually strong
    // or fragile about it right now.
    function renderRealmDossierPanel(gs, realmKey) {
        const realm = getRealm(realmKey);
        const isHome = realmKey === gs.realmKey;
        const status = theaterRealmStatus(gs, realm);
        const tracked = gs.foreignRoyals && gs.foreignRoyals[realmKey];
        const ruler = tracked ? getPerson(gs, tracked) : null;
        const rulerAlive = ruler && ruler.alive;
        const rulerName = rulerAlive ? ruler.name : realm.ruler.name;
        const rulerTitle = rulerAlive ? realmTopTitle(realmKey, ruler.gender) : realmTopTitle(realmKey, realm.ruler.gender);
        const relations = !isHome && typeof relationsWith === "function" ? relationsWith(gs, realmKey) : null;
        const d = realm.dossier || {};
        const govLabel = { hereditary: "Hereditary", elective: "Elective", theocratic: "Theocratic (elected)" }[realm.government] || realm.government;

        const listBlock = (label, items) => (items && items.length)
            ? `<p class="muted" style="margin:8px 0 2px;"><strong>${label}</strong></p><ul style="margin:0 0 2px 18px;padding:0;">${items.map(i => `<li class="muted" style="font-size:13px;">${i}</li>`).join("")}</ul>`
            : "";

        const body = `
            ${d.vibe ? `<p style="margin:2px 0 8px;font-style:italic;">${d.vibe}</p>` : ""}
            <p class="muted" style="margin:2px 0;">${gs.year} — ${rulerTitle} ${rulerName}${tracked ? (rulerAlive ? " (your own bloodline)" : "") : ""}</p>
            <p class="muted" style="margin:2px 0;font-size:13px;">${status.statusLine}</p>
            ${relations != null ? `<p class="muted" style="margin:2px 0;font-size:13px;">Relations: ${relations}/100</p>` : ""}
            ${d.narrativeHook ? `<p style="margin:10px 0;padding:8px 10px;border:1px solid var(--gilt);border-radius:6px;background:rgba(201,151,26,0.08);font-size:13px;">${d.narrativeHook}</p>` : ""}
            <p class="muted" style="margin:8px 0 2px;"><strong>Government:</strong> ${govLabel}${realm.note ? ` — ${realm.note}` : ""}</p>
            ${listBlock("Institutions", d.institutions)}
            ${listBlock("Major industries", d.majorIndustries)}
            ${listBlock("Resources", d.resources)}
            ${listBlock("Peoples", d.culturalGroups)}
            ${listBlock("Political fault lines", d.politicalConflicts)}
            ${listBlock("Strongest factions", d.strongestFactions)}
            ${listBlock("Major problems", d.majorProblems)}
            ${listBlock("Major advantages", d.majorAdvantages)}
        `;

        const card = makeCard(realm.name, body);
        if (!isHome && !gs.gameOver && typeof sendEnvoy === "function") {
            card.appendChild(makeChoiceButton(`Send an envoy (${ENVOY_COST} gold)`, () => {
                sendEnvoy(gs, realmKey);
                saveGame();
                renderPlay();
            }, !canSendEnvoy(gs, realmKey)));
        }
        return card;
    }

    // The Theater — a strategic overview of every realm in play, not a
    // literal map: elegant cards instead of ASCII geography, each one
    // reading the realm's actual live state (a tracked succession, a war,
    // a marriage tie, its stability) rather than a static flavor blurb.
    if (_playViewTab === "realms") {
        if (!_selectedTheaterRealm || !getRealm(_selectedTheaterRealm)) _selectedTheaterRealm = gameState.realmKey;

        const layout = el("div", "theater-layout", "");
        const mapCard = makeCard("The map of Europe, 1461", renderTheaterMapSvg(gameState));
        mapCard.querySelectorAll(".theater-node").forEach(node => {
            node.addEventListener("click", () => {
                _selectedTheaterRealm = node.getAttribute("data-realm");
                renderPlay();
            });
        });
        layout.appendChild(mapCard);
        layout.appendChild(renderRealmDossierPanel(gameState, _selectedTheaterRealm));
        view.appendChild(layout);
        return;
    }

    if (_playViewTab === "domain") {
        const holdings = getDomain(gameState);
        const vassals = getVassals(gameState);

        // "How much my lands are bringing in" — the same real numbers
        // tickDomain applies every year, added up front rather than
        // left to be inferred from watching the gold counter move.
        if (holdings.length) {
            const totals = domainIncomeSummary(gameState);
            const bits = [];
            if (totals.gold) bits.push(`${totals.gold} gold/yr`);
            if (totals.levies) bits.push(`${totals.levies} levies`);
            if (totals.piety) bits.push(`${totals.piety} piety/yr`);
            view.appendChild(makeCard("Your lands, this year", `<p class="muted">${bits.length ? bits.join(" · ") : "Nothing in hand is yielding yet."}</p>`));
        } else {
            view.appendChild(makeCard("Your demesne", '<p class="muted">No holdings of your own yet — that comes with a landed title.</p>'));
        }

        // How you choose to run what's in hand — a standing policy, not a
        // one-off purchase, giving "invest in my lands or extract from
        // them" a real, ongoing answer rather than only buy/develop clicks.
        if (holdings.length) {
            const activePolicy = domainPolicy(gameState);
            const policyCard = makeCard("How you run your lands", `<p class="muted">Currently: <strong>${activePolicy.name}</strong> — ${activePolicy.desc}</p>`);
            Object.values(DOMAIN_POLICIES).forEach(p => {
                if (p.key === activePolicy.key) return;
                policyCard.appendChild(makeChoiceButton(`Switch to ${p.name} — ${p.desc}`, () => {
                    setDomainPolicy(gameState, p.key);
                    saveGame();
                    renderPlay();
                }, !!gameState.gameOver));
            });
            view.appendChild(policyCard);
        }

        holdings.forEach(holding => {
            const typeInfo = HOLDING_TYPES.find(t => t.key === holding.type);
            const vassal = holding.grantedToVassalId ? vassals.find(v => v.id === holding.grantedToVassalId) : null;
            const status = vassal ? `granted to ${vassal.name}` : "in hand";
            const currentYield = holdingYieldLine(holdingYield(gameState, holding));
            const card = makeCard(`${typeInfo.name} (level ${holding.level}) — ${status}`, `<p class="muted">${typeInfo.desc}</p><p class="muted">Currently producing: ${currentYield}</p>`);
            if (!gameState.gameOver) {
                if (vassal) {
                    card.appendChild(makeChoiceButton("Revoke", () => {
                        revokeHolding(gameState, holding.id);
                        saveGame();
                        renderPlay();
                    }, !crownAuthorityInfo(gameState.crownAuthority[gameState.realmKey] || 0).canRevokeTitlesFreely));
                } else {
                    const nextYield = holdingYieldLine(holdingYield(gameState, holding, holding.level + 1));
                    card.appendChild(el("p", "muted", `At level ${holding.level + 1}: ${nextYield}`));
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

        // Proactive frontier defense — a standing investment, not a
        // per-year reaction: once built, it nullifies border-raid risk
        // (decisions.js) outright rather than just softening it.
        const frontierNeighbors = typeof neighborsOf === "function" ? neighborsOf(gameState.realmKey) : [];
        if (frontierNeighbors.length) {
            const fortifyBody = gameState.borderFortified
                ? `<p class="muted">The frontier is fortified — walls, watchtowers, and standing garrisons. Raiders look elsewhere.</p>`
                : `<p class="muted">Bordering ${frontierNeighbors.map(k => getRealm(k).name).join(", ")}. An unfortified frontier is exposed to raids when a neighbor turns unstable or hostile.</p>`;
            const fortifyCard = makeCard("Frontier defense", fortifyBody);
            if (!gameState.gameOver && !gameState.borderFortified) {
                fortifyCard.appendChild(makeChoiceButton(`Fortify the border (${BORDER_FORTIFICATION_COST} gold)`, () => {
                    fortifyBorder(gameState);
                    saveGame();
                    renderPlay();
                }, !canFortifyBorder(gameState)));
            }
            view.appendChild(fortifyCard);
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
            if (!gameState.gameOver) appendRelativeActions(card, gameState, spouse.id);
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
        parents.forEach(p => {
            card.appendChild(el("div", null, personLine(p, p.gender === "F" ? "mother" : "father")));
            if (!gameState.gameOver) appendRelativeActions(card, gameState, p.id);
        });
        if (children.length) {
            card.appendChild(el("h3", null, "Children"));
            children.forEach(c => {
                card.appendChild(el("div", null, personLine(c, c.gender === "F" ? "daughter" : "son")));
                if (!gameState.gameOver) appendRelativeActions(card, gameState, c.id);
            });
        }
        card.appendChild(el("h3", null, `Siblings (${siblings.length})`));
        siblings.forEach(s => {
            card.appendChild(el("div", null, personLine(s, s.gender === "F" ? "sister" : "brother")));
            if (!gameState.gameOver) appendRelativeActions(card, gameState, s.id);
        });
        card.appendChild(el("h3", null, `Nieces & nephews (${niecesNephews.length})`));
        niecesNephews.forEach(n => card.appendChild(el("div", null, personLine(n, n.gender === "F" ? "niece" : "nephew"))));
        card.appendChild(el("h3", null, `Aunts & uncles (${auntsUncles.length})`));
        auntsUncles.forEach(a => {
            card.appendChild(el("div", null, personLine(a, a.gender === "F" ? "aunt" : "uncle")));
            if (!gameState.gameOver) appendRelativeActions(card, gameState, a.id);
        });
        card.appendChild(el("h3", null, `Cousins (${cousins.length})`));
        cousins.forEach(c => card.appendChild(el("div", null, personLine(c, "cousin"))));
        view.appendChild(card);

        if (gameState.foreignRoyals) {
            Object.keys(gameState.foreignRoyals).forEach(realmKey => {
                const line = foreignSuccessionLine(gameState, realmKey);
                if (!line) return;
                const lineRealm = getRealm(realmKey);
                const lineCard = makeCard(`Line of succession — ${lineRealm.name}`, "");
                if (!line.ruler.alive) {
                    lineCard.appendChild(el("p", "muted", `The house has died out — no one remains to hold the seat.`));
                } else {
                    const rulerTitle = realmTopTitle(realmKey, line.ruler.gender);
                    lineCard.appendChild(el("p", null, `<strong>${rulerTitle} ${line.ruler.name}</strong>, age ${line.ruler.age}, currently holds the seat.`));
                    if (!line.order.length) {
                        lineCard.appendChild(el("p", "muted", "No living heir is known yet."));
                    } else {
                        line.order.forEach((person, index) => {
                            const isOurs = person.id === gameState.player.id || person.id === gameState.player.spouseId
                                || person.fatherId === gameState.player.id || person.motherId === gameState.player.id
                                || (gameState.player.spouseId && (person.fatherId === gameState.player.spouseId || person.motherId === gameState.player.spouseId));
                            const tag = isOurs ? ' <span class="muted">— your family</span>' : "";
                            lineCard.appendChild(el("div", null, `<strong>${index + 1}.</strong> ${personLine(person, index === 0 ? "heir apparent" : `in line (${index + 1})`)}${tag}`));
                        });
                    }
                }
                view.appendChild(lineCard);
            });
        }

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
        // Not the sovereign yourself? There's a real choice every year:
        // stay home and run your own lands, or go to the realm's actual
        // royal court and build closeness with the crown — shown first,
        // since it's the most personal, active thing on this whole tab.
        if (canAttendRoyalCourt(gameState)) {
            const realm = getRealm(gameState.realmKey);
            const rc = gameState.royalCourt;
            const atCourt = isAtRoyalCourt(gameState);
            const rulerAvatar = avatarSvg({ name: realm.ruler.name, id: "ruler-" + gameState.realmKey, tier: realmTopTier(gameState.realmKey), gender: realm.ruler.gender, alive: true }, 36);
            const rcCard = makeCard(`${rulerAvatar} The court of ${realm.ruler.name}`, `
                <div class="stat"><span>Currently</span><span>${atCourt ? `At court` : `On your own lands`}</span></div>
                <div class="stat"><span>Favor with ${realm.ruler.name}</span><span>${rc.favor}</span></div>
                ${rc.status ? `<div class="stat"><span>Standing</span><span><strong>${rc.status}</strong></span></div>` : '<p class="muted">Win enough favor and you could become the ruler\'s favorite — their mistress, or their closest confidant(e) — with real standing and real risk.</p>'}
                <p class="muted">Being away from home costs real domain income — there's no managing your lands from the capital.</p>
            `);
            rcCard.classList.add("royal-court-card");
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

        const vassals = getVassals(gameState);
        const card = makeCard("Your court", vassals.length ? "" : '<p class="muted">You command no vassals of your own yet — a higher title will bring them.</p>');
        vassals.forEach(v => {
            const vTitle = titleName(v.tier, v.gender, gameState.realmKey);
            card.appendChild(el("div", "stat", avatarRow(v, `
                <strong>${vTitle} ${v.name}</strong><br>
                <span class="muted">${relationshipLabel(v.opinion)} — ${personalityFlavor(v)}. ${v.levies} levies to call on.</span>
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
        // A hostile scheme against the player is a real, visible, ongoing
        // threat now — not an invisible yearly dice roll. Shown first,
        // since it's the most urgent thing on this whole tab when it
        // exists at all.
        if (gameState.hostileScheme) {
            const scheme = gameState.hostileScheme;
            const schemeInfo = HOSTILE_SCHEME_TYPES[scheme.type];
            const pct = Math.round((scheme.progress / scheme.threshold) * 100);
            const schemeCard = makeCard(`⚠ A scheme is in motion`, `
                <p>${scheme.discovered ? `Your Spymaster has uncovered it: <strong>${schemeInfo.name}</strong>.` : `Something is being planned against you — its shape isn't clear yet.`}</p>
                <div class="meter" style="margin:6px 0;"><span style="width:${pct}%;background:linear-gradient(90deg,var(--gules),var(--gules-bright));"></span></div>
                <p class="muted">${scheme.discovered ? "It will strike when it's ready, unless it's rooted out first." : "Your Spymaster may yet uncover it in time to act."}</p>
            `);
            if (scheme.discovered && !gameState.gameOver) {
                schemeCard.appendChild(makeChoiceButton("Root out the conspirators (40 gold)", () => {
                    counterScheme(gameState);
                    saveGame();
                    renderPlay();
                }, !canCounterScheme(gameState)));
            }
            schemeCard.classList.add("scheme-card");
            view.appendChild(schemeCard);
        }

        // Not every one of the 18 realms is a realistic target for a given
        // character — surface the ones that actually matter: realms the
        // family already has a marriage tie to (a real stake), plus a
        // handful of the weakest rivals (the realistic prey), rather than
        // an identical wall of 18 buttons every single time.
        const tiedRealmKeys = new Set((gameState.claims || []).filter(c => c.type === "marriage").map(c => c.realmKey));
        const candidates = listRealms().filter(r => r.key !== gameState.realmKey && !hasClaim(gameState, r.key));
        const tied = candidates.filter(r => tiedRealmKeys.has(r.key));
        const weakest = candidates.filter(r => !tiedRealmKeys.has(r.key))
            .sort((a, b) => effectiveStability(gameState, a.key) - effectiveStability(gameState, b.key));
        const relevantRealms = [...tied, ...weakest].slice(0, 6);

        const claimsCard = makeCard("Fabricate a claim", '<p class="muted">A fabricated claim is what makes a future war justified, rather than naked conquest — these are the realms worth your Spymaster\'s time right now.</p>');
        if (relevantRealms.length) {
            relevantRealms.forEach(realm => {
                const tag = tiedRealmKeys.has(realm.key) ? " — a marriage tie gives this real weight" : ` — stability ${effectiveStability(gameState, realm.key)}, a realistic target`;
                const row = el("div", "stat", `<span>${realm.name}${tag}</span>`);
                const btn = makeChoiceButton("Fabricate claim", () => {
                    fabricateClaim(gameState, realm.key);
                    saveGame();
                    renderPlay();
                }, !!gameState.gameOver);
                row.appendChild(btn);
                claimsCard.appendChild(row);
            });
        } else {
            claimsCard.appendChild(el("p", "muted", "No realistic targets right now — every realm nearby is either already claimed or beyond reach."));
        }
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

        const underminCard = makeCard("Undermine a rival realm", '<p class="muted">Sown unrest weakens a rival\'s stability — and, later, their ability to resist you. The same short list of realms actually worth your attention.</p>');
        if (relevantRealms.length) {
            relevantRealms.forEach(realm => {
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
        } else {
            underminCard.appendChild(el("p", "muted", "No realistic targets right now."));
        }
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
