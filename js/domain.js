// domain.js — the player's own demesne: holdings (keep/town/temple),
// development level, and the in-hand-vs-granted-to-a-vassal split for
// each title the player holds directly. The real "governing my lands"
// loop, distinct from vassals.js (which is about OTHER people's land).

const HOLDING_TYPES = [
    { key: "keep", name: "Keep", desc: "In hand, strengthens your own levies. Granted, sets a floor on that vassal's levies instead." },
    { key: "town", name: "Town", desc: "In hand, raises your own gold income. Granted, you still draw a smaller tax cut from it." },
    { key: "temple", name: "Temple", desc: "In hand, raises your own piety. Granted, it occasionally raises the realm's standing with Rome instead." },
];

// How many holding slots a title tier commands — same shape as
// vassals.js's VASSAL_COUNT_BY_TIER, since both scale with how much a
// title actually governs.
const DOMAIN_SIZE_BY_TIER = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

let _nextHoldingId = 1;
function nextHoldingId() {
    return _nextHoldingId++;
}

function setupDomain(gameState) {
    gameState.domain = gameState.domain || [];
    if (gameState.domain.length) return;
    const size = DOMAIN_SIZE_BY_TIER[gameState.player.tier] || 0;
    for (let i = 0; i < size; i++) {
        const type = HOLDING_TYPES[i % HOLDING_TYPES.length];
        gameState.domain.push({ id: nextHoldingId(), type: type.key, level: 1, grantedToVassalId: null });
    }
}

function getDomain(gameState) {
    return gameState.domain || [];
}

function inHandHoldings(gameState) {
    return getDomain(gameState).filter(h => !h.grantedToVassalId);
}

function grantHolding(gameState, holdingId, vassalId) {
    const holding = getDomain(gameState).find(h => h.id === holdingId);
    if (!holding || holding.grantedToVassalId) return false;
    const vassal = getVassals(gameState).find(v => v.id === vassalId);
    if (!vassal) return false;
    holding.grantedToVassalId = vassalId;
    adjustOpinion(vassal, 15);
    logEvent(`${gameState.player.name} has granted a ${holding.type} to ${vassal.name}.`);
    return true;
}

// Revoking land back out of a vassal's hands needs real Crown Authority —
// titles.js's High tier is exactly what unlocks "revoke titles at will."
function revokeHolding(gameState, holdingId) {
    const holding = getDomain(gameState).find(h => h.id === holdingId);
    if (!holding || !holding.grantedToVassalId) return false;
    const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
    if (!crownAuthorityInfo(level).canRevokeTitlesFreely) return false;
    const vassal = getVassals(gameState).find(v => v.id === holding.grantedToVassalId);
    holding.grantedToVassalId = null;
    if (vassal) adjustOpinion(vassal, -25);
    logEvent(`${gameState.player.name} has revoked a ${holding.type} from ${vassal ? vassal.name : "a vassal"}.`);
    return true;
}

function developHolding(gameState, holdingId) {
    const holding = getDomain(gameState).find(h => h.id === holdingId);
    if (!holding || holding.grantedToVassalId) return false;
    const cost = holding.level * 40;
    if ((gameState.player.gold || 0) < cost) return false;
    gameState.player.gold -= cost;
    holding.level += 1;
    logEvent(`${gameState.player.name} has developed a ${holding.type} to level ${holding.level}.`);
    return true;
}

// Yearly hook: every holding produces its real effect for whoever holds
// it — the player if it's in hand, the vassal it was granted to if not.
// personalLevies is recomputed fresh each year from current in-hand
// keeps (not an ever-growing accumulator), so wartime.js's
// playerMilitaryPower reads a number that reflects the domain as it
// stands right now.
function tickDomain(gameState) {
    setupDomain(gameState);
    const player = gameState.player;
    let personalLevies = 0;

    getDomain(gameState).forEach(holding => {
        const vassal = holding.grantedToVassalId ? getVassals(gameState).find(v => v.id === holding.grantedToVassalId) : null;
        if (holding.type === "keep") {
            if (vassal) vassal.levies = Math.max(vassal.levies, holding.level * 20);
            else personalLevies += holding.level * 40;
        } else if (holding.type === "town") {
            const income = holding.level * 4;
            player.gold = (player.gold || 0) + (vassal ? Math.round(income * 0.3) : income);
        } else if (holding.type === "temple") {
            if (!vassal) player.piety = (player.piety || 0) + holding.level * 2;
            else if (Math.random() < 0.1) adjustStanding(gameState, gameState.realmKey, 1);
        }
    });

    player.personalLevies = personalLevies;
}
