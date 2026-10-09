# Royal Worlds — Rebuild Design Plan

**Working title:** *Crowns & Councils* (placeholder — can change)
**Setting:** Western/Central Europe, 1461 onward (Wars of the Roses into the early Renaissance and the Italian Wars), the same ~19 realms already built out: England, France, Burgundy, Brittany, Castile, Aragon, Portugal, Austria, Milan, Venice, Naples, Florence, Rome, Hungary, Poland, Bohemia, Wallachia, the Ottoman Empire.

This plan mirrors how *Galactic Senate* (the Star Wars game) is actually built — role-defined gameplay, a canon backbone with adaptive branches, a real legislature/budget/trade layer, pressure groups, and characters who remember what you did — translated into 1461 Europe instead of invented wholesale.

---

## 1. The pitch

> You are not the hero of the Wars of the Roses. You are one person inside it — a monarch, a regent, a great lord, a bishop, a banker, a courtier, or an exile pressing a claim — and the politics of a real, moving continent happen whether or not you're the one moving them.

**Two timelines**, same idea as the Star Wars game:
- **The canon backbone**, on schedule: Edward IV's reign, Warwick's fall, Richard III, Bosworth, the Tudor settlement; the War of the Castilian Succession and Isabella/Ferdinand; Charles the Bold's death at Nancy and the Burgundian inheritance crisis; the Sforza succession in Milan; the Italian Wars from 1494; Matthias Corvinus's death without an heir; Mehmed II's wars. All of this already exists in `royal-worlds.html`'s `WORLD_TIMELINE` — it's the single best asset to carry forward **as reference material**, rewritten to fire role-aware and to actually branch.
- **Adaptive events**, which start from canon but follow what the player (and the simulated world) actually did — a succession that goes a different way because a different marriage happened, a rebellion that succeeds or fails depending on who backed it, a realm that gets absorbed by war instead of by the scripted history.

## 2. Every role is a different game

This is the single biggest structural change. Today, every playthrough is the same shape (manage stats, seek marriages, maybe inherit a throne). The rebuild instead defines **distinct interfaces and powers per role**, the way the Star Wars game splits Senate Desk / Executive / Royal Court / Chancellery / City Hall / Movement:

- **Crown (King/Queen, sovereign).** Full authority: declare war, grant titles and land, levy taxes, call or dismiss a council/parliament, appoint a council, arrange royal marriages, grant or deny royal assent to bills the council passes. This is the closest to today's "Realm Management" tab, built out properly.
- **Consort/Regent.** Married into or governing in trust for a minor or absent monarch. Real but bounded power — can advise, can be given specific delegated authority, cannot unilaterally declare war or grant titles without the Crown's (or council's) sanction. This absorbs today's `rulingStatus: "consort"/"regent"` states and gives them an actual distinct interface instead of just a different label on the same screens.
- **Great Lord / Peer (Duke, Earl, Baron holding real land).** Commands own levies and revenue, holds a seat at the Crown's council or realm's parliament/Estates, can be summoned, can petition, can conspire, can rebel. This is the role most of today's "noble marriage" outcomes land you in, and today it gives you almost nothing to actually do with that standing.
- **Council/Parliament member** (England's Parliament, France's Estates-General, an Italian city's Signoria/Great Council, the Empire's Diet). A real legislative body: committees, bills with stages (Idea → Drafting → Introduced → Committee → Debate → Vote → Passed), a chair who can bury or fast-track a bill, a budget the council must pass. Different realms have different bodies with different real powers (England's Parliament could withhold supply; an absolute realm like Naples has no such check at all).
- **Church (Bishop, Cardinal, Pope).** Spiritual authority as real political leverage: tithes, excommunication, dispensations (annulments, marriage dispensations — ties directly into the existing marriage system), Church appointments, a seat at Rome's own council.
- **Banker/Merchant (the Medici model, already partly built).** No formal office, real power anyway: loans to crowns (with real interest and real leverage when a king can't repay), guild politics, trade routes, courting or founding companies — modeled closely on the Star Wars game's "Courting companies / Homegrown companies" system, re-skinned to wool, wine, spice, and banking instead of starships.
- **Courtier (untitled gentry).** The "mayor"-tier role — real but limited: petition for patronage, seek a position at court, build relationships, work toward a title or a good marriage as a path UP into one of the roles above, rather than the whole game.
- **Pretender/Exile/Rebel.** Someone pressing a claim from outside power — a deposed line, a defeated pretender, a baron in open revolt. This absorbs today's occasional "rebellion" flavor events into an actual playable posture with its own toolbox (raise support, seek foreign backing, build a faction, time an uprising).

**Marriage and dynasty survive as a real system inside this**, not as the point of the game: every role above can still marry, found a dynasty, and pass a title to an heir — but a player's whole arc is no longer "manage stats until a good marriage happens." The deeply-tested succession/title/widowhood engine already built in `royal-worlds.html` is the best reference material for this piece specifically, even though it isn't being carried forward file-for-file.

**Information depends on role**, same principle as the Star Wars game: a courtier hears "the harvest has failed in the north"; a sitting monarch sees the actual grain-reserve numbers and the council's private advice.

## 3. Core systems (new, or deepened far past today's version)

- **The Council/Parliament layer.** Bills with real stages, committees (Finance, War, Foreign Affairs, Justice — renamed appropriately per realm), a chair's power to bury or advance a bill, a budget that must pass or the Crown governs on short rations. Varies by realm: England's Parliament is a real check; Naples' crown rules by decree; Venice's Great Council elects the Doge and runs everything.
- **Budget & economy.** Real tax bases (land tax, customs, tithes, guild dues) that grow or shrink with what's actually built; a treasury with debt, interest, and a credit rating (echoes the Star Wars game's bonds/credit-rating system); multi-year investment packages (a new port, a university, fortifications) with real funding-source choices.
- **Trade.** Each realm has real exports/imports (England: wool; Burgundy: cloth and finance; Venice: spice and shipping; Aragon: Mediterranean trade). Trade missions, negotiated agreements, blockades and piracy disrupting them — directly adapted from the Star Wars game's trade.js.
- **Pressure groups.** Guilds, the clergy, the baronage, the peasantry, a city's own merchant class — each reacts to policy with escalating pressure (grumbling → petitions → strikes/revolt), the same escalation ladder as the Star Wars game's pressure groups.
- **Canon characters with memory.** Edward IV, Richard III, Warwick, Louis XI, Charles the Bold, Isabella and Ferdinand, Matthias Corvinus, Vlad III, Mehmed II and the rest — each with an ideology, objectives, and a relationship that remembers specific things the player did ("I remember you sided with Warwick"), not just a flat favor number.
- **Realm attributes**, same five-axis idea as the Star Wars game's worlds (Wealth, Stability, Military strength, Strategic vulnerability, Cultural/religious identity) replacing today's thinner `REALM_MILITARY_STRENGTH`-only model.
- **A real record of your life**, written like the Star Wars game's end-of-career summary: *"Reigned as King of Naples, 1461–1489. Signed 12 laws. Survived 2 rebellions. Married into the House of Aragon. Lost Calabria to the Ottomans."*
- **NPC realm politics** (already built this session) carries forward conceptually — other realms acting on their own — but gets deepened with the same council/budget/pressure-group machinery the player has, not just an abstracted war roll.

## 4. What's being cut or demoted from today's game

- **Marriage-as-the-main-loop.** Still present, still deep, no longer the spine of the whole game.
- **The BitLife-style single annual-tick flow.** Replaced by the role/council/budget cadence above (monthly and yearly beats, matching the Star Wars game's Month 7/9/10 budget rhythm).
- **The single-HTML-file architecture.** Replaced per your answer below.

## 5. Architecture

**Blank-slate rewrite, split into modules**, mirroring the Star Wars game's file layout:

```
index.html              — shell + script tags, no game logic
css/style.css            — visual identity (parchment/heraldic, not sci-fi)
js/
  data.js                 — realms, houses, starting rosters, name pools
  engine.js                — core game-state object, the tick loop, save/load
  attributes.js             — character creation: culture/background, appearance, traits
  realms.js                  — the 19 realms' own attributes (wealth/stability/military/etc.)
  roles.js                    — role definitions: powers, interface, constraints per role
  council.js                   — Parliament/Estates/Great Council: bills, committees, votes
  policy.js                     — the "laws before sliders" lawbook, per-realm law states
  lawbook.js                     — the actual law catalog (England's ~90-law equivalent)
  govdesk.js                      — the Crown/Executive desk: budget, capital program, appointments
  trade.js                         — exports/imports, missions, agreements, disruption
  dilemmas.js                       — one-off scripted choice events
  events.js                          — the general random-event pool
  canon.js / canon_events.js          — the scripted historical backbone (from WORLD_TIMELINE)
  timeline.js                          — adaptive branching logic keyed off player/world state
  dynasty.js                            — marriage, succession, titles, widowhood (ported concept, rewritten)
  personal.js                            — the player's own life: age, health, family, career crossroads
  rebellion.js                            — the pretender/exile/rebel playable posture
  demographics.js                          — pressure groups and population reaction
  powers.js                                 — per-role action menus
  wartime.js                                 — war & conquest (ported concept, rewritten)
  scenes.js                                   — location/court flavor text generation
  ui.js / ui_world.js / ui_issues.js            — rendering
  main.js                                        — boot sequence
```

No build step, no server — same as today and the Star Wars game: open `index.html` in a browser.

## 6. What I need from you before I start writing code

1. **Confirm the role list above** — add, cut, or rename any of them (Crown / Consort-Regent / Great Lord / Council member / Church / Banker / Courtier / Pretender-Rebel).
2. **Confirm what survives from today's marriage/succession engine** — the plan above keeps it as one system (`dynasty.js`) rather than the spine. If you'd rather drop dynastic marriage back further (flavor only, no real succession mechanics) or keep it MORE central than this plan proposes, say so now.
3. **Time horizon** — today's game runs 1461 into the 1500s+. Keep that range, or extend/shrink it?
4. **Any Star Wars-game system you specifically want ME to prioritize first** once building starts (e.g., "get the Council/bill system working before anything else") — since this is a large rebuild, I'd build and test it in the same staged, test-backed way this session has used throughout (one system, verified, before the next), and your priority order decides the staging.

Once you confirm, I'll start building — module by module, each one tested in isolation the same way every system in today's game was, before moving to the next.
