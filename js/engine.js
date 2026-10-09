// engine.js — the bookmark-era list, the core game-state object, the
// year-tick loop, and save/load. Everything else (domain, vassals,
// dynasty, church, council, intrigue, factions, wartime, reform) hangs
// its own per-year logic off advanceYear() once it exists; until then
// engine.js calls each hook defensively so a stub module never breaks
// the loop.

// Only 1461 has a real realm roster built out so far (realms.js). The rest
// are listed so the era-select screen can show the whole intended span and
// mark what's not open yet, rather than hiding the plan from the player.
const ERA_BOOKMARKS = [
    { key: "1200", year: 1200, label: "1200 — The Age of Crusade and Charter", available: false },
    { key: "1337", year: 1337, label: "1337 — On the Eve of a Hundred Years' War", available: false },
    { key: "1461", year: 1461, label: "1461 — Roses, Reconquest, and the Fall of Constantinople's Shadow", available: true },
    { key: "1517", year: 1517, label: "1517 — The Church Splits", available: false },
    { key: "1648", year: 1648, label: "1648 — After the Peace of Westphalia", available: false },
    { key: "1740", year: 1740, label: "1740s — Enlightened Absolutism", available: false },
];

function listEras() {
    return ERA_BOOKMARKS;
}

function getEra(key) {
    return ERA_BOOKMARKS.find(e => e.key === key);
}

let gameState = null;

function startNewGame(eraKey, realmKey, character) {
    const era = getEra(eraKey);
    if (!era || !era.available) throw new Error(`Era not available: ${eraKey}`);
    const realm = getRealm(realmKey);
    if (!realm) throw new Error(`Unknown realm: ${realmKey}`);

    gameState = {
        eraKey,
        year: era.year,
        realmKey,
        player: character,
        crownAuthority: { [realmKey]: 0 },
        family: {},
        vassals: {},
        succession: { lawKey: (typeof DEFAULT_SUCCESSION_LAW !== "undefined" ? DEFAULT_SUCCESSION_LAW : "maleProximogeniture") },
        gameOver: false,
        log: [],
        turn: 0,
    };
    logEvent(`${character.name} comes of age in ${realm.name}, ${era.year}.`);

    // One-time setup hooks — each module seeds its own starting state once
    // the base gameState exists. No-op until dynasty.js/vassals.js define
    // these.
    callHookIfPresent("setupDynasty", gameState);
    callHookIfPresent("setupVassals", gameState);
    callHookIfPresent("setupChurch", gameState);
    callHookIfPresent("setupCouncil", gameState);
    callHookIfPresent("setupIntrigue", gameState);
    callHookIfPresent("setupWartime", gameState);
    callHookIfPresent("setupFactions", gameState);
    callHookIfPresent("setupReform", gameState);
    callHookIfPresent("setupCanon", gameState);

    return gameState;
}

function logEvent(text) {
    if (!gameState) return;
    gameState.log.push({ year: gameState.year, text });
}

// Rough, deliberately simple mortality curve for this phase: baseline risk
// rises with age, and poor health multiplies it. Later systems (wartime,
// intrigue, church) will add their own causes rather than replacing this.
function deathChance(character) {
    const age = character.age;
    let base = 0.002;
    if (age > 40) base += (age - 40) * 0.0015;
    if (age > 60) base += (age - 60) * 0.004;
    const healthFactor = (100 - character.health) / 100;
    return Math.min(0.9, base + healthFactor * 0.05);
}

function checkDeath(character) {
    if (!character.alive) return false;
    if (Math.random() < deathChance(character)) {
        character.alive = false;
        return true;
    }
    return false;
}

function callHookIfPresent(name, ...args) {
    if (typeof window !== "undefined" && typeof window[name] === "function") {
        return window[name](...args);
    }
    if (typeof globalThis[name] === "function") {
        return globalThis[name](...args);
    }
    return undefined;
}

// One year of the player character's life. Returns a summary the UI layer
// can show; does not itself touch the DOM.
function advanceYear() {
    if (!gameState) throw new Error("No active game");
    if (gameState.gameOver) return { year: gameState.year, playerAlive: false, gameOver: true };

    gameState.year += 1;
    gameState.turn += 1;
    const player = gameState.player;

    let died = false;
    if (player.alive) {
        player.age += 1;
        died = checkDeath(player);
        if (died) {
            logEvent(`${player.name} has died at ${player.age}.`);
        }
    }

    // Hooks for later phases — each is a no-op until its module defines it.
    // tickDynasty runs before succession is resolved below, so an heir who
    // was just an ordinary relative a moment ago still ages/marries/has
    // children normally this same year, rather than being skipped as "the
    // player" before they've actually taken that role.
    callHookIfPresent("tickDomain", gameState);
    callHookIfPresent("tickVassals", gameState);
    callHookIfPresent("tickDynasty", gameState);
    callHookIfPresent("tickChurch", gameState);
    callHookIfPresent("tickChurchCareer", gameState);
    callHookIfPresent("tickCouncil", gameState);
    callHookIfPresent("tickIntrigue", gameState);
    callHookIfPresent("tickFactions", gameState);
    callHookIfPresent("tickWartime", gameState);
    callHookIfPresent("tickReform", gameState);
    callHookIfPresent("tickCanon", gameState);
    callHookIfPresent("tickEvents", gameState);

    if (died) {
        callHookIfPresent("applySuccession", gameState);
    }

    return { year: gameState.year, playerAlive: gameState.player.alive, gameOver: !!gameState.gameOver };
}

const SAVE_KEY = "crownsAndCouncilsSave";

function saveGame() {
    if (!gameState) return false;
    try {
        if (typeof localStorage === "undefined") return false;
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        return true;
    } catch (e) {
        return false;
    }
}

function loadGame() {
    try {
        if (typeof localStorage === "undefined") return null;
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        gameState = JSON.parse(raw);
        return gameState;
    } catch (e) {
        return null;
    }
}

function hasSavedGame() {
    try {
        if (typeof localStorage === "undefined") return false;
        return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
        return false;
    }
}
