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
    const skill = player.skills[skillKey] || 0;
    return Math.max(0.05, Math.min(0.9, (skill - difficulty) / 20 + 0.5));
}

function fabricateClaim(gameState, realmKey) {
    if (hasClaim(gameState, realmKey)) return false;
    const success = Math.random() < schemeSuccessChance(gameState, "intrigue", 8);
    const realm = getRealm(realmKey);
    if (success) {
        gameState.claims.push({ realmKey, grantedYear: gameState.year, type: "fabricated" });
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

// A hostile scheme against the player isn't an invisible dice roll
// anymore — it's a real, named, ongoing thing with a progress bar, the
// way a murder plot in CK3 is something you can see building and maybe
// catch in time, not just a surprise health hit. gameState.hostileScheme
// is null until one begins; once it does, it ticks toward completion
// every year, and the player's own Spymaster has a real chance each year
// to uncover it — and only once uncovered can the player actually fight
// back (counterScheme, below).
const HOSTILE_SCHEME_TYPES = {
    murder: { name: "a plot to have you quietly killed", verb: "murder" },
    rumor_campaign: { name: "a whisper campaign meant to ruin your name", verb: "ruin" },
};

function setupHostileScheme(gameState) {
    if (gameState.hostileScheme === undefined) gameState.hostileScheme = null;
}

function canCounterScheme(gameState) {
    setupHostileScheme(gameState);
    return !!(gameState.hostileScheme && gameState.hostileScheme.discovered) && (gameState.player.gold || 0) >= 40;
}

// Spends real gold and the player's own intrigue skill to root the
// scheme out once it's been discovered — not guaranteed, but a real
// chance to end it before it lands.
function counterScheme(gameState) {
    if (!canCounterScheme(gameState)) return false;
    const player = gameState.player;
    player.gold -= 40;
    const chance = schemeSuccessChance(gameState, "intrigue", 10);
    if (Math.random() < chance) {
        const scheme = gameState.hostileScheme;
        logEvent(`${player.name}'s own agents root out ${HOSTILE_SCHEME_TYPES[scheme.type].name} before it can strike — the conspirators scatter.`);
        gameState.hostileScheme = null;
    } else {
        logEvent(`${player.name} spends gold chasing down the conspirators, but they stay one step ahead (-40 gold).`);
    }
    return true;
}

// Yearly hook: the background risk of someone ELSE's scheme landing on
// the player, offset by the player's own intrigue skill. A scheme already
// in progress ticks toward completion instead of a fresh one starting.
function tickIntrigue(gameState) {
    setupIntrigue(gameState);
    setupHostileScheme(gameState);
    const defense = 5 + (gameState.player.skills.intrigue || 0) * 0.3;

    if (!gameState.hostileScheme) {
        const risk = Math.max(0.01, 0.07 - defense * 0.002);
        if (Math.random() < risk) {
            const type = Math.random() < 0.6 ? "murder" : "rumor_campaign";
            gameState.hostileScheme = { type, progress: 0, threshold: randInt(3, 6), discovered: false };
            logEvent(`Whispers reach your court of ill intent toward you — something is being planned, though its shape isn't clear yet.`);
        }
        return;
    }

    const scheme = gameState.hostileScheme;
    scheme.progress += 1;
    if (!scheme.discovered && Math.random() < 0.22 + defense * 0.02) {
        scheme.discovered = true;
        logEvent(`Your Spymaster uncovers the shape of the plot against you — ${HOSTILE_SCHEME_TYPES[scheme.type].name}.`);
    }

    if (scheme.progress >= scheme.threshold) {
        const player = gameState.player;
        const avoided = scheme.discovered && Math.random() < 0.5;
        if (avoided) {
            logEvent(`The plot against ${player.name} is foiled at the last moment, thanks to the warning already in hand.`);
        } else if (scheme.type === "murder") {
            player.health = Math.max(0, player.health - randInt(15, 30));
            logEvent(`The plot against ${player.name} strikes home — a poisoning, made to look like illness. Health shaken badly.`);
        } else {
            player.prestige = Math.max(0, (player.prestige || 0) - 25);
            getVassals(gameState).forEach(v => adjustOpinion(v, -6));
            logEvent(`The whisper campaign against ${player.name} breaks into the open — real damage to your name at court.`);
        }
        gameState.hostileScheme = null;
    }
}
