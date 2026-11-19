// guilds.js — the Burghers & Guilds: the emerging merchant class, the
// third power block alongside the Great Feudal Lords (vassals.js, who
// hold the military power) and the Holy Church (church.js, who hold the
// realm's legitimacy). The guilds hold neither — they hold the liquid
// coin the crown actually needs, and every privilege they're granted to
// keep that coin flowing comes directly out of the Feudal Lords' own
// standing, the real three-way tension the whole estate exists to create.

function setupGuilds(gameState) {
    gameState.guilds = gameState.guilds || { standing: 50, charters: 0 };
}

function getGuildStanding(gameState) {
    setupGuilds(gameState);
    return gameState.guilds.standing;
}

function adjustGuildStanding(gameState, amount) {
    setupGuilds(gameState);
    gameState.guilds.standing = Math.max(0, Math.min(100, gameState.guilds.standing + amount));
    return gameState.guilds.standing;
}

// What the guilds actually pay the crown this year — real coin, scaled
// directly by how well they've been treated. A realm that starves its
// cities of charters and goodwill doesn't lose some abstract bonus; the
// money that would have come from trade simply isn't there.
function guildTaxIncome(gameState) {
    setupGuilds(gameState);
    const base = 10 + gameState.player.tier * 15;
    return Math.round(base * (gameState.guilds.standing / 100));
}

// Granting a trade charter hands the guilds real legal privilege — at
// the Great Feudal Lords' direct expense. This is the central
// three-estate tension made mechanical: please the cities, and the
// dukes and barons notice exactly what it cost them.
function grantTradeCharter(gameState) {
    setupGuilds(gameState);
    gameState.guilds.charters += 1;
    const gain = randInt(15, 25);
    adjustGuildStanding(gameState, gain);
    const vassalLoss = randInt(4, 10);
    getVassals(gameState).forEach(v => adjustOpinion(v, -vassalLoss));
    logEvent(`${gameState.player.name} has granted the guilds a trade charter — their standing rises by ${gain}, but the Great Feudal Lords watch their own privileges chipped away (-${vassalLoss} opinion, every vassal).`);
    return true;
}

function denyCharterPetition(gameState) {
    setupGuilds(gameState);
    const loss = randInt(10, 18);
    adjustGuildStanding(gameState, -loss);
    const vassalGain = randInt(3, 8);
    getVassals(gameState).forEach(v => adjustOpinion(v, vassalGain));
    logEvent(`${gameState.player.name} has turned away the guilds' petition — the Great Feudal Lords are pleased (+${vassalGain} opinion), but the cities will remember being refused (-${loss} standing).`);
    return true;
}

// Taxing the guilds directly (rather than courting or refusing them) —
// a third lever, pleasing no one, that trades a chunk of their own
// standing for gold in hand right now.
function taxGuilds(gameState) {
    setupGuilds(gameState);
    const take = Math.round(50 + gameState.player.tier * 20);
    gameState.player.gold = (gameState.player.gold || 0) + take;
    adjustGuildStanding(gameState, -randInt(8, 14));
    logEvent(`${gameState.player.name} has levied a special tax on the guilds — ${take} gold now, at the cost of their goodwill.`);
    return take;
}

// Yearly hook: the guilds' trade tax actually lands in the treasury,
// scaled by standing, and standing itself drifts back toward a neutral
// baseline over time.
function tickGuilds(gameState) {
    setupGuilds(gameState);
    const income = guildTaxIncome(gameState);
    if (income > 0) gameState.player.gold = (gameState.player.gold || 0) + income;
    const pull = (50 - gameState.guilds.standing) * 0.05;
    adjustGuildStanding(gameState, pull + randInt(-2, 2));
}
