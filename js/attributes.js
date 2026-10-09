// attributes.js — character creation: generating the handful of starting
// candidates the player picks from (and the player's own character object
// shape used everywhere else), scaled by title tier. Most lines start low
// on the ladder (gentry, knighted, baron) — starting as a sitting monarch
// is deliberately rare, matching the "climb" the whole game is built on.

const SKILL_KEYS = ["diplomacy", "martial", "stewardship", "intrigue", "learning"];

let _nextCharacterId = 1;
function nextCharacterId() {
    return _nextCharacterId++;
}

// Weighted toward the middle of the 3-15 range rather than flat-random, so
// most characters are unremarkable and a 14+ in something actually stands out.
function randomSkillValue() {
    const rolls = [randInt(1, 7), randInt(1, 7), randInt(1, 7)];
    return rolls.reduce((a, b) => a + b, 0);
}

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function rollSkills() {
    const skills = {};
    SKILL_KEYS.forEach(k => { skills[k] = randomSkillValue(); });
    return skills;
}

function rollTraits(count) {
    const pool = [...TEMPERAMENT_TRAITS];
    const picked = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
}

// Starting gold/prestige/piety scale with tier — a baron doesn't start with
// a king's treasury, but isn't penniless either.
const TIER_STARTING_RESOURCES = {
    0: { gold: 20, prestige: 0, piety: 0 },
    1: { gold: 60, prestige: 5, piety: 0 },
    2: { gold: 150, prestige: 15, piety: 5 },
    3: { gold: 400, prestige: 30, piety: 10 },
    4: { gold: 900, prestige: 60, piety: 15 },
    5: { gold: 2000, prestige: 100, piety: 25 },
};

function createCharacter({ realmKey, tier, gender, age, name }) {
    const realm = getRealm(realmKey);
    const cultureKey = realm ? realm.cultureKey : "england";
    const resolvedGender = gender || (Math.random() < 0.5 ? "M" : "F");
    const resolvedAge = age != null ? age : randInt(16, 28);
    const resolvedName = name || generatePeriodName(cultureKey, resolvedGender);
    const resources = TIER_STARTING_RESOURCES[tier] || TIER_STARTING_RESOURCES[0];

    return {
        id: nextCharacterId(),
        name: resolvedName,
        gender: resolvedGender,
        age: resolvedAge,
        cultureKey,
        realmKey,
        tier,
        skills: rollSkills(),
        traits: rollTraits(2),
        health: randInt(70, 100),
        gold: resources.gold,
        prestige: resources.prestige,
        piety: resources.piety,
        alive: true,
        spouseId: null,
        motherId: null,
        fatherId: null,
        childIds: [],
    };
}

// Flavor blurbs per tier, used on the character-creation screen so a blank
// stat block doesn't have to carry the whole pitch. Every tier on the
// ladder is a real starting option — gentry through king — so a player
// who wants to rule outright from the first year can.
const TIER_BLURBS = {
    0: "No land, no title — a name people still recognize, and not much else. Everything you build, you build from here.",
    1: "Knighted, or holding a single manor outright. A toehold on the ladder, easily lost.",
    2: "A baron in your own right: tenants, a hall, and a liege lord who expects your service.",
    3: "A county or earldom of your own: lesser lords answer to you, and you answer to a duke or king above.",
    4: "A duchy — counts and barons defer to you, and only a crown stands above.",
    5: "A crown. The realm is yours to rule, with vassals, a council, and a court all your own from the first year.",
};

// One starting candidate per tier isn't enough variety to choose from, so
// each tier offers a few differently-skilled lives rather than a single
// fixed character.
function generateCandidatesForTier(realmKey, tier, count) {
    const n = count || 4;
    const candidates = [];
    for (let i = 0; i < n; i++) {
        const c = createCharacter({ realmKey, tier });
        c.blurb = TIER_BLURBS[tier];
        candidates.push(c);
    }
    return candidates;
}

// Kept for anything still calling the old signature: a mixed-tier spread
// weighted toward the low end, same as the original character creation.
function generateCandidates(realmKey, count) {
    const n = count || 4;
    const tiers = [0, 1, 1, 2].slice(0, n);
    while (tiers.length < n) tiers.push(randInt(0, 2));
    return tiers.map(tier => {
        const c = createCharacter({ realmKey, tier });
        c.blurb = TIER_BLURBS[tier];
        return c;
    });
}

// Play as the realm's actual ruling monarch (realms.js's 1461 figure),
// not a generic royal — their real name, age, and historically-grounded
// traits. dynasty.js's setupDynasty generates an ordinary family around
// them, same as any other starting character.
function createRulerCharacter(realmKey) {
    const realm = getRealm(realmKey);
    const ruler = realm.ruler;
    const c = createCharacter({ realmKey, tier: 5, gender: ruler.gender, age: ruler.age, name: ruler.name });
    if (ruler.traits) c.traits = ruler.traits.slice();
    c.sourceRealmKey = realmKey;
    c.blurb = `${ruler.name} in the flesh — the actual ${titleName(5, ruler.gender, realmKey)} of ${realm.name} this year.`;
    return c;
}

// A sibling or child of the realm's actual ruler — royal blood, real
// standing, but not the crown itself. _rulerLink is read by
// dynasty.js's setupDynasty (character creation) to graft the real
// ruler into the new family tree as the right relation, and by
// marriage flows the same way when this is used as a marriage prospect.
function createRulerRelativeCandidate(realmKey, relation, forcedGender) {
    const realm = getRealm(realmKey);
    const ruler = realm.ruler;
    let age, tier;
    if (relation === "sibling") {
        age = Math.max(16, ruler.age + randInt(-15, 15));
        tier = 4;
    } else { // child
        const maxGap = Math.min(40, Math.max(19, ruler.age - 16));
        age = Math.max(16, ruler.age - randInt(18, maxGap));
        tier = 3;
    }
    const gender = forcedGender || (Math.random() < 0.5 ? "M" : "F");
    const c = createCharacter({ realmKey, tier, gender, age });
    c._rulerLink = { type: relation, ruler: { name: ruler.name, gender: ruler.gender, age: ruler.age, traits: ruler.traits } };
    c.sourceRealmKey = realmKey;
    c.blurb = relation === "sibling"
        ? `A sibling of ${ruler.name}, ${titleName(5, ruler.gender, realmKey)} of ${realm.name} — royal blood, with a great appanage of your own, but not the crown itself.`
        : `A child of ${ruler.name}, ${titleName(5, ruler.gender, realmKey)} of ${realm.name} — raised at court, with land of your own, but the throne isn't yours yet.`;
    return c;
}

// Marriage prospects from a realm's noble line (not its royal house) —
// a spread of tiers below the crown, used by dynasty.js's marriage flow
// once the player has picked which realm and which kind of match to seek.
function generateNobleMarriageCandidates(realmKey, count, forcedGender) {
    const n = count || 4;
    const tiers = [0, 1, 2, 3];
    const candidates = [];
    for (let i = 0; i < n; i++) {
        const tier = tiers[i % tiers.length];
        const gender = forcedGender || (Math.random() < 0.5 ? "M" : "F");
        const c = createCharacter({ realmKey, tier, gender, age: randInt(16, 45) });
        c.sourceRealmKey = realmKey;
        candidates.push(c);
    }
    return candidates;
}
