// wartime.js — claims-based justified war: a war needs a real claim
// (fabricated via intrigue.js, or inherited — claims live on gameState and
// so already carry through succession_laws.js's applySuccession to the
// next heir without any extra code), and the goal is scoped to that claim
// — pressing it for reparations and prestige, not open-ended conquest.
// Only one war at a time, to keep this tractable: a ruler juggling several
// claims has to choose which to press first.

function setupWartime(gameState) {
    gameState.war = gameState.war || null;
}

function playerMilitaryPower(gameState) {
    const player = gameState.player;
    const marshal = gameState.council && gameState.council.marshal;
    const marshalBonus = marshal ? marshal.skill * 10 : 0;
    return totalLevies(gameState) + (player.personalLevies || 0) + player.tier * 80 + marshalBonus + player.skills.martial * 5;
}

function targetMilitaryPower(gameState, realmKey) {
    const realm = getRealm(realmKey);
    const stability = effectiveStability(gameState, realmKey);
    return realm.attributes.militaryStrength * 8 * (stability / 100);
}

function canDeclareWar(gameState) {
    return !gameState.war && !gameState.gameOver;
}

function declareWar(gameState, targetRealmKey) {
    if (!canDeclareWar(gameState)) return false;
    if (!hasClaim(gameState, targetRealmKey)) return false;
    gameState.war = { targetRealmKey, warScore: 0, startYear: gameState.year };
    logEvent(`${gameState.player.name} has declared war on ${getRealm(targetRealmKey).name}, pressing a just claim.`);
    return true;
}

function resolveWar(gameState, outcome) {
    const war = gameState.war;
    const realm = getRealm(war.targetRealmKey);
    const player = gameState.player;

    if (outcome === "victory") {
        player.prestige = (player.prestige || 0) + 60;
        const reparations = Math.round(realm.attributes.wealth * 5);
        player.gold = (player.gold || 0) + reparations;
        getVassals(gameState).forEach(v => adjustOpinion(v, 8));
        gameState.claims = (gameState.claims || []).filter(c => c.realmKey !== war.targetRealmKey);
        logEvent(`${player.name} has won the war against ${realm.name}: the claim is pressed and settled, with ${reparations} gold in reparations.`);
    } else if (outcome === "defeat") {
        player.prestige = Math.max(0, (player.prestige || 0) - 30);
        player.health = Math.max(0, player.health - 10);
        getVassals(gameState).forEach(v => adjustOpinion(v, -8));
        logEvent(`${player.name} has lost the war against ${realm.name}. The claim stands unresolved, and the cost was real.`);
    } else {
        player.prestige = Math.max(0, (player.prestige || 0) - 10);
        logEvent(`The war against ${realm.name} has ended in a stalemate — a white peace, the claim unresolved.`);
    }
    gameState.war = null;
}

// Yearly hook: war score moves with the balance of military power, and
// every year at war has a real cost — levies attrite, the player's own
// health is strained by the campaign — so a protracted, close war is
// genuinely draining rather than a free rolls-until-you-win loop.
function tickWartime(gameState) {
    setupWartime(gameState);
    if (!gameState.war) return;
    const war = gameState.war;

    const myPower = playerMilitaryPower(gameState);
    const theirPower = targetMilitaryPower(gameState, war.targetRealmKey);
    const delta = Math.round(((myPower - theirPower) / Math.max(1, myPower + theirPower)) * 40);
    war.warScore = Math.max(-100, Math.min(100, war.warScore + delta));

    getVassals(gameState).forEach(v => { v.levies = Math.max(0, v.levies - randInt(5, 20)); });
    gameState.player.health = Math.max(0, gameState.player.health - randInt(0, 3));

    const yearsAtWar = gameState.year - war.startYear;
    if (war.warScore >= 60) {
        resolveWar(gameState, "victory");
    } else if (war.warScore <= -60) {
        resolveWar(gameState, "defeat");
    } else if (yearsAtWar >= 7) {
        resolveWar(gameState, "stalemate");
    }
}
