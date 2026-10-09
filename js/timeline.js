// timeline.js — adaptive branching helpers: whether a canon beat (see
// canon_events.js) lands on the player personally or is just world
// flavor, keyed off actual game state (the player's own realm, a
// spouse's homeland, a claim already held) rather than a fixed script.

function personalStakeInRealm(gameState, realmKey) {
    if (gameState.realmKey === realmKey) return true;
    const spouse = getSpouse(gameState, gameState.player.id);
    if (spouse && spouse.sourceRealmKey === realmKey) return true;
    if (hasClaim(gameState, realmKey)) return true;
    return false;
}
