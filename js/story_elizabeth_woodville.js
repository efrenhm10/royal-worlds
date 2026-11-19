// story_elizabeth_woodville.js — her life told as one continuous story,
// from her parents' own scandal through to the ruin or the crown her own
// choices lead her toward. Three real endings, not one: a quiet life no
// history book remembers, a dignified refusal, or the throne itself —
// each reached by a different sequence of choices, each changing what
// the NEXT scene actually says, not just how it's scored.

STORY_DECKS.elizabeth_woodville = {
    startNodeId: "parents",
    nodes: {

        parents: {
            text: () => [
                "Before there was an Elizabeth Woodville, there was a scandal her family never stopped living down.",
                "In 1437, Jacquetta of Luxembourg — a continental noblewoman, widow of John of Lancaster, Duke of Bedford, uncle to the King of England himself — married Richard Woodville, a mere knight who had served in her late husband's household. The match was beneath her by every measure that mattered at court. The fine the Crown levied against them, for marrying without royal license, was simply the price of having done it anyway, with no one's permission and nothing to gain by it that could be written down on a ledger.",
                "It would not be the last time a Woodville married for reasons the court found difficult to forgive.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "birth" }],
        },

        birth: {
            text: () => [
                "Elizabeth was born into that scandal's long shadow — the eldest of what would become thirteen children, raised at Grafton Regis in a household noble by her mother's blood and newly, precariously risen by her father's.",
                "She grew up belonging fully to neither world: too well-connected for the gentry who distrusted a knight's rapid rise, not quite grand enough for the continental cousins her mother never stopped mentioning.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "girlhood" }],
        },

        girlhood: {
            text: () => "Growing up in a household always negotiating its own standing, a sharp girl learns to watch one thing closely above all else. What does Elizabeth watch?",
            choices: [
                {
                    label: "The suitors who come calling for her sisters, and what each match actually buys the family",
                    apply: s => { s.flags.ambitiousUpbringing = true; },
                    next: "first_marriage",
                },
                {
                    label: "The quiet arithmetic of a household always one bad harvest from real trouble",
                    apply: s => { s.flags.carefulUpbringing = true; },
                    next: "first_marriage",
                },
            ],
        },

        first_marriage: {
            text: s => [
                s.flags.ambitiousUpbringing
                    ? "By the time she is of age, Elizabeth already understands exactly what a marriage is worth — and her own first match, to Sir John Grey of Groby, heir to a solid Lancastrian barony, reads to her like a fair opening move, not a verdict on her life."
                    : "By the time she is of age, Elizabeth has learned not to expect too much from a marriage, and her own first match, to Sir John Grey of Groby, heir to a solid Lancastrian barony, is exactly the kind of sensible, unremarkable arrangement she'd have chosen for herself.",
                "It is not a love match, particularly, but it is not an unkind one either. Two sons follow — Thomas, then Richard.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "widowed" }],
        },

        widowed: {
            text: () => [
                "Then the war that has been circling England for years finally reaches her own household directly. In 1461, at the second battle fought at St Albans, Sir John Grey dies for the Lancastrian cause he'd always quietly supported — on the losing side, as it turns out, now that a House of York king sits newly crowned in London.",
                "Elizabeth is twenty-four, widowed, with two small sons, and a mother-in-law who has decided that Elizabeth's dower lands — hers by the marriage settlement, hers by law — are not actually going to be handed over without a fight.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "fork" }],
        },

        fork: {
            text: () => "The dispute drags on, and every way forward from here costs something different. Does Elizabeth press her claim through the proper channels, however long that takes — or does she go around the courts entirely, and put her case directly in front of the new king himself?",
            choices: [
                {
                    label: "Press the claim through the courts — slow, proper, and the kind of fight a widow with no real friends at court tends to lose",
                    apply: s => { s.flags.pursuedCourts = true; },
                    next: "courts_1",
                },
                {
                    label: "Go around the courts — petition the king in person, whatever it costs to arrange",
                    apply: s => { s.flags.petitionedKing = true; },
                    next: "grafton",
                },
            ],
        },

        // ---- Branch A: the quiet life, unremembered ----
        courts_1: {
            text: () => [
                "The court moves at the court's own pace, and a widow with a disputed dower and no powerful patron waits years, not months. Elizabeth writes, petitions, waits, writes again.",
                "Eventually — not through any single dramatic victory, but through sheer refusal to go away — she recovers enough of what was hers to keep her sons fed and her household standing. It is not everything. It is enough.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "courts_2" }],
        },

        courts_2: {
            text: () => "A name has come forward for a second marriage — not a grand one, but a willing one, and the boys need a settled household more than they need a mother holding out for something better.",
            choices: [
                {
                    label: "Accept the match. A quiet, stable life is its own kind of victory.",
                    apply: s => { s.flags.quietRemarriage = true; },
                    next: "__HANDOFF__",
                },
                {
                    label: "Refuse. Raise the boys alone, on less, rather than answer to another husband.",
                    apply: s => { s.flags.raisedAlone = true; },
                    next: "__HANDOFF__",
                },
            ],
        },

        // ---- Branch B: the famous one ----
        grafton: {
            text: () => [
                "The young King Edward IV is out hunting near Grafton when Elizabeth puts herself — deliberately, by every account that survives — directly in his path, her two sons in tow, her petition in hand.",
                "He stops. He listens. By the second time he happens to be hunting in exactly that part of the forest, it is clear to everyone involved, including Elizabeth, that he has not stopped for the petition at all.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "courtship" }],
        },

        courtship: {
            text: () => [
                "Weeks of secret meetings follow. The Earl of Warwick, meanwhile, is deep in negotiations of his own — a French marriage, Bona of Savoy, meant to bind England to Burgundy's great rival — entirely unaware that the king he's brokering for has already made up his mind about something else.",
                "Edward proposes. In secret. To a widow, a commoner's daughter, a dead Lancastrian knight's wife — utterly unsuitable by every measure of state, and he does not appear to care in the slightest.",
            ].join("\n\n"),
            choices: [
                {
                    label: "Accept him. In secret. Whatever it costs later.",
                    apply: s => { s.flags.marriedEdward = true; },
                    next: "marriage",
                },
                {
                    label: "Refuse. Protect her name and her sons' modest security instead.",
                    apply: s => { s.flags.refusedEdward = true; },
                    next: "refused_ending",
                },
            ],
        },

        refused_ending: {
            text: () => [
                "Elizabeth says no. The king, to his own quiet surprise, does not press it — and settles her original petition in her favor as a kind of parting courtesy, as if embarrassed to have been refused by the one person in the realm with every reason to say yes.",
                "She never becomes queen. Her sons grow up untitled, comfortable, ordinary. No history book will ever write her name next to a crown — and whatever else that costs her, it is the one time in her life a king wanted something from her, and she was the one who said no.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        marriage: {
            text: () => "They are married in secret, at Grafton, with almost no one present. Edward tells no one — not his council, not his own mother, and certainly not Warwick, still laboring over a French match for a king who is already, quietly, someone's husband.",
            choices: [{ label: "Continue", next: "ascendancy" }],
        },

        ascendancy: {
            text: () => [
                "The marriage becomes known eventually — it has to — and once it does, the Woodvilles rise fast. Sisters married into the greatest houses in England. Elizabeth's father made an Earl. Her sons given rich wardships.",
                "Warwick, the Kingmaker, watches all of it happen to a family he regards as upstarts, and he is not a man who forgives being outpaced in his own king's court.",
            ].join("\n\n"),
            choices: [
                {
                    label: "Push the family's rise further still — every advantage, while it's there to take",
                    apply: s => { s.flags.pushedFamilyRise = true; },
                    next: "readeption",
                },
                {
                    label: "Deliberately restrain it — fewer matches, less provocation, less tinder for Warwick to strike",
                    apply: s => { s.flags.restrainedFamily = true; },
                    next: "readeption",
                },
            ],
        },

        readeption: {
            text: s => [
                s.flags.pushedFamilyRise
                    ? "It is not enough to stop what comes next. In 1470, Warwick finally defects outright — allied, astonishingly, with Margaret of Anjou herself, the old Lancastrian enemy, to restore Henry VI to the throne he was deposed from nine years before."
                    : "The restraint buys time, but not enough of it. In 1470, Warwick defects outright anyway — allied, astonishingly, with Margaret of Anjou herself, the old Lancastrian enemy, to restore Henry VI to the throne.",
                "Edward flees to Burgundy. Elizabeth, heavily pregnant, flees to sanctuary at Westminster Abbey with her daughters, and gives birth there — in sanctuary, under guard, on rations the Abbey can spare — to a son. The boy is christened Edward, after a father who is, for the moment, a king in exile and nothing else.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "restoration" }],
        },

        restoration: {
            text: () => "It does not last. Within the year Edward returns, wins at Barnet and Tewkesbury, and takes back a throne that was briefly, impossibly, not his. Elizabeth and her children come out of sanctuary into a London that is, once again, unquestionably theirs.",
            choices: [{ label: "Continue", next: "crisis_1483" }],
        },

        crisis_1483: {
            text: () => [
                "Twelve years of real peace follow — the longest, steadiest stretch of Elizabeth's life. Then, in April of 1483, Edward dies suddenly, at not quite forty-one, for reasons no one at court can fully agree on.",
                "Her son by him — the boy born in sanctuary — is twelve now, and already, within days, in the custody of his uncle, Richard of Gloucester, who has just had Elizabeth's brother and her son by her first marriage arrested on the road to London.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "sanctuary_choice" }],
        },

        sanctuary_choice: {
            text: () => "Everything Elizabeth has built for twenty years is suddenly, violently uncertain again. Does she flee — again — to the one place that has protected her before, or does she stand and fight Gloucester in the open, whatever that costs?",
            choices: [
                {
                    label: "Flee to sanctuary at Westminster Abbey with her younger children",
                    apply: s => { s.flags.fledSanctuary = true; },
                    next: "__HANDOFF__",
                },
                {
                    label: "Resist Gloucester's regency openly — rally what allies remain",
                    apply: s => { s.flags.resistedOpenly = true; },
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
                        gs.player.gold = Math.max(0, (gs.player.gold || 0) - 20);
                        gs.player.piety = (gs.player.piety || 0) + 10;
                        logEvent(`${player.name} takes her younger children into Westminster Abbey's sanctuary once again, powerless for now to stop whatever is already happening to the sons left outside it.`);
                    } else {
                        gs.player.prestige = (gs.player.prestige || 0) + 15;
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
