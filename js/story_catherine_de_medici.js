// story_catherine_de_medici.js — orphaned at a month old, married off at
// fourteen, humiliated for a decade for bearing no children, then, in
// her fifties, the real power in France for thirty years. Paced in
// short beats with a real choice on almost every page, ending at the
// single darkest choice of her life — the massacre that made her name
// a byword for ruthlessness — and handing off into the ongoing game
// right after it, Queen Mother in fact if not in name.

STORY_DECKS.catherine_de_medici = {
    startNodeId: "parents",
    startingStats: { gold: 40, prestige: 0, houseStanding: 55 },
    nodes: {

        parents: {
            text: () => "Catherine's parents never once laid eyes on her. Lorenzo de' Medici married the French noblewoman Madeleine de la Tour d'Auvergne in 1518 — a Papal alliance match. Madeleine died fifteen days after Catherine's birth; Lorenzo died three weeks after that. A month old, and already an orphan heiress with no one left to raise her.",
            choices: [
                {
                    label: "Grow up guarded and watchful — nothing about her own safety is ever assumed again",
                    apply: s => { s.flags.learnedDistrust = true; adjustStoryStat(s, "houseStanding", 3); },
                    next: "siege",
                },
                {
                    label: "Grow up composed above all — whatever she feels, no one gets to see it",
                    apply: s => { s.flags.learnedMasks = true; adjustStoryStat(s, "prestige", 3); },
                    next: "siege",
                },
            ],
        },

        // Not one choice in this scene is actually hers — the city
        // decides her fate, her uncle decides her marriage, both
        // without asking. What she controls is how she bears it.
        siege: {
            text: () => "Florence expels the Medici in 1527, when Catherine is eight, and keeps her as a hostage to the family's fortunes. During the siege that follows, a mob reportedly calls for her to be put on the city walls as a target. She is eleven, and no one asks her opinion on any of it.",
            choices: [
                {
                    label: "Beg the nuns sheltering her to intercede with the mob directly",
                    apply: s => { s.flags.appealedDirectly = true; adjustStoryStat(s, "prestige", -2); },
                    next: "marriage",
                },
                {
                    label: "Say nothing, show nothing, and wait for the Medici armies outside the walls",
                    apply: s => { s.flags.waitedItOut = true; adjustStoryStat(s, "prestige", 3); },
                    next: "marriage",
                },
                {
                    label: "Write secretly to her aunt, begging her to use whatever influence remains",
                    apply: s => { s.flags.appealedToAunt = true; adjustStoryStat(s, "houseStanding", 4); adjustStoryStat(s, "gold", -5); },
                    next: "marriage",
                },
            ],
        },

        marriage: {
            text: () => "The Medici retake Florence; her uncle, now Pope Clement VII, arranges the grandest match a banker's granddaughter could make — no one asks Catherine either. At fourteen, she marries Henri, Duke of Orléans, second son of the King of France. The French court never lets her forget she's merchant blood married into five centuries of crowns.",
            choices: [
                {
                    label: "Study the court obsessively — learn exactly who actually matters here",
                    apply: s => { s.flags.studiedCourt = true; adjustStoryStat(s, "houseStanding", 6); },
                    next: "barren_years",
                },
                {
                    label: "Keep to herself — let her dowry speak for her, since nothing else will",
                    apply: s => { adjustStoryStat(s, "gold", -10); },
                    next: "barren_years",
                },
            ],
        },

        barren_years: {
            text: () => "Ten years pass without a child. Henri keeps an open mistress, Diane de Poitiers, who runs his household outright. King Francis I himself is said to be weighing an annulment.",
            choices: [
                {
                    label: "Endure it quietly — make herself useful and watchful, and wait",
                    apply: s => { s.flags.enduredDiane = true; adjustStoryStat(s, "houseStanding", 5); },
                    next: "fertility",
                },
                {
                    label: "Confront Henri directly — demand her position secured, whatever the risk",
                    apply: s => { s.flags.confrontedDiane = true; },
                    next: "confront_outcome",
                },
            ],
        },

        confront_outcome: {
            text: () => "It is the kind of gamble that could go either way with a husband who has never had to choose between the two women in his life.",
            choices: [
                {
                    label: "Say it plainly, in front of his own council, and force the issue",
                    apply: s => { s.flags.confrontBackfired = Math.random() < 0.5; },
                    next: "confront_result",
                },
            ],
        },

        confront_result: {
            text: s => s.flags.confrontBackfired
                ? "It backfires badly. Humiliated in front of his own court, Henri backs Diane more openly than ever, and the annulment talk only gathers weight."
                : "Astonishingly, it works. Unsettled by his wife's bluntness, Henri quietly tells his father the annulment talk is to stop.",
            choices: [{ label: "Continue", next: s => s.flags.confrontBackfired ? "set_aside_ending" : "fertility" }],
        },

        set_aside_ending: {
            text: () => "The annulment proceeds within the year. Catherine returns to Florence, her dowry refunded, her marriage dissolved — no queen, no regency, no massacre for history to remember her by. Just a Medici again, for the rest of a long, quiet, well-funded life.",
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        fertility: {
            text: () => "Then, by medicine, prayer, or simple chance, children finally come — ten of them. The annulment talk evaporates. Henri becomes King in 1547; Catherine is Queen of France, though Diane remains openly dominant at court regardless.",
            choices: [
                {
                    label: "Make peace with Diane's place at court — a war not worth fighting anymore",
                    apply: s => { adjustStoryStat(s, "houseStanding", 4); },
                    next: "widowhood",
                },
                {
                    label: "Keep a private, exact ledger of every slight — settled later, not forgotten",
                    apply: s => { s.flags.keptLedger = true; adjustStoryStat(s, "prestige", 5); },
                    next: "widowhood",
                },
            ],
        },

        widowhood: {
            text: () => "In 1559 a jousting splinter kills Henri. Her eldest son is dead within the year too. Her second son, Charles, becomes king at ten — and France needs a regent. For the first time in her life, at forty, real power is actually hers to wield.",
            choices: [
                {
                    label: "A careful, exhausting balance — favor neither Catholic nor Huguenot fully",
                    apply: s => { s.flags.balancedRegency = true; adjustStoryStat(s, "houseStanding", 6); },
                    next: "wars_of_religion",
                },
                {
                    label: "Back the Catholic hardliners outright — crush the Huguenots while she has the army",
                    apply: s => { s.flags.hardlineRegency = true; adjustStoryStat(s, "prestige", 8); adjustStoryStat(s, "houseStanding", -4); },
                    next: "wars_of_religion",
                },
            ],
        },

        wars_of_religion: {
            text: s => s.flags.hardlineRegency
                ? "It doesn't work the way the hardliners promised — brutal civil war grinds on for a decade regardless."
                : "It doesn't hold the way she needs — brutal civil war grinds on for a decade anyway, every fragile peace broken again.",
            choices: [
                {
                    label: "Keep brokering terms with exhausted patience, peace after broken peace",
                    next: "bartholomew",
                },
                {
                    label: "Start quietly identifying who, if it ever came to it, would have to be removed",
                    apply: s => { s.flags.plannedAhead = true; },
                    next: "bartholomew",
                },
            ],
        },

        bartholomew: {
            text: () => "August 1572: the Huguenot military leadership, Admiral Coligny included, is gathered in Paris for a royal wedding meant to seal a fragile peace. A botched attempt on Coligny's life leaves the city braced for retaliation it's certain is coming — and Catherine almost no time to decide anything.",
            choices: [
                {
                    label: "Order the strike first — the whole Huguenot leadership, while they're in one city",
                    apply: s => { s.flags.orderedMassacre = true; adjustStoryStat(s, "prestige", -15); },
                    next: "massacre_ordered",
                },
                {
                    label: "Refuse. Warn Coligny's camp and let the moment pass without striking.",
                    apply: s => { s.flags.preventedMassacre = true; adjustStoryStat(s, "houseStanding", -8); },
                    next: "massacre_prevented",
                },
            ],
        },

        massacre_ordered: {
            text: () => "Coligny is killed before dawn. What was meant to be a contained strike spirals within hours into a city-wide massacre — thousands dead in Paris alone over three days, thousands more elsewhere in France in the weeks after. The Huguenot leadership is shattered for a generation; Catherine's own name is now bound to it forever.",
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        massacre_prevented: {
            text: () => "Coligny gets out of Paris in time. There is no massacre — and no decisive break in the war either. It grinds on inconclusively for years, and the hardliners at her own court never forgive her for the strike she didn't make when she had him.",
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },
    },

    handoff(storyState) {
        handoffCatherineDeMedici(storyState);
    },
};

function handoffCatherineDeMedici(storyState) {
    const flags = storyState.flags;
    const setAside = !!flags.confrontBackfired;
    if (setAside) {
        handoffToRealGame({
            figureKey: "catherine_de_medici", realmKey: "florence", name: "Catherine de' Medici",
            gender: "F", age: 24, tier: 3, traits: ["Shrewd", "Patient"], year: 1543,
            resumeHook(gs) {
                logEvent(`${gs.player.name} returns to Florence, a Medici again and nothing else — her marriage dissolved, her dowry returned, and no French throne, no regency, no massacre for history to ever hold against her.`);
            },
        });
        return;
    }
    handoffToRealGame({
        figureKey: "catherine_de_medici", realmKey: "france", name: "Catherine de' Medici",
        gender: "F", age: 53, tier: 4, traits: ["Shrewd", "Patient"], year: 1572,
        resumeHook(gs) {
            const player = gs.player;
            const henri = createCharacter({ realmKey: "france", tier: 5, gender: "M", age: 42, name: "Henri II" });
            henri.traits = ["Gallant", "Ambitious"];
            henri.alive = false;
            henri.spouseId = player.id;
            registerPerson(gs, henri);
            player.spouseId = henri.id;

            const charlesIX = createCharacter({ realmKey: "france", tier: 5, gender: "M", age: 22, name: "Charles IX" });
            charlesIX.motherId = player.id; charlesIX.fatherId = henri.id; charlesIX.royalHouseKey = "france";
            registerPerson(gs, charlesIX);
            const henriDuAnjou = createCharacter({ realmKey: "france", tier: 4, gender: "M", age: 21, name: "Henri, Duke of Anjou" });
            henriDuAnjou.motherId = player.id; henriDuAnjou.fatherId = henri.id; henriDuAnjou.royalHouseKey = "france";
            registerPerson(gs, henriDuAnjou);
            const margueriteDeValois = createCharacter({ realmKey: "france", tier: 4, gender: "F", age: 19, name: "Marguerite de Valois" });
            margueriteDeValois.motherId = player.id; margueriteDeValois.fatherId = henri.id; margueriteDeValois.royalHouseKey = "france";
            registerPerson(gs, margueriteDeValois);

            // Catherine rules in fact, not in name — the crown itself is
            // her son's, tracked the same way any other realm's own
            // ruler is, so royalRelationTitle (dynasty.js) reads her
            // correctly as Queen Mother rather than as the reigning
            // monarch herself.
            gs.homeRulerId = charlesIX.id;
            growDomainAndVassalsForTier(gs, player.tier);

            if (flags.orderedMassacre) {
                player.prestige = Math.max(0, (player.prestige || 0) - 20);
                player.piety = Math.max(0, (player.piety || 0) - 15);
                gs.crownAuthority = gs.crownAuthority || {};
                gs.crownAuthority.france = (gs.crownAuthority.france || 0) + 20;
                logEvent(`${player.name}'s name is now bound forever to the massacre in Paris — the crown secure for a generation, and her own reputation ruined for just as long.`);
            } else {
                player.piety = (player.piety || 0) + 10;
                gs.rivalStability = gs.rivalStability || {};
                gs.rivalStability.france = (gs.rivalStability.france || 0) - 10;
                logEvent(`${player.name} is not remembered for a massacre she didn't order — and France's civil war, unresolved, is still hers to somehow hold together.`);
            }
            logEvent(`${player.name}'s story, from an orphaned month-old heiress to the power behind three sons' thrones, continues now as the ordinary business of a life still being lived.`);
        },
    });
}
