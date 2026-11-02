// canon_events.js — the actual scripted historical beats for the 1461
// bookmark. Drawn from royal-worlds.html's own WORLD_TIMELINE content
// (Edward IV, Warwick, Richard III, Bosworth, the Castilian succession
// war, the Burgundian crisis, the Sforza succession, the Italian Wars,
// Matthias Corvinus, Mehmed II) as reference material, rewritten to run
// on the new systems: each beat is a world event that lands at its real
// year, logs what happened, and nudges the affected realm's stability
// (intrigue.js's rivalStability overlay) rather than rewriting
// realms.js's static roster outright. A beat the player has a personal
// stake in (timeline.js) says so.

const CANON_EVENTS_1461 = [
    {
        id: "rome_tolfa_alum", year: 1461, realmKey: "rome",
        headline: "Vast alum deposits have been discovered at Tolfa, within the Papal States themselves. Alum is essential to the European cloth trade and was bought from the Ottomans until now — Pope Pius II has an independent fortune at last, beholden to no one for it.",
        stabilityDelta: { rome: 15 },
    },
    {
        id: "france_league_public_weal_resolved", year: 1465, realmKey: "france",
        headline: "After the bloody stalemate at Montlhéry, Louis XI has bought peace with his own great vassals at the Treaties of Conflans and Saint-Maur — towns on the Somme ceded back to Burgundy, Normandy handed to his own brother. The crown's reach, so carefully gathered, has been forced to loosen its grip.",
        stabilityDelta: { france: -12, burgundy: 8, brittany: 6 },
        // Branches on the real league_of_the_public_weal decision
        // (decisions.js) — which side a vassal actually backed changes how
        // hard the settlement lands, not just how the player's own
        // standing moved at the time.
        variants: [
            {
                when: gameState => gameState.leagueOfThePublicWealSide === "league",
                headline: "After the bloody stalemate at Montlhéry, Louis XI has bought peace with his own great vassals at the Treaties of Conflans and Saint-Maur — with lords like this one already in their camp, Burgundy and Brittany press their advantage harder, and the crown's concessions cut deeper still.",
                stabilityDelta: { france: -16, burgundy: 10, brittany: 8 },
            },
            {
                when: gameState => gameState.leagueOfThePublicWealSide === "king",
                headline: "After the bloody stalemate at Montlhéry, Louis XI has bought peace with his own great vassals at the Treaties of Conflans and Saint-Maur — a hard settlement, though the King does not forget which of his vassals stood with him when it mattered, and the crown's own loss stings a little less for it.",
                stabilityDelta: { france: -8, burgundy: 6, brittany: 4 },
            },
        ],
    },
    {
        id: "burgundy_philip_dies", year: 1467, realmKey: "burgundy",
        headline: "Philip the Good, Duke of Burgundy, has died at 71. His son Charles the Bold succeeds him, and a harder, more combative Burgundy begins.",
        stabilityDelta: { burgundy: -10 },
    },
    {
        id: "wallachia_vlad_imprisoned", year: 1468, realmKey: "wallachia",
        headline: "Vlad III of Wallachia has fallen out with Matthias Corvinus of Hungary and been imprisoned. Radu cel Frumos, his own brother and an Ottoman client, is installed in his place.",
        stabilityDelta: { wallachia: -15 },
    },
    {
        id: "castile_isabella_marries_ferdinand", year: 1469, realmKey: "castile",
        headline: "Isabella of Castile has married Ferdinand of Aragon in secret, against her half-brother Henry IV's wishes — the match that will one day bind Castile and Aragon together.",
        stabilityDelta: { castile: -8, aragon: 5 },
    },
    {
        id: "england_tewkesbury", year: 1471, realmKey: "england",
        headline: "The Earl of Warwick, 'the Kingmaker,' has fallen at Barnet, and the Lancastrian cause has been broken at Tewkesbury. Edward IV's hold on the English throne looks secure at last.",
        stabilityDelta: { england: 15 },
        // Branches on the real wars_of_roses_allegiance decision
        // (decisions.js) — pledging Lancaster doesn't just cost standing
        // at the time, it actually changes who wins this battle.
        variants: [
            {
                when: gameState => gameState.warsOfRosesHouse === "lancaster",
                headline: "Backed by real allies, the Lancastrian cause holds at Tewkesbury after all — Edward IV's Yorkist army is broken instead, and the Red Rose's grip on the throne is real again, for now.",
                stabilityDelta: { england: -10 },
            },
            {
                when: gameState => gameState.warsOfRosesHouse === "neutral",
                headline: "The Earl of Warwick has fallen at Barnet, and the Lancastrian cause has been broken at Tewkesbury — Edward IV's throne is secure, though those who stayed neutral earn no credit for it.",
                stabilityDelta: { england: 5 },
            },
        ],
    },
    {
        id: "burgundy_charles_dies_nancy", year: 1477, realmKey: "burgundy",
        headline: "Charles the Bold has died at the Battle of Nancy. His daughter Mary inherits a Burgundy suddenly surrounded on all sides, and marries Maximilian of Austria within the year — the Habsburgs' fortunes rise with her.",
        stabilityDelta: { burgundy: -25, austria: 10 },
        // Branches on the real burgundian_succession_crisis decision
        // (decisions.js) — championing Mary's own rule or encouraging
        // French encroachment actually changes who ends up holding
        // Burgundy, not just how the player's own standing moved.
        variants: [
            {
                when: gameState => gameState.burgundySuccessionResolved === "mary",
                headline: "Charles the Bold has died at the Battle of Nancy. With real support behind her, his daughter Mary holds Burgundy in her own right, no Habsburg marriage needed — a rarer thing, a woman ruling a great duchy outright.",
                stabilityDelta: { burgundy: -10 },
            },
            {
                when: gameState => gameState.burgundySuccessionResolved === "france",
                headline: "Charles the Bold has died at the Battle of Nancy, and with the duchy's defenders turned against its own succession, Louis XI's France has moved into the leaderless duchy almost unopposed — Burgundy as an independent power is finished.",
                stabilityDelta: { burgundy: -40, france: 10 },
            },
        ],
    },
    {
        id: "ottoman_otranto", year: 1480, realmKey: "ottoman",
        headline: "An Ottoman force has taken Otranto, on the Italian mainland itself — a shock to every court in Christendom, Rome not least.",
        stabilityDelta: { naples: -10 },
    },
    {
        id: "mehmed_dies", year: 1481, realmKey: "ottoman",
        headline: "Mehmed II, conqueror of Constantinople, has died. His sons Bayezid and Cem are already at each other's throats over the succession.",
        stabilityDelta: { ottoman: -10 },
    },
    {
        id: "england_bosworth", year: 1485, realmKey: "england",
        headline: "Richard III has been defeated and killed at Bosworth Field. Henry Tudor takes the throne as Henry VII — the Plantagenet line is ended, and a new dynasty begins.",
        stabilityDelta: { england: -20 },
        // Continues the alternate thread from england_tewkesbury — if
        // Lancaster actually won in 1471, there's no Yorkist Richard III
        // on the throne for Henry Tudor to depose. The crisis moves
        // instead to the Lancastrian line's own succession.
        variants: [
            {
                when: gameState => gameState.warsOfRosesHouse === "lancaster",
                headline: "The House of Lancaster's restored throne faces its first real test as the old king's heirs quarrel bitterly over who inherits — the Red Rose's hold has outlasted Tewkesbury, but not without real cost.",
                stabilityDelta: { england: -15 },
            },
        ],
    },
    {
        id: "hungary_matthias_dies", year: 1490, realmKey: "hungary",
        headline: "Matthias Corvinus has died without a legitimate heir. Hungary's nobility, wary of another strong king, elects the pliable Vladislaus II instead.",
        stabilityDelta: { hungary: -15 },
    },
    {
        id: "granada_falls", year: 1492, realmKey: "castile",
        headline: "Granada has fallen to the combined armies of Castile and Aragon, completing the reconquest of Iberia after nearly eight centuries.",
        stabilityDelta: { castile: 15, aragon: 10 },
    },
    {
        id: "italian_wars_begin", year: 1494, realmKey: "france",
        headline: "Charles VIII of France has marched an army into Italy to press his claim on Naples. Milan, Florence, and Venice watch nervously — the Italian Wars have begun.",
        stabilityDelta: { milan: -10, naples: -10, florence: -5, venice: -5 },
    },
    {
        id: "france_louis_succession", year: 1498, realmKey: "france",
        headline: "Charles VIII of France has died without surviving sons. His cousin succeeds him as Louis XII.",
        stabilityDelta: { france: -5 },
    },
];
