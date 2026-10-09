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
// stat block doesn't have to carry the whole pitch.
const TIER_BLURBS = {
    0: "No land, no title — a name people still recognize, and not much else. Everything you build, you build from here.",
    1: "Knighted, or holding a single manor outright. A toehold on the ladder, easily lost.",
    2: "A baron in your own right: tenants, a hall, and a liege lord who expects your service.",
};

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
