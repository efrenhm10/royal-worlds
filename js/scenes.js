// scenes.js — a one-line atmospheric scene description for wherever the
// player currently is, keyed off title tier and realm. Flavor only, no
// mechanical effect — the HUD shows one under the player's name/title.

const SCENE_LINES = {
    0: [
        "A single room above a tradesman's shop is home enough, for now.",
        "The name still opens doors, even with no land behind it.",
    ],
    1: [
        "A single manor, its hall smelling of woodsmoke and old rushes.",
        "A knight's modest household — a few servants, a well-kept sword.",
    ],
    2: [
        "A baronial hall, tenants' rents just covering the roof repairs.",
        "A household large enough to need a steward, small enough to know everyone in it.",
    ],
    3: [
        "A county seat, with lesser lords waiting in the antechamber.",
        "A court with its own small intrigues, already forming around you.",
    ],
    4: [
        "A ducal court, tapestried and watchful, counts and barons at the table.",
        "A household rivaling some kings' — and ambitions to match.",
    ],
    5: [
        "A royal court, every corner of it worth someone's careful attention.",
        "A throne room built to remind every visitor exactly whose it is.",
    ],
    6: [
        "A court other crowned heads write to first, and answer last.",
    ],
};

function sceneDescription(gameState) {
    const player = gameState.player;
    const tier = Math.max(0, Math.min(player.tier, 6));
    const lines = SCENE_LINES[tier] || SCENE_LINES[0];
    const realm = getRealm(gameState.realmKey);
    const index = (gameState.year + player.id) % lines.length;
    return `${lines[index]} (${realm.name})`;
}
