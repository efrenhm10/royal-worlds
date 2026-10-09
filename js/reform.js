// reform.js — the spreading religious-movement pressure (the "Winds of
// Reform" thread from royal-worlds.html, made real): a reform level that
// grows faster the worse a realm's standing with Rome is (church.js), that
// the player can suppress or openly tolerate/embrace, and that carries a
// real schism risk — breaking from Rome outright — in a long enough game.

function setupReform(gameState) {
    gameState.reform = gameState.reform || { level: 10, schismed: false };
}

function reformLevel(gameState) {
    setupReform(gameState);
    return gameState.reform.level;
}

function suppressReform(gameState) {
    setupReform(gameState);
    const player = gameState.player;
    if ((player.gold || 0) < 50) return false;
    player.gold -= 50;
    gameState.reform.level = Math.max(0, gameState.reform.level - randInt(10, 20));
    adjustStanding(gameState, gameState.realmKey, 5);
    getVassals(gameState).forEach(v => { if (Math.random() < 0.3) adjustOpinion(v, -3); });
    logEvent(`${player.name} has moved to suppress reformist preaching, spending gold and some goodwill to do it.`);
    return true;
}

function embraceReform(gameState) {
    setupReform(gameState);
    const player = gameState.player;
    gameState.reform.level = Math.min(100, gameState.reform.level + randInt(10, 20));
    adjustStanding(gameState, gameState.realmKey, -15);
    player.prestige = (player.prestige || 0) + 10;
    logEvent(`${player.name} has openly tolerated, even encouraged, reformist preaching — Rome's patience is not infinite.`);
    return true;
}

// Yearly hook: reform pressure grows on its own, faster when the realm's
// standing with Rome (church.js) is already poor, and a sustained high
// level carries a real, if small, yearly chance of outright schism.
function tickReform(gameState) {
    setupReform(gameState);
    if (gameState.reform.schismed) return;

    const standing = getStanding(gameState, gameState.realmKey);
    const pressure = (55 - standing) * 0.04;
    gameState.reform.level = Math.max(0, Math.min(100, gameState.reform.level + pressure + randInt(-1, 2)));

    if (gameState.reform.level >= 80 && Math.random() < 0.05) {
        gameState.reform.schismed = true;
        adjustStanding(gameState, gameState.realmKey, -40);
        logEvent(`${getRealm(gameState.realmKey).name} has broken from Rome entirely — a schism, generations in the making, is now real.`);
    }
}
