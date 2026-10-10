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
    };
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
        const baseline = 50 - info.vassalOpinionPenalty + traitOpinionBias(vassal.traits);
        const pull = (baseline - vassal.opinion) * 0.1;
        const wobble = randInt(-3, 3);
        adjustOpinion(vassal, pull + wobble);
    });
}
