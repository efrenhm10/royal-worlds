// narrative.js — the same mechanical event should not read the same way
// twice, and it should especially not read the same way for a Wrathful
// brawler and a Craven schemer. This maps each temperament trait to one
// of a handful of "voices," and gives decisions.js/scenes.js a shared way
// to pick a phrasing in that voice — so who you ARE actually colors how
// your own life reads, not just which numbers move.

const TRAIT_VOICE = {
    Wrathful: "bold", Gallant: "bold", Zealous: "bold", Ambitious: "bold",
    Craven: "wary", Cautious: "wary", Paranoid: "wary", Patient: "wary",
    Pious: "devout", Just: "devout", Honest: "devout", Temperate: "devout",
    Shrewd: "cunning", Deceitful: "cunning", Vengeful: "cunning",
    Generous: "warm", Trusting: "warm", Gluttonous: "warm",
};

// A character's first trait (in roll order) that maps to a voice wins —
// traits are rolled two at a time, so this is usually just "whichever
// came first," which is as good a tiebreak as any for flavor purposes.
function playerVoice(person) {
    for (const trait of (person.traits || [])) {
        if (TRAIT_VOICE[trait]) return TRAIT_VOICE[trait];
    }
    return "neutral";
}

// variants is {voiceKey: string | string[]}. Only needs to cover the
// voices that actually read differently for a given line — anything
// missing falls back to "neutral", then to whatever's first defined, so
// no event has to write all five every time.
function voiceLine(variants, person) {
    const voice = playerVoice(person);
    const pick = variants[voice] || variants.neutral || variants[Object.keys(variants)[0]];
    if (!pick) return "";
    return Array.isArray(pick) ? randomFrom(pick) : pick;
}

// A one-line read on who someone IS, from their own temperament — used
// to describe anyone in the player's orbit (a vassal, a spouse, a
// council member) as a person with a disposition, not a trait-tag list.
const VOICE_PERSONALITY_FLAVOR = {
    bold: "quick to act, and quicker to anger",
    wary: "careful with every word around you",
    devout: "devout, and watching to see if you are too",
    cunning: "always working an angle",
    warm: "openly, genuinely fond of you",
    neutral: "hard to get a true read on",
};

function personalityFlavor(person) {
    return VOICE_PERSONALITY_FLAVOR[playerVoice(person)] || VOICE_PERSONALITY_FLAVOR.neutral;
}

// Translates a raw opinion number into how that relationship would
// actually be described, the way a real court would gossip about it —
// the words the number means, not the number itself.
function relationshipLabel(opinion) {
    if (opinion >= 85) return "devoted to you";
    if (opinion >= 70) return "a true ally";
    if (opinion >= 55) return "warm toward you";
    if (opinion >= 45) return "civil, nothing more";
    if (opinion >= 30) return "wary of you";
    if (opinion >= 15) return "resentful";
    return "your enemy, in all but name";
}
