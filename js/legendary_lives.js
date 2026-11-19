// legendary_lives.js — "Legendary Lives": start the game as a real,
// named historical figure at a real moment in their actual life, inside
// the same 1461 world already built, and live through their real,
// documented turning points — follow history, or take your own path at
// each one. Everything underneath (family, marriage, succession,
// vassals, war) is the exact machinery any ordinary start already uses;
// the only things this file adds are WHICH character you begin as, and
// a short, hand-written list of the real decisions that actually
// shaped their life, fired at their real year instead of drawn from the
// general random decision pool.

// A scripted beat is a DECISION_EVENTS-shaped object (so resolveDecision's
// existing by-id lookup finds it and logs its result the same way as any
// other decision) plus a `year` and an optional `onTrigger`/`prereq`.
// `condition`/`chance` are never read for these — tickLegendaryBiography
// (below) is what actually fires them, deterministically, at their own
// real year, not a dice roll.

function marryHistoricalSpouse(gameState, spouseData) {
    const player = gameState.player;
    const spouse = createCharacter({
        realmKey: spouseData.realmKey, tier: spouseData.tier,
        gender: spouseData.gender, age: spouseData.age, name: spouseData.name,
    });
    if (spouseData.traits) spouse.traits = spouseData.traits.slice();
    spouse.bloodline = false;
    spouse.sourceRealmKey = spouseData.realmKey;
    spouse.royalHouseKey = spouseData.realmKey;
    spouse.spouseId = player.id;
    registerPerson(gameState, spouse);
    player.spouseId = spouse.id;

    if (spouseData.realmKey === gameState.realmKey) {
        // Marrying within your own home realm covers two very different
        // cases: the player marrying UP into a crown they didn't
        // already hold (homeRulerId should become the new spouse), or a
        // reigning player simply taking a spouse (homeRulerId should
        // stay exactly as it was — marrying a commoner doesn't demote a
        // king).
        if (gameState.homeRulerId !== player.id) {
            gameState.homeRulerId = spouse.id;
        }
    } else {
        // Marrying a foreign ruler or heir — the same path any ordinary
        // marriage into a ruling house takes (relocatePlayerIfNeeded
        // decides for itself whether this actually moves the player out
        // of their own realm, based on relative station).
        gameState.foreignRoyals = gameState.foreignRoyals || {};
        gameState.foreignRoyals[spouseData.realmKey] = spouse.id;
        relocatePlayerIfNeeded(gameState, spouse);
    }
    return spouse;
}

const LEGENDARY_FIGURES = {
    louis_xi: {
        key: "louis_xi", name: "Louis XI", realmKey: "france", gender: "M", age: 38,
        startType: "ruler", birthYear: 1423, traits: ["Shrewd", "Paranoid"],
        blurb: "The \"Universal Spider\" — three years into a reign already defined by patient, ruthless maneuvering against the greatest vassals in France.",
        beats: [
            {
                id: "louis_xi_conflans", year: 1465,
                title: "The League of the Public Weal",
                text: gameState => `Burgundy, Brittany, and your own treacherous brother have raised the realm's greatest lords against you, in the name of "the public weal" — really, against the centralizing hand that keeps closing on their privileges. The battle at Montlhéry settled nothing. Now it's a question of what you're willing to give back to end it.`,
                options: [
                    {
                        label: "Follow history: buy them off at Conflans and Saint-Maur",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 40);
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) + 8;
                            gameState.rivalStability.brittany = (gameState.rivalStability.brittany || 0) + 6;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 4));
                            return `${p.name} buys peace with towns on the Somme and Normandy handed to his own brother — humiliating, but the league disbands, and the crown lives to centralize another day (-40 gold; Burgundy and Brittany emboldened; your own vassals relieved the war is over).`;
                        },
                    },
                    {
                        label: "Your own path: refuse every demand and fight on",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 15;
                            getVassals(gameState).forEach(v => { if (Math.random() < 0.4) adjustOpinion(v, -6); });
                            if (Math.random() < 0.5) {
                                p.gold = Math.max(0, (p.gold || 0) - 80);
                                return `${p.name} refuses to be bled by his own vassals — the league grinds on through another costly season before finally breaking apart under its own contradictions (-80 gold, +15 prestige; several vassals uneasy at the cost of your stubbornness).`;
                            }
                            return `${p.name} holds the line, and — against the odds — the league's own lords start quarreling faster than they can press the siege. It breaks apart by autumn with no lands surrendered (+15 prestige; a few vassals uneasy at the risk you took).`;
                        },
                    },
                ],
            },
            {
                id: "louis_xi_peronne", year: 1468,
                title: "The Trap at Péronne",
                text: gameState => `Charles the Bold has invited you to Péronne to settle matters in person — a fool's errand by half the court's reckoning, since you yourself quietly set Liège's townsmen stirring against him not three months ago, and he surely suspects it.`,
                options: [
                    {
                        label: "Follow history: go to Péronne anyway",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = Math.max(0, (p.prestige || 0) - 20);
                            p.gold = Math.max(0, (p.gold || 0) - 30);
                            p.piety = (p.piety || 0) + 5;
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) + 10;
                            return `Liège revolts on schedule, and Charles — certain you orchestrated it under his own roof — holds you under guard for days, until you swear to brutal new terms and ride with his own army as it burns Liège down to make the point stick (-20 prestige, -30 gold, +5 piety in penance; Burgundy's terms hold, for now).`;
                        },
                    },
                    {
                        label: "Your own path: refuse the invitation outright",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 8;
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) - 15;
                            return `No king humiliated under guard — but no settlement either. Liège still burns, on your own orders, and France and Burgundy drift that much closer to open war without ever actually negotiating anything (+8 prestige; Burgundy's hostility deepens).`;
                        },
                    },
                ],
            },
            {
                id: "louis_xi_burgundy_inheritance", year: 1477,
                title: "Burgundy's Inheritance",
                text: gameState => `Charles the Bold is dead at Nancy, reckless to the end, and left no son — only Mary, twenty years old, suddenly the richest, most contested heiress in Europe. Her own lands lie open, and your armies are already closer to them than anyone else's.`,
                options: [
                    {
                        label: "Follow history: seize what you can while she's vulnerable",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 100;
                            p.prestige = (p.prestige || 0) + 20;
                            gameState.burgundySuccessionResolved = "france";
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) - 20;
                            return `Artois and Picardy fall to French arms within the year, and Mary's own defenders, with no one left to rally them, barely slow the advance — Burgundy as an independent power is finished (+100 gold, +20 prestige).`;
                        },
                    },
                    {
                        label: "Your own path: recognize Mary's own right to rule, and offer alliance instead",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 10;
                            gameState.burgundySuccessionResolved = "mary";
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) + 15;
                            return `You offer the Dauphin's hand instead of an army — a rarer thing from the Spider than a web. Mary holds Burgundy in her own right, and France's restraint is not forgotten in Bruges or Ghent (+10 prestige; Burgundy's trust in France, unexpectedly, grows).`;
                        },
                    },
                ],
            },
        ],
    },

    edward_iv: {
        key: "edward_iv", name: "Edward IV", realmKey: "england", gender: "M", age: 19,
        startType: "ruler", birthYear: 1442, traits: ["Gallant", "Ambitious"],
        blurb: "Nineteen years old and newly crowned after a bloody civil war — young, popular, and about to make a marriage that will cost him everything he's just won.",
        beats: [
            {
                id: "edward_iv_woodville_marriage", year: 1464,
                title: "A Secret Marriage",
                text: gameState => `Warwick has spent months quietly arranging a French match — Bona of Savoy — to bind England to Burgundy's rival. You've fallen for Elizabeth Woodville instead: a commoner-born widow, a Lancastrian knight's daughter, utterly unsuitable by every measure of state. Warwick doesn't know yet. He will.`,
                options: [
                    {
                        label: "Follow history: marry Elizabeth Woodville in secret",
                        apply(gameState) {
                            const p = gameState.player;
                            marryHistoricalSpouse(gameState, { realmKey: "england", name: "Elizabeth Woodville", gender: "F", age: 27, tier: 1, traits: ["Ambitious"] });
                            gameState.edwardMarriedWoodville = true;
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            getVassals(gameState).forEach(v => { if (Math.random() < 0.5) adjustOpinion(v, -5); });
                            return `${p.name} marries for love, not alliance — a scandal the court will spend years paying for, and Warwick, when he learns of it, never quite forgives (-10 prestige; several great lords uneasy at a commoner's rise).`;
                        },
                    },
                    {
                        label: "Your own path: heed Warwick, and marry Bona of Savoy",
                        apply(gameState) {
                            const p = gameState.player;
                            marryHistoricalSpouse(gameState, { realmKey: "england", name: "Bona of Savoy", gender: "F", age: 20, tier: 4, traits: ["Cautious"] });
                            gameState.edwardMarriedWoodville = false;
                            p.prestige = (p.prestige || 0) + 5;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 8));
                            return `${p.name} takes the match of state instead of the one of the heart — Warwick's own standing, and France's goodwill, are secured by it (+5 prestige; the realm's great lords, Warwick above all, firmly behind you).`;
                        },
                    },
                ],
            },
            {
                id: "edward_iv_warwick_betrayal", year: 1470,
                title: "Warwick's Betrayal",
                text: gameState => `Warwick — the Kingmaker, the man who helped put you on this throne — has defected entirely, allied now with Margaret of Anjou herself, the old enemy, to restore Henry VI. His army is already moving, and yours is not ready to meet it.`,
                options: [
                    {
                        label: "Follow history: flee to Burgundy and regroup",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 30);
                            gameState.edwardFledIn1470 = true;
                            return `${p.name} slips across the Channel to Burgundian shelter rather than fight at a ruinous disadvantage — humbling, but alive, and already plotting a return (-30 gold).`;
                        },
                    },
                    {
                        label: "Your own path: stand and fight now, outnumbered",
                        apply(gameState) {
                            const p = gameState.player;
                            if (Math.random() < 0.35) {
                                p.health = Math.max(5, p.health - randInt(25, 40));
                                return `${p.name} refuses to run — and nearly dies for it. The field is lost, the body carried off half-conscious, and the crown with it, for now (health badly shaken).`;
                            }
                            p.prestige = (p.prestige || 0) + 25;
                            return `Against every sane calculation, ${p.name}'s smaller force holds and breaks Warwick's vanguard outright — no exile needed, no Readeption, the crown never actually slips (+25 prestige).`;
                        },
                    },
                ],
            },
            {
                id: "edward_iv_after_tewkesbury", year: 1471,
                title: "After Tewkesbury",
                text: gameState => `Your enemies are broken at last — Warwick dead at Barnet, the Lancastrian cause shattered at Tewkesbury. Margaret of Anjou's only son is a prisoner. Henry VI himself sits powerless in the Tower. The only question left is how far you go to make sure this is really over.`,
                options: [
                    {
                        label: "Follow history: have the Lancastrian line ended outright",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 10;
                            p.piety = Math.max(0, (p.piety || 0) - 10);
                            getVassals(gameState).forEach(v => { if (Math.random() < 0.3) adjustOpinion(v, -3); });
                            return `Edward of Westminster does not survive the battle's aftermath, and Henry VI does not survive the Tower much past it — brutal, and final. No rival royal blood is left to rally around (+10 prestige, -10 piety).`;
                        },
                    },
                    {
                        label: "Your own path: spare them, and imprison them instead",
                        apply(gameState) {
                            const p = gameState.player;
                            p.piety = (p.piety || 0) + 10;
                            p.prestige = (p.prestige || 0) + 5;
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.england = (gameState.rivalStability.england || 0) - 5;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 4));
                            return `Mercy, for once, from the house of York — Henry and the young prince live out their days under lock and guard. Praised for it at court, though a King's conscience is rarely the same thing as a King's security (+10 piety, +5 prestige; a quiet, lingering Lancastrian hope left alive somewhere).`;
                        },
                    },
                ],
            },
            {
                id: "edward_iv_appetites", year: 1478,
                title: "A King's Appetites",
                text: gameState => `The crisis is over, the court is yours, and Yorkist London has never seen such splendor — or such excess.`,
                options: [
                    {
                        label: "Follow history: indulge fully",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 20);
                            p.prestige = (p.prestige || 0) + 15;
                            p.health = Math.max(10, p.health - 8);
                            return `Feasts, hunts, mistresses, a court more splendid than Burgundy's own — ${p.name}'s reputation for magnificence is set for good (-20 gold, +15 prestige, health beginning to show the cost).`;
                        },
                    },
                    {
                        label: "Your own path: keep a disciplined, martial household",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 20;
                            p.prestige = (p.prestige || 0) + 5;
                            p.health = Math.min(100, p.health + 10);
                            return `${p.name} keeps to the saddle and the training yard rather than the banquet hall — less dazzling, but the gold stays in the treasury and the body stays sound (+20 gold, +5 prestige, +10 health).`;
                        },
                    },
                ],
            },
        ],
    },

    charles_the_bold: {
        key: "charles_the_bold", name: "Charles the Bold", realmKey: "burgundy", gender: "M", age: 28,
        startType: "child", tierOverride: 3, birthYear: 1433, traits: ["Wrathful", "Ambitious"],
        blurb: "Heir to the richest state in Europe, impatient to rule it his own way — ambition that will carry Burgundy to its height, then over the edge entirely.",
        scriptedDeaths: [
            { id: "philip_the_good_dies", year: 1467, find: gameState => getPerson(gameState, gameState.homeRulerId) },
        ],
        beats: [
            {
                id: "charles_the_bold_liege", year: 1468,
                title: "The Siege of Liège",
                text: gameState => `Liège has risen again — incited, you're fairly sure, by Louis XI's gold, though proving it changes nothing. You have an army outside its walls, and a free hand in what happens when it falls.`,
                options: [
                    {
                        label: "Follow history: sack the city as an example",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 40;
                            p.prestige = (p.prestige || 0) + 25;
                            p.piety = Math.max(0, (p.piety || 0) - 15);
                            getVassals(gameState).forEach(v => adjustOpinion(v, 3));
                            return `Liège burns, thoroughly and deliberately — no rebellious town in the Burgundian lands will forget it soon (+40 gold, +25 prestige, -15 piety; your own nobles note the iron with something like admiration).`;
                        },
                    },
                    {
                        label: "Your own path: punish the ringleaders, spare the city",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 10;
                            p.piety = (p.piety || 0) + 10;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 6));
                            return `The ringleaders hang; the city itself stands. A harder thing to manage than a massacre, and it earns you a reputation as a hard but just lord rather than merely a terrifying one (+10 prestige, +10 piety; your own court's loyalty firmer for it).`;
                        },
                    },
                ],
            },
            {
                id: "charles_the_bold_neuss", year: 1475,
                title: "The March on Neuss",
                text: gameState => `A year outside the walls of Neuss — a town hardly worth what it's already cost — and still it hasn't fallen. Every advisor you have is quietly begging you to withdraw before the whole campaign bleeds Burgundy dry for nothing.`,
                options: [
                    {
                        label: "Follow history: press the siege regardless",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 80);
                            getVassals(gameState).forEach(v => adjustOpinion(v, -8));
                            p.prestige = (p.prestige || 0) + 5;
                            return `You will not be the one who backs down from a town, whatever it costs — and it costs a great deal, for little beyond the point itself (-80 gold; the Burgundian nobility exhausted and increasingly resentful, +5 prestige in stubborn pride alone).`;
                        },
                    },
                    {
                        label: "Your own path: cut losses and withdraw",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 30;
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            getVassals(gameState).forEach(v => adjustOpinion(v, 10));
                            return `The siege is lifted, the army brought home intact — a rare admission, for you, that a thing isn't worth finishing (+30 gold saved, -10 prestige; real relief among the lords who have to pay for your wars).`;
                        },
                    },
                ],
            },
            {
                id: "charles_the_bold_nancy", year: 1476,
                title: "One Battle Too Many",
                text: gameState => `Lorraine and the Swiss cantons have humiliated you twice already this year — Grandson, then Morat, your army broken both times. Every advisor begs you to winter properly and rebuild in the spring. You are already making for Nancy instead.`,
                options: [
                    {
                        label: "Follow history: march on Nancy now, in deep winter",
                        apply(gameState) {
                            const p = gameState.player;
                            if (Math.random() < 0.45) {
                                p.alive = false;
                                return `${p.name} is cut down in the rout outside Nancy, his body found days later half-frozen in a ditch, stripped by looters who didn't even recognize whose it was. The Burgundian state he spent his life building ends in the snow with him.`;
                            }
                            p.health = Math.max(10, p.health - 20);
                            return `${p.name} survives Nancy by inches — the army broken a third time, but alive, however diminished, to try to rebuild what's left (health badly shaken).`;
                        },
                    },
                    {
                        label: "Your own path: heed your advisors, and winter the army first",
                        apply(gameState) {
                            const p = gameState.player;
                            p.health = Math.min(100, p.health + 10);
                            p.gold = Math.max(0, (p.gold || 0) - 30);
                            p.prestige = Math.max(0, (p.prestige || 0) - 15);
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.burgundy = (gameState.rivalStability.burgundy || 0) - 10;
                            return `${p.name} swallows the pride of it and waits — alive and rebuilding, but Lorraine's lords use the delay to consolidate against you, and the court whispers, for the first time, that the Bold is faltering (-30 gold, -15 prestige, +10 health).`;
                        },
                    },
                ],
            },
        ],
    },

    isabella_i: {
        key: "isabella_i", name: "Isabella of Castile", realmKey: "castile", gender: "F", age: 10,
        startType: "sibling", tierOverride: 4, birthYear: 1451, traits: ["Pious", "Shrewd"],
        blurb: "A ten-year-old half-sister to a king many call unfit to rule — and, though she doesn't know it yet, the eventual architect of a unified Spain.",
        beats: [
            {
                id: "isabella_guisando", year: 1468,
                title: "The Treaty of Guisando",
                text: gameState => `Your half-brother Henry IV, worn down by years of civil war with his own rebellious nobility, is ready to name you heir over his own daughter Juana — whose paternity half the court openly doubts. It would make you Princess of Asturias. It would also, for the first time, make you a real target.`,
                options: [
                    {
                        label: "Follow history: accept being named heir",
                        apply(gameState) {
                            const p = gameState.player;
                            p.tier = Math.max(p.tier, 4);
                            p.prestige = (p.prestige || 0) + 15;
                            gameState.isabellaNamedHeir = true;
                            return `${p.name} accepts the treaty — Princess of Asturias now, in open rivalry with a niece whose own claim won't quietly disappear (+15 prestige; a real, immediate target on your back).`;
                        },
                    },
                    {
                        label: "Your own path: decline, and urge Henry to recognize Juana instead",
                        apply(gameState) {
                            const p = gameState.player;
                            p.health = Math.min(100, p.health + 5);
                            p.prestige = Math.max(0, (p.prestige || 0) - 5);
                            gameState.isabellaNamedHeir = false;
                            return `${p.name} steps back from the fight entirely — fewer sleepless nights, and no crown waiting at the end of it either (-5 prestige, +5 health; a quieter life than history remembers you for).`;
                        },
                    },
                ],
            },
            {
                id: "isabella_ferdinand_marriage", year: 1469,
                title: "A Secret Marriage",
                text: gameState => `Henry IV wants you married off to serve his own alliances — a Portuguese match has already been proposed. But you've quietly corresponded with Ferdinand, heir to Aragon, for over a year, and papal dispensation for the match has already been secured in secret.`,
                options: [
                    {
                        label: "Follow history: marry Ferdinand of Aragon in secret",
                        apply(gameState) {
                            const p = gameState.player;
                            const candidate = createRulerRelativeCandidate("aragon", "child", "M");
                            arrangeMarriage(gameState, p, candidate);
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            return `${p.name} defies Henry outright and marries Ferdinand without his leave — the match that will one day bind Castile and Aragon together, whatever it costs with your own brother right now (-10 prestige with the crown; a real claim and a real alliance with Aragon, pressed quietly into place).`;
                        },
                    },
                    {
                        label: "Your own path: obey Henry, and marry the Portuguese match",
                        apply(gameState) {
                            const p = gameState.player;
                            const candidate = createRulerRelativeCandidate("portugal", "child", "M");
                            arrangeMarriage(gameState, p, candidate);
                            p.prestige = (p.prestige || 0) + 10;
                            return `${p.name} does as asked — dutiful, and it costs nothing with Henry's court. Whatever Castile and Aragon might have become together, it will not be through you (+10 prestige with the crown; no Aragonese alliance, no path to the union history remembers).`;
                        },
                    },
                ],
            },
            {
                id: "isabella_contested_succession", year: 1474,
                title: "A Queen Contested",
                text: gameState => `Henry IV is dead. Juana la Beltraneja's faction, backed by Portugal, says the crown is hers by law. Your own faction says the Treaty of Guisando already settled it. Nothing is actually settled until someone makes it so.`,
                options: [
                    {
                        label: "Follow history: fight for the crown outright",
                        apply(gameState) {
                            const p = gameState.player;
                            p.tier = Math.max(p.tier, realmTopTier("castile"));
                            gameState.homeRulerId = p.id;
                            growDomainAndVassalsForTier(gameState, p.tier);
                            p.gold = Math.max(0, (p.gold || 0) - 60);
                            p.prestige = (p.prestige || 0) + 25;
                            p.piety = (p.piety || 0) + 5;
                            return `${p.name} is proclaimed queen in Segovia within days of Henry's death and makes the rest of the realm accept it by force where it won't by law — a war of succession, won (-60 gold, +25 prestige, +5 piety; Castile is yours, outright).`;
                        },
                    },
                    {
                        label: "Your own path: seek a negotiated settlement with Juana's faction",
                        apply(gameState) {
                            const p = gameState.player;
                            p.tier = Math.max(p.tier, realmTopTier("castile"));
                            gameState.homeRulerId = p.id;
                            growDomainAndVassalsForTier(gameState, p.tier);
                            p.gold = Math.max(0, (p.gold || 0) - 20);
                            p.prestige = (p.prestige || 0) + 10;
                            p.piety = (p.piety || 0) + 10;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 5));
                            return `${p.name} talks Juana's own backers down from the brink rather than burning the realm to prove a point — less glory, far less blood, and a crown that still, in the end, is yours (-20 gold, +10 prestige, +10 piety; the realm settles behind you with far less resentment).`;
                        },
                    },
                ],
            },
        ],
    },

    margaret_of_anjou: {
        key: "margaret_of_anjou", name: "Margaret of Anjou", realmKey: "england", gender: "F", age: 31,
        startType: "custom", tierOverride: 3, birthYear: 1430, traits: ["Wrathful", "Ambitious"],
        blurb: "Queen of a cause that's just lost everything. Fierce, French-born, and not remotely finished fighting for her son's throne.",
        setupFamily(gameState) {
            const player = gameState.player;
            const henry = createCharacter({ realmKey: "england", tier: 5, gender: "M", age: 39, name: "Henry VI" });
            henry.traits = ["Pious", "Craven"];
            henry.alive = true;
            henry.bloodline = false;
            henry.spouseId = player.id;
            registerPerson(gameState, henry);
            player.spouseId = henry.id;
            const son = createCharacter({ realmKey: "england", tier: 4, gender: "M", age: 8, name: "Edward of Westminster" });
            son.motherId = player.id;
            son.fatherId = henry.id;
            son.bloodline = true;
            registerPerson(gameState, son);
            logEvent(`${player.name}'s own house: her husband Henry VI, deposed but still living, and their son Edward — eight years old, and already a king's son with no kingdom.`);
        },
        beats: [
            {
                id: "margaret_after_towton", year: 1462,
                title: "After Towton",
                text: gameState => `Towton broke you. Thousands of Lancastrian dead in a single snowbound day, and Edward of York sits on a throne that was Henry's for nearly forty years. You, Henry, and your son are alive, and across the border in Scotland for now. That is the only victory left to count.`,
                options: [
                    {
                        label: "Follow history: keep fighting for the cause",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 10;
                            p.gold = Math.max(0, (p.gold || 0) - 20);
                            gameState.margaretContinuesFight = true;
                            return `${p.name} will not accept a throne lost on one field — French and Scottish gold is already being begged for, and the war, whatever anyone in London wants to believe, is not over (-20 gold, +10 prestige; the "She-Wolf" reputation is already forming).`;
                        },
                    },
                    {
                        label: "Your own path: seek quiet terms, and protect your son above the cause",
                        apply(gameState) {
                            const p = gameState.player;
                            p.health = Math.min(100, p.health + 10);
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            p.gold = (p.gold || 0) + 10;
                            gameState.margaretContinuesFight = false;
                            return `${p.name} quietly puts out feelers for terms through intermediaries — a pension, safety for the boy, an end to the running. The cause, for all real purposes, ends here; whatever comes next is simply a life, not the legend (+10 gold, +10 health, -10 prestige).`;
                        },
                    },
                ],
            },
            {
                id: "margaret_warwick_alliance", year: 1470,
                title: "Warwick's Unlikely Alliance",
                text: gameState => `Louis XI has brokered the unthinkable: Warwick — the Kingmaker, the man who crowned Edward of York and has hated you for a decade — now offers to restore Henry to the throne, if you'll have him as an ally.`,
                options: [
                    {
                        label: "Follow history: swallow the hatred, and take the alliance",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 5;
                            gameState.readeption = true;
                            return `You make the Kingmaker kneel before you for the better part of a quarter hour before you so much as answer him — and then you take the alliance anyway. Henry is restored to the throne within the year (+5 prestige; Henry's Readeption begins).`;
                        },
                    },
                    {
                        label: "Your own path: refuse Warwick on principle",
                        apply(gameState) {
                            const p = gameState.player;
                            p.piety = (p.piety || 0) + 10;
                            p.prestige = Math.max(0, (p.prestige || 0) - 5);
                            gameState.readeption = false;
                            return `${p.name} will not ally with the man who destroyed you to begin with, whatever the French king offers. Principled, and it costs you the one real chance at restoration the cause will ever see again (+10 piety, -5 prestige).`;
                        },
                    },
                ],
            },
            {
                id: "margaret_after_tewkesbury", year: 1471,
                title: "After Tewkesbury",
                onTrigger(gameState) {
                    const son = allFamily(gameState).find(p => p.motherId === gameState.player.id && p.name === "Edward of Westminster");
                    if (son) son.alive = false;
                    const henry = getSpouse(gameState, gameState.player.id);
                    if (henry) henry.alive = false;
                },
                text: gameState => `Tewkesbury has ended it. Your son is dead — cut down in the rout, or executed within the hour, the accounts don't agree which. Henry won't last the month in the Tower. You are a prisoner of the house that destroyed your family.`,
                options: [
                    {
                        label: "Follow history: accept captivity, and live",
                        apply(gameState) {
                            const p = gameState.player;
                            p.health = Math.max(10, p.health - 15);
                            p.gold = Math.max(0, (p.gold || 0) - 30);
                            return `${p.name} is held, then years later ransomed back to France, where she lives out the rest of her life in genteel poverty — broken, but alive, with nothing left to fight for and no one left to fight with (-15 health, -30 gold).`;
                        },
                    },
                    {
                        label: "Your own path: resist capture, even now",
                        apply(gameState) {
                            const p = gameState.player;
                            if (Math.random() < 0.4) {
                                p.alive = false;
                                return `${p.name} will not be taken quietly — and this time it costs her everything. She dies as she lived the last decade: fighting for a cause that has already, in every way that matters, been lost.`;
                            }
                            p.health = Math.max(5, p.health - 25);
                            p.gold = Math.max(0, (p.gold || 0) - 40);
                            p.prestige = (p.prestige || 0) + 10;
                            return `${p.name} slips the first attempt to take her — hunted now, harder, poorer, but free, and still, against every reasonable expectation, alive (-25 health, -40 gold, +10 prestige for the sheer defiance of it).`;
                        },
                    },
                ],
            },
        ],
    },

    margaret_of_york: {
        key: "margaret_of_york", name: "Margaret of York", realmKey: "england", gender: "F", age: 15,
        startType: "sibling", tierOverride: 4, birthYear: 1446, traits: ["Shrewd", "Vengeful"],
        blurb: "A York princess of fifteen, her family's throne barely secure — one marriage away from becoming the most dangerous dowager in Europe.",
        beats: [
            {
                id: "margaret_york_burgundy_marriage", year: 1468,
                title: "A Match for an Alliance",
                text: gameState => `Your brother Edward needs Burgundy as a counterweight to France, and Charles the Bold — newly Duke on his father's death — needs England's friendship just as badly. The match has been proposed for months. It is, finally, time to answer.`,
                options: [
                    {
                        label: "Follow history: marry Charles the Bold, and become Duchess",
                        apply(gameState) {
                            const p = gameState.player;
                            marryHistoricalSpouse(gameState, { realmKey: "burgundy", name: "Charles the Bold", gender: "M", age: 35, tier: 4, traits: ["Wrathful", "Ambitious"] });
                            p.prestige = (p.prestige || 0) + 15;
                            return `${p.name} crosses to Bruges for a wedding so lavish it's still spoken of decades later — Duchess of Burgundy now, bound to the richest, most fragile state in Europe (+15 prestige; a new home, a new household, a new set of enemies).`;
                        },
                    },
                    {
                        label: "Your own path: decline this specific match",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = Math.max(0, (p.prestige || 0) - 5);
                            gameState.margaretYorkDeclinedBurgundy = true;
                            return `${p.name} holds out for a different, less binding alliance — Burgundy's offer goes elsewhere, and whatever history remembers of the Yorkist dowager of Burgundy, it will not be written about you (-5 prestige; no Burgundian marriage, no Burgundian story).`;
                        },
                    },
                ],
            },
            {
                id: "margaret_york_burgundy_succession", year: 1477,
                title: "A Duchy Without a Duke",
                prereq: gameState => gameState.realmKey === "burgundy",
                text: gameState => `Charles has fallen at Nancy, reckless to the end, and left no son — only his daughter Mary, nineteen years old, suddenly the richest, most contested heiress in Europe, with Louis XI's armies already moving.`,
                options: [
                    {
                        label: "Follow history: champion Mary's own right to rule",
                        apply(gameState) {
                            const p = gameState.player;
                            p.prestige = (p.prestige || 0) + 15;
                            p.gold = Math.max(0, (p.gold || 0) - 30);
                            gameState.crownAuthority = gameState.crownAuthority || {};
                            gameState.crownAuthority[gameState.realmKey] = (gameState.crownAuthority[gameState.realmKey] || 0) + 5;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 6));
                            if (!gameState.burgundySuccessionResolved) gameState.burgundySuccessionResolved = "mary";
                            return `${p.name} rallies what's left of the ducal court behind her stepdaughter rather than let France simply take what's left — costly, but Burgundy's own lords hold together around a line they still trust (-30 gold, +15 prestige; the lords steadier for your stand).`;
                        },
                    },
                    {
                        label: "Your own path: urge a swift French-brokered peace",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 40;
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            getVassals(gameState).forEach(v => { if (Math.random() < 0.5) adjustOpinion(v, -4); else adjustOpinion(v, 4); });
                            if (!gameState.burgundySuccessionResolved) gameState.burgundySuccessionResolved = "france";
                            return `${p.name} argues for terms over resistance — peace bought at the cost of real independence, and the court splits sharply over whether that was wisdom or surrender (+40 gold, -10 prestige; the lords divided on what you've done).`;
                        },
                    },
                ],
            },
            {
                id: "margaret_york_pretenders", year: 1487,
                title: "The Pretender's Patron",
                prereq: gameState => gameState.realmKey === "burgundy",
                text: gameState => `Henry Tudor sits uneasily on England's throne, and a boy calling himself the lost son of your murdered brother Edward has surfaced in Ireland — Lambert Simnel. You know perfectly well he's a fraud. You also know perfectly well that doesn't matter.`,
                options: [
                    {
                        label: "Follow history: fund and back the pretender anyway",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 50);
                            p.prestige = (p.prestige || 0) + 10;
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.england = (gameState.rivalStability.england || 0) - 10;
                            gameState.margaretYorkBacksPretenders = true;
                            return `${p.name} funds mercenaries, ships, and a fiction she knows is a fiction, purely on the strength of an old, unforgiving memory for the house that destroyed York's cause (-50 gold, +10 prestige; the Tudor regime visibly rattled from across the Channel).`;
                        },
                    },
                    {
                        label: "Your own path: make a cautious peace with the Tudor regime",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 20;
                            p.prestige = Math.max(0, (p.prestige || 0) - 5);
                            p.piety = (p.piety || 0) + 5;
                            gameState.rivalStability = gameState.rivalStability || {};
                            gameState.rivalStability.england = (gameState.rivalStability.england || 0) + 5;
                            return `${p.name} lets York's cause die with Richard III at Bosworth, where it already, in truth, died — a quieter dowager's life, and a far friendlier letter from London than her nephew Edward's murderer would ever have earned her (+20 gold, +5 piety, -5 prestige).`;
                        },
                    },
                ],
            },
        ],
    },

    elizabeth_woodville: {
        key: "elizabeth_woodville", name: "Elizabeth Woodville", realmKey: "england", gender: "F", age: 24,
        startType: "custom", tierOverride: 1, birthYear: 1437, traits: ["Ambitious", "Patient"],
        blurb: "A widow of twenty-four with two young sons and a disputed inheritance — and, soon, a secret that will scandalize every court in Christendom.",
        setupFamily(gameState) {
            const player = gameState.player;
            const johnGrey = createCharacter({ realmKey: "england", tier: 1, gender: "M", age: 32, name: "Sir John Grey" });
            johnGrey.alive = false;
            registerPerson(gameState, johnGrey);
            const thomas = createCharacter({ realmKey: "england", tier: 1, gender: "M", age: 6, name: "Thomas Grey" });
            thomas.motherId = player.id;
            thomas.fatherId = johnGrey.id;
            registerPerson(gameState, thomas);
            const richard = createCharacter({ realmKey: "england", tier: 1, gender: "M", age: 4, name: "Richard Grey" });
            richard.motherId = player.id;
            richard.fatherId = johnGrey.id;
            registerPerson(gameState, richard);
            logEvent(`${player.name}: a widow at twenty-four, her husband Sir John Grey killed for the Lancastrian cause at St Albans, left with two young sons and an estate under dispute.`);
        },
        beats: [
            {
                id: "elizabeth_grafton_oak", year: 1464,
                title: "Beneath the Oak at Grafton",
                text: gameState => `The young king himself has ridden out while hunting near your family's lands, and stopped — ostensibly to hear your petition over your late husband's confiscated estate. He has stopped three times now. Everyone at court can guess why, except, it seems, Warwick, still deep in his French marriage negotiations.`,
                options: [
                    {
                        label: "Follow history: accept Edward's proposal, and marry him",
                        apply(gameState) {
                            const p = gameState.player;
                            marryHistoricalSpouse(gameState, { realmKey: "england", name: "Edward IV", gender: "M", age: 22, tier: 5, traits: ["Gallant", "Ambitious"] });
                            p.tier = Math.max(p.tier, 4);
                            growDomainAndVassalsForTier(gameState, p.tier);
                            p.prestige = (p.prestige || 0) + 20;
                            gameState.elizabethMarriedEdward = true;
                            return `${p.name} marries the King of England in secret — a widow, a commoner's daughter, Queen within the year, and a scandal the whole realm will spend the next decade paying for, one way or another (+20 prestige; a household now fit for a queen).`;
                        },
                    },
                    {
                        label: "Your own path: decline the king's advances",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 10;
                            p.prestige = (p.prestige || 0) + 5;
                            gameState.elizabethMarriedEdward = false;
                            return `${p.name} protects her own name rather than her own ambition — the estate dispute is quietly settled in her favor as a parting courtesy, and the crown of England goes to someone else's story entirely (+10 gold, +5 prestige; a private, ordinary life, by the standards of what might have been).`;
                        },
                    },
                ],
            },
            {
                id: "elizabeth_woodville_ascendancy", year: 1469,
                title: "The Woodville Ascendancy",
                prereq: gameState => !!gameState.elizabethMarriedEdward,
                text: gameState => `Your family's standing has multiplied almost overnight — sisters married into the greatest noble houses in England, your father made an Earl, your sons given rich wardships. Warwick watches all of it, and he is not a man who forgives being outpaced.`,
                options: [
                    {
                        label: "Follow history: push the family's rise further still",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 40);
                            p.prestige = (p.prestige || 0) + 20;
                            getVassals(gameState).forEach(v => adjustOpinion(v, -8));
                            gameState.warwickRebellionRisk = true;
                            return `Every remaining sibling is married as high as can possibly be arranged — immense family power, and a court nobility, Warwick loudest of all, that resents every inch of it (-40 gold, +20 prestige; real resentment building at court).`;
                        },
                    },
                    {
                        label: "Your own path: deliberately restrain the family's rise",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = (p.gold || 0) + 20;
                            p.prestige = (p.prestige || 0) + 5;
                            getVassals(gameState).forEach(v => adjustOpinion(v, 5));
                            return `${p.name} talks her own family down from the grandest matches on offer — less power for the Woodvilles, far less tinder for Warwick to strike against (+20 gold, +5 prestige; the court noticeably calmer about your family's place in it).`;
                        },
                    },
                ],
            },
            {
                id: "elizabeth_sanctuary", year: 1483,
                title: "Sanctuary",
                prereq: gameState => !!gameState.elizabethMarriedEdward,
                onTrigger(gameState) {
                    const spouse = getSpouse(gameState, gameState.player.id);
                    if (spouse) spouse.alive = false;
                },
                text: gameState => `Edward is dead at forty — sudden, for a man who seemed invincible only weeks ago. Your son by him is twelve, uncrowned, and already in the custody of his uncle Richard of Gloucester, who has just arrested your brother and your son Richard Grey on the road to London.`,
                options: [
                    {
                        label: "Follow history: flee to sanctuary at Westminster Abbey",
                        apply(gameState) {
                            const p = gameState.player;
                            p.gold = Math.max(0, (p.gold || 0) - 20);
                            p.prestige = Math.max(0, (p.prestige || 0) - 10);
                            p.piety = (p.piety || 0) + 10;
                            gameState.elizabethFledSanctuary = true;
                            return `${p.name} takes her younger children into the Abbey's sanctuary rather than Gloucester's reach — safe, but powerless to stop whatever is already happening to the sons left outside it (-20 gold, -10 prestige, +10 piety).`;
                        },
                    },
                    {
                        label: "Your own path: resist Gloucester's regency openly",
                        apply(gameState) {
                            const p = gameState.player;
                            if (Math.random() < 0.5) {
                                p.health = Math.max(10, p.health - 20);
                                p.prestige = Math.max(0, (p.prestige || 0) - 15);
                                p.gold = Math.max(0, (p.gold || 0) - 30);
                                return `${p.name} rallies what allies remain rather than hide — and Gloucester's men move faster than her own. Arrested, humiliated, and lucky to be merely imprisoned rather than worse (-20 health, -15 prestige, -30 gold).`;
                            }
                            p.prestige = (p.prestige || 0) + 20;
                            p.gold = Math.max(0, (p.gold || 0) - 10);
                            return `${p.name}'s open defiance draws just enough of the old Woodville affinity back to her side to slow Gloucester's takeover by weeks, not months — not a victory, but not nothing either (+20 prestige, -10 gold).`;
                        },
                    },
                ],
            },
        ],
    },
};

function listLegendaryFigures() {
    return Object.values(LEGENDARY_FIGURES);
}

function buildLegendaryCharacter(figureKey) {
    const figure = LEGENDARY_FIGURES[figureKey];
    const c = createCharacter({ realmKey: figure.realmKey, tier: figure.startType === "ruler" ? realmTopTier(figure.realmKey) : figure.tierOverride, gender: figure.gender, age: figure.age, name: figure.name });
    if (figure.traits) c.traits = figure.traits.slice();
    if (figure.startType === "ruler") {
        c.sourceRealmKey = figure.realmKey;
        c.royalHouseKey = figure.realmKey;
    } else if (figure.startType === "child" || figure.startType === "sibling") {
        const rulerData = getRealm(figure.realmKey).ruler;
        c._rulerLink = { type: figure.startType, ruler: { name: rulerData.name, gender: rulerData.gender, age: rulerData.age, traits: rulerData.traits } };
        c.sourceRealmKey = figure.realmKey;
        c.royalHouseKey = figure.realmKey;
    }
    c.blurb = figure.blurb;
    return c;
}

// Entry point from the Legendary Lives selection screen — reuses
// startNewGame exactly as any ordinary start does, then layers on
// whatever this specific figure needs beyond the generic family
// generator (a guaranteed birth order for a "child" start, a real
// spouse and children the generic system has no way to know about).
function startLegendaryLife(figureKey) {
    const figure = LEGENDARY_FIGURES[figureKey];
    if (!figure) throw new Error(`Unknown legendary figure: ${figureKey}`);
    const character = buildLegendaryCharacter(figureKey);
    startNewGame("1461", figure.realmKey, character);
    gameState.legendaryFigureKey = figureKey;
    gameState.legendaryFigureCharacterId = character.id;
    gameState.legendaryBeatsResolved = [];
    gameState.legendaryDeathsResolved = [];

    if (figure.startType === "child") {
        // Real history has exactly one heir in mind here — a randomly
        // generated older brother shouldn't occasionally outrank them
        // by pure chance.
        getSiblings(gameState, gameState.player.id).forEach(sib => {
            if (sib.gender === "M" && sib.alive && sib.age > gameState.player.age) {
                sib.alive = false;
                logEvent(`${sib.name}, older than ${gameState.player.name}, died in childhood, as so many did.`);
            }
        });
    }

    if (typeof figure.setupFamily === "function") figure.setupFamily(gameState);
    return gameState;
}

// Yearly hook: forces a specific named relative's death at their real
// historical year, independent of the generic mortality roll — used only
// for deaths a biography beat's own succession depends on landing at the
// right time (Philip the Good's, so Charles the Bold's accession matches
// history), not for the figure's own death, which stays a real risk.
function tickLegendaryScriptedDeaths(gameState) {
    if (!gameState.legendaryFigureKey) return;
    const figure = LEGENDARY_FIGURES[gameState.legendaryFigureKey];
    if (!figure || !figure.scriptedDeaths) return;
    gameState.legendaryDeathsResolved = gameState.legendaryDeathsResolved || [];
    figure.scriptedDeaths.forEach(sd => {
        if (sd.year !== gameState.year) return;
        if (gameState.legendaryDeathsResolved.includes(sd.id)) return;
        gameState.legendaryDeathsResolved.push(sd.id);
        const person = sd.find(gameState);
        if (person && person.alive) person.alive = false;
    });
}

// Yearly hook: fires the one scripted beat due this exact year, if any,
// as a real pendingDecision — blocking advanceYear until the player
// actually answers it, the same as any other decision.
function tickLegendaryBiography(gameState) {
    if (!gameState.legendaryFigureKey) return;
    if (!gameState.player.alive || gameState.pendingDecision || gameState.pendingSuccessionScene) return;
    // Once the real historical figure is no longer the one you're
    // playing (they died early, an heir took over), their own
    // remaining scripted beats stop meaning anything — from here it's
    // just that heir's own, ordinary life.
    if (gameState.player.id !== gameState.legendaryFigureCharacterId) return;
    const figure = LEGENDARY_FIGURES[gameState.legendaryFigureKey];
    if (!figure) return;
    gameState.legendaryBeatsResolved = gameState.legendaryBeatsResolved || [];
    const beat = (figure.beats || []).find(b => b.year === gameState.year && !gameState.legendaryBeatsResolved.includes(b.id));
    if (!beat) return;
    gameState.legendaryBeatsResolved.push(beat.id);
    if (beat.prereq && !beat.prereq(gameState)) return;
    if (typeof beat.onTrigger === "function") beat.onTrigger(gameState);
    gameState.pendingDecision = {
        eventId: beat.id,
        title: beat.title,
        text: typeof beat.text === "function" ? beat.text(gameState) : beat.text,
        options: beat.options.map(o => ({ label: o.label })),
        context: {},
    };
}

// Registered into the shared decision pool purely so resolveDecision's
// existing by-id lookup finds them — condition/chance are never read
// for these; tickLegendaryBiography is what actually fires them, at
// their own real year, never a random roll.
(function registerLegendaryBeats() {
    Object.values(LEGENDARY_FIGURES).forEach(figure => {
        (figure.beats || []).forEach(beat => {
            DECISION_EVENTS.push({
                id: beat.id,
                condition: () => false,
                chance: 0,
                title: beat.title,
                text: beat.text,
                options: beat.options,
            });
        });
    });
})();
