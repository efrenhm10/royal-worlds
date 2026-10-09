# Royal Worlds — Rebuild Design Plan (v3: multi-era, CK3-shaped)

**Setting:** all of Europe, with a choice of **bookmark start dates** spanning roughly 1200–1800, not a fixed Wars-of-the-Roses spine. See §1a.

**This supersedes v2.** v2 still treated 1461 as the fixed starting point. You asked to loosen that: pick your era and realm the way CK3 itself lets you pick a bookmark (867, 1066, 1178, 1337, 1444...) rather than always starting in the same year. The target is still **Crusader Kings 3**: you play one noble or royal character across a life (and generations, through your dynasty), and the entire game points at one tension —

> **Protect your line and your country, or elevate your line toward greater rank.**

Everything below is built around that sentence. The Star Wars game's *underlying techniques* (a canon backbone that adapts, characters with real memory, realm attributes, a lived-in sense that the world moves without you) are still the quality bar — just applied to a dynasty game across six centuries, not a parliamentary one in one fixed year.

---

## 1. The pitch

> You are a noble or royal character, somewhere in Europe, at a moment you chose. Your own life is short; your dynasty is the real game. Hold what your line already has, or spend your life — marriages, wars, intrigue, the Church, claims — pushing it one rung higher. Die, and you become your heir. The line either survives you or it doesn't.

**One continuous role, scaled by your title**, not a menu of separate "games." A landless gentry character, a Baron, a Duke, and a King are all playing the *same* systems — council, vassals, intrigue, war, succession — just at different scale. Climbing the ladder (gentry → knighted/landed → Baron → Earl/Count → Duke → King → occasionally Emperor-recognition) is itself the central progress of "elevating your line." This replaces v1's idea of separate Crown/Consort/Great-Lord/Council-member/Courtier *interfaces* with one interface that simply does more as your rank rises.

## 1a. Picking your era — bookmark starts, not one fixed year

A truly continuous "any year 1200–1800" game would mean hand-modeling six centuries of shifting borders and dynasties with full historical accuracy — not realistic to build well. CK3 itself doesn't do that either: it offers a handful of well-researched **bookmark years**, each with its own real political map, and lets you pick any living character on that map. This rebuild does the same. Proposed bookmarks (subject to your edits):

- **1200** — High medieval Europe: the Angevin Empire just lost its continental core to Capetian France, the Reconquista still has Granada and much of Iberia under Muslim rule, the Holy Roman Empire under the Hohenstaufen, the Fourth Crusade about to upend Byzantium.
- **1337** — the eve of the Hundred Years' War: England and France about to tear at each other for a century, the Black Death not yet arrived.
- **1444** — mid-15th century: close to where today's game already starts (1461), so the existing 19-realm roster and the deeply-tested succession/dynasty engine port almost directly here.
- **1517** — the Reformation's opening year: Luther, a fracturing Church, the Ottomans at their height under Suleiman soon to come, Spain newly united and about to become a world empire.
- **1648** — post-Thirty Years' War: the Peace of Westphalia, the modern idea of sovereign states, absolutism rising in France, the Dutch Republic established.
- **1740s–1750s** — the Enlightenment and the eve of real constitutional pressure: enlightened absolutism, the first real cracks toward what becomes constitutional monarchy, closer to (but still before) 1800.

Each bookmark needs its own realm roster, starting rulers, and starting Crown Authority/Church/stability conditions — this is a genuinely large content requirement, so the plan is to **ship with 1444 first** (reusing everything already built and tested this session) and add the other bookmarks one at a time afterward, each using the exact same systems, just different data. I'd like your read on this bookmark list and the "1444 first" build order before I lock it in.

**Two timelines, per bookmark, same idea throughout:**
- **Canon backbone** — each bookmark gets its OWN short list of known historical beats appropriate to that era and region (not one list stretched across 600 years). For 1444: Edward IV, Warwick, Richard III, Bosworth; the Castilian succession war; Charles the Bold's death; the Sforza succession; the Italian Wars; Matthias Corvinus's heirless death; Mehmed II — already written once in `royal-worlds.html`'s `WORLD_TIMELINE`, reused as reference material for this one bookmark specifically.
- **Adaptive branches** — a succession that runs through YOUR marriage instead of the history books; a realm absorbed by your war instead of the scripted one; a rebellion that succeeds or fails depending on who actually backed it.

## 2. What's IN (the CK3-shaped core)

- **Your character, your dynasty, your line.** Birth, appearance, traits, marriage, children, death, and then you BECOME your heir — the engine this game already does well, kept and deepened, not demoted to a side system.
- **Titles and rank as the real progression ladder.** Untitled gentry → knighted/landed → Baron → Count/Earl → Duke/Archduke → King/Queen → (rare) Emperor-recognition (Austria's Holy Roman Emperor mechanic already exists and is the right model). Every rank unlocks more: more land, more vassals, more council seats, more war options.
- **Vassals.** If you hold enough land, other nobles hold title FROM you — they have opinion of you, pay you, owe you levies, and can be content, resentful, or ready to join a faction against you. This is new and is the single most "CK3" system missing today.
- **Your own demesne — land you govern directly**, distinct from vassal land you've granted out. Build and upgrade holdings (a keep for defense and levies, a town for tax income, a temple for piety/Church favor), choose how much of your title's land you keep in-hand versus grant to a vassal (more in-hand land = more direct income and control, but a vassal-less realm also means fewer levies to call on and nobody else absorbing the administrative load), and watch your capital's own development rise over a reign. This is the actual hands-on "governing my lands" loop — closer to CK3's holdings/buildings system than to today's Estates tab, and a real, separate system from vassal MANAGEMENT (which is about other people's land, not yours).
- **A small Council**, not a legislature: Chancellor, Steward, Marshal, Spymaster, Court Chaplain — named advisors with a skill rating and a faction, each unlocking a toolbox (Chancellor: fabricate claims, improve foreign relations; Steward: grow the treasury, manage domain; Marshal: raise/train levies, war score bonuses; Spymaster: intrigue, uncover plots, sabotage; Chaplain: piety, Church relations, marriage dispensations). This is the "Council" the original mid-session summary already flagged as unbuilt — it's the right scope for this rebuild, replacing v1's Parliament/committee/bill machinery entirely.
- **Intrigue / Schemes.** Fabricate a claim, foment unrest in a rival's land, seduce, arrange a "convenient" death, uncover a plot against you. This is the toolbox for a character who ISN'T strong enough to just declare war — exactly the "elevate my line" half of the pitch for a lower-ranked player.
- **Claims and justified war**, replacing today's "declare war on any neighbor you're strong enough to beat": a war needs a real claim (inherited, fabricated via your Chancellor, or pressed through a collateral marriage tie — which plugs directly into the existing marriage/succession engine), and war goals are scoped to that claim (a county, a whole kingdom) rather than "roll until someone is annexed."
- **Factions.** Vassals (or even your own close family) can form a faction against you — depose, revoke a title, press for independence, back a rival claimant. This IS "protect your line and your country" as a mechanical pressure, not just flavor text.
- **Succession law as a real choice**, not a fixed rule: primogeniture vs. partition vs. elective vs. seniority, each with real tradeoffs (partition splits your realm among heirs — classic CK3 tension between a big single heir and a fractured dynasty). Builds directly on the succession engine already deeply tested in the current game.
- **Canon characters with real memory** — same as v1, kept: Edward IV, Richard III, Warwick, Louis XI, Charles the Bold, Isabella and Ferdinand, Matthias Corvinus, Vlad III, Mehmed II and the rest, each with opinions that remember specific things you did.
- **Realm attributes** (Wealth, Stability, Military strength, Strategic vulnerability, Cultural/religious identity) — kept from v1, replacing today's thin `REALM_MILITARY_STRENGTH`-only model, now also driving vassal opinion and faction risk.
- **The Church as a real power pressing on you, not just a personal stat.** Rome has its own interests, independent of any one king: it wants tithes, orthodoxy, and deference. A ruler who defies the Pope risks excommunication — a real, heavy penalty (vassals released from their oath of loyalty, a legitimate pretext for rivals to invade, your own faction risk spiking) — while a ruler who stays in Rome's good graces gets real benefits (marriage dispensations, legitimizing a bastard, support against a rebellious vassal). This is the Catholic Church as a genuine check on crown power, the way it actually was.
- **A child sent into Church service is a real, playable dynastic strategy, not a one-line flavor note.** Today's game already has the seed of this (a Cardinal child has a real chance at the Papacy). The rebuild makes the payoff land with real weight: a son who rises priest → bishop → cardinal → **Pope** puts your own blood on the Throne of St. Peter — meaningfully lower excommunication risk for your entire dynasty (he has real latitude to look the other way, or at least slow-walk it), favorable dispensations essentially on demand, a legitimacy boost to your line's own prestige, and leverage you can call on against a rival who ISN'T so fortunate. It's a second, real path to "elevate your line" that doesn't run through marriage or conquest at all — and it's generational: the next Pope isn't guaranteed to be your blood, so the advantage is real but not permanent, exactly the kind of tension the rest of the game runs on.
- **Religious movements as a spreading, divisive pressure** — the printing-press/"Winds of Reform" thread already present in today's game, made into a real system rather than a background flag: as the era advances (especially once the timeline reaches the early 1500s, Luther's era), reformist ideas spread through your realm whether you want them to or not. You choose to suppress it (costs stability, pleases Rome, angers any vassals who've already converted) or tolerate/embrace it (pleases a growing faction, risks Rome's censure or outright a crusade/holy war called against you). A long enough playthrough can end with your own realm genuinely split, or a full break with Rome — a dynastic and religious stake at once, not a flavor event.
- **Crown Authority as the "constitutional monarchy" pressure, modeled the way CK3 actually models it — not as a parliament.** Every realm has a Crown Authority level: how much a king can do without his vassals' consent. Raising it is a real, resisted act — vassal opinion drops, faction risk rises, and in realms with a real tradition of chartered rights (England's own Magna Carta lineage is the obvious one) your nobility can force you into a charter that permanently caps how far you can push, exactly the historical seed of constitutional monarchy. Lower Crown Authority realms (France trending more absolutist, Naples ruling by near-decree) feel different to rule than high-pressure ones. This is the full answer to "the pressures of ruling" without resurrecting a bill-passing legislature.
- **A real record of your life and your dynasty**, CK3-style: *cause of death, reign length, titles held, wars won and lost, a dynasty prestige score that carries from ruler to ruler.*
- **NPC realm politics** (built this session) carries forward conceptually, rebuilt on the same vassal/faction/claim machinery the player uses — other rulers losing their own vassals to a faction, pressing their own claims, facing their own Church and Crown Authority pressure — not a separate abstracted system.

## 3. What's OUT (cut from v1, not just demoted)

- **Parliament/Estates-General/Great Council as a legislative body with bills, committees, and markup sessions.** Gone entirely. CK3 doesn't have this and neither should this game. Realm *laws* still exist (succession law, crown authority / vassal power balance) but as a short, meaningful list you change with real cost — not a 90-item lawbook with committee stages.
- **Courtier as a distinct playable mode.** Folded into "low-ranked character" — the same systems, just with less land and fewer options, not a separate interface.
- **Banker/Merchant as a core pillar**, and the Star Wars game's company-courting economic sim. A banking/trade dynasty (the Medici model) can still exist as *flavor and a path to wealth*, but it's not a structural pillar alongside Crown/Vassal/Church the way v1 had it.
- **Budget markup sessions, multi-year infrastructure investment packages, trade missions as their own subsystem, pressure-group escalation ladders.** All Star-Wars-game-specific texture that doesn't belong in a CK3-shaped game. Replaced by CK3's actual economic layer: domain income, vassal levies/taxes, and the Steward council role.

## 4. Architecture (unchanged from v1 — still a blank-slate, modular rewrite)

```
index.html              — shell + script tags, no game logic
css/style.css            — visual identity (parchment/heraldic)
js/
  data.js                 — realms, houses, starting rosters, name pools
  engine.js                — core game-state object, the tick loop, save/load
  attributes.js             — character creation: background, appearance, traits
  realms.js                  — the 19 realms' own attributes + title hierarchy
  titles.js                   — the rank ladder (county/duchy/kingdom/empire), who holds what, Crown Authority per realm
  domain.js                    — your own demesne: holdings, buildings, development, in-hand vs. granted land
  vassals.js                    — liege/vassal relationships, opinion, levies, taxes, Crown Authority pressure/charters
  council.js                     — Chancellor/Steward/Marshal/Spymaster/Chaplain
  intrigue.js                     — schemes: fabricate claim, foment unrest, assassinate, seduce
  factions.js                      — depose/revoke/independence/claimant factions against the player (or an NPC)
  wartime.js                        — claims, justified war, war score, sieges (ported concept, rewritten)
  dynasty.js                         — marriage, succession, titles, widowhood (ported concept, rewritten)
  succession_laws.js                  — primogeniture/partition/elective/seniority choice + consequences
  church.js                            — piety, Church careers, dispensations, excommunication, Rome's own standing toward you
  reform.js                             — the spreading religious-movement pressure (suppress/tolerate/embrace, schism risk)
  personal.js                            — the player's own life: age, health, family, career/death
  canon.js / canon_events.js             — the scripted historical backbone (from WORLD_TIMELINE)
  timeline.js                             — adaptive branching logic keyed off player/world state
  events.js                                — the general random-event pool
  scenes.js                                 — location/court flavor text generation
  ui.js / ui_world.js                        — rendering
  main.js                                     — boot sequence
```

No build step, no server — open `index.html` in a browser, same as today.

## 5. Still open — need your answer on these before I write code

1. **Bookmark years** — does the §1a list (1200 / 1337 / 1444 / 1517 / 1648 / 1740s) look right, or do you want different/fewer/more? And do you agree with shipping 1444 first (reusing the already-tested dynasty/succession engine and the 19-realm roster) before building out the other eras?
2. **Church as a playable path?** Today's game already lets a CHILD rise to Pope. In this rebuild, should the PLAYER be able to live a Church-career life themselves (vows, no legitimate heir, but real political power as a prince-bishop or eventually Pope) — or is Church strictly a thing your *children* can do, and the player is always a landed/noble track?
3. **Build order** — once I start, what should work FIRST? My instinct, in CK3-priority order: (a) titles/rank ladder + vassals, since everything else hangs off "what do you actually hold," then (b) succession/dynasty (the system most already proven in today's game, lowest risk to re-prove), then (c) council + intrigue, then (d) claims/wartime, then (e) the Church/reform/Crown-Authority pressure systems, then (f) the 1444 canon timeline specifically, with the other bookmarks' own content built after the systems and the first bookmark are both solid. Agree, or reorder?

Once you confirm, I start building — module by module, each tested in isolation before the next, same disciplined pattern as this whole session.
