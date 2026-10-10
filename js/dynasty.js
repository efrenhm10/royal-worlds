// dynasty.js — the real extended family tree. Every person (player,
// parents, siblings, spouses, children, nieces/nephews, aunts/uncles,
// cousins — anyone related at all) lives in one flat registry,
// gameState.family, as a record of {id, motherId, fatherId, spouseId}.
// Siblings, aunts/uncles, nieces/nephews and cousins are never stored
// directly — they're *derived* by scanning the registry for shared parent
// ids, so the tree can never drift out of sync with itself, and a person
// seeded in at any point (marrying in, being born) is correctly related
// to everyone else without any extra bookkeeping.
//
// This is what lets a Church-career character (see church_career.js), who
// has no children of their own, still matter: their nieces, nephews and
// cousins are first-class, queryable, and the whole reason that life path
// is worth playing.

// A rough, deliberately simple survivorship curve used only for SEEDING
// relatives who already exist at game start (we don't simulate their
// whole lives retroactively) — year-to-year mortality for anyone already
// in play uses engine.js's real deathChance()/checkDeath() instead.
function stillAliveChance(age) {
    if (age < 50) return 0.9;
    if (age < 60) return 0.75;
    if (age < 70) return 0.55;
    if (age < 80) return 0.3;
    return 0.1;
}

function registerPerson(gameState, person) {
    gameState.family[person.id] = person;
    return person;
}

function getPerson(gameState, id) {
    return gameState.family[id];
}

function allFamily(gameState) {
    return Object.values(gameState.family);
}

function getChildren(gameState, id) {
    return allFamily(gameState).filter(p => p.motherId === id || p.fatherId === id);
}

function getParents(gameState, id) {
    const p = getPerson(gameState, id);
    if (!p) return [];
    return [p.motherId, p.fatherId].filter(Boolean).map(pid => getPerson(gameState, pid)).filter(Boolean);
}

function getSiblings(gameState, id) {
    const p = getPerson(gameState, id);
    if (!p) return [];
    return allFamily(gameState).filter(o =>
        o.id !== id &&
        ((p.motherId && o.motherId === p.motherId) || (p.fatherId && o.fatherId === p.fatherId))
    );
}

function getSpouse(gameState, id) {
    const p = getPerson(gameState, id);
    return p && p.spouseId ? getPerson(gameState, p.spouseId) : null;
}

function getAuntsUncles(gameState, id) {
    const result = [];
    getParents(gameState, id).forEach(parent => {
        getSiblings(gameState, parent.id).forEach(s => result.push(s));
    });
    return result;
}

function getNiecesNephews(gameState, id) {
    const result = [];
    getSiblings(gameState, id).forEach(s => {
        getChildren(gameState, s.id).forEach(c => result.push(c));
    });
    return result;
}

function getCousins(gameState, id) {
    const result = [];
    getAuntsUncles(gameState, id).forEach(au => {
        getChildren(gameState, au.id).forEach(c => result.push(c));
    });
    return result;
}

function makeRelative(realmKey, gender, age) {
    return createCharacter({ realmKey, tier: 0, gender, age: Math.max(0, age) });
}

// Generates a spouse, and 0-N children, for an already-registered person —
// shared by starting-family generation and by marriages that happen
// mid-game (tickDynasty, below).
function marryIn(gameState, personId, realmKey) {
    const person = getPerson(gameState, personId);
    if (!person || person.spouseId) return null;
    const spouseGender = person.gender === "M" ? "F" : "M";
    const spouse = makeRelative(realmKey, spouseGender, person.age + randInt(-5, 5));
    spouse.bloodline = false; // married in, not blood kin — matters for seniority-law succession
    registerPerson(gameState, spouse);
    person.spouseId = spouse.id;
    spouse.spouseId = person.id;
    return spouse;
}

// A newborn carries a courtesy title from birth, one rank below whichever
// parent outranks the other — a king's son is a prince, not a commoner,
// the moment he's born. The player's own children get this exactly the
// same way as any other family member's.
function bearChild(gameState, motherId, fatherId, realmKey) {
    const mother = getPerson(gameState, motherId);
    const father = getPerson(gameState, fatherId);
    const parentTier = Math.max((mother && mother.tier) || 0, (father && father.tier) || 0);
    const childTier = Math.max(0, parentTier - 1);
    const child = createCharacter({ realmKey, tier: childTier, gender: Math.random() < 0.5 ? "M" : "F", age: 0 });
    child.bloodline = true;
    child.motherId = motherId;
    child.fatherId = fatherId;
    registerPerson(gameState, child);
    return child;
}

function allBloodline(gameState) {
    return allFamily(gameState).filter(p => p.bloodline);
}

function generateSiblingWithFamily(gameState, realmKey, player) {
    const gender = Math.random() < 0.5 ? "M" : "F";
    const sibling = makeRelative(realmKey, gender, Math.max(0, player.age + randInt(-12, 12)));
    sibling.bloodline = true;
    sibling.motherId = player.motherId;
    sibling.fatherId = player.fatherId;
    sibling.alive = Math.random() < stillAliveChance(sibling.age);
    registerPerson(gameState, sibling);

    if (sibling.alive && sibling.age >= 16 && Math.random() < 0.7) {
        const spouse = marryIn(gameState, sibling.id, realmKey);
        if (spouse) spouse.alive = Math.random() < stillAliveChance(spouse.age);
        const mother = sibling.gender === "F" ? sibling : spouse;
        const father = sibling.gender === "M" ? sibling : spouse;
        const childCount = randInt(0, 3);
        for (let i = 0; i < childCount; i++) {
            const childAge = Math.max(0, sibling.age - randInt(16, Math.max(16, sibling.age - 1)));
            const child = bearChild(gameState, mother ? mother.id : null, father ? father.id : null, realmKey);
            child.age = childAge;
            child.alive = Math.random() < stillAliveChance(child.age);
        }
    }
    return sibling;
}

function generateParentSiblingWithFamily(gameState, realmKey, parent) {
    const gender = Math.random() < 0.5 ? "M" : "F";
    const auntUncle = makeRelative(realmKey, gender, Math.max(0, parent.age + randInt(-10, 10)));
    auntUncle.bloodline = true;
    auntUncle.motherId = parent.motherId || null;
    auntUncle.fatherId = parent.fatherId || null;
    auntUncle.alive = Math.random() < stillAliveChance(auntUncle.age);
    registerPerson(gameState, auntUncle);

    if (auntUncle.alive && auntUncle.age >= 16 && Math.random() < 0.7) {
        const spouse = marryIn(gameState, auntUncle.id, realmKey);
        if (spouse) spouse.alive = Math.random() < stillAliveChance(spouse.age);
        const childCount = randInt(0, 3);
        for (let i = 0; i < childCount; i++) {
            const childAge = Math.max(0, auntUncle.age - randInt(16, Math.max(16, auntUncle.age - 1)));
            const mother = auntUncle.gender === "F" ? auntUncle : spouse;
            const father = auntUncle.gender === "M" ? auntUncle : spouse;
            const child = bearChild(gameState, mother ? mother.id : null, father ? father.id : null, realmKey);
            child.age = childAge;
            child.alive = Math.random() < stillAliveChance(child.age);
        }
    }
    return auntUncle;
}

// Called once, at game start, to seed the player's whole starting web of
// relatives — parents, siblings (with their own spouses/children), and
// both sides' aunts/uncles (with their own spouses/children, i.e. the
// player's cousins).
// Builds a full character object pinned to an actual realms.js ruler's
// real name/gender/age/traits — used to graft the real monarch into a
// new family tree as a parent or sibling when the player chose to play
// as their child or sibling (attributes.js's _rulerLink).
function buildRulerLinkCharacter(realmKey, rulerData) {
    const c = createCharacter({ realmKey, tier: 5, gender: rulerData.gender, age: rulerData.age, name: rulerData.name });
    if (rulerData.traits) c.traits = rulerData.traits.slice();
    c.bloodline = true;
    c.alive = true;
    return c;
}

function setupDynasty(gameState) {
    gameState.family = gameState.family || {};
    const player = gameState.player;
    registerPerson(gameState, player);
    const realmKey = gameState.realmKey;
    const link = player._rulerLink || null;

    player.bloodline = true;
    let father, mother;
    if (link && link.type === "child") {
        const rulerChar = buildRulerLinkCharacter(realmKey, link.ruler);
        const otherParent = makeRelative(realmKey, rulerChar.gender === "M" ? "F" : "M", rulerChar.age + randInt(-8, 8));
        otherParent.bloodline = true;
        otherParent.alive = Math.random() < stillAliveChance(otherParent.age);
        father = rulerChar.gender === "M" ? rulerChar : otherParent;
        mother = rulerChar.gender === "F" ? rulerChar : otherParent;
    } else {
        father = makeRelative(realmKey, "M", player.age + randInt(20, 36));
        mother = makeRelative(realmKey, "F", player.age + randInt(16, 32));
        father.bloodline = true;
        mother.bloodline = true;
        father.alive = Math.random() < stillAliveChance(father.age);
        mother.alive = Math.random() < stillAliveChance(mother.age);
    }
    father.spouseId = mother.id;
    mother.spouseId = father.id;
    registerPerson(gameState, father);
    registerPerson(gameState, mother);
    player.motherId = mother.id;
    player.fatherId = father.id;

    const siblingCount = Math.max(0, Math.round((randInt(0, 4) + randInt(0, 4)) / 2) - 1);
    let rulerSiblingInjected = false;
    const injectRulerSibling = () => {
        const rulerChar = buildRulerLinkCharacter(realmKey, link.ruler);
        rulerChar.motherId = player.motherId;
        rulerChar.fatherId = player.fatherId;
        registerPerson(gameState, rulerChar);
        rulerSiblingInjected = true;
    };
    for (let i = 0; i < siblingCount; i++) {
        if (link && link.type === "sibling" && !rulerSiblingInjected) {
            injectRulerSibling();
        } else {
            generateSiblingWithFamily(gameState, realmKey, player);
        }
    }
    if (link && link.type === "sibling" && !rulerSiblingInjected) injectRulerSibling();

    // Aunts/uncles are generated relative to each parent's age whether or
    // not that parent is still alive themselves — a dead father can still
    // have living siblings.
    const paternalAuntsUncles = randInt(0, 3);
    for (let i = 0; i < paternalAuntsUncles; i++) generateParentSiblingWithFamily(gameState, realmKey, father);
    const maternalAuntsUncles = randInt(0, 3);
    for (let i = 0; i < maternalAuntsUncles; i++) generateParentSiblingWithFamily(gameState, realmKey, mother);

    logEvent(`${player.name}'s family: ${getSiblings(gameState, player.id).length} siblings, ${getAuntsUncles(gameState, player.id).length} aunts/uncles, ${getCousins(gameState, player.id).length} cousins known to history.`);
}

// Yearly hook (called by engine.js's advanceYear): ages every living
// relative, checks for deaths, and lets the tree keep growing — unmarried
// adults sometimes marry, married couples of childbearing age sometimes
// have a child — so the family stays alive rather than freezing at the
// snapshot taken at game start.
function tickDynasty(gameState) {
    const realmKey = gameState.realmKey;
    allFamily(gameState).forEach(person => {
        if (person.id === gameState.player.id) return; // player already aged in engine.js
        if (!person.alive) return;
        person.age += 1;
        if (checkDeath(person)) {
            logEvent(`${person.name} has died at ${person.age}.`);
        }
    });

    allFamily(gameState).forEach(person => {
        if (!person.alive || person.id === gameState.player.id) return;
        if (!person.spouseId && person.age >= 16 && person.age <= 45 && Math.random() < 0.08) {
            const spouse = marryIn(gameState, person.id, realmKey);
            if (spouse) logEvent(`${person.name} has married ${spouse.name}.`);
        }
    });

    // NPC couples keep the family tree growing on their own — but the
    // player's own childbearing is a deliberate action (tryForChild,
    // below), not a passive yearly dice roll, so the player and their
    // spouse are skipped here.
    allFamily(gameState).forEach(person => {
        if (!person.alive || person.gender !== "F" || person.age < 16 || person.age > 45) return;
        if (person.id === gameState.player.id || person.id === gameState.player.spouseId) return;
        const spouse = getSpouse(gameState, person.id);
        if (!spouse || !spouse.alive) return;
        if (Math.random() < 0.12) {
            const child = bearChild(gameState, person.id, spouse.id, realmKey);
            logEvent(`${person.name} and ${spouse.name} have had a child, ${child.name}.`);
        }
    });
}

function canTryForChild(gameState) {
    const player = gameState.player;
    if (!player.alive) return false;
    const spouse = getSpouse(gameState, player.id);
    if (!spouse || !spouse.alive) return false;
    const mother = player.gender === "F" ? player : spouse;
    const father = player.gender === "M" ? player : spouse;
    if (mother.age < 16 || mother.age > 45) return false;
    if (father.age < 16) return false;
    return true;
}

// A deliberate player action rather than a background roll — real agency
// over the one decision that matters most for the whole dynasty game.
function tryForChild(gameState) {
    if (!canTryForChild(gameState)) return null;
    const player = gameState.player;
    const spouse = getSpouse(gameState, player.id);
    const mother = player.gender === "F" ? player : spouse;
    const father = player.gender === "M" ? player : spouse;

    if (Math.random() < 0.35) {
        const child = bearChild(gameState, mother.id, father.id, gameState.realmKey);
        logEvent(`${mother.name} and ${father.name} have had a child, ${child.name}.`);
        return child;
    }
    logEvent(`${player.name} and ${spouse.name} have tried for a child this year, without success.`);
    return null;
}

function isAvailableToMarry(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive || person.age < 16) return false;
    const spouse = getSpouse(gameState, personId);
    return !spouse || !spouse.alive;
}

// A handful of marriage prospects for the player specifically — drawn from
// a spread of realms (including the player's own) so a match can be a
// local arrangement or a cross-border one, same flavor as a real medieval
// court weighing a match's foreign-alliance value against convenience.
function generateMarriageCandidates(gameState, count) {
    const n = count || 3;
    const player = gameState.player;
    const gender = player.gender === "M" ? "F" : "M";
    const pool = listRealms();
    const candidates = [];
    for (let i = 0; i < n; i++) {
        const realm = randomFrom(pool);
        const age = Math.max(16, player.age + randInt(-8, 8));
        const candidate = makeRelative(realm.key, gender, age);
        candidate.sourceRealmKey = realm.key;
        candidates.push(candidate);
    }
    return candidates;
}

// Royal family prospects (the ruler, their siblings, their children) from
// a chosen realm, or a spread of that realm's noble line — the two
// categories the Family tab's marriage picker offers once a realm is
// chosen. Always of the opposite gender from whoever is getting married
// (the player themselves, or a child the player is arranging a match for).
function generateMarriageCandidatesForRealm(gameState, realmKey, category, targetPerson) {
    const target = targetPerson || gameState.player;
    const forcedGender = target.gender === "M" ? "F" : "M";
    if (category === "royal") {
        const realm = getRealm(realmKey);
        const candidates = [];
        if (realm.ruler.gender === forcedGender) candidates.push(createRulerCharacter(realmKey));
        candidates.push(createRulerRelativeCandidate(realmKey, "sibling", forcedGender));
        candidates.push(createRulerRelativeCandidate(realmKey, "sibling", forcedGender));
        candidates.push(createRulerRelativeCandidate(realmKey, "child", forcedGender));
        return candidates;
    }
    return generateNobleMarriageCandidates(realmKey, 4, forcedGender);
}

// Marrying outside your own rank is a real social and financial fact, not
// just flavor: securing a match above your station costs a dowry scaled
// to the gap (gold, paid up front); marrying beneath it costs standing at
// court instead (a prestige hit, scaled the same way).
function marriageCost(playerTier, candidateTier) {
    const gap = candidateTier - playerTier;
    return gap > 0 ? gap * 300 : 0;
}

function marriageShame(playerTier, candidateTier) {
    const gap = playerTier - candidateTier;
    return gap > 0 ? gap * 10 : 0;
}

// Historically, whichever spouse belonged to the clearly lesser household
// relocated and gave up whatever they held in their own right — a
// non-heir daughter moved to her husband's lands; an heiress (or a
// reigning queen) stayed put and her husband joined HER instead. Tier
// already represents how much real land/power a character currently
// holds, so it stands in for "who was the heir": the lower-tier spouse
// moves, full stop — no nominal claim kept on what's given up. Equal
// tier defaults to the traditional wife-moves-to-husband pattern. A
// reigning monarch (tier 5) never relocates.
function relocatePlayerIfNeeded(gameState, candidate) {
    const player = gameState.player;
    if (!candidate.sourceRealmKey || candidate.sourceRealmKey === gameState.realmKey) return;
    if (player.tier === 5) return;

    const movesOut = player.gender === "F" ? candidate.tier >= player.tier : candidate.tier > player.tier;
    if (!movesOut) return;

    const oldRealm = getRealm(gameState.realmKey);
    const newRealmKey = candidate.sourceRealmKey;
    const newRealm = getRealm(newRealmKey);

    gameState.realmKey = newRealmKey;
    player.realmKey = newRealmKey;
    player.cultureKey = newRealm.cultureKey;
    player.tier = Math.max(player.tier, candidate.tier);

    // What she held at home doesn't travel with her — new household,
    // new court, built fresh around her new station.
    gameState.domain = [];
    gameState.vassals = {};
    gameState.council = {};
    gameState.crownAuthority = gameState.crownAuthority || {};
    if (gameState.crownAuthority[newRealmKey] == null) gameState.crownAuthority[newRealmKey] = 0;
    callHookIfPresent("setupDomain", gameState);
    callHookIfPresent("setupVassals", gameState);
    callHookIfPresent("setupCouncil", gameState);

    logEvent(`${player.name} has left ${oldRealm.name} behind to join the household of ${newRealm.name}, surrendering what they held at home.`);
}

// Marrying into a realm's actual royal house shouldn't just be flavor
// text — it should mean something you can watch update. Grafts the real
// ruler (or, if the candidate already IS the ruler, the candidate
// themself) into the SAME shared family registry everyone else lives in,
// linked to the candidate exactly the way _rulerLink says (sibling or
// child of the ruler), with nominal already-deceased parents so the
// existing shared-parent-id derivation (getSiblings, getChildren, etc.)
// recognizes the relation for free. From this point on, that royal house
// ages, marries, and dies through the SAME generic tickDynasty loop as
// anyone else — nothing else has to re-run or re-compute it, which is
// exactly what makes the line of succession a living thing instead of a
// snapshot taken the moment the marriage happened.
function graftRoyalHouse(gameState, candidate) {
    const realmKey = candidate.sourceRealmKey;
    if (!realmKey) return;
    const realm = getRealm(realmKey);
    const isRulerThemself = !candidate._rulerLink && candidate.tier === 5 && candidate.name === realm.ruler.name;
    if (!candidate._rulerLink && !isRulerThemself) return;

    gameState.foreignRoyals = gameState.foreignRoyals || {};
    let ruler = isRulerThemself ? candidate : getPerson(gameState, gameState.foreignRoyals[realmKey]);
    if (!ruler || !ruler.alive) {
        ruler = candidate._rulerLink ? buildRulerLinkCharacter(realmKey, candidate._rulerLink.ruler) : candidate;
        if (ruler !== candidate) registerPerson(gameState, ruler);
    }
    gameState.foreignRoyals[realmKey] = ruler.id;

    // If the ruler IS the candidate, arrangeMarriage already gave them a
    // spouse (the player/target) — only a grafted sibling or child needs
    // one generated here.
    if (!getSpouse(gameState, ruler.id) && ruler.id !== candidate.id) {
        const rulerSpouse = marryIn(gameState, ruler.id, realmKey);
        if (rulerSpouse) rulerSpouse.alive = true;
    }

    if (!ruler.motherId || !ruler.fatherId) {
        const nominalMother = makeRelative(realmKey, "F", ruler.age + randInt(18, 30));
        const nominalFather = makeRelative(realmKey, "M", ruler.age + randInt(20, 34));
        nominalMother.alive = false;
        nominalFather.alive = false;
        nominalMother.spouseId = nominalFather.id;
        nominalFather.spouseId = nominalMother.id;
        registerPerson(gameState, nominalMother);
        registerPerson(gameState, nominalFather);
        ruler.motherId = nominalMother.id;
        ruler.fatherId = nominalFather.id;
    }

    if (candidate._rulerLink && candidate._rulerLink.type === "sibling") {
        candidate.motherId = ruler.motherId;
        candidate.fatherId = ruler.fatherId;
    } else if (candidate._rulerLink && candidate._rulerLink.type === "child") {
        const rulerSpouse = getSpouse(gameState, ruler.id);
        candidate.fatherId = ruler.gender === "M" ? ruler.id : (rulerSpouse ? rulerSpouse.id : null);
        candidate.motherId = ruler.gender === "F" ? ruler.id : (rulerSpouse ? rulerSpouse.id : null);
    }

    // Seed the rest of the house once, the first time it's grafted in — a
    // sibling or two of the ruler (each with their own spouse and
    // children), so the line isn't trivially just one or two names.
    if (!ruler._houseSeeded) {
        ruler._houseSeeded = true;
        const extraSiblings = randInt(1, 2);
        for (let i = 0; i < extraSiblings; i++) generateSiblingWithFamily(gameState, realmKey, ruler);
        if (!isRulerThemself) {
            const rulerSpouse = getSpouse(gameState, ruler.id);
            const mother = ruler.gender === "F" ? ruler : rulerSpouse;
            const father = ruler.gender === "M" ? ruler : rulerSpouse;
            if (mother && father) {
                const extraChildren = randInt(0, 2);
                for (let i = 0; i < extraChildren; i++) {
                    const child = bearChild(gameState, mother.id, father.id, realmKey);
                    child.age = Math.max(0, ruler.age - randInt(18, Math.max(18, ruler.age - 15)));
                    child.alive = Math.random() < stillAliveChance(child.age);
                }
            }
        }
    }

    logEvent(`${candidate.name}'s tie to ${realm.name}'s royal house is now tracked — the line of succession to its throne will show where the family stands, and update as the house itself does.`);
}

// The general case: arranges a marriage for ANY family member, not just
// the player — the player always pays the cost and bears the shame,
// since they're the one with the gold and the standing to spend. Only
// the player's OWN marriage can trigger relocation (domain/vassals/
// council are the player's, not any other family member's).
function arrangeMarriage(gameState, targetPerson, candidate) {
    if (!isAvailableToMarry(gameState, targetPerson.id)) return null;
    const payer = gameState.player;
    const isSelf = targetPerson.id === payer.id;

    const cost = marriageCost(targetPerson.tier, candidate.tier);
    if (cost > 0 && (payer.gold || 0) < cost) return null;

    candidate.bloodline = false;
    candidate.spouseId = targetPerson.id;
    registerPerson(gameState, candidate);
    targetPerson.spouseId = candidate.id;
    graftRoyalHouse(gameState, candidate);

    if (cost > 0) {
        payer.gold -= cost;
        logEvent(isSelf
            ? `${payer.name} has married ${candidate.name} — a match above their station, secured with ${cost} gold in dowry and land concessions.`
            : `${payer.name} has arranged ${targetPerson.name}'s marriage to ${candidate.name} — above their station, costing ${cost} gold in dowry.`);
    } else {
        const shame = marriageShame(targetPerson.tier, candidate.tier);
        if (shame > 0) {
            payer.prestige = Math.max(0, (payer.prestige || 0) - shame);
            logEvent(isSelf
                ? `${payer.name} has married ${candidate.name} — marrying beneath their station, and the court has taken notice (-${shame} prestige).`
                : `${payer.name} has arranged ${targetPerson.name}'s marriage to ${candidate.name} — beneath their station, which reflects poorly on the family (-${shame} prestige).`);
        } else {
            logEvent(isSelf ? `${payer.name} has married ${candidate.name}.` : `${payer.name} has arranged ${targetPerson.name}'s marriage to ${candidate.name}.`);
        }
    }

    // A spouse from elsewhere brings a collateral claim on their homeland
    // with them — one of the three ways wartime.js recognizes a claim
    // (the others: fabricated via intrigue.js, or simply inherited, since
    // claims live on gameState and already carry through succession). If
    // they're tied to that realm's actual royal house, the children of
    // this marriage carry real royal blood, not just a flavor note.
    if (candidate.sourceRealmKey && candidate.sourceRealmKey !== gameState.realmKey) {
        gameState.claims = gameState.claims || [];
        const already = gameState.claims.some(c => c.realmKey === candidate.sourceRealmKey);
        if (!already) {
            gameState.claims.push({ realmKey: candidate.sourceRealmKey, grantedYear: gameState.year, type: "marriage" });
            const realmName = getRealm(candidate.sourceRealmKey).name;
            const stake = candidate._rulerLink
                ? ` — any children of this marriage will carry royal blood of ${realmName}'s own ruling house, and a real claim on its throne`
                : "";
            logEvent(`Through this marriage, the family presses a collateral claim on ${realmName}${stake}.`);
        }
    }

    if (isSelf) relocatePlayerIfNeeded(gameState, candidate);

    return candidate;
}

function marryPlayerTo(gameState, candidate) {
    return arrangeMarriage(gameState, gameState.player, candidate);
}
