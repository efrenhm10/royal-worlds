// church.js — the Catholic Church as a real power pressing on every
// realm, independent of any one ruler's wishes: a standing score Rome
// holds toward each realm (not a personal player stat), drifting on its
// own and pushed around by church_career.js's player actions, reform.js's
// religious-movement pressure (later phase), and plain neglect.

const EXCOMMUNICATION_RISK_THRESHOLD = 20;

function setupChurch(gameState) {
    gameState.church = gameState.church || { standing: {} };
    if (gameState.church.standing[gameState.realmKey] == null) {
        gameState.church.standing[gameState.realmKey] = 60;
    }
}

function getStanding(gameState, realmKey) {
    gameState.church = gameState.church || { standing: {} };
    if (gameState.church.standing[realmKey] == null) gameState.church.standing[realmKey] = 60;
    return gameState.church.standing[realmKey];
}

function adjustStanding(gameState, realmKey, amount) {
    const current = getStanding(gameState, realmKey);
    gameState.church.standing[realmKey] = Math.max(0, Math.min(100, current + amount));
    return gameState.church.standing[realmKey];
}

function isExcommunicationRisk(gameState, realmKey) {
    return getStanding(gameState, realmKey) < EXCOMMUNICATION_RISK_THRESHOLD;
}

// Yearly hook: standing drifts slowly back toward a neutral baseline, and
// a realm sitting in excommunication-risk territory for a stretch pays a
// small, growing vassal-opinion cost — the Church's displeasure is a real
// problem for a ruler, not background flavor.
function tickChurch(gameState) {
    setupChurch(gameState);
    const realmKey = gameState.realmKey;
    const standing = getStanding(gameState, realmKey);
    const pull = (60 - standing) * 0.05;
    adjustStanding(gameState, realmKey, pull + randInt(-2, 2));

    if (isExcommunicationRisk(gameState, realmKey)) {
        getVassals(gameState).forEach(v => adjustOpinion(v, -2));
    }
}
