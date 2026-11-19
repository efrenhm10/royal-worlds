// stress.js — a CK3-style stress matrix: acting against your own nature
// has a real psychological cost, and enough of it breaks you. Stress
// comes from two places — ongoing structural pressure (a war, a faction,
// excommunication risk, failing health) and the specific choices you
// make, scored against your own temperament (narrative.js's voice
// system) rather than a fixed "good/bad" axis, so a Wrathful character
// is stressed by backing down, not by confronting someone.

const STRESS_MAX = 100;
const STRESS_BREAKING_POINT = 85;

// Keyword inference from a decision OPTION's own label — avoids having
// to hand-tag every option in decisions.js while still reading the real
// character of the choice, the same five voices narrative.js already
// uses everywhere else.
const OPTION_TONE_PATTERNS = [
    { tone: "bold", pattern: /compete|confront|demand satisfaction|hunt them down|march|refuse outright|make an example|refuse\b/i },
    { tone: "wary", pattern: /decline|let it (pass|go)|ignore|push through|ask for better terms|keep him waiting/i },
    { tone: "devout", pattern: /pray|pilgrimage|dispensation|host him graciously|meet him yourself|seek the church/i },
    { tone: "cunning", pattern: /pay for silence|bribe|quietly|fund the scheme/i },
    { tone: "warm", pattern: /lend gold|generous|gift|festival|offer a place|praise them|encourage them/i },
];

function inferOptionTone(label) {
    for (const { tone, pattern } of OPTION_TONE_PATTERNS) {
        if (pattern.test(label)) return tone;
    }
    return null;
}

// Called right after a decision is resolved: choosing in your own voice
// is a relief; choosing against it costs something real.
function applyStressForChoice(gameState, optionLabel) {
    const tone = inferOptionTone(optionLabel);
    if (!tone) return;
    const player = gameState.player;
    const voice = playerVoice(player);
    if (voice === "neutral") return;
    player.stress = player.stress || 0;
    if (tone === voice) {
        player.stress = Math.max(0, player.stress - 3);
    } else {
        player.stress = Math.min(STRESS_MAX, player.stress + 6);
    }
}

const COPING_OUTCOMES = {
    bold: { text: p => `${p.name} can no longer hold it together quietly — a public outburst, in front of the whole court.`, apply(p) { p.prestige = Math.max(0, (p.prestige || 0) - 15); } },
    wary: { text: p => `${p.name} withdraws from court entirely for a time, unable to face anyone.`, apply(p) { p.health = Math.max(0, p.health - 10); } },
    devout: { text: p => `${p.name} disappears into fasting and prayer, punishing, far past what faith actually asks.`, apply(p) { p.health = Math.max(0, p.health - 12); p.piety = (p.piety || 0) + 10; } },
    cunning: { text: p => `${p.name} drowns it in wine and worse company, and it shows.`, apply(p) { p.gold = Math.max(0, (p.gold || 0) - 40); p.health = Math.max(0, p.health - 5); } },
    warm: { text: p => `${p.name} breaks down in front of the people closest to them — no shame in it, but it's real.`, apply(p) { p.health = Math.max(0, p.health - 6); } },
    neutral: { text: p => `${p.name} simply cannot carry it anymore, and it costs something real.`, apply(p) { p.health = Math.max(0, p.health - 10); } },
};

function tickStress(gameState) {
    const player = gameState.player;
    player.stress = player.stress || 0;

    player.stress = Math.max(0, player.stress - 2); // a year without a new blow eases, slowly

    if (gameState.war) player.stress = Math.min(STRESS_MAX, player.stress + 4);
    if (gameState.faction) player.stress = Math.min(STRESS_MAX, player.stress + 5);
    if (isExcommunicationRisk(gameState, gameState.realmKey)) player.stress = Math.min(STRESS_MAX, player.stress + 3);
    if (gameState.reform && gameState.reform.schismed) player.stress = Math.min(STRESS_MAX, player.stress + 3);
    if (player.health < 40) player.stress = Math.min(STRESS_MAX, player.stress + 3);
    if (gameState.hostileScheme) player.stress = Math.min(STRESS_MAX, player.stress + 2);

    if (player.stress >= STRESS_BREAKING_POINT) {
        const voice = playerVoice(player);
        const coping = COPING_OUTCOMES[voice] || COPING_OUTCOMES.neutral;
        logEvent(coping.text(player));
        coping.apply(player);
        player.stress = Math.round(STRESS_BREAKING_POINT * 0.5); // the break itself is the release
    }
}

function stressLabel(stress) {
    if (stress >= STRESS_BREAKING_POINT) return "breaking point";
    if (stress >= 65) return "severe";
    if (stress >= 40) return "strained";
    if (stress >= 20) return "manageable";
    return "at ease";
}
