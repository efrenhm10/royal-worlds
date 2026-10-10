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
