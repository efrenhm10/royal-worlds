// council.js — the small council: Chancellor, Steward, Marshal, Spymaster,
// Court Chaplain. Each is a named character with a skill and an opinion
// of their own, not a slider — and each produces a real yearly effect
// (gold, prestige, piety, levies) scaled by that skill.

const COUNCIL_ROLES = [
    { key: "chancellor", name: "Chancellor", skillKey: "diplomacy" },
    { key: "steward", name: "Steward", skillKey: "stewardship" },
    { key: "marshal", name: "Marshal", skillKey: "martial" },
    { key: "spymaster", name: "Spymaster", skillKey: "intrigue" },
    { key: "chaplain", name: "Court Chaplain", skillKey: "learning" },
];

let _nextCouncilId = 1;
function nextCouncilId() {
    return _nextCouncilId++;
}

function makeAdvisor(gameState, role) {
    const realm = getRealm(gameState.realmKey);
    const gender = Math.random() < 0.5 ? "M" : "F";
    return {
        id: nextCouncilId(),
        name: generatePeriodName(realm.cultureKey, gender),
        gender,
        role: role.key,
        skill: randomSkillValue(),
        opinion: randInt(45, 75),
    };
}

// A landless gentleman/gentlewoman (tier 0) has no household to speak of —
// a formal council starts at tier 1 (knighted/landed) and up.
function setupCouncil(gameState) {
    gameState.council = gameState.council || {};
    if (gameState.player.tier < 1) return;
    COUNCIL_ROLES.forEach(role => {
        gameState.council[role.key] = makeAdvisor(gameState, role);
    });
}

function getCouncil(gameState) {
    return gameState.council || {};
}

function replaceAdvisor(gameState, roleKey) {
    const role = COUNCIL_ROLES.find(r => r.key === roleKey);
    if (!role) return null;
    const advisor = makeAdvisor(gameState, role);
    gameState.council[roleKey] = advisor;
    logEvent(`${advisor.name} has been appointed ${role.name}.`);
    return advisor;
}

// Yearly hook: advisor opinion drifts toward neutral, an advisor
// occasionally retires or dies and is replaced, and each filled role
// produces its real effect for the year.
function tickCouncil(gameState) {
    const council = getCouncil(gameState);
    const player = gameState.player;

    Object.keys(council).forEach(roleKey => {
        const advisor = council[roleKey];
        adjustOpinion(advisor, (50 - advisor.opinion) * 0.08 + randInt(-3, 3));
        if (Math.random() < 0.03) {
            const role = COUNCIL_ROLES.find(r => r.key === roleKey);
            logEvent(`${advisor.name} has left your service as ${role.name}.`);
            replaceAdvisor(gameState, roleKey);
        }
    });

    if (council.steward) player.gold = (player.gold || 0) + Math.round(council.steward.skill * 0.5);
    if (council.chancellor) player.prestige = (player.prestige || 0) + Math.round(council.chancellor.skill * 0.2);
    if (council.chaplain) player.piety = (player.piety || 0) + Math.round(council.chaplain.skill * 0.2);
    if (council.marshal) {
        getVassals(gameState).forEach(v => { v.levies += Math.round(council.marshal.skill * 0.5); });
    }
}
