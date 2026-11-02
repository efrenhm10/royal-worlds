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
    const standing = typeof standingPower === "function" ? standingPower(gameState) : 0;
    const levies = typeof totalEffectiveLevies === "function" ? totalEffectiveLevies(gameState) : totalLevies(gameState);
    return levies + (player.personalLevies || 0) + standing + player.tier * 80 + player.skills.martial * 5;
}

function targetMilitaryPower(gameState, realmKey) {
    const realm = getRealm(realmKey);
    const stability = effectiveStability(gameState, realmKey);
    return realm.attributes.militaryStrength * 8 * (stability / 100);
}

function canDeclareWar(gameState) {
    return !gameState.war && !gameState.gameOver;
}

// The Military Pact (dynasty.js's arrangeMarriage) — a realm the crown
// married into cannot be attacked while the pact holds, full stop. It
// has to be formally and visibly broken first (breakMarriagePact).
function hasMarriagePact(gameState, realmKey) {
    return (gameState.marriagePacts || []).some(p => p.realmKey === realmKey);
}

function declareWar(gameState, targetRealmKey) {
    if (!canDeclareWar(gameState)) return false;
    if (!hasClaim(gameState, targetRealmKey)) return false;
    if (hasMarriagePact(gameState, targetRealmKey)) return false;
    gameState.war = { targetRealmKey, warScore: 0, startYear: gameState.year };
    logEvent(`${gameState.player.name} has declared war on ${getRealm(targetRealmKey).name}, pressing a just claim.`);
    return true;
}

// Breaking faith is a real, visible, costly act — not a quiet toggle.
// Every court in Christendom notices a broken marriage pact; it isn't
// something a ruler does twice without their own word meaning nothing.
function breakMarriagePact(gameState, realmKey) {
    if (!hasMarriagePact(gameState, realmKey)) return false;
    gameState.marriagePacts = gameState.marriagePacts.filter(p => p.realmKey !== realmKey);
    const player = gameState.player;
    player.prestige = Math.max(0, (player.prestige || 0) - 25);
    gameState.relations = gameState.relations || {};
    gameState.relations[realmKey] = Math.max(0, (gameState.relations[realmKey] != null ? gameState.relations[realmKey] : 50) - 35);
    getVassals(gameState).forEach(v => { if (Math.random() < 0.3) adjustOpinion(v, -randInt(3, 8)); });
    logEvent(`${player.name} has formally broken the marriage pact with ${getRealm(realmKey).name} — a betrayal every court in Christendom will remember (-25 prestige, relations shattered).`);
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

// Foreign relations — a simple, player-actionable number (0-100, default
// 50) per realm, distinct from a realm's own internal stability
// (rivalStability/effectiveStability) and from claims/war. This is the
// lever for "manage my relations" directly rather than only ever
// reacting to events: a gift-bearing envoy raises it, and good relations
// with a raiding or unstable neighbor measurably softens
// decisions.js's border_raid risk — a political answer alongside
// domain.js's fortifyBorder's military one.
function relationsWith(gameState, realmKey) {
    gameState.relations = gameState.relations || {};
    return gameState.relations[realmKey] != null ? gameState.relations[realmKey] : 50;
}

const ENVOY_COOLDOWN = 2;
const ENVOY_COST = 60;

function canSendEnvoy(gameState, realmKey) {
    if (realmKey === gameState.realmKey) return false;
    if ((gameState.player.gold || 0) < ENVOY_COST) return false;
    gameState.envoyCooldowns = gameState.envoyCooldowns || {};
    const last = gameState.envoyCooldowns[realmKey];
    return last == null || gameState.year - last >= ENVOY_COOLDOWN;
}

function sendEnvoy(gameState, realmKey) {
    if (!canSendEnvoy(gameState, realmKey)) return false;
    gameState.relations = gameState.relations || {};
    gameState.envoyCooldowns = gameState.envoyCooldowns || {};
    const player = gameState.player;
    player.gold -= ENVOY_COST;
    gameState.envoyCooldowns[realmKey] = gameState.year;
    const before = relationsWith(gameState, realmKey);
    gameState.relations[realmKey] = Math.min(100, before + randInt(5, 12));
    logEvent(`${player.name} sends an envoy to ${getRealm(realmKey).name}, bearing gifts and goodwill (-${ENVOY_COST} gold, relations ${before} -> ${gameState.relations[realmKey]}).`);
    return true;
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
