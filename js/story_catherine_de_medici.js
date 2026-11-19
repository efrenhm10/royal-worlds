// story_catherine_de_medici.js — orphaned at a month old, married off at
// fourteen into the oldest royal house in Europe, humiliated for a
// decade for bearing no children, and then, in her fifties, the real
// power in France for the better part of thirty years. Her story runs
// all the way to the single darkest choice of her life — the massacre
// that made her name a byword for ruthlessness for the rest of history
// — and hands off into the ongoing game right after it, Queen Mother in
// fact if not in name, with whatever years are left to her still to live.

STORY_DECKS.catherine_de_medici = {
    startNodeId: "parents",
    nodes: {

        parents: {
            text: () => [
                "Catherine de' Medici's parents never once laid eyes on her.",
                "Lorenzo de' Medici, Duke of Urbino, married Madeleine de la Tour d'Auvergne, a French noblewoman of ancient blood, in 1518 — a match arranged by Lorenzo's cousin, Pope Leo X, to bind the Medici's new money to one of the oldest names in France. Madeleine died of a fever just fifteen days after giving birth to their only child, in Florence, in April of 1519. Lorenzo himself died three weeks after that, almost certainly of syphilis, leaving a month-old daughter heir to a title and a fortune and nothing resembling a family to raise her.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "childhood" }],
        },

        childhood: {
            text: () => [
                "Catherine was raised first by her grandmother, then by an aunt, in a Florence that loved and feared the Medici name in roughly equal measure. In 1527, when she was eight, the city expelled the family outright, and the new republican government kept her — a Medici heiress, a hostage to the family's own fortunes — moved between convents for her own uneasy protection.",
                "During the siege that followed, as Imperial and Papal armies closed in to restore Medici rule, a mob reportedly called for her to be put out on the city walls as a target, or worse, handed to the soldiers outright. She was eleven. The Medici retook Florence in 1530 anyway, and her formidable uncle — by then Pope Clement VII — took personal charge of arranging what came next for her.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "lesson" }],
        },

        lesson: {
            text: () => "A child who survives a mob calling for her death learns something from it that never quite leaves her. What does Catherine take from those years?",
            choices: [
                {
                    label: "That the right face, offered calmly enough, is armor even when everyone else is deciding her fate for her",
                    apply: s => { s.flags.learnedMasks = true; },
                    next: "marriage",
                },
                {
                    label: "That trusting the wrong protector, even for a moment, is the only danger that actually matters",
                    apply: s => { s.flags.learnedDistrust = true; },
                    next: "marriage",
                },
            ],
        },

        marriage: {
            text: () => [
                "In 1533, at fourteen, Catherine is married at Marseille to Henri, Duke of Orléans — second son of King Francis I of France. Her uncle the Pope arranges it as the grandest alliance a banking family's granddaughter could possibly make: the oldest royal house in Europe, in exchange for a dowry vast enough that no one at the French court can quite bring themselves to say no to it, whatever they privately think of her blood.",
                "They never let her forget the mismatch anyway. A Medici, however rich, is still a merchant's granddaughter to men whose own families have worn crowns for five hundred years.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "barren_years" }],
        },

        barren_years: {
            text: () => [
                "Ten years pass without a child. Henri keeps an open, acknowledged mistress, Diane de Poitiers, a widow nearly twenty years his senior who runs his household and, increasingly, his affections — while Catherine's own position at court grows more precarious with every childless year. King Francis I himself reportedly begins to consider having the marriage annulled.",
                "Everyone at court has an opinion about what a queen who cannot give the realm an heir is actually worth.",
            ].join("\n\n"),
            choices: [
                {
                    label: "Endure it. Make herself quietly useful and watchful rather than beloved, and wait.",
                    apply: s => { s.flags.enduredDiane = true; },
                    next: "fertility",
                },
                {
                    label: "Confront Henri directly — demand her position be secured on its own terms, whatever the risk.",
                    apply: s => { s.flags.confrontedDiane = true; },
                    next: "confront_outcome",
                },
            ],
        },

        confront_outcome: {
            text: () => "It is the kind of gamble that could go either way with a husband who has never once had to choose between the two women in his life.",
            choices: [
                {
                    label: "Continue",
                    apply: s => { s.flags.confrontBackfired = Math.random() < 0.5; },
                    next: "confront_result",
                },
            ],
        },

        confront_result: {
            text: s => s.flags.confrontBackfired
                ? "It backfires badly. Henri, embarrassed in front of his own court, backs Diane more openly than before, and the annulment talk Catherine was trying to head off only gathers real weight instead."
                : "Astonishingly, it works. Henri — not a subtle man, but not an entirely heartless one either — is unsettled enough by his wife's bluntness that he quietly tells his father the annulment talk is to stop. Diane remains, but Catherine's own place is no longer quite so easily questioned.",
            choices: [{ label: "Continue", next: s => s.flags.confrontBackfired ? "set_aside_ending" : "fertility" }],
        },

        set_aside_ending: {
            text: () => [
                "The annulment proceeds within the year. Catherine is sent back to Florence with her dowry returned and her marriage dissolved — no queen, no regency, no massacre for history to remember her by. A Medici again, and nothing else, for the rest of a long, quiet, well-funded life.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        fertility: {
            text: () => [
                "Then, whether by a physician's intervention, by prayer, or by simple chance — the sources disagree and always will — children finally come. Ten of them, over the following twelve years, most of whom survive infancy. The annulment talk evaporates entirely. Catherine, whatever else she is at the French court, is no longer merely a disappointment.",
                "Henri becomes King Henri II in 1547, on his own father's death. Catherine is Queen of France — though Diane de Poitiers, now the Duchess of Valentinois, remains openly, infuriatingly dominant at court regardless.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "widowhood" }],
        },

        widowhood: {
            text: () => [
                "In 1559, Henri is struck in the eye by a splintered lance during a tournament celebrating two royal marriages, and dies of the wound ten agonizing days later. Catherine's eldest son becomes King Francis II at fifteen — and is dead himself within a year and a half, of an ear infection that spreads to his brain.",
                "Her second son, Charles, becomes king at ten years old. France needs a regent, and for the first time in her life, at forty, the power is Catherine's own to actually wield, not merely to watch other people wield around her.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "regency" }],
        },

        regency: {
            text: () => "A country already splitting between Catholics and the growing Huguenot movement is now hers to govern through a child king. How does she rule?",
            choices: [
                {
                    label: "A careful, exhausting balance — favor neither side fully, broker peace after fragile peace",
                    apply: s => { s.flags.balancedRegency = true; },
                    next: "wars_of_religion",
                },
                {
                    label: "Back the Catholic hardliners decisively — crush the Huguenots while the crown still has the army to do it",
                    apply: s => { s.flags.hardlineRegency = true; },
                    next: "wars_of_religion",
                },
            ],
        },

        wars_of_religion: {
            text: s => s.flags.hardlineRegency
                ? "It doesn't work the way the hardliners promised it would. A decade of brutal, grinding civil war follows regardless — massacres and counter-massacres, a kingdom that cannot agree with itself about anything, least of all religion."
                : "It doesn't hold the way she needs it to. A decade of brutal, grinding civil war follows anyway — massacres and counter-massacres, every fragile peace she brokers lasting just long enough to be broken again.",
            choices: [{ label: "Continue", next: "bartholomew" }],
        },

        bartholomew: {
            text: () => [
                "By August 1572, the Huguenot military leadership — including Admiral Coligny, the Protestant cause's most capable commander — is gathered in Paris itself, for a royal wedding meant to seal yet another fragile peace. An assassination attempt on Coligny fails, badly, and leaves the Huguenot leadership furious and the city's Catholic population braced for retaliation they're certain is coming.",
                "Catherine has, for perhaps the only time in thirteen years of careful balancing, a single clear choice in front of her — and almost no time at all to make it.",
            ].join("\n\n"),
            choices: [
                {
                    label: "Order the strike first — the Huguenot leadership, all of it, while they're gathered in one city and can't escape",
                    apply: s => { s.flags.orderedMassacre = true; },
                    next: "massacre_ordered",
                },
                {
                    label: "Refuse. Warn Coligny's camp, and let the moment — whatever it costs later — pass without striking",
                    apply: s => { s.flags.preventedMassacre = true; },
                    next: "massacre_prevented",
                },
            ],
        },

        massacre_ordered: {
            text: () => [
                "The order goes out. Coligny is killed in his own bed before dawn. What was meant to be a contained strike against perhaps a few dozen Huguenot leaders spirals within hours into a city-wide massacre — Catholic mobs killing Protestants in the streets of Paris for three straight days, the violence spreading to other French cities over the following weeks. The final death toll will never be agreed on; the lowest serious estimates still run past two thousand in Paris alone, with thousands more dead elsewhere in France.",
                "The Huguenot military leadership is shattered for a generation. The crown's immediate security is, by the only measure that mattered to Catherine in that hour, secured. Her own name is now permanently, inseparably bound to one of the worst massacres in European history — a verdict no explanation she ever offers afterward will unmake.",
            ].join("\n\n"),
            choices: [{ label: "Continue", next: "__HANDOFF__" }],
        },

        massacre_prevented: {
            text: () => [
                "Coligny is warned in time and gets out of Paris with most of his retinue intact. There is no massacre — but there is also no shattered Huguenot leadership, no decisive moment that breaks the civil war's back. The fighting grinds on, inconclusive, for years yet to come, and the hardliners at Catherine's own court never fully forgive her for the strike she didn't make when she had Coligny in her hand.",
                "History will not call her a monster for this. It will, just as surely, never call the Wars of Religion over because of it either.",
            ].join("\n\n"),
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
