// story_elizabeth_woodville.js — her life told as one continuous story,
// paced the way a good "live through it" game paces itself: short beats,
// a real choice on almost every page. As a knight's daughter and then a
// widow, Elizabeth doesn't get to decide most of what happens TO her —
// who she marries, whose custody she's in, whether the crown notices
// her at all — so most choices are about how she answers that: obey,
// quietly resist, or lean on family for help. What she actually
// controls (her own gold, her own name, her family's standing) carries
// forward into the real game at the end.

STORY_DECKS.elizabeth_woodville = {
    startNodeId: "parents",
    startingStats: { gold: 15, prestige: 0, houseStanding: 35 },
    nodes: {

        parents: {
            text: () => "Before there was an Elizabeth Woodville, there was a scandal: her mother Jacquetta, a continental noblewoman, married a mere knight — Richard Woodville — for nothing anyone could call advantage, and paid the Crown's fine for doing it without leave. Elizabeth, their eldest, grows up knowing the family married for love once already, against everyone's advice.",
            choices: [
                {
                    label: "She'll resent that scandal — it cost the family standing she means to win back",
                    apply: s => { s.flags.resentsScandal = true; adjustStoryStat(s, "houseStanding", 2); },
                    next: "girlhood",
                },
                {
                    label: "She's quietly proud of it — her parents chose each other over everything else",
                    apply: s => { s.flags.proudOfScandal = true; adjustStoryStat(s, "prestige", 2); },
                    next: "girlhood",
                },
            ],
        },

        girlhood: {
            text: () => "At Grafton Regis, a sharp girl in a house of thirteen children learns to watch one thing closely. What does Elizabeth watch?",
            choices: [
                {
                    label: "The suitors courting her sisters, and what each match actually buys the family",
                    apply: s => { s.flags.ambitiousUpbringing = true; adjustStoryStat(s, "houseStanding", 4); },
                    next: "first_marriage",
                },
                {
                    label: "The household accounts, always one bad harvest from real trouble",
                    apply: s => { s.flags.carefulUpbringing = true; adjustStoryStat(s, "gold", 10); },
                    next: "first_marriage",
                },
            ],
        },

        // Her first marriage isn't her choice at all — her father
        // arranges it. What's actually hers to decide is how she meets
        // that.
        first_marriage: {
            text: () => "Her father arranges it: Sir John Grey of Groby, a solid Lancastrian heir. No one asks Elizabeth whether she wants this. They never do.",
            choices: [
                {
                    label: "Accept it gracefully — a dutiful daughter, whatever she privately thinks",
                    apply: s => { s.flags.obedientDaughter = true; adjustStoryStat(s, "houseStanding", 5); },
                    next: "first_marriage_2",
                },
                {
                    label: "Go along with it, but make it plain she was never asked",
                    apply: s => { s.flags.quietlyResentful = true; },
                    next: "first_marriage_2",
                },
                {
                    label: "Ask her mother Jacquetta how she ever made peace with a marriage no one approved of",
                    apply: s => { s.flags.askedMother = true; adjustStoryStat(s, "prestige", 3); },
                    next: "first_marriage_2",
                },
            ],
        },

        first_marriage_2: {
            text: s => s.flags.askedMother
                ? "Jacquetta's answer is simple: a marriage is what you make of it afterward, not what's decided beforehand. Elizabeth marries Grey with that advice in her pocket. Two sons follow, Thomas and Richard."
                : "It turns out to be a decent enough match, as arranged marriages go — not loveless, if never quite chosen. Two sons follow, Thomas and Richard.",
            choices: [{ label: "Continue", next: "widowed" }],
        },

        widowed: {
            text: () => "1461: John Grey dies for Lancaster at the second battle of St Albans — the losing side, now that a Yorkist king sits newly crowned in London. Elizabeth is twenty-four, widowed, two small sons, and a mother-in-law who refuses to hand over the dower lands that are hers by law.",
            choices: [
                {
                    label: "Press the claim through the courts — slow, proper, and likely to lose",
                    apply: s => { s.flags.pursuedCourts = true; adjustStoryStat(s, "houseStanding", 3); },
                    next: "courts_1",
                },
                {
                    label: "Go around the courts — petition the king himself, whatever it takes to arrange",
                    apply: s => { s.flags.petitionedKing = true; adjustStoryStat(s, "prestige", 5); adjustStoryStat(s, "gold", -5); },
                    next: "courtship",
                },
            ],
        },

        // ---- Branch A: the quiet life, unremembered ----
        courts_1: {
            text: () => "The case drags for years — a widow with no patron waits, writes, waits again. Money runs thin before the courts rule in her favor.",
            choices: [
                {
                    label: "Sell what jewelry remains rather than ask anyone for help",
                    apply: s => { s.flags.proudPoverty = true; adjustStoryStat(s, "gold", 8); adjustStoryStat(s, "prestige", 3); },
                    next: "courts_2",
                },
                {
                    label: "Write to her mother Jacquetta's own family on the continent and ask outright",
                    apply: s => { s.flags.askedForHelp = true; adjustStoryStat(s, "gold", 15); adjustStoryStat(s, "houseStanding", -3); },
                    next: "courts_2",
                },
            ],
        },

        courts_2: {
            text: () => "The dower is finally hers, in part. A name has come forward for a second marriage — not grand, but willing, and the boys need a settled household more than she needs to hold out for better.",
            choices: [
                {
                    label: "Accept the match. A quiet, stable life is its own kind of victory.",
                    apply: s => { s.flags.quietRemarriage = true; adjustStoryStat(s, "houseStanding", 6); },
                    next: "__HANDOFF__",
                },
                {
                    label: "Refuse. Raise the boys alone, on less, rather than answer to another husband.",
                    apply: s => { s.flags.raisedAlone = true; adjustStoryStat(s, "prestige", 6); },
                    next: "__HANDOFF__",
                },
            ],
        },

        // ---- Branch B: the famous one ----
        courtship: {
            text: () => "King Edward IV stops while hunting near Grafton to hear her petition — then stops again, and again, until it's plain to everyone he hasn't come for the petition at all. Weeks of secret meetings end with a proposal: marriage, in secret, to a widow with no fortune, while the Earl of Warwick negotiates a French match for him that Edward has apparently already decided against.",
            choices: [
                {
                    label: "Accept him. In secret. Whatever it costs later.",
                    apply: s => { s.flags.marriedEdward = true; adjustStoryStat(s, "prestige", 20); },
                    next: "ascendancy",
                },
                {
                    label: "Refuse. Protect her name and her sons' modest security instead.",
                    apply: s => { s.flags.refusedEdward = true; adjustStoryStat(s, "houseStanding", 10); },
                    next: "refused_ending",
                },
            ],
        },

        refused_ending: {
            text: () => "Edward, to his own quiet surprise, doesn't press it — and settles her petition in her favor anyway, as if embarrassed to have been refused. She never becomes queen. Her sons grow up untitled and ordinary. It is the one time in her life a king wanted something from her, and she said no.",
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        ascendancy: {
            text: () => "They marry at Grafton with almost no one present — not Edward's council, not his mother, certainly not Warwick. Once the marriage becomes known, the Woodvilles rise fast: sisters married into the great houses, her father made an Earl. Warwick watches an upstart family outpace him in his own king's court.",
            choices: [
                {
                    label: "Push the family's rise further still — every advantage, while it's there",
                    apply: s => { s.flags.pushedFamilyRise = true; adjustStoryStat(s, "houseStanding", 15); adjustStoryStat(s, "prestige", -3); },
                    next: "readeption",
                },
                {
                    label: "Restrain it deliberately — less provocation, less tinder for Warwick",
                    apply: s => { s.flags.restrainedFamily = true; adjustStoryStat(s, "houseStanding", 5); },
                    next: "readeption",
                },
                {
                    label: "Ask her mother's advice — Jacquetta has outlasted worse enemies than Warwick",
                    apply: s => { s.flags.askedMotherAscendancy = true; adjustStoryStat(s, "houseStanding", 8); adjustStoryStat(s, "prestige", 4); },
                    next: "readeption",
                },
            ],
        },

        readeption: {
            text: s => `${s.flags.pushedFamilyRise ? "It isn't enough." : "It buys time, but not enough of it."} In 1470 Warwick defects outright, allied with the old enemy Margaret of Anjou, to restore Henry VI. Edward flees to Burgundy; Elizabeth, pregnant, flees to sanctuary at Westminster Abbey, cut off from the court entirely.`,
            choices: [
                {
                    label: "Lean on what Woodville allies are still at large to get word out",
                    apply: s => { s.flags.leanedOnAllies = true; adjustStoryStat(s, "houseStanding", 5); adjustStoryStat(s, "gold", -10); },
                    next: "crisis_1483",
                },
                {
                    label: "Trust no one — sit tight in sanctuary and wait it out alone",
                    apply: s => { s.flags.trustedNoOne = true; adjustStoryStat(s, "prestige", 5); },
                    next: "crisis_1483",
                },
            ],
        },

        crisis_1483: {
            text: () => "She gives birth in sanctuary to a son — Edward, after a father who is briefly a king in exile and nothing else. Within the year Edward returns, wins at Barnet and Tewkesbury, and takes the throne back. Twelve peaceful years follow — then, in April 1483, Edward dies suddenly at not quite forty-one. Her boy by him is twelve, uncrowned, and already in his uncle Gloucester's custody.",
            choices: [
                {
                    label: "Act now — gather her younger children and move before Gloucester does",
                    apply: s => { s.flags.actedFast = true; adjustStoryStat(s, "prestige", 5); },
                    next: "sanctuary_choice",
                },
                {
                    label: "Wait for real news before doing anything that can't be undone",
                    apply: s => { s.flags.waitedForNews = true; adjustStoryStat(s, "houseStanding", 3); },
                    next: "sanctuary_choice",
                },
            ],
        },

        sanctuary_choice: {
            text: () => "Gloucester has already arrested her brother and her son Richard Grey on the road to London. Everything she's built for twenty years is violently uncertain again. Flee once more to the sanctuary that protected her before — or stand and fight him in the open?",
            choices: [
                {
                    label: "Flee to sanctuary at Westminster Abbey with her younger children",
                    apply: s => { s.flags.fledSanctuary = true; adjustStoryStat(s, "gold", -10); adjustStoryStat(s, "houseStanding", 5); },
                    next: "__HANDOFF__",
                },
                {
                    label: "Resist Gloucester's regency openly — rally what allies remain",
                    apply: s => { s.flags.resistedOpenly = true; adjustStoryStat(s, "prestige", 10); },
                    next: "__HANDOFF__",
                },
            ],
        },
    },

    // Three real endings reach this point, each with its own age, realm
    // standing, and family already in place — not the same character
    // reset to a stock starting point regardless of what the story just
    // established.
    handoff(storyState) {
        const flags = storyState.flags;
        if (flags.marriedEdward) {
            handoffToRealGame({
                figureKey: "elizabeth_woodville", realmKey: "england", name: "Elizabeth Woodville",
                gender: "F", age: 46, tier: 4, traits: ["Ambitious", "Patient"], year: 1483,
                resumeHook(gs) {
                    const player = gs.player;
                    const edward = createCharacter({ realmKey: "england", tier: 5, gender: "M", age: 40, name: "Edward IV" });
                    edward.traits = ["Gallant", "Ambitious"];
                    edward.alive = false;
                    edward.spouseId = player.id;
                    registerPerson(gs, edward);
                    player.spouseId = edward.id;

                    const edwardV = createCharacter({ realmKey: "england", tier: 5, gender: "M", age: 12, name: "Edward V" });
                    edwardV.motherId = player.id; edwardV.fatherId = edward.id; edwardV.royalHouseKey = "england";
                    registerPerson(gs, edwardV);
                    const richardShrewsbury = createCharacter({ realmKey: "england", tier: 4, gender: "M", age: 9, name: "Richard of Shrewsbury" });
                    richardShrewsbury.motherId = player.id; richardShrewsbury.fatherId = edward.id; richardShrewsbury.royalHouseKey = "england";
                    registerPerson(gs, richardShrewsbury);
                    const elizabethOfYork = createCharacter({ realmKey: "england", tier: 4, gender: "F", age: 17, name: "Elizabeth of York" });
                    elizabethOfYork.motherId = player.id; elizabethOfYork.fatherId = edward.id; elizabethOfYork.royalHouseKey = "england";
                    registerPerson(gs, elizabethOfYork);

                    const thomasGrey = createCharacter({ realmKey: "england", tier: 3, gender: "M", age: 28, name: "Thomas Grey" });
                    thomasGrey.motherId = player.id;
                    registerPerson(gs, thomasGrey);
                    const richardGrey = createCharacter({ realmKey: "england", tier: 2, gender: "M", age: 26, name: "Richard Grey" });
                    richardGrey.motherId = player.id;
                    richardGrey.alive = !flags.fledSanctuary || Math.random() < 0.5;
                    registerPerson(gs, richardGrey);

                    gs.homeRulerId = player.id;
                    gs.player.tier = Math.max(gs.player.tier, 4);
                    growDomainAndVassalsForTier(gs, gs.player.tier);
                    if (flags.fledSanctuary) {
                        logEvent(`${player.name} takes her younger children into Westminster Abbey's sanctuary once again, powerless for now to stop whatever is already happening to the sons left outside it.`);
                    } else {
                        logEvent(`${player.name} refuses to simply disappear into sanctuary again — whatever allies the Woodville name still commands in London, she means to use them.`);
                    }
                    logEvent(`${player.name}'s story, from a disputed widow's dower to a crown held for twenty years, continues now as the ordinary business of a life still being lived.`);
                },
            });
        } else if (flags.refusedEdward) {
            handoffToRealGame({
                figureKey: "elizabeth_woodville", realmKey: "england", name: "Elizabeth Woodville",
                gender: "F", age: 30, tier: 1, traits: ["Ambitious", "Patient"], year: 1467,
                resumeHook(gs) {
                    const player = gs.player;
                    const sonAges = [12, 10];
                    ["Thomas Grey", "Richard Grey"].forEach((n, i) => {
                        const son = createCharacter({ realmKey: "england", tier: 1, gender: "M", age: sonAges[i], name: n });
                        son.motherId = player.id;
                        registerPerson(gs, son);
                    });
                    logEvent(`${player.name} lives the quieter life she chose — a private household, no crown, no history book's notice, and a king's one refusal she never once regretted.`);
                },
            });
        } else {
            const quiet = !!flags.quietRemarriage;
            handoffToRealGame({
                figureKey: "elizabeth_woodville", realmKey: "england", name: "Elizabeth Woodville",
                gender: "F", age: 32, tier: quiet ? 1 : 0, traits: ["Ambitious", "Patient"], year: 1469,
                resumeHook(gs) {
                    const player = gs.player;
                    const sonAges = [14, 12];
                    ["Thomas Grey", "Richard Grey"].forEach((n, i) => {
                        const son = createCharacter({ realmKey: "england", tier: 1, gender: "M", age: sonAges[i], name: n });
                        son.motherId = player.id;
                        registerPerson(gs, son);
                    });
                    logEvent(quiet
                        ? `${player.name} builds a modest, settled household out of a second, humbler marriage — the courts eventually gave back enough to live on, and that, in the end, was the whole of the fight.`
                        : `${player.name} raises her sons alone rather than answer to a second husband — harder, poorer, and entirely her own.`);
                },
            });
        }
    },
};
