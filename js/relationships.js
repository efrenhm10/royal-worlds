// relationships.js — the piece the earlier single-file version of this
// game had and the rebuild didn't: family isn't just trait tags to read,
// it's loyalty you actively work at. Every blood relative and spouse
// carries a loyalty number (0-100, separate from vassals/council's
// opinion, same spirit), and the player can act on it directly — ask for
// gold, ask for political support, send a gift, or simply spend time
// together — instead of only ever being on the receiving end of events.

const RELATIVE_ASK_COOLDOWN = 3;
const RELATIVE_VISIT_COOLDOWN = 1;

function relativeLoyalty(person) {
    return person.loyalty != null ? person.loyalty : 50;
}

function canAskRelativeForGold(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive || person.id === gameState.player.id) return false;
    return person.lastAskedGoldYear == null || gameState.year - person.lastAskedGoldYear >= RELATIVE_ASK_COOLDOWN;
}

// Success is gated on loyalty, not guaranteed — leaning on family is a
// real ask, not a free withdrawal, and it costs a little loyalty either
// way, win or lose.
function askRelativeForGold(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!canAskRelativeForGold(gameState, personId)) return false;
    const player = gameState.player;
    person.lastAskedGoldYear = gameState.year;
    const loyalty = relativeLoyalty(person);
    const success = Math.random() * 100 < loyalty;
    if (success) {
        const amount = 10 + Math.round(loyalty / 3);
        const given = Math.min(amount, Math.max(0, person.gold || 0));
        person.gold = Math.max(0, (person.gold || 0) - given);
        player.gold = (player.gold || 0) + given;
        person.loyalty = Math.max(0, loyalty - 8);
        logEvent(given > 0
            ? `${person.name} sends ${given} gold without much fuss — family looking after family (+${given} gold).`
            : `${person.name} agrees to help, but has little enough of their own to spare right now.`);
    } else {
        person.loyalty = Math.max(0, loyalty - 4);
        logEvent(`${person.name} apologizes but can't spare anything just now — and the asking itself strains things a little.`);
    }
    return true;
}

function canAskRelativeForSupport(gameState, personId) {
    return canAskRelativeForGold(gameState, personId);
}

// The political counterpart — calling on a relative's own standing
// instead of their purse. Separate cooldown field so leaning on someone
// for money doesn't quietly block leaning on them for support too.
function canAskRelativeForSupportSeparately(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive || person.id === gameState.player.id) return false;
    return person.lastAskedSupportYear == null || gameState.year - person.lastAskedSupportYear >= RELATIVE_ASK_COOLDOWN;
}

function askRelativeForSupport(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!canAskRelativeForSupportSeparately(gameState, personId)) return false;
    const player = gameState.player;
    person.lastAskedSupportYear = gameState.year;
    const loyalty = relativeLoyalty(person);
    const success = Math.random() * 100 < loyalty;
    if (success) {
        const amount = 5 + Math.round(loyalty / 10);
        player.prestige = (player.prestige || 0) + amount;
        person.loyalty = Math.max(0, loyalty - 8);
        logEvent(`${person.name} puts their own name behind yours where it matters (+${amount} prestige).`);
    } else {
        person.loyalty = Math.max(0, loyalty - 4);
        logEvent(`${person.name} isn't willing to spend their own standing on this, not this time.`);
    }
    return true;
}

// A proactive investment, not a reaction to anything — always available
// as long as it's affordable, which is its own natural limit.
function sendGiftToRelative(gameState, personId, amount) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive || person.id === gameState.player.id) return false;
    const player = gameState.player;
    const cost = amount || 20;
    if ((player.gold || 0) < cost) return false;
    player.gold -= cost;
    person.gold = (person.gold || 0) + cost;
    const loyalty = relativeLoyalty(person);
    person.loyalty = Math.min(100, loyalty + Math.round(cost / 4));
    logEvent(`${player.name} sends ${person.name} a generous gift (-${cost} gold).`);
    return true;
}

function canSpendTimeWithRelative(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!person || !person.alive || person.id === gameState.player.id) return false;
    return person.lastTimeTogetherYear == null || gameState.year - person.lastTimeTogetherYear >= RELATIVE_VISIT_COOLDOWN;
}

// Free, but not unlimited — a real year of real attention, not an
// infinitely-repeatable button.
function spendTimeWithRelative(gameState, personId) {
    const person = getPerson(gameState, personId);
    if (!canSpendTimeWithRelative(gameState, personId)) return false;
    person.lastTimeTogetherYear = gameState.year;
    const loyalty = relativeLoyalty(person);
    person.loyalty = Math.min(100, loyalty + randInt(3, 7));
    logEvent(`${gameState.player.name} spends real time with ${person.name} — small, but it matters.`);
    return true;
}
