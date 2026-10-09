// titles.js — the rank ladder every playable character climbs or falls
// along, plus Crown Authority: the dial that decides how much a crowned
// ruler can get away with before their own vassals push back.

const TITLE_LADDER = [
    { tier: 0, nameM: "Gentleman", nameF: "Gentlewoman", desc: "No title, no land of your own — a notable name, nothing more." },
    { tier: 1, nameM: "Sir", nameF: "Dame", desc: "Knighted, or landed with a single manor — a toehold." },
    { tier: 2, nameM: "Baron", nameF: "Baroness", desc: "A real barony: tenants, a hall, a seat at your liege's court." },
    { tier: 3, nameM: "Count", nameF: "Countess", desc: "A county of your own, with lesser lords owing you service." },
    { tier: 4, nameM: "Duke", nameF: "Duchess", desc: "A duchy — counts and barons answer to you." },
    { tier: 5, nameM: "King", nameF: "Queen", desc: "A crown. Dukes who were sovereign now owe you fealty." },
    { tier: 6, nameM: "Emperor", nameF: "Empress", desc: "Rare recognition above the crown itself — suzerainty other kings concede, not land you rule directly." },
];

// A handful of realms use a locally conventional name for a tier instead of
// the generic ladder word (England's "Earl" for tier 3, Austria's
// "Archduke" for tier 4, Venice's elected "Doge" for tier 4, Wallachia's
// "Voivode" for tier 4, Rome's "Pope" for tier 6). realms.js already carries
// each realm's own titleM/titleF for its ruling title; this override table
// is only for addressing OTHER title-holders within that realm's hierarchy
// at a tier that isn't the realm's top one (e.g. an English count is an Earl
// even though the King of England's own title is unaffected).
const REALM_TITLE_OVERRIDES = {
    england: { 3: { nameM: "Earl", nameF: "Countess" } },
};

function tierInfo(tier) {
    return TITLE_LADDER[tier];
}

function titleName(tier, gender, realmKey) {
    const override = REALM_TITLE_OVERRIDES[realmKey] && REALM_TITLE_OVERRIDES[realmKey][tier];
    if (override) return gender === "F" ? override.nameF : override.nameM;
    const info = tierInfo(tier);
    return gender === "F" ? info.nameF : info.nameM;
}

function tierUp(tier) {
    return Math.min(tier + 1, TITLE_LADDER.length - 1);
}

function tierDown(tier) {
    return Math.max(tier - 1, 0);
}

// Crown Authority — how much a crowned ruler (tier 5+) can centralize power
// before chartered rights and vassal factions push back. Four levels, each
// unlocked by holding the crown long enough and keeping stability above a
// threshold; each level raises what the ruler can do unilaterally but also
// raises baseline vassal unrest.
const CROWN_AUTHORITY_LEVELS = [
    {
        level: 0, name: "Low",
        desc: "Vassals hold their chartered rights in full. You cannot revoke a title or override local law without real cause.",
        vassalOpinionPenalty: 0,
        canRevokeTitlesFreely: false,
        canOverrideSuccessionLaw: false,
        taxAndLevyShare: 0.5,
    },
    {
        level: 1, name: "Medium",
        desc: "The crown's writ runs further. Minor titles can be revoked for cause; vassals grumble but comply.",
        vassalOpinionPenalty: 10,
        canRevokeTitlesFreely: false,
        canOverrideSuccessionLaw: false,
        taxAndLevyShare: 0.65,
    },
    {
        level: 2, name: "High",
        desc: "The crown can revoke titles at will and leans on vassals for most of their strength. Resentment is building.",
        vassalOpinionPenalty: 20,
        canRevokeTitlesFreely: true,
        canOverrideSuccessionLaw: false,
        taxAndLevyShare: 0.8,
    },
    {
        level: 3, name: "Absolute",
        desc: "Vassals are tenants of the crown in all but name. Chartered rights exist on parchment only — and factions know it.",
        vassalOpinionPenalty: 35,
        canRevokeTitlesFreely: true,
        canOverrideSuccessionLaw: true,
        taxAndLevyShare: 1.0,
    },
];

function crownAuthorityInfo(level) {
    return CROWN_AUTHORITY_LEVELS[Math.max(0, Math.min(level, CROWN_AUTHORITY_LEVELS.length - 1))];
}

// Raising Crown Authority a level is a deliberate ruler action, not a tick
// effect — engine.js calls this and is responsible for logging the event
// and for the immediate faction-unrest consequence described above.
function canRaiseCrownAuthority(realmState) {
    if (!realmState || realmState.rulerTier < 5) return false;
    if (realmState.crownAuthority >= CROWN_AUTHORITY_LEVELS.length - 1) return false;
    return realmState.stability >= 50;
}
