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
];

// Rolls for at most one new decision per year, and only if none is already
// waiting to be resolved — advanceYear (engine.js) refuses to run again
// while gameState.pendingDecision is set, so this never silently stacks.
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
    gameState.pendingDecision = null;
    return true;
}
