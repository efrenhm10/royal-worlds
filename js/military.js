// military.js — real troop composition, not one abstract "levies" number.
// Vassal levies and domain-keep levies (vassals.js, domain.js) are the
// feudal muster; this is the standing force the player recruits and
// maintains directly — men-at-arms, knights, archers — plus mercenary
// companies hired for a burst of temporary strength. All of it feeds
// into wartime.js's playerMilitaryPower.

const TROOP_TYPES = [
    { key: "menAtArms", name: "Men-at-Arms", quality: 3, recruitCost: 15, upkeep: 0.4, desc: "Professional footmen — armored, drilled, loyal to you alone." },
    { key: "knights", name: "Knights", quality: 6, recruitCost: 60, upkeep: 1.2, desc: "Mounted and armored nobility-trained warriors. Expensive, and worth it." },
    { key: "archers", name: "Archers", quality: 2, recruitCost: 10, upkeep: 0.25, desc: "Ranged troops — cheap, fragile, decisive in the right battle." },
];

const MERCENARY_COMPANY_NAMES = ["The Free Lances", "The Iron Company", "The White Mantles", "The Black Band", "The Golden Spears", "The Ravens of the Rhine", "The Sable Company"];

function setupMilitary(gameState) {
    gameState.military = gameState.military || { menAtArms: 0, knights: 0, archers: 0, mercenaries: [] };
}

function getTroopCount(gameState, key) {
    setupMilitary(gameState);
    return gameState.military[key] || 0;
}

function recruitTroopCost(gameState, key, amount) {
    const type = TROOP_TYPES.find(t => t.key === key);
    return type ? type.recruitCost * amount : 0;
}

function recruitTroops(gameState, key, amount) {
    setupMilitary(gameState);
    const type = TROOP_TYPES.find(t => t.key === key);
    if (!type || amount <= 0) return false;
    const cost = recruitTroopCost(gameState, key, amount);
    if ((gameState.player.gold || 0) < cost) return false;
    gameState.player.gold -= cost;
    gameState.military[key] = (gameState.military[key] || 0) + amount;
    logEvent(`${gameState.player.name} has recruited ${amount} ${type.name.toLowerCase()}, for ${cost} gold.`);
    return true;
}

function disbandTroops(gameState, key, amount) {
    setupMilitary(gameState);
    const type = TROOP_TYPES.find(t => t.key === key);
    if (!type) return false;
    const have = gameState.military[key] || 0;
    const n = Math.min(amount, have);
    if (n <= 0) return false;
    gameState.military[key] -= n;
    logEvent(`${gameState.player.name} has disbanded ${n} ${type.name.toLowerCase()}.`);
    return true;
}

function standingUpkeep(gameState) {
    setupMilitary(gameState);
    const troopUpkeep = TROOP_TYPES.reduce((sum, t) => sum + (gameState.military[t.key] || 0) * t.upkeep, 0);
    const mercUpkeep = gameState.military.mercenaries.reduce((sum, m) => sum + m.costPerYear, 0);
    return Math.round(troopUpkeep + mercUpkeep);
}

// Quality isn't flavor — it's a direct multiplier on how much fighting
// strength each body of troops is worth, same unit scale as
// wartime.js's targetMilitaryPower.
function standingPower(gameState) {
    setupMilitary(gameState);
    const base = TROOP_TYPES.reduce((sum, t) => sum + (gameState.military[t.key] || 0) * t.quality * 10, 0);
    const merc = gameState.military.mercenaries.reduce((sum, m) => sum + m.count * m.quality * 10, 0);
    return Math.round(base + merc);
}

function hireMercenaries(gameState) {
    setupMilitary(gameState);
    const count = randInt(200, 600);
    const quality = randInt(3, 6);
    const costPerYear = Math.round(count * quality * 0.08);
    const hireCost = Math.round(costPerYear * 1.5);
    if ((gameState.player.gold || 0) < hireCost) return false;
    gameState.player.gold -= hireCost;
    const name = randomFrom(MERCENARY_COMPANY_NAMES);
    gameState.military.mercenaries.push({ name, count, quality, costPerYear, hiredYear: gameState.year });
    logEvent(`${gameState.player.name} has hired ${name} — ${count} mercenaries — for ${hireCost} gold upfront.`);
    return true;
}

function dismissMercenaries(gameState, index) {
    setupMilitary(gameState);
    if (!gameState.military.mercenaries[index]) return false;
    const m = gameState.military.mercenaries.splice(index, 1)[0];
    logEvent(`${gameState.player.name} has dismissed ${m.name}.`);
    return true;
}

// Yearly hook: standing troops and mercenary contracts cost real upkeep.
// If the treasury can't cover it, the army doesn't just sit there for
// free — part of it deserts, or a mercenary company walks.
function tickMilitary(gameState) {
    setupMilitary(gameState);
    const upkeep = standingUpkeep(gameState);
    if (upkeep <= 0) return;
    if ((gameState.player.gold || 0) >= upkeep) {
        gameState.player.gold -= upkeep;
        return;
    }
    if (gameState.military.mercenaries.length) {
        const gone = gameState.military.mercenaries.shift();
        logEvent(`${gameState.player.name} cannot pay the army — ${gone.name} abandons the contract.`);
    } else {
        let lostAny = false;
        TROOP_TYPES.forEach(t => {
            if (gameState.military[t.key] > 0) {
                const lost = Math.ceil(gameState.military[t.key] * 0.25);
                gameState.military[t.key] -= lost;
                lostAny = true;
            }
        });
        if (lostAny) logEvent(`${gameState.player.name} cannot pay the standing army — a quarter of it deserts.`);
    }
    gameState.player.gold = 0;
}
