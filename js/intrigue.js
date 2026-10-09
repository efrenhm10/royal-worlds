// intrigue.js — schemes: fabricate a claim, undermine a rival realm's
// stability, arrange a convenient death, and the standing background risk
// of a plot landing on the player instead. The toolbox for a character
// not yet strong enough to just declare war — and the thing that makes
// one, later, justified (wartime.js reads gameState.claims).

function setupIntrigue(gameState) {
    gameState.claims = gameState.claims || [];
    gameState.rivalStability = gameState.rivalStability || {};
}

// Other systems (wartime.js) should read a realm's stability through this,
// not realms.js's static REALMS table directly — intrigue can knock it
// down without mutating the shared realm data itself.
function effectiveStability(gameState, realmKey) {
    const realm = getRealm(realmKey);
    const base = realm ? realm.attributes.stability : 50;
    const mod = (gameState.rivalStability && gameState.rivalStability[realmKey]) || 0;
    return Math.max(0, Math.min(100, base + mod));
}

function hasClaim(gameState, realmKey) {
    return (gameState.claims || []).some(c => c.realmKey === realmKey);
}

function schemeSuccessChance(gameState, skillKey, difficulty) {
    const player = gameState.player;
    const spymaster = gameState.council && gameState.council.spymaster;
    const skill = (player.skills[skillKey] || 0) + (spymaster ? spymaster.skill * 0.3 : 0);
    return Math.max(0.05, Math.min(0.9, (skill - difficulty) / 20 + 0.5));
}

function fabricateClaim(gameState, realmKey) {
    if (hasClaim(gameState, realmKey)) return false;
    const success = Math.random() < schemeSuccessChance(gameState, "intrigue", 8);
    const realm = getRealm(realmKey);
    if (success) {
        gameState.claims.push({ realmKey, grantedYear: gameState.year });
        logEvent(`${gameState.player.name} has fabricated a claim on ${realm.name}.`);
    } else {
        gameState.player.prestige = Math.max(0, gameState.player.prestige - 5);
        logEvent(`${gameState.player.name}'s attempt to fabricate a claim on ${realm.name} has failed, costing some standing.`);
    }
    return success;
}

function undermineRivalStability(gameState, realmKey) {
    const success = Math.random() < schemeSuccessChance(gameState, "intrigue", 10);
    const realm = getRealm(realmKey);
    if (success) {
        gameState.rivalStability[realmKey] = ((gameState.rivalStability && gameState.rivalStability[realmKey]) || 0) - randInt(5, 12);
        logEvent(`${gameState.player.name}'s agents have sown unrest in ${realm.name}.`);
    } else {
        logEvent(`An attempt to undermine ${realm.name} has been discovered and come to nothing.`);
    }
    return success;
}

function arrangeConvenientDeath(gameState, targetId) {
    const target = getPerson(gameState, targetId);
    if (!target || !target.alive || target.id === gameState.player.id) return false;
    const success = Math.random() < schemeSuccessChance(gameState, "intrigue", 14);
    if (success) {
        target.alive = false;
        logEvent(`${target.name} has died suddenly and conveniently.`);
    } else {
        gameState.player.prestige = Math.max(0, gameState.player.prestige - 15);
        getVassals(gameState).forEach(v => adjustOpinion(v, -5));
        logEvent(`A plot against ${target.name} has been uncovered, and the scandal has cost ${gameState.player.name} dearly.`);
    }
    return success;
}

// Yearly hook: the background risk of someone ELSE's scheme landing on the
// player, offset by the Spymaster's skill (council.js) if one is seated.
function tickIntrigue(gameState) {
    setupIntrigue(gameState);
    const spymaster = gameState.council && gameState.council.spymaster;
    const defense = spymaster ? spymaster.skill : 5;
    const risk = Math.max(0.01, 0.06 - defense * 0.002);
    if (Math.random() < risk) {
        const player = gameState.player;
        player.health = Math.max(0, player.health - randInt(5, 15));
        logEvent(`A plot against ${player.name} has struck close — a poisoning scare, a near-accident. Health shaken.`);
    }
}
