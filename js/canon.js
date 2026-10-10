// canon.js — shared helpers for the scripted historical backbone: which
// beats exist for the active bookmark era, and the firing logic. Each
// beat fires once, at its real year, logs what happened to the Chronicle,
// nudges the affected realm(s)' stability, and — when timeline.js says
// the player has a personal stake in that realm — says so explicitly,
// rather than scrolling past as background noise.

function canonEventsForEra(eraKey) {
    if (eraKey === "1461" && typeof CANON_EVENTS_1461 !== "undefined") return CANON_EVENTS_1461;
    return [];
}

function setupCanon(gameState) {
    gameState.canonFired = gameState.canonFired || [];
}

function applyCanonEvent(gameState, evt) {
    const stakeholder = personalStakeInRealm(gameState, evt.realmKey);
    logEvent(`${stakeholder ? "" : "[World] "}${evt.headline}`);
    if (evt.stabilityDelta) {
        gameState.rivalStability = gameState.rivalStability || {};
        Object.keys(evt.stabilityDelta).forEach(realmKey => {
            gameState.rivalStability[realmKey] = (gameState.rivalStability[realmKey] || 0) + evt.stabilityDelta[realmKey];
        });
    }
    if (stakeholder) {
        logEvent(`This touches ${gameState.player.name} directly, through ${gameState.realmKey === evt.realmKey ? "their own realm" : (hasClaim(gameState, evt.realmKey) ? "a claim they hold" : "their spouse's homeland")}.`);
    }
}

// Yearly hook: fires any not-yet-fired beat scheduled for this exact year.
function tickCanon(gameState) {
    setupCanon(gameState);
    const events = canonEventsForEra(gameState.eraKey);
    events.forEach(evt => {
        if (gameState.canonFired.includes(evt.id)) return;
        if (evt.year !== gameState.year) return;
        gameState.canonFired.push(evt.id);
        applyCanonEvent(gameState, evt);
    });
}
