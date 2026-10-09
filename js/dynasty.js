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

function bearChild(gameState, motherId, fatherId, realmKey) {
    const child = makeRelative(realmKey, Math.random() < 0.5 ? "M" : "F", 0);
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
function setupDynasty(gameState) {
    gameState.family = gameState.family || {};
    const player = gameState.player;
    registerPerson(gameState, player);
    const realmKey = gameState.realmKey;

    player.bloodline = true;
    const father = makeRelative(realmKey, "M", player.age + randInt(20, 36));
    const mother = makeRelative(realmKey, "F", player.age + randInt(16, 32));
    father.bloodline = true;
    mother.bloodline = true;
    father.alive = Math.random() < stillAliveChance(father.age);
    mother.alive = Math.random() < stillAliveChance(mother.age);
    father.spouseId = mother.id;
    mother.spouseId = father.id;
    registerPerson(gameState, father);
    registerPerson(gameState, mother);
    player.motherId = mother.id;
    player.fatherId = father.id;

    const siblingCount = Math.max(0, Math.round((randInt(0, 4) + randInt(0, 4)) / 2) - 1);
    for (let i = 0; i < siblingCount; i++) {
        generateSiblingWithFamily(gameState, realmKey, player);
    }

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

function marryPlayerTo(gameState, candidate) {
    const player = gameState.player;
    if (!isAvailableToMarry(gameState, player.id)) return null;
    candidate.bloodline = false;
    candidate.spouseId = player.id;
    registerPerson(gameState, candidate);
    player.spouseId = candidate.id;
    logEvent(`${player.name} has married ${candidate.name}.`);

    // A spouse from elsewhere brings a collateral claim on their homeland
    // with them — one of the three ways wartime.js recognizes a claim
    // (the others: fabricated via intrigue.js, or simply inherited, since
    // claims live on gameState and already carry through succession).
    if (candidate.sourceRealmKey && candidate.sourceRealmKey !== gameState.realmKey) {
        gameState.claims = gameState.claims || [];
        const already = gameState.claims.some(c => c.realmKey === candidate.sourceRealmKey);
        if (!already) {
            gameState.claims.push({ realmKey: candidate.sourceRealmKey, grantedYear: gameState.year, type: "marriage" });
            logEvent(`Through this marriage, ${player.name} presses a collateral claim on ${getRealm(candidate.sourceRealmKey).name}.`);
        }
    }
    return candidate;
}
