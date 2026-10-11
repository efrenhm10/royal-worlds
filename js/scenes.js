// scenes.js — a short atmospheric line for wherever the player currently
// is, shown under their name/title in the HUD. Flavor only, no mechanical
// effect — but it's one of the places the game should read like a life
// being lived, not a dashboard: it varies by rank, by a slow-turning
// season, and by the player's own temperament (narrative.js's voice
// system), not just one fixed caption per tier.

const SCENE_LINES = {
    0: {
        neutral: ["A single room above a tradesman's shop is home enough, for now.", "The name still opens doors, even with no land behind it."],
        bold: ["No land yet, but every conversation is a door {name} means to push through."],
        wary: ["A single rented room, door barred at night — {name} trusts the street less than the name still carries."],
        warm: ["Little to {name}'s name but a few good friends who'd vouch for them anywhere."],
    },
    1: {
        neutral: ["A single manor, its hall smelling of woodsmoke and old rushes.", "A knight's modest household — a few servants, a well-kept sword."],
        bold: ["A single manor, but {name} already talks about it like the first of several."],
        devout: ["A modest manor, and a chapel {name} keeps better than the roof."],
    },
    2: {
        neutral: ["A baronial hall, tenants' rents just covering the roof repairs.", "A household large enough to need a steward, small enough to know everyone in it."],
        cunning: ["A baronial hall where {name} already knows exactly which tenant owes what, and to whom."],
        warm: ["A baronial hall that still feels more like a large family than a household."],
    },
    3: {
        neutral: ["A county seat, with lesser lords waiting in the antechamber.", "A court with its own small intrigues, already forming around you."],
        wary: ["A county seat with more flattery in the antechamber than {name} fully trusts."],
        bold: ["A county seat, and {name} already eyeing what a duchy would feel like."],
    },
    4: {
        neutral: ["A ducal court, tapestried and watchful, counts and barons at the table.", "A household rivaling some kings' — and ambitions to match."],
        cunning: ["A ducal court where every tapestry hides at least one listening ear, and {name} knows it."],
    },
    5: {
        neutral: ["A royal court, every corner of it worth someone's careful attention.", "A throne room built to remind every visitor exactly whose it is."],
        bold: ["A throne room, and {name} still feels the weight of it less than the possibility of it."],
        wary: ["A royal court where {name} has learned that every smile is also a calculation."],
    },
    6: {
        neutral: ["A court other crowned heads write to first, and answer last."],
    },
};

const SEASON_PHRASES = [
    "the bite of winter", "the mud and renewal of spring", "the long light of summer", "the turn toward harvest",
];

function seasonPhrase(gameState) {
    return SEASON_PHRASES[((gameState.year % 4) + 4) % 4];
}

function sceneDescription(gameState) {
    const player = gameState.player;
    const tier = Math.max(0, Math.min(player.tier, 6));
    const byVoice = SCENE_LINES[tier] || SCENE_LINES[0];
    const base = voiceLine(byVoice, player);
    const line = base.replace(/\{name\}/g, player.name);

    const realm = getRealm(gameState.realmKey);
    const season = seasonPhrase(gameState);
    const spouse = typeof getSpouse === "function" ? getSpouse(gameState, player.id) : null;
    const spouseLine = spouse && spouse.alive && Math.random() < 0.5 ? ` ${spouse.name} is rarely far.` : "";

    return `${line} It is ${season} in ${realm.name}.${spouseLine}`;
}
