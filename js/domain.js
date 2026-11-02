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

// A tier's starting size isn't its ceiling — a ruler can buy more land,
// up to a cap set by what that rank could plausibly absorb into their own
// demesne (a baron isn't annexing a county's worth of territory).
const DOMAIN_MAX_BY_TIER = { 0: 0, 1: 3, 2: 5, 3: 8, 4: 12, 5: 18, 6: 24 };

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

// Buying land scales with how much you already hold — the first new
// holding is a real but reachable purchase, the tenth is a kingdom-sized
// undertaking.
function buyHoldingCost(gameState) {
    return 250 + getDomain(gameState).length * 180;
}

function canBuyHolding(gameState) {
    const max = DOMAIN_MAX_BY_TIER[gameState.player.tier] || 0;
    return getDomain(gameState).length < max && (gameState.player.gold || 0) >= buyHoldingCost(gameState);
}

function buyHolding(gameState, typeKey) {
    const max = DOMAIN_MAX_BY_TIER[gameState.player.tier] || 0;
    if (getDomain(gameState).length >= max) return false;
    const cost = buyHoldingCost(gameState);
    if ((gameState.player.gold || 0) < cost) return false;
    const type = HOLDING_TYPES.find(t => t.key === typeKey) || HOLDING_TYPES[0];
    gameState.player.gold -= cost;
    gameState.domain.push({ id: nextHoldingId(), type: type.key, level: 1, grantedToVassalId: null });
    logEvent(`${gameState.player.name} has purchased new land: a ${type.name.toLowerCase()}, for ${cost} gold.`);
    return true;
}

// How you choose to run your own lands, year over year — not a one-off
// purchase like buyHolding/developHolding, but a standing policy that
// trades immediate income against the land's future growth, exactly the
// "make income on it or invest in it" choice that was missing: every
// holding in hand is run the same way until you change it.
const DOMAIN_POLICIES = {
    reinvest: {
        key: "reinvest", name: "Reinvest",
        desc: "Plow revenue back into your lands. Yield is lower year to year, but in-hand holdings slowly improve themselves for free.",
        yieldMultiplier: 0.7, autoGrowChance: 0.12,
    },
    balanced: {
        key: "balanced", name: "Balanced",
        desc: "Run your demesne at its ordinary yield — no extra growth, no extra strain.",
        yieldMultiplier: 1, autoGrowChance: 0,
    },
    extract: {
        key: "extract", name: "Extract",
        desc: "Squeeze every holding for all it's worth. Yield is higher right now, but it costs your vassals' opinion of you over time.",
        yieldMultiplier: 1.35, autoGrowChance: 0, opinionDriftPerYear: -1,
    },
};
const DEFAULT_DOMAIN_POLICY = "balanced";

function domainPolicy(gameState) {
    return DOMAIN_POLICIES[gameState.domainPolicy] || DOMAIN_POLICIES[DEFAULT_DOMAIN_POLICY];
}

function setDomainPolicy(gameState, key) {
    if (!DOMAIN_POLICIES[key]) return false;
    gameState.domainPolicy = key;
    logEvent(`${gameState.player.name} now runs the demesne on a policy of ${DOMAIN_POLICIES[key].name.toLowerCase()}.`);
    return true;
}

// What a holding actually produces, at any level — the single source of
// truth tickDomain's real yearly effects are built from, reused by the
// UI to show a real, specific before/after preview ("gold income 8 -> 12
// a year") before the player spends anything, instead of a flat "level
// up" button with no visible payoff. In-hand holdings are scaled by the
// active domain policy; a holding already granted to a vassal runs on
// their own management, not yours, so the policy doesn't touch it.
function holdingYield(gameState, holding, levelOverride) {
    const level = levelOverride != null ? levelOverride : holding.level;
    const vassal = !!holding.grantedToVassalId;
    const awayPenalty = (typeof isAtRoyalCourt === "function" && isAtRoyalCourt(gameState)) ? 0.5 : 1;
    const policyMult = vassal ? 1 : domainPolicy(gameState).yieldMultiplier;
    if (holding.type === "keep") {
        return vassal
            ? { levies: level * 20, note: "sets this vassal's levy floor" }
            : { levies: Math.round(level * 40 * awayPenalty * policyMult) };
    }
    if (holding.type === "town") {
        const income = Math.round(level * 4 * (vassal ? 1 : awayPenalty * policyMult));
        return vassal ? { gold: Math.round(income * 0.3), note: "your cut of a vassal's tax" } : { gold: income };
    }
    if (holding.type === "temple") {
        return vassal ? { note: "10% yearly chance of +1 standing with Rome" } : { piety: Math.round(level * 2 * awayPenalty * policyMult) };
    }
    return {};
}

// A one-line summary of what a holding yields right now, for the Domain
// tab's "what is this actually producing" display.
function holdingYieldLine(yieldObj) {
    const parts = [];
    if (yieldObj.gold) parts.push(`${yieldObj.gold} gold/yr`);
    if (yieldObj.levies) parts.push(`${yieldObj.levies} levies`);
    if (yieldObj.piety) parts.push(`${yieldObj.piety} piety/yr`);
    if (yieldObj.note) parts.push(yieldObj.note);
    return parts.length ? parts.join(", ") : "no current yield";
}

// The domain-wide total — "how much my lands are bringing in", added up
// across every in-hand holding, the same numbers tickDomain actually
// applies each year.
function domainIncomeSummary(gameState) {
    const totals = { gold: 0, levies: 0, piety: 0 };
    inHandHoldings(gameState).forEach(h => {
        const y = holdingYield(gameState, h);
        totals.gold += y.gold || 0;
        totals.levies += y.levies || 0;
        totals.piety += y.piety || 0;
    });
    return totals;
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

// Frontier fortification — a standing, permanent investment distinct from
// an individual holding: once built, it nullifies decisions.js's
// border_raid risk entirely rather than just softening it, giving the
// player a real, proactive choice between hardening a frontier and
// spending that same gold elsewhere.
const BORDER_FORTIFICATION_COST = 300;

function canFortifyBorder(gameState) {
    return !gameState.borderFortified && (gameState.player.gold || 0) >= BORDER_FORTIFICATION_COST;
}

function fortifyBorder(gameState) {
    if (!canFortifyBorder(gameState)) return false;
    gameState.player.gold -= BORDER_FORTIFICATION_COST;
    gameState.borderFortified = true;
    logEvent(`${gameState.player.name} has fortified the frontier — walls, watchtowers, and standing garrisons along the border (-${BORDER_FORTIFICATION_COST} gold). Raiders will find it a harder crossing now.`);
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
    const policy = domainPolicy(gameState);
    let personalLevies = 0;

    // Reinvest: in-hand holdings have a real chance to improve themselves
    // for free each year, the payoff for the lower yield above.
    if (policy.autoGrowChance) {
        inHandHoldings(gameState).forEach(h => {
            if (Math.random() < policy.autoGrowChance) {
                h.level += 1;
                logEvent(`Reinvestment has improved your ${h.type} to level ${h.level}, at no cost.`);
            }
        });
    }
    // Extract: squeezing the land for more than it easily gives costs
    // your vassals' good opinion, a little every year it's kept up.
    if (policy.opinionDriftPerYear && inHandHoldings(gameState).length) {
        getVassals(gameState).forEach(v => adjustOpinion(v, policy.opinionDriftPerYear));
    }

    // Land run from a distance yields less — a real reason "stay home and
    // manage my own lands" and "go to the royal court" (royal_court.js)
    // are a genuine trade-off, not a free pick of both. The actual
    // numbers come from holdingYield so the Domain tab's preview and
    // this yearly application never drift apart.
    getDomain(gameState).forEach(holding => {
        const vassal = holding.grantedToVassalId ? getVassals(gameState).find(v => v.id === holding.grantedToVassalId) : null;
        if (vassal) {
            if (holding.type === "keep") {
                vassal.levies = Math.max(vassal.levies, holding.level * 20);
            } else if (holding.type === "town") {
                player.gold = (player.gold || 0) + (holdingYield(gameState, holding).gold || 0);
            } else if (holding.type === "temple" && Math.random() < 0.1) {
                adjustStanding(gameState, gameState.realmKey, 1);
            }
            return;
        }
        const y = holdingYield(gameState, holding);
        if (holding.type === "keep") personalLevies += y.levies || 0;
        else if (holding.type === "town") player.gold = (player.gold || 0) + (y.gold || 0);
        else if (holding.type === "temple") player.piety = (player.piety || 0) + (y.piety || 0);
    });

    player.personalLevies = personalLevies;
}
