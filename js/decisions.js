// decisions.js — the moment-to-moment choices that were missing from every
// other system: instead of a passive log line telling you what happened,
// a real situation is put in front of you, tied to your actual state (a
// resentful vassal, your own health, a council member's ask, a rival's
// insult), and you pick between options that each cost or gain something
// real. This is what makes "Advance a year" feel like playing a character
// instead of watching a dashboard update itself.
//
// A decision, once rolled, sits in gameState.pendingDecision until the
// player resolves it — advanceYear refuses to run again until they do, so
// a decision is never just one more thing buried in a log the player can
// ignore.

// Historical Pressure Registry — a small, explicit schema for real
// structural events (a realm, a real year window, a real choice), run
// through one generic processor instead of each being its own hand-rolled
// decision object. The brackets below are real history, not placeholders:
// extending this list means adding another data entry, not writing a new
// branch of game logic.
const HISTORICAL_PRESSURE_TEMPLATES = [
    {
        id: "wars_of_roses_allegiance",
        realmKey: "england",
        yearMin: 1455,
        yearMax: 1487,
        flagField: "warsOfRosesHouse",
        chance: 0.5,
        title: "Lancaster or York?",
        text: gameState => voiceLine({
            bold: [`England tears at itself between Lancaster and York, and ${gameState.player.name} can't simply wait this one out — a side must be chosen, and chosen now.`],
            wary: [`The realm is splitting between Lancaster and York. ${gameState.player.name} has put off choosing a side as long as it's been safe to — which is to say, no longer.`],
            neutral: `England is tearing itself apart between the houses of Lancaster and York — a choice that can't be avoided forever.`,
        }, gameState.player),
        options: [
            {
                label: "Pledge for Lancaster",
                apply(gameState) {
                    gameState.warsOfRosesHouse = "lancaster";
                    gameState.rivalStability = gameState.rivalStability || {};
                    gameState.rivalStability.england = (gameState.rivalStability.england || 0) - 15;
                    getVassals(gameState).forEach(v => adjustOpinion(v, randInt(-5, 10)));
                    return `${gameState.player.name} pledges for the House of Lancaster. York is now a declared rival — and the realm's own stability bears the strain of the choice.`;
                },
            },
            {
                label: "Pledge for York",
                apply(gameState) {
                    gameState.warsOfRosesHouse = "york";
                    gameState.rivalStability = gameState.rivalStability || {};
                    gameState.rivalStability.england = (gameState.rivalStability.england || 0) - 15;
                    getVassals(gameState).forEach(v => adjustOpinion(v, randInt(-5, 10)));
                    return `${gameState.player.name} pledges for the House of York. Lancaster is now a declared rival — and the realm's own stability bears the strain of the choice.`;
                },
            },
            {
                label: "Stay neutral, for now",
                apply(gameState) {
                    gameState.warsOfRosesHouse = "neutral";
                    getVassals(gameState).forEach(v => adjustOpinion(v, -8));
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 10);
                    return `${gameState.player.name} refuses to choose a side — and both houses, and most of the court, take it as cowardice rather than wisdom (-10 prestige, vassals uneasy).`;
                },
            },
        ],
    },
    {
        id: "isabella_piety_demand",
        realmKey: "castile",
        yearMin: 1474,
        yearMax: 1504,
        chance: 0.15,
        title: "A Queen's own piety, demanded of you too",
        text: gameState => voiceLine({
            devout: [`Isabella's own famous piety sets the tone for the whole court now — and her clergy have started asking pointed questions about ${gameState.player.name}'s own devotion.`],
            wary: [`Word reaches ${gameState.player.name} that Isabella's clergy have been asking pointed questions about devotion at court — the kind of attention that's dangerous to ignore.`],
            cunning: [`Isabella's clergy are asking pointed questions about devotion at court — ${gameState.player.name} suspects it's as much about land as it is about God.`],
            neutral: `Isabella's reign has brought real clerical scrutiny to every noble house in Castile, ${gameState.player.name}'s included.`,
        }, gameState.player),
        options: [
            {
                label: "Pay a generous tithe (60 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 60) return "There isn't enough gold to make a tithe the clergy would actually respect.";
                    player.gold -= 60;
                    adjustStanding(gameState, gameState.realmKey, 12);
                    return `A generous tithe quiets the whispers, for now (-60 gold, +12 standing with Rome).`;
                },
            },
            {
                label: "Publicly renounce impious ways",
                apply(gameState) {
                    const player = gameState.player;
                    player.prestige = Math.max(0, (player.prestige || 0) - 10);
                    player.piety = (player.piety || 0) + 15;
                    adjustStanding(gameState, gameState.realmKey, 15);
                    return `${player.name} makes a public show of devotion — humbling, but it satisfies the clergy (-10 prestige, +15 piety, +15 standing with Rome).`;
                },
            },
            {
                label: "Refuse to answer to anyone's piety but your own",
                apply(gameState) {
                    adjustStanding(gameState, gameState.realmKey, -25);
                    return `${gameState.player.name} refuses to bow to the clergy's demands — and Isabella's own church does not forget a refusal (-25 standing with Rome).`;
                },
            },
        ],
    },
    {
        id: "league_of_the_public_weal",
        realmKey: "france",
        yearMin: 1464,
        yearMax: 1466,
        flagField: "leagueOfThePublicWealSide",
        chance: 0.4,
        title: "The great vassals rise against the King",
        text: gameState => voiceLine({
            bold: [`Burgundy, Brittany, and the rest of the great vassals have banded together against Louis XI, calling it the League of the Public Weal. ${gameState.player.name} is expected to declare a side.`],
            cunning: [`Louis XI is grasping for more power than any vassal is comfortable with — and the great lords' new League of the Public Weal wants to know where ${gameState.player.name} stands.`],
            neutral: `The great vassals have formed the League of the Public Weal against Louis XI's crown. ${gameState.player.name} cannot stay unnoticed much longer.`,
        }, gameState.player),
        options: [
            {
                label: "Side with the King",
                apply(gameState) {
                    gameState.leagueOfThePublicWealSide = "king";
                    gameState.player.prestige = (gameState.player.prestige || 0) + 10;
                    getVassals(gameState).forEach(v => adjustOpinion(v, randInt(-8, 2)));
                    return `${gameState.player.name} stands with Louis XI against the great vassals — the crown remembers its friends (+10 prestige), though not every vassal is pleased.`;
                },
            },
            {
                label: "Side with the League",
                apply(gameState) {
                    gameState.leagueOfThePublicWealSide = "league";
                    gameState.rivalStability = gameState.rivalStability || {};
                    gameState.rivalStability.france = (gameState.rivalStability.france || 0) - 10;
                    getVassals(gameState).forEach(v => adjustOpinion(v, randInt(0, 10)));
                    return `${gameState.player.name} joins Burgundy, Brittany, and the rest of the League against the crown — the great vassals take notice, and the King's own stability bears the cost.`;
                },
            },
            {
                label: "Stay neutral, for now",
                apply(gameState) {
                    gameState.leagueOfThePublicWealSide = "neutral";
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 8);
                    return `${gameState.player.name} commits to neither side — a safe choice, but one that costs standing with both (-8 prestige).`;
                },
            },
        ],
    },
    {
        id: "ottoman_frontier_pressure",
        realmKey: "hungary",
        yearMin: 1461,
        yearMax: 1526,
        chance: 0.2,
        title: "The Ottoman frontier presses closer",
        text: gameState => voiceLine({
            bold: [`Word comes from the southern marches that Ottoman raiders have struck again — the frontier needs real support, not sympathy.`],
            wary: [`The Ottoman frontier is restless again. ${gameState.player.name} knows the raids won't stop on their own.`],
            devout: [`The Ottoman threat is spoken of at court as a matter of faith as much as war — and ${gameState.player.name} is expected to answer for it.`],
            neutral: `The southern frontier reports fresh Ottoman pressure. Hungary's nobles are asked, again, to answer for its defense.`,
        }, gameState.player),
        options: [
            {
                label: "Fund the frontier levies (80 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 80) return "There isn't enough gold to fund the frontier properly.";
                    player.gold -= 80;
                    player.prestige = (player.prestige || 0) + 8;
                    return `Gold flows south to the frontier levies — the marches hold a little firmer for it (-80 gold, +8 prestige).`;
                },
            },
            {
                label: "Buy a truce with tribute (50 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 50) return "There isn't enough gold to buy even a truce.";
                    player.gold -= 50;
                    player.prestige = Math.max(0, (player.prestige || 0) - 5);
                    return `A quiet tribute buys a season's peace on the frontier — practical, if not exactly glorious (-50 gold, -5 prestige).`;
                },
            },
            {
                label: "Ignore it — the frontier is not your problem",
                apply(gameState) {
                    const player = gameState.player;
                    if (Math.random() < 0.4) {
                        gameState.rivalStability = gameState.rivalStability || {};
                        gameState.rivalStability.hungary = (gameState.rivalStability.hungary || 0) - 10;
                        return `The raids go unanswered, and the realm's stability suffers for it.`;
                    }
                    return `The frontier holds on its own, this time, without any help from here.`;
                },
            },
        ],
    },
    {
        id: "burgundian_succession_crisis",
        realmKey: "burgundy",
        yearMin: 1477,
        yearMax: 1477,
        flagField: "burgundySuccessionResolved",
        chance: 0.8,
        title: "Charles the Bold is dead at Nancy",
        text: gameState => voiceLine({
            bold: [`Charles the Bold has fallen at Nancy, and Burgundy's great inheritance now rests on his daughter Mary alone — every neighbor smells opportunity, and ${gameState.player.name} must decide where to stand.`],
            cunning: [`With Charles the Bold dead, Mary of Burgundy's inheritance is suddenly the question of the age — a Habsburg marriage is already being whispered of, and so is French annexation.`],
            neutral: `Charles the Bold is dead, and Mary of Burgundy's succession is now the crisis of the moment, with France and the Habsburgs both circling.`,
        }, gameState.player),
        options: [
            {
                label: "Champion Mary's independent rule",
                apply(gameState) {
                    gameState.burgundySuccessionResolved = "mary";
                    gameState.player.prestige = (gameState.player.prestige || 0) + 10;
                    return `${gameState.player.name} declares for Mary of Burgundy's own right to rule — a popular stand at home, and prestige follows (+10 prestige).`;
                },
            },
            {
                label: "Urge the Habsburg marriage",
                apply(gameState) {
                    gameState.burgundySuccessionResolved = "habsburg";
                    gameState.player.piety = (gameState.player.piety || 0) + 5;
                    gameState.player.prestige = (gameState.player.prestige || 0) + 5;
                    return `${gameState.player.name} presses for the match with Maximilian of Habsburg — a safe, dynastic answer to the crisis (+5 piety, +5 prestige).`;
                },
            },
            {
                label: "Exploit the chaos for France",
                apply(gameState) {
                    gameState.burgundySuccessionResolved = "france";
                    gameState.rivalStability = gameState.rivalStability || {};
                    gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) - 20;
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 5);
                    return `${gameState.player.name} quietly encourages French encroachment on the leaderless duchy — Burgundy's own stability pays the price, and not everyone at home approves (-5 prestige).`;
                },
            },
        ],
    },
    {
        id: "granada_war_pressure",
        realmKey: ["castile", "aragon"],
        yearMin: 1481,
        yearMax: 1492,
        chance: 0.3,
        title: "The Crown calls for the war against Granada",
        text: gameState => voiceLine({
            devout: [`Ferdinand and Isabella's war against Granada is called a holy duty from every pulpit in the realm — and ${gameState.player.name} is expected to answer the call.`],
            bold: [`The war against Granada grinds on, and the Crown is calling in every noble's debt of service to finish it.`],
            neutral: `The Reconquista's final push against Granada continues, and the Crown asks every noble house to contribute to it.`,
        }, gameState.player),
        options: [
            {
                label: "Answer with men and gold (70 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 70) return "There isn't enough gold to answer the Crown's call properly.";
                    player.gold -= 70;
                    player.prestige = (player.prestige || 0) + 12;
                    player.piety = (player.piety || 0) + 5;
                    return `Men and gold are sent south to the war against Granada — the Crown, and the Church, both take notice (-70 gold, +12 prestige, +5 piety).`;
                },
            },
            {
                label: "Contribute gold only (35 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 35) return "There isn't enough gold to contribute even that much.";
                    player.gold -= 35;
                    player.prestige = (player.prestige || 0) + 4;
                    return `A gold contribution is sent south — modest, but it satisfies the letter of the Crown's call (-35 gold, +4 prestige).`;
                },
            },
            {
                label: "Decline, citing other burdens",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 10);
                    return `${gameState.player.name} begs off the Crown's call — and the Crown does not forget who answered and who didn't (-10 prestige).`;
                },
            },
        ],
    },
    {
        // Not a separate ideology system — this plugs straight into the
        // real, already-ticking friction scale reform.js maintains
        // (gameState.reform.level, 0-100, driven by standing with Rome).
        // Once that friction crosses a real threshold, it stops being an
        // ambient number and becomes a decision with teeth: the choice
        // permanently moves piety, standing, and — through vassal opinion
        // feeding factions.js's own revolt risk — real military
        // vulnerability, not just flavor text.
        id: "protestant_reform_unrest",
        realmKey: ["england", "france", "burgundy", "austria", "bohemia", "hungary", "poland", "brittany", "scotland"],
        yearMin: 1517,
        yearMax: 1560,
        chance: 0.35,
        extraCondition: gameState => typeof reformLevel === "function" && reformLevel(gameState) >= 60 && !(gameState.reform && gameState.reform.schismed),
        title: "The new preaching reaches your own lands",
        text: gameState => voiceLine({
            devout: [`Reformist preachers have reached ${gameState.player.name}'s own lands, and the old certainties are being argued over openly, even here.`],
            wary: [`${gameState.player.name} can no longer treat the new preaching as someone else's problem — it has reached home, and taken root.`],
            cunning: [`The new preaching has taken real root close to home — ${gameState.player.name} sees as much opportunity in it as danger.`],
            neutral: `The reformist movement sweeping the Church has reached ${gameState.player.name}'s own lands directly, and can no longer be ignored.`,
        }, gameState.player),
        options: [
            {
                label: "Crack down hard on the preachers (50 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 50) return "There isn't enough gold on hand to move against them properly, and the preaching continues unchecked.";
                    player.gold -= 50;
                    gameState.reform.level = Math.max(0, gameState.reform.level - randInt(10, 20));
                    adjustStanding(gameState, gameState.realmKey, 5);
                    getVassals(gameState).forEach(v => { if (Math.random() < 0.3) adjustOpinion(v, -3); });
                    return `The preachers are driven out or silenced — the old order holds here, for now (-50 gold, +5 standing with Rome), though not every vassal is comfortable with how it was done.`;
                },
            },
            {
                label: "Openly tolerate the new preaching",
                apply(gameState) {
                    const player = gameState.player;
                    gameState.reform.level = Math.min(100, gameState.reform.level + randInt(10, 20));
                    adjustStanding(gameState, gameState.realmKey, -15);
                    player.prestige = (player.prestige || 0) + 10;
                    player.piety = Math.max(0, (player.piety || 0) - 5);
                    const vassals = getVassals(gameState);
                    if (vassals.length && Math.random() < 0.4) {
                        const v = randomFrom(vassals);
                        v.levies = Math.max(0, Math.round(v.levies * 0.8));
                        adjustOpinion(v, randInt(-6, 10));
                    }
                    return `${player.name} lets the new preaching stand unmolested — popular in some quarters, costly with Rome (-15 standing, -5 piety, +10 prestige), and at least one vassal quietly diverts levies to keep their own lands' peace instead of yours.`;
                },
            },
            {
                label: "Steer a careful middle path",
                apply(gameState) {
                    const player = gameState.player;
                    gameState.reform.level = Math.min(100, gameState.reform.level + randInt(2, 6));
                    adjustStanding(gameState, gameState.realmKey, -3);
                    player.piety = (player.piety || 0) + 3;
                    return `${player.name} neither embraces nor crushes the new preaching — an uneasy compromise that leaves almost no one fully satisfied (-3 standing with Rome, +3 piety).`;
                },
            },
        ],
    },
];

function buildHistoricalPressureDecisionEvent(tpl) {
    const realms = [].concat(tpl.realmKey);
    return {
        id: tpl.id,
        chance: tpl.chance,
        condition: gameState => realms.includes(gameState.realmKey)
            && gameState.year >= tpl.yearMin && gameState.year <= tpl.yearMax
            && (!tpl.flagField || !gameState[tpl.flagField])
            && (!tpl.extraCondition || tpl.extraCondition(gameState)),
        title: tpl.title,
        text: tpl.text,
        options: tpl.options,
    };
}

// Leverage Request pool — a royal tie cuts both ways: relatives who hold a
// foreign throne lean on the player, and courtiers lean on the player to
// use the connection on THEIR behalf. The request itself is drawn from a
// small pool of standard social favors rather than being hardcoded to
// "send gold", so the same two decisions read differently each time they
// come up.
const LEVERAGE_REQUEST_TYPES = [
    {
        key: "gold",
        askLine: "a demand for gold, dressed up as a request",
        acceptLabel: "Send gold (60 gold)",
        accept(gameState) {
            const player = gameState.player;
            if ((player.gold || 0) < 60) return "There isn't enough gold to send what's being asked.";
            player.gold -= 60;
            player.prestige = (player.prestige || 0) + 10;
            return `Gold is sent, and the family's standing with its crowned relative only grows (-60 gold, +10 prestige).`;
        },
    },
    {
        key: "military",
        askLine: "a request for levies to stand behind a shaky crown",
        acceptLabel: "Send levies to their aid",
        accept(gameState) {
            const player = gameState.player;
            player.prestige = (player.prestige || 0) + 15;
            return `Men are sent to stand behind a relative's crown — a costly show of loyalty, but it is noticed (+15 prestige).`;
        },
    },
    {
        key: "title",
        askLine: "a request to finally make good on a title once promised",
        acceptLabel: "Grant the title demanded",
        accept(gameState) {
            const player = gameState.player;
            player.prestige = Math.max(0, (player.prestige || 0) - 10);
            return `The title is granted — prestige slips for the favor it costs, though the relative's gratitude is real (-10 prestige).`;
        },
    },
];

function leverageRequestFor(key) {
    return LEVERAGE_REQUEST_TYPES.find(r => r.key === key) || LEVERAGE_REQUEST_TYPES[0];
}

// THE PROCEDURAL DRAMA DIRECTOR — the engine every beat below is
// actually generated from, not a label on three hand-picked examples.
// It is two small classifiers plus one processor:
//
//   classifyPlayerSituation(gameState)  -> ["unmarried_royal_sibling", ...]
//       WHO you structurally are right now — read live off the family
//       tree, marriage status and crown proximity that already exist
//       (reigningSiblingMonarch, isAvailableToMarry, getChildren,
//       realmTopTier), never a fixed role picked at character creation.
//
//   assessRealmNeeds(gameState)  -> ["needs_border_alliance", ...]
//       WHAT the realm actually needs right now — read live off
//       borders/relations, succession security and the war, the same
//       state the rest of the game already tracks.
//
//   buildDramaBeatDecisionEvent(tpl)
//       Turns a {situation, need, ...} template into a real decision
//       whose condition is the CROSS-REFERENCE of the two — a beat only
//       exists where a situation tag and a need tag actually overlap.
// A new beat means adding a template to DRAMA_BEAT_TEMPLATES, not
// writing a new one-off condition function.
function classifyPlayerSituation(gameState) {
    const player = gameState.player;
    const tags = [];
    if (!player || !player.alive) return tags;

    const isReigning = player.realmKey === gameState.realmKey && player.tier >= realmTopTier(gameState.realmKey);
    if (isReigning) tags.push("reigning_monarch");

    if (isAvailableToMarry(gameState, player.id) && player.age >= 16 && player.age <= 45) {
        tags.push("unmarried");
        if (typeof reigningSiblingMonarch === "function" && reigningSiblingMonarch(gameState)) {
            tags.push("unmarried_royal_sibling");
        }
    }

    if (isReigning && !getChildren(gameState, player.id).some(c => c.alive)) {
        tags.push("childless_reigning_monarch");
    }

    if (gameState.war) {
        const myPower = playerMilitaryPower(gameState);
        const theirPower = targetMilitaryPower(gameState, gameState.war.targetRealmKey);
        if (myPower < theirPower * 0.75) tags.push("war_leader_outmatched");
    }

    return tags;
}

function assessRealmNeeds(gameState) {
    const needs = [];
    const situations = classifyPlayerSituation(gameState);

    const neighbors = typeof neighborsOf === "function" ? neighborsOf(gameState.realmKey) : [];
    const hasUntiedRiskyNeighbor = neighbors.some(k => {
        const alreadyTied = (gameState.claims || []).some(c => c.realmKey === k && c.type === "marriage");
        if (alreadyTied) return false;
        const relationsLow = typeof relationsWith === "function" ? relationsWith(gameState, k) < 65 : true;
        const risky = effectiveStability(gameState, k) < 50 || k === "ottoman" || k === "wallachia";
        return relationsLow && risky;
    });
    if (hasUntiedRiskyNeighbor) needs.push("needs_border_alliance");

    if (situations.includes("childless_reigning_monarch")) needs.push("needs_heir");
    if (situations.includes("war_leader_outmatched")) needs.push("needs_military_support");

    return needs;
}

function buildDramaBeatDecisionEvent(tpl) {
    return {
        id: tpl.id,
        chance: tpl.chance,
        condition: gameState => classifyPlayerSituation(gameState).includes(tpl.situation)
            && assessRealmNeeds(gameState).includes(tpl.need)
            && (!tpl.extraCondition || tpl.extraCondition(gameState)),
        buildContext: tpl.buildContext,
        title: tpl.title,
        text: tpl.text,
        options: tpl.options,
    };
}

const DRAMA_BEAT_TEMPLATES = [
    // unmarried_royal_sibling x needs_border_alliance — the crown leans
    // on a sibling to secure a border through marriage.
    {
        id: "sibling_marriage_alliance",
        situation: "unmarried_royal_sibling",
        need: "needs_border_alliance",
        chance: 0.3,
        buildContext: gameState => {
            const sib = reigningSiblingMonarch(gameState);
            const neighbors = neighborsOf(sib.realmKey).filter(k => k !== gameState.realmKey);
            const risky = neighbors.filter(k => {
                const tied = (gameState.claims || []).some(c => c.realmKey === k && c.type === "marriage");
                return !tied && (effectiveStability(gameState, k) < 50 || k === "ottoman" || k === "wallachia") && relationsWith(gameState, k) < 65;
            });
            const pool = risky.length ? risky : (neighbors.length ? neighbors : listRealms().map(r => r.key).filter(k => k !== sib.realmKey));
            const targetRealmKey = randomFrom(pool);
            const forcedGender = gameState.player.gender === "M" ? "F" : "M";
            const candidate = generateNobleMarriageCandidates(targetRealmKey, 1, forcedGender)[0];
            const reasons = [
                `seal an alliance with ${getRealm(targetRealmKey).name} against a shared rival`,
                `buy a season's peace along the ${getRealm(targetRealmKey).name} border`,
                `settle a debt owed to ${getRealm(targetRealmKey).name}'s own house`,
            ];
            return { siblingId: sib.id, candidate, targetRealmKey, reasonLine: randomFrom(reasons) };
        },
        title: "A crown's demand, dressed as family",
        text: (gameState, ctx) => {
            const sib = getPerson(gameState, ctx.siblingId);
            const n = gameState.player.name;
            const sibTitle = sib ? realmTopTitle(sib.realmKey, sib.gender) : "The crown";
            const sibName = sib ? sib.name : "your sibling";
            return voiceLine({
                bold: [`${sibTitle} ${sibName} summons ${n} with a demand dressed up as a family favor: marry ${ctx.candidate.name} of ${getRealm(ctx.targetRealmKey).name}, to ${ctx.reasonLine}.`],
                wary: [`${n} is called before ${sibTitle} ${sibName} — a marriage is being arranged, to ${ctx.candidate.name} of ${getRealm(ctx.targetRealmKey).name}, meant to ${ctx.reasonLine}. It isn't really a request.`],
                cunning: [`${sibTitle} ${sibName} wants ${n} married to ${ctx.candidate.name} of ${getRealm(ctx.targetRealmKey).name} — useful to the crown, to ${ctx.reasonLine}, whatever it costs ${n} personally.`],
                neutral: `${sibTitle} ${sibName} asks ${n} to marry ${ctx.candidate.name} of ${getRealm(ctx.targetRealmKey).name}, to ${ctx.reasonLine}.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Comply — marry for the crown",
                apply(gameState, ctx) {
                    const sib = getPerson(gameState, ctx.siblingId);
                    const married = arrangeMarriage(gameState, gameState.player, ctx.candidate);
                    if (!married) return `There isn't enough standing to make the match happen properly, as asked — the moment passes, awkwardly.`;
                    if (sib) sib.loyalty = Math.min(100, relativeLoyalty(sib) + 20);
                    gameState.player.prestige = (gameState.player.prestige || 0) + 15;
                    return `${gameState.player.name} marries ${married.name} as asked — the crown remembers who answered the call (+15 prestige)${sib ? `, and ${sib.name}'s trust in you only grows.` : "."}`;
                },
            },
            {
                label: "Refuse",
                apply(gameState, ctx) {
                    const sib = getPerson(gameState, ctx.siblingId);
                    const player = gameState.player;
                    if (sib) sib.loyalty = Math.max(0, relativeLoyalty(sib) - 35);
                    if (Math.random() < 0.5) {
                        if (sib) sib.loyalty = 5;
                        player.gold = Math.max(0, (player.gold || 0) - 40);
                        getVassals(gameState).forEach(v => { if (Math.random() < 0.4) adjustOpinion(v, randInt(-6, -1)); });
                        return `${player.name} refuses — and ${sib ? sib.name : "the crown"} doesn't forgive it quietly. The royal allowance stops cold, and word soon follows that raiders have grown bolder along an undefended stretch of the border since (-40 gold, vassals uneasy).`;
                    }
                    return `${player.name} refuses the match — ${sib ? sib.name : "the crown"} is coldly disappointed, and makes no secret of it.`;
                },
            },
        ],
    },
    // unmarried x needs_heir (only reachable by a childless reigning
    // monarch — needs_heir only exists when that situation does) — the
    // council presses a crownless-heir monarch to marry quickly.
    {
        id: "pressed_to_remarry_for_heir",
        situation: "unmarried",
        need: "needs_heir",
        chance: 0.25,
        extraCondition: gameState => classifyPlayerSituation(gameState).includes("childless_reigning_monarch"),
        buildContext: gameState => ({ candidate: generateMarriageCandidates(gameState, 1)[0] }),
        title: "No heir, and the council knows it",
        text: (gameState, ctx) => voiceLine({
            bold: [`The council says plainly what everyone already thinks: there is no heir, and ${gameState.player.name} has put off marrying long enough that it's becoming a real danger to the line.`],
            wary: [`${gameState.player.name} is reminded, not gently, that a crown without an heir is a crown half-lost already — and a match, ${ctx.candidate.name}, is already waiting to be considered.`],
            cunning: [`The council has already found a convenient match — ${ctx.candidate.name} — and makes clear that the longer ${gameState.player.name} waits, the more they'll be seen as inviting a succession crisis on purpose.`],
            neutral: `The council presses ${gameState.player.name} to marry and secure the succession, proposing ${ctx.candidate.name} as a practical match.`,
        }, gameState.player),
        options: [
            {
                label: "Marry quickly, for the realm's sake",
                apply(gameState, ctx) {
                    const married = arrangeMarriage(gameState, gameState.player, ctx.candidate);
                    if (!married) return `The match falls through before it can be made official — the council is not pleased.`;
                    getVassals(gameState).forEach(v => adjustOpinion(v, randInt(4, 10)));
                    return `${gameState.player.name} marries ${married.name} — not for love, but the succession is secured, and the court visibly relaxes.`;
                },
            },
            {
                label: "Resist — you'll choose in your own time",
                apply(gameState) {
                    const player = gameState.player;
                    player.prestige = Math.max(0, (player.prestige || 0) - 8);
                    getVassals(gameState).forEach(v => { if (Math.random() < 0.5) adjustOpinion(v, randInt(-8, -2)); });
                    return `${player.name} refuses to be rushed — a right any ruler should have, though the council's confidence in the line's security visibly slips (-8 prestige, vassals uneasy).`;
                },
            },
        ],
    },
    // war_leader_outmatched x needs_military_support — the Marshal
    // forces a real choice once a war is clearly being lost.
    {
        id: "war_funding_crisis",
        situation: "war_leader_outmatched",
        need: "needs_military_support",
        chance: 0.3,
        buildContext: gameState => ({ targetRealmKey: gameState.war.targetRealmKey }),
        title: "The war is going badly, and your Marshal says so plainly",
        text: (gameState, ctx) => voiceLine({
            bold: [`Your Marshal lays it out without softening it: the war against ${getRealm(ctx.targetRealmKey).name} is being lost on the numbers alone, and something has to change now.`],
            wary: [`${gameState.player.name}'s own Marshal is openly worried — the war against ${getRealm(ctx.targetRealmKey).name} is going badly, and waiting any longer only makes the numbers worse.`],
            neutral: `The war against ${getRealm(ctx.targetRealmKey).name} is going badly — your own council urges a real decision, not more waiting.`,
        }, gameState.player),
        options: [
            {
                label: "Raise emergency funds for mercenaries (100 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if (!gameState.war) return "The matter resolves itself before anything can be done.";
                    if ((player.gold || 0) < 100) return "There isn't enough gold on hand to hire anyone worth the price.";
                    player.gold -= 100;
                    gameState.war.warScore = Math.min(100, gameState.war.warScore + 15);
                    return `Mercenaries are hired on short notice — costly, but it buys real ground back on the war (-100 gold, +15 war score).`;
                },
            },
            {
                label: "Seek terms now, before it gets worse",
                apply(gameState) {
                    const player = gameState.player;
                    if (!gameState.war) return "The matter resolves itself before anything can be done.";
                    const realmName = getRealm(gameState.war.targetRealmKey).name;
                    player.prestige = Math.max(0, (player.prestige || 0) - 10);
                    gameState.war = null;
                    return `${player.name} sues for peace against ${realmName} before the war gets any worse — a white peace, the claim unresolved, prestige bruised by the retreat (-10 prestige).`;
                },
            },
            {
                label: "Press on regardless",
                apply(gameState) {
                    gameState.player.health = Math.max(0, gameState.player.health - randInt(0, 5));
                    return `${gameState.player.name} presses on despite the Marshal's warning — the strain of it is real.`;
                },
            },
        ],
    },
];

const DECISION_EVENTS = [
    {
        id: "tournament_invite",
        chance: 0.12,
        condition: gameState => gameState.player.age >= 16 && gameState.player.age <= 55 && gameState.player.tier >= 1,
        title: "A tournament is announced",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                bold: [`Word of a tournament nearby reaches ${n} like a trumpet call — here, finally, is a chance to be seen.`, `${n} hears of the coming tournament and is already turning over how best to make an entrance.`],
                wary: [`A tournament is announced nearby. ${n} weighs the glory against the very real chance of a cracked rib or worse.`],
                devout: [`A tournament nearby draws every vain and ambitious soul in the region — ${n} wonders if attending is wisdom or vanity.`],
                cunning: [`A tournament is announced — ${n} sees it less as sport than as a stage, full of rivals worth watching closely.`],
                warm: [`A tournament nearby promises a rare gathering of old friends and new faces — ${n} is glad of the excuse.`],
                neutral: `A tournament is to be held nearby. ${n} is invited to take part, or simply to attend.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Compete yourself",
                apply(gameState) {
                    const player = gameState.player;
                    player.prestige = (player.prestige || 0) + 15;
                    if (Math.random() < 0.2) {
                        player.health = Math.max(0, player.health - 12);
                        return `${player.name} is wounded in the lists, but the crowd remembers the courage (+15 prestige, -12 health).`;
                    }
                    return `${player.name} performs admirably before the whole court (+15 prestige).`;
                },
            },
            {
                label: "Sponsor a champion (30 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 30) return `There isn't enough gold to sponsor a champion, and the moment passes.`;
                    player.gold -= 30;
                    player.prestige = (player.prestige || 0) + 6;
                    return `${player.name}'s sponsored champion acquits himself well (-30 gold, +6 prestige).`;
                },
            },
            {
                label: "Decline to attend",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 3);
                    return `${gameState.player.name} stays away, and the court notices the absence (-3 prestige).`;
                },
            },
        ],
    },
    {
        id: "vassal_grievance",
        chance: 0.22,
        condition: gameState => getVassals(gameState).some(v => v.opinion < 35),
        buildContext: gameState => ({ vassalId: getVassals(gameState).filter(v => v.opinion < 35).sort((a, b) => a.opinion - b.opinion)[0].id }),
        title: "A vassal's grievance",
        text: (gameState, ctx) => {
            const v = gameState.vassals[ctx.vassalId];
            return voiceLine({
                bold: [`${v.name} marches into court with a grievance, voice raised loud enough for the whole hall to hear (opinion ${v.opinion}).`],
                wary: [`${v.name} corners you quietly about a grievance — the kind of complaint that festers if it's dismissed (opinion ${v.opinion}).`],
                devout: [`${v.name} brings a grievance to court with the solemn air of someone who believes they are owed justice, not favor (opinion ${v.opinion}).`],
                cunning: [`${v.name} raises a grievance — you can't help wondering what they're really testing (opinion ${v.opinion}).`],
                warm: [`${v.name} comes to you troubled, clearly hoping to be heard rather than merely managed (opinion ${v.opinion}).`],
                neutral: `${v.name} airs a grievance at court — their patience with you is thin (opinion ${v.opinion}).`,
            }, gameState.player);
        },
        options: [
            {
                label: "Hear them out and make concessions (50 gold)",
                apply(gameState, ctx) {
                    const v = gameState.vassals[ctx.vassalId];
                    const player = gameState.player;
                    if (!v) return "The matter resolves itself before it reaches you.";
                    if ((player.gold || 0) < 50) return `There isn't enough gold to satisfy ${v.name}, and the grievance festers.`;
                    player.gold -= 50;
                    adjustOpinion(v, 20);
                    return `${v.name}'s grievance is settled with real concessions (-50 gold, +20 opinion).`;
                },
            },
            {
                label: "Dismiss the complaint",
                apply(gameState, ctx) {
                    const v = gameState.vassals[ctx.vassalId];
                    if (!v) return "The matter resolves itself before it reaches you.";
                    adjustOpinion(v, -10);
                    return `${v.name}'s complaint is dismissed outright (-10 opinion).`;
                },
            },
            {
                label: "Make an example of them",
                apply(gameState, ctx) {
                    const v = gameState.vassals[ctx.vassalId];
                    if (!v) return "The matter resolves itself before it reaches you.";
                    adjustOpinion(v, -25);
                    getVassals(gameState).forEach(o => { if (o.id !== v.id) adjustOpinion(o, 5); });
                    return `${v.name} is humiliated before the whole court — the rest take note (-25 opinion for them, +5 for everyone else).`;
                },
            },
        ],
    },
    {
        id: "illness",
        chance: 0.1,
        condition: gameState => gameState.player.health < 85,
        title: "A worrying cough",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                bold: [`${n} tries to shrug off the illness and push through it, which is exactly how it gets worse.`],
                wary: [`A nagging illness has ${n} watching every symptom like it might be the last warning they get.`],
                devout: [`${n} takes to bed with illness, murmuring that this, too, is in God's hands.`],
                warm: [`${n}'s illness draws the whole household's worry — everyone underfoot with remedies and advice.`],
                cunning: [`${n} is laid low by illness, and already calculating who'd benefit most if it lingered.`],
                neutral: `${n} is laid low by illness, worse than it first seemed.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Summon a physician (40 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 40) return "There isn't enough gold for a physician, and the illness runs its course.";
                    player.gold -= 40;
                    player.health = Math.min(100, player.health + 20);
                    return `A physician's care pays off (-40 gold, +20 health).`;
                },
            },
            {
                label: "Pray for recovery",
                apply(gameState) {
                    const player = gameState.player;
                    player.piety = (player.piety || 0) + 5;
                    if (Math.random() < 0.25) {
                        player.health = Math.max(0, player.health - 10);
                        return `Prayer brings comfort, but the illness worsens regardless (+5 piety, -10 health).`;
                    }
                    player.health = Math.min(100, player.health + 8);
                    return `Prayer and rest see ${player.name} through it (+5 piety, +8 health).`;
                },
            },
            {
                label: "Push through it",
                apply(gameState) {
                    const player = gameState.player;
                    if (Math.random() < 0.3) {
                        player.health = Math.max(0, player.health - 15);
                        return `${player.name} ignores it, and it catches up all at once (-15 health).`;
                    }
                    player.health = Math.min(100, player.health + 3);
                    return `${player.name} shakes it off through sheer stubbornness (+3 health).`;
                },
            },
        ],
    },
    {
        id: "court_scandal",
        chance: 0.1,
        condition: gameState => gameState.player.tier >= 1,
        title: "Unkind gossip",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                bold: [`A rumor about ${n} is making the rounds at court — and ${n}'s first instinct is to find whoever started it.`],
                wary: [`${n} hears, secondhand and much too late, that a rumor about them is already three rooms ahead.`],
                cunning: [`A rumor about ${n} is spreading — which raises the question of who actually benefits from it spreading.`],
                devout: [`An unkind rumor about ${n} circulates — a reminder that even blameless conduct invites gossip.`],
                warm: [`${n} is hurt more than they'll admit to hear what's being said behind their back at court.`],
                neutral: `A rumor about ${n}'s conduct is circulating at court — true or not, it's spreading.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Confront the accuser directly",
                apply(gameState) {
                    const player = gameState.player;
                    if (Math.random() < 0.55) {
                        player.prestige = (player.prestige || 0) + 8;
                        return `${player.name} faces the rumor head-on and comes out ahead (+8 prestige).`;
                    }
                    player.prestige = Math.max(0, (player.prestige || 0) - 10);
                    return `The confrontation only fans the flames (-10 prestige).`;
                },
            },
            {
                label: "Pay for silence (40 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 40) return "There isn't enough gold to buy silence, and the rumor spreads on its own.";
                    player.gold -= 40;
                    return `A quiet payment and the rumor dies before it travels far (-40 gold).`;
                },
            },
            {
                label: "Let it pass",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 5);
                    return `${gameState.player.name} lets the gossip run its course (-5 prestige).`;
                },
            },
        ],
    },
    {
        id: "pilgrimage_offer",
        chance: 0.08,
        condition: gameState => gameState.player.age >= 16,
        title: "A call to pilgrimage",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                devout: [`${n}'s confessor need not press hard — the idea of a pilgrimage has already taken root.`],
                bold: [`A pilgrimage is proposed to ${n}, more duty than desire — though the roads promise their own adventure.`],
                wary: [`${n}'s confessor raises the subject of a pilgrimage; ${n} thinks mostly of bandits and bad roads.`],
                warm: [`${n} is drawn to the idea of a pilgrimage less for piety than for the company it would mean along the way.`],
                cunning: [`${n}'s confessor suggests a pilgrimage; ${n} wonders how much piety can be had for how little inconvenience.`],
                neutral: `${n}'s confessor speaks of a pilgrimage, for the good of the soul and the family's name.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Go yourself (20 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 20) return "There isn't enough gold to make the journey properly.";
                    player.gold -= 20;
                    player.piety = (player.piety || 0) + 15;
                    if (Math.random() < 0.1) {
                        player.health = Math.max(0, player.health - 8);
                        return `The journey is hard on ${player.name}, but the piety earned is real (-20 gold, +15 piety, -8 health).`;
                    }
                    return `${player.name} returns humbled and renewed (-20 gold, +15 piety).`;
                },
            },
            {
                label: "Send a priest in your stead (10 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 10) return "There isn't enough gold to send anyone in your place.";
                    player.gold -= 10;
                    player.piety = (player.piety || 0) + 5;
                    return `A priest makes the journey on ${player.name}'s behalf (-10 gold, +5 piety).`;
                },
            },
            {
                label: "Decline for now",
                apply(gameState) {
                    return `${gameState.player.name} puts the matter off for another year.`;
                },
            },
        ],
    },
    {
        id: "advisor_request",
        chance: 0.14,
        condition: gameState => Object.keys(getCouncil(gameState)).length > 0,
        buildContext: gameState => {
            const roles = Object.keys(getCouncil(gameState));
            return { roleKey: randomFrom(roles) };
        },
        title: "A council member's request",
        text: (gameState, ctx) => {
            const advisor = getCouncil(gameState)[ctx.roleKey];
            return voiceLine({
                cunning: [`${advisor.name} asks for more funding, framed as necessity — you suspect it's also ambition.`],
                wary: [`${advisor.name} requests more funding; you find yourself wondering what exactly it will be spent on.`],
                warm: [`${advisor.name} comes asking for more support, plainly believing you'll understand why it matters.`],
                bold: [`${advisor.name} asks for more latitude bluntly, in the manner of someone used to getting it.`],
                devout: [`${advisor.name} asks for more latitude, and makes a point of promising it will be used honestly.`],
                neutral: `${advisor.name} asks for more latitude — and more funding — to do their work properly.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Grant it (30 gold)",
                apply(gameState, ctx) {
                    const advisor = getCouncil(gameState)[ctx.roleKey];
                    const player = gameState.player;
                    if (!advisor) return "The request becomes moot.";
                    if ((player.gold || 0) < 30) return `There isn't enough gold to grant ${advisor.name}'s request.`;
                    player.gold -= 30;
                    adjustOpinion(advisor, 15);
                    return `${advisor.name}'s request is granted (-30 gold, +15 opinion).`;
                },
            },
            {
                label: "Refuse",
                apply(gameState, ctx) {
                    const advisor = getCouncil(gameState)[ctx.roleKey];
                    if (!advisor) return "The request becomes moot.";
                    adjustOpinion(advisor, -10);
                    return `${advisor.name}'s request is refused (-10 opinion).`;
                },
            },
        ],
    },
    {
        id: "lean_harvest",
        chance: 0.12,
        condition: gameState => gameState.player.tier >= 2,
        title: "A lean harvest",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                devout: [`Word of a thin harvest reaches ${n}, and with it the old fear that it's a judgment, not just bad weather.`],
                warm: [`${n} hears the harvest has come in thin, and immediately thinks of which households will go hungriest first.`],
                cunning: [`A lean harvest is reported to ${n} — and with it, a chance to be remembered as generous, or not.`],
                bold: [`A thin harvest is reported; ${n}'s instinct is to act decisively before the grumbling starts.`],
                wary: [`Word reaches ${n} of a thin harvest, and with it the question of how much unrest it'll buy.`],
                neutral: `Word reaches ${n} that the harvest has come in thin across the domain this year.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Open your granaries (60 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 60) return "There isn't enough gold in reserve to open the granaries.";
                    player.gold -= 60;
                    getVassals(gameState).forEach(v => adjustOpinion(v, 10));
                    return `Opening the granaries steadies the realm (-60 gold, +10 opinion for every vassal).`;
                },
            },
            {
                label: "Let each household fend for itself",
                apply(gameState) {
                    getVassals(gameState).forEach(v => adjustOpinion(v, -6));
                    return `Nothing is done, and the vassals remember it (-6 opinion for every vassal).`;
                },
            },
        ],
    },
    {
        id: "rival_insult",
        chance: 0.1,
        condition: gameState => gameState.player.tier >= 2 && listRealms().some(r => r.key !== gameState.realmKey),
        buildContext: gameState => {
            const others = listRealms().filter(r => r.key !== gameState.realmKey);
            return { realmKey: randomFrom(others).key };
        },
        title: "A rival's insult",
        text: (gameState, ctx) => {
            const realm = getRealm(ctx.realmKey);
            const n = gameState.player.name;
            return voiceLine({
                bold: [`${realm.ruler.name} of ${realm.name} has slighted ${n}, deliberately or not — and ${n} is in no mood to let it pass.`],
                wary: [`Word reaches ${n} of a slight from ${realm.ruler.name} — the kind of thing that's dangerous to ignore and dangerous to answer.`],
                cunning: [`${realm.ruler.name}'s slight reaches ${n}'s ears — worth noting exactly who was in the room when it happened.`],
                devout: [`${n} hears of ${realm.ruler.name}'s slight, and is reminded that pride answered with pride rarely ends well.`],
                warm: [`${n} is stung more than expected to hear of ${realm.ruler.name}'s slight — it feels personal, whether it was meant that way or not.`],
                neutral: `Word of a slight from ${realm.ruler.name} of ${realm.name} reaches ${n} — deliberate or not, the court is watching how you respond.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Demand satisfaction",
                apply(gameState, ctx) {
                    const realm = getRealm(ctx.realmKey);
                    const player = gameState.player;
                    if (Math.random() < 0.5) {
                        player.prestige = (player.prestige || 0) + 10;
                        return `${realm.ruler.name} backs down publicly (+10 prestige).`;
                    }
                    player.prestige = Math.max(0, (player.prestige || 0) - 10);
                    return `${realm.ruler.name} does not back down, and the exchange costs face instead (-10 prestige).`;
                },
            },
            {
                label: "Seek the Church's mediation",
                apply(gameState) {
                    gameState.player.piety = Math.max(0, (gameState.player.piety || 0) - 5);
                    return `The matter is quietly smoothed over through the Church (-5 piety).`;
                },
            },
            {
                label: "Let it go",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 5);
                    return `${gameState.player.name} lets the slight pass unanswered (-5 prestige).`;
                },
            },
        ],
    },
    {
        id: "marriage_offer_for_child",
        chance: 0.16,
        condition: gameState => getChildren(gameState, gameState.player.id).some(c => isAvailableToMarry(gameState, c.id)),
        buildContext: gameState => {
            const children = getChildren(gameState, gameState.player.id).filter(c => isAvailableToMarry(gameState, c.id));
            const child = randomFrom(children);
            const realm = randomFrom(listRealms().filter(r => r.key !== gameState.realmKey));
            const forcedGender = child.gender === "M" ? "F" : "M";
            const candidate = randomFrom(generateNobleMarriageCandidates(realm.key, 3, forcedGender));
            return { childId: child.id, candidate };
        },
        title: "A marriage offer arrives",
        text: (gameState, ctx) => {
            const child = getPerson(gameState, ctx.childId);
            const candidateTitle = personDisplayTitle(ctx.candidate);
            return voiceLine({
                bold: [`A match is proposed for ${child.name}: ${candidateTitle} ${ctx.candidate.name} of ${getRealm(ctx.candidate.sourceRealmKey).name}. A bold alliance, if it holds.`],
                wary: [`An envoy arrives proposing ${child.name} wed ${candidateTitle} ${ctx.candidate.name} — the kind of offer worth reading twice before answering.`],
                cunning: [`A marriage is proposed for ${child.name}, to ${candidateTitle} ${ctx.candidate.name} — worth asking what the other family actually wants from it.`],
                warm: [`Word arrives of a proposed match for ${child.name}, with ${candidateTitle} ${ctx.candidate.name} — ${child.name}'s own happiness is worth weighing here, not just the alliance.`],
                neutral: `An offer arrives: ${candidateTitle} ${ctx.candidate.name} of ${getRealm(ctx.candidate.sourceRealmKey).name}, proposed as a match for ${child.name}.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Accept the match",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    if (!child || !isAvailableToMarry(gameState, child.id)) return "The moment has already passed.";
                    const result = arrangeMarriage(gameState, child, ctx.candidate);
                    if (!result) return `There isn't enough gold on hand to accept this match properly, and the offer is withdrawn.`;
                    return `${child.name} is married to ${ctx.candidate.name}.`;
                },
            },
            {
                label: "Ask for better terms",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    if (Math.random() < 0.5) {
                        gameState.player.prestige = (gameState.player.prestige || 0) + 8;
                        return `The negotiation goes well — better terms are won, and word of the shrewd bargaining spreads (+8 prestige). The match itself still waits on your word.`;
                    }
                    return `The other family takes offense at the haggling, and the offer for ${child ? child.name : "the match"} is quietly withdrawn.`;
                },
            },
            {
                label: "Decline",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    return `The offer for ${child ? child.name : "the match"} is declined, politely.`;
                },
            },
        ],
    },
    {
        id: "spymaster_opportunity",
        chance: 0.12,
        condition: gameState => gameState.council && gameState.council.spymaster && !gameState.war,
        buildContext: gameState => {
            const others = listRealms().filter(r => r.key !== gameState.realmKey && !hasClaim(gameState, r.key));
            if (!others.length) return {};
            return { realmKey: randomFrom(others).key };
        },
        title: "Your Spymaster brings an opportunity",
        text: (gameState, ctx) => {
            const spymaster = gameState.council.spymaster;
            const realm = ctx.realmKey ? getRealm(ctx.realmKey) : null;
            return voiceLine({
                cunning: [`${spymaster.name} lays out an opening${realm ? ` against ${realm.name}` : ""} — the kind of thing that only works if you move before it closes.`],
                wary: [`${spymaster.name} brings word of an opportunity${realm ? ` involving ${realm.name}` : ""}; it's tempting, and that's exactly what gives you pause.`],
                bold: [`${spymaster.name} has found an opening${realm ? ` against ${realm.name}` : ""} and clearly expects you to take it.`],
                neutral: `${spymaster.name} brings news of a possible opportunity${realm ? ` concerning ${realm.name}` : ""}.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Fund the scheme (40 gold)",
                apply(gameState, ctx) {
                    const player = gameState.player;
                    const spymaster = gameState.council.spymaster;
                    if (!ctx.realmKey) return "The opportunity turns out to be nothing after all.";
                    if ((player.gold || 0) < 40) return `There isn't enough gold to fund ${spymaster.name}'s scheme, and the moment slips by.`;
                    player.gold -= 40;
                    const chance = Math.max(0.3, Math.min(0.85, 0.5 + spymaster.skill * 0.015));
                    if (Math.random() < chance) {
                        gameState.claims = gameState.claims || [];
                        gameState.claims.push({ realmKey: ctx.realmKey, grantedYear: gameState.year, type: "fabricated" });
                        return `${spymaster.name}'s scheme pays off — a fabricated claim on ${getRealm(ctx.realmKey).name} is now yours (-40 gold).`;
                    }
                    player.prestige = Math.max(0, (player.prestige || 0) - 8);
                    return `${spymaster.name}'s scheme unravels, and the failure costs standing (-40 gold, -8 prestige).`;
                },
            },
            {
                label: "Decline — too risky",
                apply(gameState) {
                    return `The opportunity is passed up. ${gameState.council.spymaster.name} says nothing, but notes it.`;
                },
            },
        ],
    },
    {
        id: "faction_overture",
        chance: 0.3,
        condition: gameState => !!gameState.faction,
        title: "The faction makes an overture",
        text: gameState => {
            const type = gameState.faction.type === "depose" ? "your abdication" : "independence";
            return voiceLine({
                bold: [`The faction demanding ${type} sends terms — plainly expecting you to fold.`],
                wary: [`A quiet approach from the faction: terms, framed as reasonable, that would end the standoff demanding ${type}.`],
                cunning: [`The faction's terms arrive — worth reading closely for which member is actually wavering.`],
                neutral: `The faction demanding ${type} sends terms for ending the standoff.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Make real concessions (80 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if (!gameState.faction) return "The faction has already dissolved.";
                    if ((player.gold || 0) < 80) return "There isn't enough gold to make concessions worth taking seriously.";
                    player.gold -= 80;
                    const members = gameState.faction.memberIds.map(id => gameState.vassals[id]).filter(Boolean);
                    members.forEach(v => adjustOpinion(v, 15));
                    return `Concessions are made, and the faction's edge dulls, for now (-80 gold, +15 opinion for each member).`;
                },
            },
            {
                label: "Refuse outright",
                apply(gameState) {
                    if (!gameState.faction) return "The faction has already dissolved.";
                    const members = gameState.faction.memberIds.map(id => gameState.vassals[id]).filter(Boolean);
                    members.forEach(v => adjustOpinion(v, -10));
                    gameState.player.prestige = (gameState.player.prestige || 0) + 5;
                    return `The terms are refused flatly — a show of resolve the court notices (+5 prestige, -10 opinion for each faction member).`;
                },
            },
            {
                label: "Quietly bribe the ringleader (50 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if (!gameState.faction) return "The faction has already dissolved.";
                    if ((player.gold || 0) < 50) return "There isn't enough gold to buy anyone off quietly.";
                    player.gold -= 50;
                    if (gameState.faction.memberIds.length > 1 && Math.random() < 0.5) {
                        const peeledId = gameState.faction.memberIds.pop();
                        const peeled = gameState.vassals[peeledId];
                        return `${peeled ? peeled.name : "One of the faction's members"} quietly steps away from the faction (-50 gold).`;
                    }
                    return `The bribe changes nothing — the faction holds together regardless (-50 gold).`;
                },
            },
        ],
    },
    {
        id: "war_surrender_offer",
        chance: 0.25,
        condition: gameState => !!gameState.war,
        title: "A town offers surrender",
        text: gameState => {
            const realm = getRealm(gameState.war.targetRealmKey);
            return voiceLine({
                bold: [`A town in ${realm.name} offers to open its gates rather than face a siege — the garrison watching to see what kind of victor you'll be.`],
                wary: [`A town in ${realm.name} sends terms of surrender — possibly sincere, possibly a trap to slow you down.`],
                devout: [`A town in ${realm.name} offers surrender, its priests pleading for the people inside to be spared.`],
                neutral: `A town in ${realm.name} offers to surrender rather than be stormed.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Accept with mercy",
                apply(gameState) {
                    if (!gameState.war) return "The war has already ended.";
                    gameState.war.warScore = Math.min(100, gameState.war.warScore + 8);
                    gameState.player.prestige = (gameState.player.prestige || 0) + 6;
                    return `The surrender is accepted, and the town spared (+8 war score, +6 prestige).`;
                },
            },
            {
                label: "Make an example of them",
                apply(gameState) {
                    if (!gameState.war) return "The war has already ended.";
                    gameState.war.warScore = Math.min(100, gameState.war.warScore + 14);
                    gameState.player.piety = Math.max(0, (gameState.player.piety || 0) - 10);
                    return `The town is made an example of — the rest of the realm takes the warning, at a real cost to your name (+14 war score, -10 piety).`;
                },
            },
            {
                label: "Press on, take nothing",
                apply(gameState) {
                    return `The offer is ignored. The campaign continues as it was.`;
                },
            },
        ],
    },
    {
        id: "reform_preacher",
        chance: 0.12,
        condition: gameState => gameState.reform && !gameState.reform.schismed && reformLevel(gameState) > 20,
        title: "A preacher draws a crowd",
        text: gameState => {
            return voiceLine({
                devout: [`A charismatic reformist preacher has drawn a real crowd in your lands — close enough to your own hall that silence isn't really an option.`],
                bold: [`A reformist preacher is drawing crowds openly now, daring someone to do something about it.`],
                wary: [`Word reaches you of a preacher stirring reformist sentiment nearby — the kind of thing that's easier to handle quietly, early.`],
                neutral: `A reformist preacher has drawn a real crowd somewhere in your lands.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Expel him",
                apply(gameState) {
                    gameState.reform.level = Math.max(0, gameState.reform.level - 10);
                    adjustStanding(gameState, gameState.realmKey, 3);
                    return `The preacher is sent away — reform pressure eases, and Rome takes quiet note (-10 reform, +3 standing).`;
                },
            },
            {
                label: "Let him speak",
                apply(gameState) {
                    gameState.reform.level = Math.min(100, gameState.reform.level + 6);
                    gameState.player.prestige = (gameState.player.prestige || 0) + 3;
                    return `He's allowed to speak freely — the common folk take it as a kind of fairness (+6 reform, +3 prestige).`;
                },
            },
            {
                label: "Meet him yourself",
                apply(gameState) {
                    gameState.player.piety = (gameState.player.piety || 0) + 5;
                    gameState.reform.level = Math.max(0, gameState.reform.level - 5);
                    return `A quiet, private conversation does more than a public expulsion would have (-5 reform, +5 piety).`;
                },
            },
        ],
    },
    {
        id: "papal_legate",
        chance: 0.1,
        condition: gameState => gameState.player.tier >= 2,
        title: "A papal legate visits",
        text: gameState => {
            return voiceLine({
                devout: [`A legate from Rome arrives, and ${gameState.player.name} means to receive him properly.`],
                cunning: [`A legate from Rome arrives — worth remembering that his report home will shape how you're seen there.`],
                wary: [`A papal legate's unannounced visit puts the whole household on its best behavior.`],
                neutral: `A legate from Rome arrives at court, unannounced.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Host him graciously (30 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 30) return "There isn't enough gold to host him as he deserves.";
                    player.gold -= 30;
                    adjustStanding(gameState, gameState.realmKey, 10);
                    player.piety = (player.piety || 0) + 5;
                    return `A gracious reception leaves a real impression (-30 gold, +10 standing with Rome, +5 piety).`;
                },
            },
            {
                label: "Receive him plainly",
                apply(gameState) {
                    adjustStanding(gameState, gameState.realmKey, 3);
                    return `A plain, correct reception — nothing more (+3 standing with Rome).`;
                },
            },
            {
                label: "Keep him waiting",
                apply(gameState) {
                    adjustStanding(gameState, gameState.realmKey, -8);
                    return `The legate is kept waiting longer than is wise, and he notices (-8 standing with Rome).`;
                },
            },
        ],
    },
    {
        id: "sibling_asks_for_help",
        chance: 0.12,
        condition: gameState => getSiblings(gameState, gameState.player.id).some(s => s.alive),
        buildContext: gameState => ({ siblingId: randomFrom(getSiblings(gameState, gameState.player.id).filter(s => s.alive)).id }),
        title: "A sibling asks for help",
        text: (gameState, ctx) => {
            const sibling = getPerson(gameState, ctx.siblingId);
            return voiceLine({
                warm: [`${sibling.name} comes asking for help — family first, and it shows in how directly they ask.`],
                wary: [`${sibling.name} asks for help, and you find yourself wondering exactly how much this will actually cost.`],
                cunning: [`${sibling.name} asks for help — the kind of favor that's usually remembered, one way or another.`],
                neutral: `${sibling.name} comes to you asking for help.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Lend gold (40 gold)",
                apply(gameState, ctx) {
                    const sibling = getPerson(gameState, ctx.siblingId);
                    const player = gameState.player;
                    if (!sibling || !sibling.alive) return "The matter has already resolved itself.";
                    if ((player.gold || 0) < 40) return `There isn't enough gold to help ${sibling.name} properly.`;
                    player.gold -= 40;
                    sibling.gold = (sibling.gold || 0) + 40;
                    player.prestige = (player.prestige || 0) + 3;
                    return `${sibling.name} is grateful for the help (-40 gold to you, +40 gold to them, +3 prestige).`;
                },
            },
            {
                label: "Offer a place at court",
                apply(gameState, ctx) {
                    const sibling = getPerson(gameState, ctx.siblingId);
                    gameState.player.prestige = (gameState.player.prestige || 0) + 2;
                    return `${sibling ? sibling.name : "Your sibling"} is welcomed at court instead — a smaller gesture, still a real one (+2 prestige).`;
                },
            },
            {
                label: "Turn them away",
                apply(gameState, ctx) {
                    const sibling = getPerson(gameState, ctx.siblingId);
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 5);
                    return `${sibling ? sibling.name : "Your sibling"} is turned away, and it isn't forgotten (-5 prestige).`;
                },
            },
        ],
    },
    {
        id: "child_shows_talent",
        chance: 0.14,
        condition: gameState => getChildren(gameState, gameState.player.id).some(c => c.alive && c.age < 16 && getEducationFocus(gameState, c.id)),
        buildContext: gameState => {
            const eligible = getChildren(gameState, gameState.player.id).filter(c => c.alive && c.age < 16 && getEducationFocus(gameState, c.id));
            const child = randomFrom(eligible);
            const focusKey = getEducationFocus(gameState, child.id);
            return { childId: child.id, focusKey };
        },
        title: "Your child shows real promise",
        text: (gameState, ctx) => {
            const child = getPerson(gameState, ctx.childId);
            const focus = EDUCATION_FOCI.find(f => f.key === ctx.focusKey);
            return voiceLine({
                bold: [`${child.name}'s tutors report real promise in ${focus ? focus.name.toLowerCase() : "their studies"} — the kind of talent worth pushing further.`],
                warm: [`${child.name} has taken to ${focus ? focus.name.toLowerCase() : "their studies"} with real enthusiasm, and it shows.`],
                neutral: `${child.name}'s tutors report genuine promise in ${focus ? focus.name.toLowerCase() : "their studies"}.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Encourage them further (30 gold)",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    const player = gameState.player;
                    const focus = EDUCATION_FOCI.find(f => f.key === ctx.focusKey);
                    if (!child || !child.alive) return "The moment has passed.";
                    if ((player.gold || 0) < 30) return `There isn't enough gold to bring in a finer tutor for ${child.name}.`;
                    player.gold -= 30;
                    if (focus && focus.skillKey && child.skills) child.skills[focus.skillKey] = (child.skills[focus.skillKey] || 0) + 3;
                    return `A finer tutor is brought in for ${child.name} (-30 gold, real skill gained).`;
                },
            },
            {
                label: "Praise them publicly",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    gameState.player.prestige = (gameState.player.prestige || 0) + 5;
                    return `${child ? child.name : "Your child"} is praised before the whole household (+5 prestige).`;
                },
            },
            {
                label: "Keep them humble",
                apply(gameState, ctx) {
                    const child = getPerson(gameState, ctx.childId);
                    return `${child ? child.name : "Your child"} is encouraged to keep working, nothing more said.`;
                },
            },
        ],
    },
    {
        id: "bandit_trouble",
        chance: 0.11,
        condition: gameState => gameState.player.tier >= 1,
        title: "Bandits on the roads",
        text: gameState => {
            const n = gameState.player.name;
            return voiceLine({
                bold: [`Bandits have been preying on the roads near ${n}'s lands — ${n} is half-tempted to ride out personally.`],
                wary: [`Reports of bandits on the roads reach ${n} — bad for trade, worse for anyone who has to travel them.`],
                neutral: `Bandits have been preying on travelers along the roads near ${n}'s lands.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Hunt them down yourself",
                apply(gameState) {
                    const player = gameState.player;
                    const chance = Math.max(0.3, Math.min(0.85, 0.5 + (player.skills.martial || 0) * 0.02));
                    if (Math.random() < chance) {
                        player.prestige = (player.prestige || 0) + 10;
                        return `${player.name} rides out and runs the bandits down personally (+10 prestige).`;
                    }
                    player.health = Math.max(0, player.health - 12);
                    return `The bandits put up more of a fight than expected (-12 health).`;
                },
            },
            {
                label: "Send soldiers to deal with it (40 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 40) return "There isn't enough gold to send a proper force after them.";
                    player.gold -= 40;
                    return `The bandits are dealt with by soldiers sent for the purpose, cleanly (-40 gold).`;
                },
            },
            {
                label: "Ignore it",
                apply(gameState) {
                    gameState.player.gold = Math.max(0, (gameState.player.gold || 0) - 25);
                    return `Trade suffers while the bandits go unanswered (-25 gold).`;
                },
            },
        ],
    },
    {
        id: "tenant_festival",
        chance: 0.1,
        condition: gameState => gameState.player.tier >= 1,
        title: "The tenants ask for a festival",
        text: gameState => {
            return voiceLine({
                warm: [`The tenants ask for a festival, and ${gameState.player.name} is genuinely glad to give them one.`],
                cunning: [`The tenants ask for a festival — a cheap way to buy real goodwill, if you're willing to spend it.`],
                neutral: `The tenants ask for a festival to be held.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Fund it generously (50 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 50) return "There isn't enough gold to fund it properly.";
                    player.gold -= 50;
                    player.prestige = (player.prestige || 0) + 5;
                    getVassals(gameState).forEach(v => adjustOpinion(v, 5));
                    return `A generous festival is held, remembered fondly (-50 gold, +5 prestige, +5 opinion for every vassal).`;
                },
            },
            {
                label: "Allow a modest one (15 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 15) return "There isn't even enough gold for a modest one.";
                    player.gold -= 15;
                    getVassals(gameState).forEach(v => adjustOpinion(v, 2));
                    return `A modest festival is allowed (-15 gold, +2 opinion for every vassal).`;
                },
            },
            {
                label: "Refuse",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 3);
                    getVassals(gameState).forEach(v => adjustOpinion(v, -3));
                    return `The request is refused (-3 prestige, -3 opinion for every vassal).`;
                },
            },
        ],
    },
    {
        id: "plague_scare",
        chance: 0.08,
        condition: gameState => gameState.player.tier >= 1,
        title: "Sickness in a nearby town",
        text: gameState => {
            return voiceLine({
                wary: [`Sickness is reported in a nearby town, and ${gameState.player.name} is already thinking about how fast it could spread.`],
                devout: [`Sickness in a nearby town has ${gameState.player.name}'s confessor already speaking of prayer and precaution both.`],
                neutral: `Sickness is reported in a town not far from here.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Quarantine the area (50 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 50) return "There isn't enough gold to enforce a proper quarantine.";
                    player.gold -= 50;
                    return `A quarantine is enforced, and the sickness is contained before it spreads (-50 gold).`;
                },
            },
            {
                label: "Pray and wait",
                apply(gameState) {
                    const player = gameState.player;
                    player.piety = (player.piety || 0) + 5;
                    if (Math.random() < 0.2) {
                        player.health = Math.max(0, player.health - 10);
                        return `Prayers are said, but the sickness reaches your own household regardless (+5 piety, -10 health).`;
                    }
                    return `Prayers are said, and the sickness passes without reaching here (+5 piety).`;
                },
            },
            {
                label: "Ignore it",
                apply(gameState) {
                    const player = gameState.player;
                    if (Math.random() < 0.3) {
                        player.health = Math.max(0, player.health - 15);
                        return `The sickness reaches here after all, unaddressed (-15 health).`;
                    }
                    return `Nothing comes of it, this time.`;
                },
            },
        ],
    },
    // Historical pressure — every real bracket runs through the generic
    // HISTORICAL_PRESSURE_TEMPLATES processor defined above, keyed by
    // realm and year window. Adding another real event to history means
    // adding another template, not writing a new decision by hand.
    ...HISTORICAL_PRESSURE_TEMPLATES.map(buildHistoricalPressureDecisionEvent),
    // Opinion Leverage — a royal tie cuts both ways: relatives who hold a
    // foreign throne lean on you, and courtiers lean on you to use the
    // connection on THEIR behalf. The specific favor asked is drawn from
    // the LEVERAGE_REQUEST_TYPES pool (gold, military aid, or a title)
    // rather than being fixed to one kind of request.
    {
        id: "royal_relative_demands_favor",
        chance: 0.12,
        condition: gameState => typeof hasRelativeHoldingAForeignThrone === "function" && hasRelativeHoldingAForeignThrone(gameState),
        buildContext: gameState => ({ requestType: randomFrom(LEVERAGE_REQUEST_TYPES).key }),
        title: "A royal relative calls in a favor",
        text: (gameState, ctx) => {
            const req = leverageRequestFor(ctx.requestType);
            return voiceLine({
                bold: [`Word arrives from a relative who now sits on a foreign throne — ${req.askLine}.`],
                cunning: [`A relative's crown seems to come with an expectation attached — ${req.askLine}.`],
                neutral: `A relative who holds a foreign throne sends word: ${req.askLine}.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Grant the request",
                apply(gameState, ctx) {
                    const req = leverageRequestFor(ctx && ctx.requestType);
                    return req.accept(gameState);
                },
            },
            {
                label: "Decline, diplomatically",
                apply(gameState) {
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 5);
                    return `The request is declined as gently as possible — relations cool slightly (-5 prestige).`;
                },
            },
        ],
    },
    {
        id: "courtier_begs_influence",
        chance: 0.1,
        condition: gameState => typeof hasRelativeHoldingAForeignThrone === "function" && hasRelativeHoldingAForeignThrone(gameState) && [...getVassals(gameState), ...Object.values(getCouncil(gameState))].length > 0,
        buildContext: gameState => {
            const pool = [...getVassals(gameState), ...Object.values(getCouncil(gameState))];
            return { personId: randomFrom(pool).id };
        },
        title: "A courtier begs a favor",
        text: (gameState, ctx) => {
            const person = getCourtierById(gameState, ctx.personId);
            const n = gameState.player.name;
            return voiceLine({
                warm: [`${person ? person.name : "Someone at court"} comes to ${n} hoping you'll use your family's royal connection on their behalf — land, mostly, though they're careful not to say so outright.`],
                cunning: [`${person ? person.name : "Someone at court"} is angling for ${n} to use the family's royal tie for their own gain — land, almost certainly.`],
                neutral: `${person ? person.name : "Someone at court"} asks ${n} to use the family's connection to a throne on their behalf.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Use your influence for them",
                apply(gameState, ctx) {
                    const person = getCourtierById(gameState, ctx.personId);
                    if (!person) return "The matter resolves itself before anything can be done.";
                    adjustOpinion(person, 20);
                    gameState.player.prestige = Math.max(0, (gameState.player.prestige || 0) - 3);
                    return `${person.name} gets the help they wanted — word of it costs a little polish on your own name, but wins real loyalty (+20 opinion, -3 prestige).`;
                },
            },
            {
                label: "Decline — your influence isn't for spending here",
                apply(gameState, ctx) {
                    const person = getCourtierById(gameState, ctx.personId);
                    if (!person) return "The matter resolves itself before anything can be done.";
                    adjustOpinion(person, -8);
                    return `${person.name} is turned away, and doesn't hide the disappointment (-8 opinion).`;
                },
            },
        ],
    },
    // Procedural Drama Director — every beat generated by
    // classifyPlayerSituation x assessRealmNeeds above (forced marriage
    // for a border alliance, heir-pressure remarriage, a war-funding
    // crisis, and whatever gets added to DRAMA_BEAT_TEMPLATES next).
    ...DRAMA_BEAT_TEMPLATES.map(buildDramaBeatDecisionEvent),
    // Ambient border pressure — any realm with an unstable or openly
    // hostile neighbor (per realms.js's REALM_NEIGHBORS) carries a real,
    // recurring risk of raids, unless the player has paid to fortify the
    // frontier (domain.js's fortifyBorder), which suppresses this
    // entirely rather than just softening it.
    {
        id: "border_raid",
        chance: 0.22,
        // Raid risk is now a genuine two-lever choice: fortifyBorder
        // (domain.js) answers it with walls and gold spent once; good
        // relations (wartime.js's relationsWith/sendEnvoy) answers it
        // politically, realm by realm, and overrides even a classically
        // raiding or unstable neighbor once trust is real.
        condition: gameState => {
            if (gameState.borderFortified) return false;
            const neighbors = neighborsOf(gameState.realmKey);
            if (!neighbors.length) return false;
            return neighbors.some(k => (effectiveStability(gameState, k) < 45 || k === "ottoman" || k === "wallachia") && relationsWith(gameState, k) < 65);
        },
        buildContext: gameState => {
            const neighbors = neighborsOf(gameState.realmKey);
            const risky = neighbors.filter(k => (effectiveStability(gameState, k) < 45 || k === "ottoman" || k === "wallachia") && relationsWith(gameState, k) < 65);
            const raiderRealmKey = randomFrom(risky.length ? risky : neighbors);
            return { raiderRealmKey };
        },
        title: "Raiders along the border",
        text: (gameState, ctx) => {
            const raiderRealm = getRealm(ctx.raiderRealmKey);
            return voiceLine({
                bold: [`Riders come in from the border at a gallop — raiders out of ${raiderRealm.name} have struck an outlying village, and ${gameState.player.name} has to answer for it, one way or another.`],
                wary: [`Word reaches ${gameState.player.name} of raiders out of ${raiderRealm.name} striking the border again — not the first time this year, and likely not the last.`],
                neutral: `Raiders from across the ${raiderRealm.name} border have struck an outlying holding.`,
            }, gameState.player);
        },
        options: [
            {
                label: "Muster the border levies to drive them off (40 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    if ((player.gold || 0) < 40) return "There isn't enough gold on hand to muster a proper response, and the raiders have their way.";
                    player.gold -= 40;
                    player.prestige = (player.prestige || 0) + 5;
                    return `The border levies ride out and drive the raiders back across the frontier — costly, but it's noticed (-40 gold, +5 prestige).`;
                },
            },
            {
                label: "Pay them off quietly (25 gold)",
                apply(gameState) {
                    const player = gameState.player;
                    const paid = Math.min(25, player.gold || 0);
                    player.gold = Math.max(0, (player.gold || 0) - 25);
                    return paid > 0 ? `A quiet payment sends the raiders elsewhere, for now (-${paid} gold).` : `There's nothing to pay them with, and they take what they want regardless.`;
                },
            },
            {
                label: "Let the local lords handle it themselves",
                apply(gameState) {
                    if (Math.random() < 0.5) {
                        getVassals(gameState).forEach(v => { if (Math.random() < 0.4) adjustOpinion(v, -6); });
                        return `The local lords handle it on their own — and resent being left to, afterward.`;
                    }
                    return `The raid burns itself out before it reaches anything that matters.`;
                },
            },
        ],
    },
];

function getCourtierById(gameState, id) {
    if (gameState.vassals[id]) return gameState.vassals[id];
    return Object.values(getCouncil(gameState)).find(c => c.id === id) || null;
}

// Rolls for at most one new decision per year, and only if none is already
// waiting to be resolved — advanceYear (engine.js) refuses to run again
// while gameState.pendingDecision is set, so this never silently stacks.
function allDecisionEvents() {
    return DECISION_EVENTS;
}

function tickDecisions(gameState) {
    if (!gameState.player.alive || gameState.pendingDecision) return;
    const candidates = DECISION_EVENTS.filter(e => e.condition(gameState) && Math.random() < e.chance);
    if (!candidates.length) return;
    const event = randomFrom(candidates);
    const ctx = event.buildContext ? event.buildContext(gameState) : {};
    gameState.pendingDecision = {
        eventId: event.id,
        title: event.title,
        text: typeof event.text === "function" ? event.text(gameState, ctx) : event.text,
        options: event.options.map(o => ({ label: o.label })),
        context: ctx,
    };
}

function resolveDecision(gameState, optionIndex) {
    const pending = gameState.pendingDecision;
    if (!pending) return false;
    const event = DECISION_EVENTS.find(e => e.id === pending.eventId);
    if (!event) { gameState.pendingDecision = null; return false; }
    const option = event.options[optionIndex];
    if (!option) return false;
    const resultText = option.apply(gameState, pending.context);
    logEvent(resultText || `${gameState.player.name} makes a choice.`);
    if (typeof applyStressForChoice === "function") applyStressForChoice(gameState, option.label);
    gameState.pendingDecision = null;
    return true;
}
