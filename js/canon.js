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

// A scripted beat isn't locked to the real-history outcome — if the
// player's own earlier choice (a Drama Director beat or a historical-
// pressure decision) actually changed the balance of power it bears on,
// canon_events.js can list alternate variants, each gated on a flag
// those decisions set (gameState.warsOfRosesHouse,
// gameState.burgundySuccessionResolved, ...). The first matching
// variant replaces the real-history headline/stabilityDelta; with no
// match (the player never engaged, or isn't in a position to have
// mattered), the real historical outcome is exactly what still happens
// — your choices bend the story, but the story was always going to move
// on regardless.
function resolveCanonEventVariant(evt, gameState) {
    if (evt.variants) {
        const match = evt.variants.find(v => v.when(gameState));
        if (match) return { headline: match.headline, stabilityDelta: match.stabilityDelta };
    }
    return { headline: evt.headline, stabilityDelta: evt.stabilityDelta };
}

function applyCanonEvent(gameState, evt) {
    const resolved = resolveCanonEventVariant(evt, gameState);
    const stakeholder = personalStakeInRealm(gameState, evt.realmKey);
    logEvent(`${stakeholder ? "" : "[World] "}${resolved.headline}`);
    if (resolved.stabilityDelta) {
        gameState.rivalStability = gameState.rivalStability || {};
        Object.keys(resolved.stabilityDelta).forEach(realmKey => {
            gameState.rivalStability[realmKey] = (gameState.rivalStability[realmKey] || 0) + resolved.stabilityDelta[realmKey];
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
