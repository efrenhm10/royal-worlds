// succession_laws.js — what happens when the player dies. This is the
// system that makes "die, and you become your heir" real: it picks the
// heir according to the realm's chosen law, hands them the title (and,
// under partition, a smaller one), and carries the court over to them.
// If no heir can be found at all, the line is extinct and the game ends.

// A dead candidate's own position in the order is normally just their
// age — except where right of representation (below) has stood in for
// them with their own living child, who should rank where the dead
// parent WOULD have, not wherever their own much-younger age would
// otherwise sort them.
function successionSortAge(person) {
    return person._successionSortAge != null ? person._successionSortAge : person.age;
}

function pickByAge(pool, genderPreference) {
    let candidates = pool;
    if (genderPreference) {
        const preferred = candidates.filter(p => p.gender === genderPreference);
        if (preferred.length) candidates = preferred;
    }
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => successionSortAge(b) - successionSortAge(a))[0];
}

// Right of representation: a dead child isn't simply skipped in favor of
// the next relationship tier out (siblings, nieces/nephews…) — their OWN
// living children step into their branch's place first, the way real
// succession law works (a dead heir apparent's own son still comes before
// the old king's younger children). Each substituted descendant is tagged
// with the dead parent's own age so pickByAge/orderPool rank their branch
// where the parent would have stood, not at the descendant's actual age.
function getChildrenWithRepresentation(gameState, personId) {
    const result = [];
    getChildren(gameState, personId).forEach(child => {
        if (child.alive) {
            result.push(child);
            return;
        }
        getChildrenWithRepresentation(gameState, child.id).forEach(descendant => {
            if (descendant._successionSortAge == null) descendant._successionSortAge = child.age;
            result.push(descendant);
        });
    });
    return result;
}

function sumSkills(person) {
    return SKILL_KEYS.reduce((total, key) => total + ((person.skills && person.skills[key]) || 0), 0);
}

const SUCCESSION_LAWS = {
    maleProximogeniture: {
        key: "maleProximogeniture", name: "Male-Preference Primogeniture",
        desc: "The eldest son inherits everything undivided; a daughter only inherits if there is no living son.",
        pick: pool => pickByAge(pool, "M") || pickByAge(pool, null),
    },
    cognaticPrimogeniture: {
        key: "cognaticPrimogeniture", name: "Primogeniture",
        desc: "The eldest child inherits everything undivided, regardless of sex.",
        pick: pool => pickByAge(pool, null),
    },
    agnatic: {
        key: "agnatic", name: "Agnatic (Salic) Law",
        desc: "Only a male descendant in the male line may inherit at all — if none lives, the search moves further out the family tree rather than passing to a woman.",
        pick: pool => pickByAge(pool.filter(p => p.gender === "M"), null),
    },
    partition: {
        key: "partition", name: "Partition",
        desc: "The realm is divided among every living child; your own line keeps the senior share, at a reduced rank, while the rest is granted away to siblings.",
        pick: pool => pickByAge(pool, "M") || pickByAge(pool, null),
    },
    elective: {
        key: "elective", name: "Elective",
        desc: "The most capable candidate is chosen from among the eligible kin — not necessarily the eldest, or even the closest in blood.",
        pick: pool => [...pool].sort((a, b) => sumSkills(b) - sumSkills(a))[0] || null,
    },
    seniority: {
        key: "seniority", name: "Seniority",
        desc: "The eldest living member of the whole bloodline inherits, whoever — and wherever in the family tree — that turns out to be.",
        pick: null, // handled specially in determineHeir: ignores the proximity pools entirely
    },
};

const DEFAULT_SUCCESSION_LAW = "maleProximogeniture";

function candidatePools(gameState, personId) {
    return [
        getChildrenWithRepresentation(gameState, personId),
        getSiblings(gameState, personId),
        getNiecesNephews(gameState, personId),
        getAuntsUncles(gameState, personId),
        getCousins(gameState, personId),
    ].map(pool => pool.filter(p => p.alive));
}

function determineHeir(gameState, lawKey, deceased) {
    const law = SUCCESSION_LAWS[lawKey] || SUCCESSION_LAWS[DEFAULT_SUCCESSION_LAW];

    if (law.key === "seniority") {
        const livingKin = allBloodline(gameState).filter(p => p.alive && p.id !== deceased.id);
        if (!livingKin.length) return null;
        return [...livingKin].sort((a, b) => b.age - a.age)[0];
    }

    const pools = candidatePools(gameState, deceased.id);
    for (const pool of pools) {
        if (!pool.length) continue;
        const heir = law.pick(pool);
        if (heir) return heir;
    }
    return null;
}

// A realm's own real succession law — Venice's Doge is elected, France
// follows Salic law, etc. (realms.js's defaultSuccessionLaw) — rather than
// the single hardcoded default every realm used to share regardless of
// its actual government.
function realmSuccessionLaw(realmKey) {
    const realm = getRealm(realmKey);
    return (realm && realm.defaultSuccessionLaw) || DEFAULT_SUCCESSION_LAW;
}

// Full ordering within a candidate pool for a given law — determineHeir
// above only needs the single top pick, but showing a real line of
// succession needs the whole order. Each law's full-pool order is built
// to agree with determineHeir's own pick as its first entry, so "where do
// I stand" and "who would inherit" are always the same answer.
function orderPool(pool, lawKey) {
    const law = SUCCESSION_LAWS[lawKey] || SUCCESSION_LAWS[DEFAULT_SUCCESSION_LAW];
    if (law.key === "agnatic") {
        return pool.filter(p => p.gender === "M").sort((a, b) => successionSortAge(b) - successionSortAge(a));
    }
    if (law.key === "elective") {
        return [...pool].sort((a, b) => sumSkills(b) - sumSkills(a));
    }
    if (law.key === "maleProximogeniture" || law.key === "partition") {
        const males = pool.filter(p => p.gender === "M").sort((a, b) => successionSortAge(b) - successionSortAge(a));
        const females = pool.filter(p => p.gender !== "M").sort((a, b) => successionSortAge(b) - successionSortAge(a));
        return [...males, ...females];
    }
    // cognaticPrimogeniture, and the default fallback: straight age order.
    return [...pool].sort((a, b) => successionSortAge(b) - successionSortAge(a));
}

// The full line of succession for ANY tracked person, not just the
// player — used for a realm's royal house the family has married into
// (see dynasty.js's graftRoyalHouse), where seeing exactly where you
// stand matters as much as who's first in line.
const FOREIGN_DEFAULT_SUCCESSION_LAW = "maleProximogeniture";

function determineSuccessionOrder(gameState, lawKey, personId, count) {
    const limit = count || 10;
    const law = SUCCESSION_LAWS[lawKey] || SUCCESSION_LAWS[FOREIGN_DEFAULT_SUCCESSION_LAW];

    if (law.key === "seniority") {
        return allFamily(gameState)
            .filter(p => p.alive && p.id !== personId)
            .sort((a, b) => b.age - a.age)
            .slice(0, limit);
    }

    const pools = candidatePools(gameState, personId);
    const order = [];
    for (const pool of pools) {
        if (order.length >= limit) break;
        orderPool(pool, lawKey).forEach(p => { if (order.length < limit) order.push(p); });
    }
    return order.slice(0, limit);
}

// The realm, its tracked monarch, and the live ordered line beneath
// them — null if the family has no tie to this realm's royal house at
// all. Reads straight off the shared family registry, so it's never
// stale: it reflects every death, marriage, and birth tickDynasty has
// already applied.
function foreignSuccessionLine(gameState, realmKey, count) {
    const rulerId = gameState.foreignRoyals && gameState.foreignRoyals[realmKey];
    if (!rulerId) return null;
    const ruler = getPerson(gameState, rulerId);
    if (!ruler) return null;
    const lawKey = realmSuccessionLaw(realmKey);
    const order = ruler.alive ? determineSuccessionOrder(gameState, lawKey, ruler.id, count) : [];
    return { ruler, order, lawKey };
}

// Yearly hook: a tracked foreign monarch who died this year (via the same
// generic tickDynasty aging/death loop everyone else goes through) is
// replaced by their own heir — the line promotes itself exactly the way
// the player's own succession does, without the player having to do
// anything.
function tickForeignRoyals(gameState) {
    if (!gameState.foreignRoyals) return;
    Object.keys(gameState.foreignRoyals).forEach(realmKey => {
        const rulerId = gameState.foreignRoyals[realmKey];
        const ruler = getPerson(gameState, rulerId);
        if (!ruler || ruler.alive) return;
        const realm = getRealm(realmKey);
        const heir = determineHeir(gameState, realmSuccessionLaw(realmKey), ruler);
        if (heir) {
            heir.tier = Math.max(heir.tier || 0, realmTopTier(realmKey));
            gameState.foreignRoyals[realmKey] = heir.id;
            logEvent(`${heir.name} succeeds ${ruler.name} as ${realmTopTitle(realmKey, heir.gender)} of ${realm.name}.`);
        } else {
            delete gameState.foreignRoyals[realmKey];
            logEvent(`${realm.name}'s royal house, which the family married into, has died out entirely.`);
        }
    });
}

function canChangeSuccessionLaw(gameState) {
    const level = (gameState.crownAuthority && gameState.crownAuthority[gameState.realmKey]) || 0;
    return crownAuthorityInfo(level).canOverrideSuccessionLaw;
}

function changeSuccessionLaw(gameState, lawKey) {
    if (!SUCCESSION_LAWS[lawKey]) return false;
    if (!canChangeSuccessionLaw(gameState)) return false;
    gameState.succession.lawKey = lawKey;
    logEvent(`${gameState.player.name} has proclaimed ${SUCCESSION_LAWS[lawKey].name} as the law of succession.`);
    return true;
}

// Procedural Drama Director — the single biggest hinge point the whole
// game turns on (your character dying and someone else picking up where
// they left off) deserves more than a log line. reignHighlight reads
// what was actually true of the reign that just ended; assessRealmState
// does the same instant audit of what the heir is actually inheriting —
// both built from state the engine already tracks (war, revolt, reform,
// stability), not a new parallel system.
function reignHighlight(deceased, gameState) {
    if (gameState.war) return "a reign spent at war";
    if (gameState.faction) return "a reign shadowed by rebellion among their own vassals";
    if ((deceased.prestige || 0) >= 150) return "a reign remembered for its prestige and ambition";
    if ((deceased.piety || 0) >= 80) return "a reign marked by real devotion";
    if (deceased.traits && deceased.traits.length) return `a reign shaped by being ${deceased.traits[0].toLowerCase()}`;
    return "a quiet, unremarkable reign";
}

function assessRealmState(gameState) {
    if (gameState.war) return `at war with ${getRealm(gameState.war.targetRealmKey).name} — your country stands on the brink of real danger`;
    if (gameState.faction) return `wracked by open revolt among your own vassals`;
    if (gameState.reform && gameState.reform.schismed) return `permanently broken from Rome — a schism that will outlive this reign`;
    const stability = typeof effectiveStability === "function" ? effectiveStability(gameState, gameState.realmKey) : 50;
    if (stability < 35) return `weak and fracturing — its stability dangerously low`;
    if (stability >= 70) return `peaceful and prosperous, a realm at ease with itself`;
    return `holding steady — neither thriving nor in crisis`;
}

// Called from engine.js's advanceYear the moment the player is found dead.
// Finds the heir, transfers rank/resources/court to them, and makes them
// the new player — or, if the bloodline has run out entirely, ends the game.
function applySuccession(gameState) {
    const deceased = gameState.player;
    const lawKey = (gameState.succession && gameState.succession.lawKey) || DEFAULT_SUCCESSION_LAW;
    const heir = determineHeir(gameState, lawKey, deceased);

    if (!heir) {
        gameState.gameOver = true;
        gameState.gameOverReason = `${deceased.name}'s line has ended — no heir could be found. The ${titleName(deceased.tier, deceased.gender, gameState.realmKey).toLowerCase()}'s seat passes out of your family's hands.`;
        logEvent(gameState.gameOverReason);
        return;
    }

    const isPartition = lawKey === "partition";
    const highlight = reignHighlight(deceased, gameState);
    heir.tier = Math.max(heir.tier || 0, isPartition ? tierDown(deceased.tier) : deceased.tier);
    heir.gold = (heir.gold || 0) + Math.floor(deceased.gold * (isPartition ? 0.5 : 1));
    heir.prestige = (heir.prestige || 0) + Math.floor(deceased.prestige * 0.5);
    heir.realmKey = deceased.realmKey;
    heir.cultureKey = heir.cultureKey || deceased.cultureKey;

    gameState.player = heir;
    getVassals(gameState).forEach(v => { v.liegeId = heir.id; });

    const newTitle = titleName(heir.tier, heir.gender, gameState.realmKey);
    gameState.pendingSuccessionScene = {
        deceasedName: deceased.name,
        deceasedAge: deceased.age,
        highlight,
        heirName: heir.name,
        title: newTitle,
        realmName: getRealm(gameState.realmKey).name,
        assessment: assessRealmState(gameState),
    };
    logEvent(`${heir.name} inherits as ${newTitle}${isPartition ? ", the realm split among siblings" : ""}.`);
}
