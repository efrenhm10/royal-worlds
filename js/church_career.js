// church_career.js — the player's OWN Church career: priest -> bishop ->
// cardinal -> Pope. Taking orders means giving up marriage and a
// secular inheritance of your own; the payoff is real, tiered power to
// help named relatives in dynasty.js's extended family tree — exactly
// the "send a son into the Church, and he can help his siblings and
// nieces and nephews" loop this whole system was built for.

const CHURCH_RANKS = [
    { tier: 0, name: "Priest" },
    { tier: 1, name: "Bishop" },
    { tier: 2, name: "Cardinal" },
    { tier: 3, name: "Pope" },
];

function churchRankName(tier) {
    return CHURCH_RANKS[Math.max(0, Math.min(tier, CHURCH_RANKS.length - 1))].name;
}

function canEnterChurch(gameState) {
    const player = gameState.player;
    if (player.churchTier != null) return false;
    if (player.age < 16) return false;
    const spouse = getSpouse(gameState, player.id);
    if (spouse && spouse.alive) return false;
    return true;
}

function enterChurch(gameState) {
    if (!canEnterChurch(gameState)) return false;
    const player = gameState.player;
    player.churchTier = 0;
    player.churchPiety = player.churchPiety || 0;
    logEvent(`${player.name} has taken holy orders, renouncing marriage and any secular inheritance of their own.`);
    return true;
}

function promotionChance(player) {
    const tier = player.churchTier;
    const skill = (player.skills.learning + player.skills.diplomacy) / 2;
    if (tier === 0) return 0.04 + skill * 0.003; // Priest -> Bishop
    if (tier === 1) return 0.025 + skill * 0.002; // Bishop -> Cardinal
    if (tier === 2) return 0.01 + skill * 0.001; // Cardinal -> Pope (rare)
    return 0;
}

function promotionPietyRequirement(tier) {
    return [0, 20, 40, 60][tier] || 0;
}

// Yearly hook: a churchman player accrues piety faster than a secular one,
// and can be promoted once piety and skill clear the bar for the next rank.
function tickChurchCareer(gameState) {
    const player = gameState.player;
    if (player.churchTier == null || !player.alive) return;

    const piousBonus = player.traits && player.traits.includes("Pious") ? 2 : 0;
    player.churchPiety = (player.churchPiety || 0) + 3 + piousBonus;
    player.piety = (player.piety || 0) + 2 + piousBonus;

    if (player.churchTier >= CHURCH_RANKS.length - 1) return;
    if (player.churchPiety < promotionPietyRequirement(player.churchTier + 1)) return;
    if (Math.random() < promotionChance(player)) {
        player.churchTier += 1;
        logEvent(`${player.name} has been raised to ${churchRankName(player.churchTier)}.`);
        if (player.churchTier === 3) {
            adjustStanding(gameState, gameState.realmKey, 25);
            logEvent(`With ${player.name} on the Throne of St. Peter, ${getRealm(gameState.realmKey).name} stands higher than ever in Rome's favor.`);
        }
    }
}

// What a churchman can actually DO for the family, gated by rank — this is
// the mechanical payoff, not flavor text.
const CHURCH_ACTIONS = [
    {
        key: "bless", minTier: 0, pietyCost: 5,
        name: "Bless a kinsman",
        desc: "A small favor — a blessing, a word put in at a conclave.",
        apply(gameState, relative) {
            relative.prestige = (relative.prestige || 0) + 10;
        },
    },
    {
        key: "petition", minTier: 1, pietyCost: 15,
        name: "Petition for a kinsman's cause",
        desc: "A bishop's word carries real weight — a grant, a favorable ruling.",
        apply(gameState, relative) {
            relative.prestige = (relative.prestige || 0) + 15;
            relative.gold = (relative.gold || 0) + 25;
            adjustStanding(gameState, gameState.realmKey, 5);
        },
    },
    {
        key: "shield", minTier: 2, pietyCost: 25,
        name: "Shield the family from Rome's displeasure",
        desc: "A cardinal can quiet an inquiry before it becomes a real threat.",
        apply(gameState) {
            adjustStanding(gameState, gameState.realmKey, 15);
        },
    },
    {
        key: "grant", minTier: 3, pietyCost: 10,
        name: "Grant a papal favor",
        desc: "The Pope's own patronage — nothing in Christendom carries more.",
        apply(gameState, relative) {
            relative.prestige = (relative.prestige || 0) + 40;
            relative.gold = (relative.gold || 0) + 100;
        },
    },
];

function availableChurchActions(gameState) {
    const player = gameState.player;
    if (player.churchTier == null) return [];
    return CHURCH_ACTIONS.filter(a => player.churchTier >= a.minTier && (player.churchPiety || 0) >= a.pietyCost);
}

function performChurchAction(gameState, actionKey, relativeId) {
    const player = gameState.player;
    const action = CHURCH_ACTIONS.find(a => a.key === actionKey);
    if (!action) return false;
    if (player.churchTier == null || player.churchTier < action.minTier) return false;
    if ((player.churchPiety || 0) < action.pietyCost) return false;

    const relative = relativeId ? getPerson(gameState, relativeId) : null;
    if (actionKey !== "shield" && (!relative || !relative.alive)) return false;

    player.churchPiety -= action.pietyCost;
    action.apply(gameState, relative);
    const who = relative ? ` for ${relative.name}` : "";
    logEvent(`${player.name} (${churchRankName(player.churchTier)}) has used their office${who}: ${action.name.toLowerCase()}.`);
    return true;
}
