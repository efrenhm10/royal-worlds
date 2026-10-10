// events.js — the general random-event pool: ambient, non-canon events
// that can fire for any character regardless of era or realm. Each year
// at most one fires, chosen from whichever events match the player's
// current age/tier and pass their own independent roll.

const RANDOM_EVENTS = [
    {
        id: "good_harvest", minTier: 1, chance: 0.08,
        headline: player => `A good harvest fills ${player.name}'s coffers.`,
        apply(gameState) { gameState.player.gold = (gameState.player.gold || 0) + 20; },
    },
    {
        id: "poor_harvest", minTier: 1, chance: 0.06,
        headline: player => `A poor harvest strains ${player.name}'s finances.`,
        apply(gameState) { gameState.player.gold = Math.max(0, (gameState.player.gold || 0) - 15); },
    },
    {
        id: "tournament", minTier: 2, minAge: 16, maxAge: 55, chance: 0.05,
        headline: player => `${player.name} competes in a tournament, to loud acclaim.`,
        apply(gameState) {
            gameState.player.prestige = (gameState.player.prestige || 0) + 10;
            if (Math.random() < 0.15) gameState.player.health = Math.max(0, gameState.player.health - 10);
        },
    },
    {
        id: "illness", chance: 0.05,
        headline: player => `${player.name} is laid low by a bout of illness.`,
        apply(gameState) { gameState.player.health = Math.max(0, gameState.player.health - 15); },
    },
    {
        id: "pilgrimage", minAge: 16, chance: 0.04,
        headline: player => `${player.name} undertakes a pilgrimage.`,
        apply(gameState) {
            gameState.player.piety = (gameState.player.piety || 0) + 10;
            gameState.player.gold = Math.max(0, (gameState.player.gold || 0) - 10);
        },
    },
    {
        id: "flattering_portrait", minTier: 3, chance: 0.03,
        headline: player => `${player.name} sits for a flattering portrait, copies of which travel further than expected.`,
        apply(gameState) { gameState.player.prestige = (gameState.player.prestige || 0) + 5; },
    },
    {
        id: "court_gossip", chance: 0.04,
        headline: player => `Unkind gossip about ${player.name} circulates at court.`,
        apply(gameState) {
            const vassals = getVassals(gameState);
            if (vassals.length) adjustOpinion(randomFrom(vassals), -5);
        },
    },
    {
        id: "grateful_tenant", minTier: 1, chance: 0.05,
        headline: player => `A grateful tenant sends ${player.name} a gift.`,
        apply(gameState) { gameState.player.gold = (gameState.player.gold || 0) + 10; },
    },
    {
        id: "old_wound", minAge: 40, chance: 0.04,
        headline: player => `An old wound aches worse than ${player.name} lets on.`,
        apply(gameState) { gameState.player.health = Math.max(0, gameState.player.health - 5); },
    },
];

function eligibleRandomEvents(gameState) {
    const player = gameState.player;
    return RANDOM_EVENTS.filter(e => {
        if (e.minTier != null && player.tier < e.minTier) return false;
        if (e.minAge != null && player.age < e.minAge) return false;
        if (e.maxAge != null && player.age > e.maxAge) return false;
        return true;
    });
}

function tickEvents(gameState) {
    if (!gameState.player.alive) return;
    const candidates = eligibleRandomEvents(gameState).filter(e => Math.random() < e.chance);
    if (!candidates.length) return;
    const chosen = randomFrom(candidates);
    logEvent(chosen.headline(gameState.player));
    if (chosen.apply) chosen.apply(gameState);
}
