// royal_court.js — for anyone who isn't the realm's own sovereign (tier
// < 5), the choice this game was missing: stay home and run your own
// lands, or go to the realm's actual royal court and build closeness
// with the king or queen. Close enough unlocks real standing — a
// recognized Favorite, Mistress, or Confidant(e) — with a real stipend,
// and real risk: jealous rivals, scandal, disgrace that costs the status
// itself, not just a number.

function setupRoyalCourt(gameState) {
    gameState.royalCourt = gameState.royalCourt || { location: "home", favor: 0, status: null, yearsInStatus: 0 };
}

function isAtRoyalCourt(gameState) {
    setupRoyalCourt(gameState);
    return gameState.royalCourt.location === "court";
}

function canAttendRoyalCourt(gameState) {
    return gameState.player.tier < 5 && gameState.player.alive;
}

function travelToCourt(gameState) {
    setupRoyalCourt(gameState);
    if (!canAttendRoyalCourt(gameState)) return false;
    gameState.royalCourt.location = "court";
    const realm = getRealm(gameState.realmKey);
    logEvent(`${gameState.player.name} has traveled to ${realm.ruler.name}'s court.`);
    return true;
}

function returnHome(gameState) {
    setupRoyalCourt(gameState);
    if (gameState.royalCourt.location === "home") return false;
    gameState.royalCourt.location = "home";
    logEvent(`${gameState.player.name} has returned home to see to their own lands.`);
    return true;
}

function payRespects(gameState) {
    setupRoyalCourt(gameState);
    if (!isAtRoyalCourt(gameState)) return false;
    const gain = randInt(2, 5);
    gameState.royalCourt.favor = Math.min(100, gameState.royalCourt.favor + gain);
    logEvent(`${gameState.player.name} has paid their respects at court.`);
    return true;
}

// A bigger, riskier push for favor — gold spent on gifts and gestures
// that can land well or come across as presumptuous.
function seekCloserFavor(gameState) {
    setupRoyalCourt(gameState);
    if (!isAtRoyalCourt(gameState)) return false;
    const player = gameState.player;
    const cost = 50;
    if ((player.gold || 0) < cost) return false;
    player.gold -= cost;
    const chance = Math.min(0.9, 0.55 + player.skills.diplomacy * 0.02);
    if (Math.random() < chance) {
        const gain = randInt(8, 15);
        gameState.royalCourt.favor = Math.min(100, gameState.royalCourt.favor + gain);
        logEvent(`${player.name}'s overtures at court have been well received (+${gain} favor).`);
    } else {
        const loss = randInt(3, 8);
        gameState.royalCourt.favor = Math.max(0, gameState.royalCourt.favor - loss);
        logEvent(`${player.name}'s overtures at court have come across as presumptuous (-${loss} favor).`);
    }
    return true;
}

function royalFavoriteTitle(gameState) {
    const realm = getRealm(gameState.realmKey);
    const player = gameState.player;
    if (player.gender !== realm.ruler.gender) {
        return player.gender === "F" ? `${realm.ruler.name}'s mistress` : `${realm.ruler.name}'s favorite`;
    }
    return `${realm.ruler.name}'s closest confidant${player.gender === "F" ? "e" : ""}`;
}

function canBecomeFavorite(gameState) {
    setupRoyalCourt(gameState);
    return isAtRoyalCourt(gameState) && gameState.royalCourt.favor >= 60 && !gameState.royalCourt.status;
}

function becomeFavorite(gameState) {
    setupRoyalCourt(gameState);
    if (!canBecomeFavorite(gameState)) return false;
    const title = royalFavoriteTitle(gameState);
    gameState.royalCourt.status = title;
    gameState.royalCourt.yearsInStatus = 0;
    gameState.player.prestige = (gameState.player.prestige || 0) + 25;
    logEvent(`${gameState.player.name} has become ${title}.`);
    return true;
}

// Yearly hook: a Favorite draws a real stipend and prestige every year —
// but every year also carries a real, growing chance of scandal. Half
// the time it's just whispers (a prestige hit); half the time it's
// outright disgrace, which costs the status itself.
function tickRoyalCourt(gameState) {
    setupRoyalCourt(gameState);
    const rc = gameState.royalCourt;
    const player = gameState.player;
    if (!rc.status) return;

    rc.yearsInStatus += 1;
    player.gold = (player.gold || 0) + 40;
    player.prestige = (player.prestige || 0) + 5;

    const scandalChance = Math.min(0.35, 0.08 + rc.yearsInStatus * 0.01);
    if (Math.random() < scandalChance) {
        if (Math.random() < 0.5) {
            logEvent(`Scandal breaks over ${player.name}'s closeness to the throne — disgraced, ${player.name} is sent from court as ${rc.status} no longer.`);
            rc.status = null;
            rc.favor = Math.max(0, rc.favor - 40);
            rc.yearsInStatus = 0;
            rc.location = "home";
            player.prestige = Math.max(0, player.prestige - 30);
        } else {
            const hit = randInt(5, 15);
            player.prestige = Math.max(0, player.prestige - hit);
            logEvent(`Jealous rivals at court have whispered against ${player.name} (-${hit} prestige) — the sovereign's favor holds, for now.`);
        }
    }
}
