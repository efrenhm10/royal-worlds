// vassals.js — liege/vassal relationships: opinion, levies, and the
// resistance side of Crown Authority (titles.js defines what each level
// lets a ruler do; this is who pushes back, and how hard).

const VASSAL_COUNT_BY_TIER = {
    0: 0, // gentry — no one answers to you
    1: 0, // knighted/landed — a single manor, still no vassals of your own
    2: 2, // baron — a couple of tenant knights
    3: 4, // count/earl
    4: 6, // duke/archduke
    5: 9, // king/queen
    6: 14, // emperor-recognition
};

let _nextVassalId = 1;
function nextVassalId() {
    return _nextVassalId++;
}

function makeVassal(gameState, liegeTier) {
    const realmKey = gameState.realmKey;
    const realm = getRealm(realmKey);
    const vassalTier = Math.max(0, Math.min(liegeTier - 1, 4));
    const gender = Math.random() < 0.5 ? "M" : "F";
    const name = generatePeriodName(realm.cultureKey, gender);
    const traits = rollTraits(2);
    return {
        id: nextVassalId(),
        name,
        gender,
        tier: vassalTier,
        liegeId: gameState.player.id,
        traits,
        opinion: Math.max(0, Math.min(100, randInt(45, 70) + traitOpinionBias(traits))),
        levies: randInt(20, 200) * (vassalTier + 1),
        // A grudge is not the same thing as a bad mood — opinion drifts
        // and recovers year to year, but a vassal who's been refused,
        // specifically and by name, remembers it on top of however they
        // currently feel. Fades slowly if never reinforced, but every
        // fresh refusal resets the clock.
        grudge: 0,
    };
}

// A specific, named refusal — not just a bad roll — adds real, lasting
// grudge on top of whatever opinion hit already landed. This is what a
// vassal remembers specifically about being told no, separate from
// their moment-to-moment mood.
function addVassalGrudge(vassal, amount) {
    vassal.grudge = Math.max(0, (vassal.grudge || 0) + amount);
}

function setupVassals(gameState) {
    gameState.vassals = gameState.vassals || {};
    const player = gameState.player;
    const count = VASSAL_COUNT_BY_TIER[player.tier] || 0;
    for (let i = 0; i < count; i++) {
        const vassal = makeVassal(gameState, player.tier);
        gameState.vassals[vassal.id] = vassal;
    }
    if (count > 0) {
        logEvent(`${player.name} is owed service by ${count} vassal${count === 1 ? "" : "s"}.`);
    }
}

function getVassals(gameState) {
    return Object.values(gameState.vassals || {});
}

function totalLevies(gameState) {
    return getVassals(gameState).reduce((sum, v) => sum + v.levies, 0);
}

// The King does not own the army — the vassals do. What a vassal
// actually sends when the levy is called depends on how they feel about
// the one calling it, not just how many men their lands can field. A
// vassal who hates you doesn't quietly contribute less; they withhold
// outright, refusing the summons. This is the real, load-bearing
// military number (wartime.js's playerMilitaryPower) — totalLevies above
// stays the raw, nominal figure the Domain/Military tabs show alongside
// it, so the gap between "what you command on paper" and "what actually
// shows up" is visible, not hidden in a single number.
function vassalLevyContribution(vassal) {
    if (vassal.opinion < 30) return 0; // refuses the summons outright
    if (vassal.opinion < 55) return Math.round(vassal.levies * 0.5); // answers, grudgingly and short
    return vassal.levies; // answers in full
}

function totalEffectiveLevies(gameState) {
    return getVassals(gameState).reduce((sum, v) => sum + vassalLevyContribution(v), 0);
}

// Named vassals who are refusing or shorting the muster right now — for
// the Military tab to actually show WHO isn't answering, not just a
// smaller total number with no explanation.
function withholdingVassals(gameState) {
    return getVassals(gameState)
        .filter(v => v.opinion < 55)
        .map(v => ({ vassal: v, refusing: v.opinion < 30 }));
}

function adjustOpinion(vassal, amount) {
    vassal.opinion = Math.max(0, Math.min(100, vassal.opinion + amount));
}

// Yearly hook: opinion drifts toward a baseline set by the realm's current
// Crown Authority level (a high-authority ruler keeps more power but bears
// a standing opinion penalty across every vassal, per titles.js), plus a
// small random wobble so the court doesn't feel static.
function tickVassals(gameState) {
    const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
    const info = crownAuthorityInfo(level);
    getVassals(gameState).forEach(vassal => {
        const grudgePenalty = (vassal.grudge || 0) * 1.5;
        const baseline = 50 - info.vassalOpinionPenalty + traitOpinionBias(vassal.traits) - grudgePenalty;
        const pull = (baseline - vassal.opinion) * 0.1;
        const wobble = randInt(-3, 3);
        adjustOpinion(vassal, pull + wobble);

        // A grudge never reinforced by a fresh refusal slowly fades —
        // it doesn't haunt a vassal forever, but it doesn't vanish the
        // moment opinion itself happens to recover either.
        if (vassal.grudge > 0) vassal.grudge = Math.max(0, vassal.grudge - 0.5);

        // An ambitious house doesn't sit still waiting for the crown's
        // permission to grow — left unchecked, its real strength (real
        // levies, not just a number on a sheet) keeps building year over
        // year, exactly the kind of rising power a court should have to
        // actually notice and manage, not just a name on a roster.
        if (vassal.traits && vassal.traits.includes("Ambitious")) {
            vassal.levies = Math.round(vassal.levies * (1 + randInt(1, 4) / 100));
        }
    });
}
