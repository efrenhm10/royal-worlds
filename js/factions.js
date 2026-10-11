// factions.js — vassals organizing against a ruler: the mechanical teeth
// behind "protect your line and your country." A high Crown Authority
// pushed too far, too fast, or a run of badly-handled vassals, breeds a
// faction — and a faction that isn't defused erupts into open rebellion.

function setupFactions(gameState) {
    gameState.faction = gameState.faction || null;
}

function factionRisk(gameState) {
    const vassals = getVassals(gameState);
    if (!vassals.length) return 0;
    const avgOpinion = vassals.reduce((s, v) => s + v.opinion, 0) / vassals.length;
    const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
    const caPenalty = crownAuthorityInfo(level).vassalOpinionPenalty;
    return Math.max(0, (50 - avgOpinion) + caPenalty * 0.5);
}

function resolveFaction(gameState, rebelVassals) {
    const player = gameState.player;
    const rebelPower = rebelVassals.reduce((s, v) => s + v.levies, 0);
    const loyalVassals = getVassals(gameState).filter(v => !rebelVassals.includes(v));
    const playerPower = loyalVassals.reduce((s, v) => s + v.levies, 0) + player.tier * 80 + player.skills.martial * 5;

    if (playerPower >= rebelPower) {
        rebelVassals.forEach(v => adjustOpinion(v, -15));
        player.prestige = (player.prestige || 0) + 20;
        logEvent(`${player.name} has suppressed the faction against them. The rebels' standing is broken, for now.`);
    } else {
        const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
        gameState.crownAuthority[gameState.realmKey] = Math.max(0, level - 1);
        player.prestige = Math.max(0, (player.prestige || 0) - 25);
        rebelVassals.forEach(v => adjustOpinion(v, 15));
        logEvent(`${player.name} has been forced to back down. Crown Authority falls, and the rebels' chartered rights stand confirmed.`);
    }
    gameState.faction = null;
}

// Yearly hook: forms a faction out of the realm's most disloyal vassals
// when conditions are ripe, lets it dissolve if opinions recover, and
// otherwise forces a reckoning after a couple of years of brewing.
function tickFactions(gameState) {
    setupFactions(gameState);
    const vassals = getVassals(gameState);
    if (!vassals.length) return;

    if (!gameState.faction) {
        const risk = factionRisk(gameState);
        const chance = Math.min(0.5, risk * 0.01);
        if (Math.random() < chance) {
            const disloyal = vassals.filter(v => v.opinion < 40);
            if (disloyal.length) {
                const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
                const type = level >= 2 ? "depose" : "independence";
                gameState.faction = { type, memberIds: disloyal.map(v => v.id), formedYear: gameState.year };
                logEvent(`A faction of vassals has formed against ${gameState.player.name}, demanding ${type === "depose" ? "your abdication" : "independence"}.`);
            }
        }
        return;
    }

    const members = gameState.faction.memberIds.map(id => vassals.find(v => v.id === id)).filter(Boolean);
    const stillDisloyal = members.filter(v => v.opinion < 45);
    if (!stillDisloyal.length) {
        logEvent(`The faction against ${gameState.player.name} has lost its nerve and dissolved.`);
        gameState.faction = null;
        return;
    }

    const yearsBrewing = gameState.year - gameState.faction.formedYear;
    if (yearsBrewing >= 2) {
        resolveFaction(gameState, stillDisloyal);
    }
}
