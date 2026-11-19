// story_mode.js — Legendary Lives, rebuilt as an actual story instead of
// a sequence of decision-card popups: a figure's life told as connected
// narrative prose, starting before they're even born, with real choices
// along the way that change what the NEXT part of the story actually is
// — not just a stat delta layered on identical text, but a different
// scene, sometimes a different ending entirely. Once the story reaches
// its own natural end, it hands off into the ordinary game (engine.js's
// gameState, decisions, vassals, war — everything else in this game),
// carrying forward what the story established as real, already-happened
// fact (who you married, who's already dead, who your children are).
//
// A story deck is a small graph, not a line: STORY_DECKS[figureKey] =
// { startNodeId, nodes: { id: { text(storyState) => string, choices: [
// { label, apply(storyState), next: nodeId | "__HANDOFF__" } ] } } }.
// A node with one choice is narration — "Continue" — not a decision.

// Each figure's deck lives in its own file (story_elizabeth_woodville.js,
// story_catherine_de_medici.js, ...) and just assigns into this shared
// registry — declared once, here, so those files don't each need their
// own top-level declaration of the same name.
const STORY_DECKS = {};

let _storyState = null;

function getStoryState() {
    return _storyState;
}

// The three numbers the story actually tracks and shows throughout —
// deliberately the game's own existing currencies (gold, personal
// prestige, the family's own standing), not an invented skill system.
// A royal or noble child doesn't get to decide much for herself yet, so
// these mostly move in response to how her family is doing and how she
// handles having so little say in her own life — not a stat grind.
function beginStory(figureKey) {
    const deck = STORY_DECKS[figureKey];
    if (!deck) throw new Error(`No story deck for: ${figureKey}`);
    const starting = deck.startingStats || {};
    _storyState = {
        figureKey, nodeId: deck.startNodeId, flags: {},
        gold: starting.gold != null ? starting.gold : 20,
        prestige: starting.prestige != null ? starting.prestige : 0,
        houseStanding: starting.houseStanding != null ? starting.houseStanding : 40,
    };
    return _storyState;
}

function adjustStoryStat(storyState, key, amount) {
    const current = storyState[key] || 0;
    storyState[key] = key === "gold" ? Math.max(0, current + amount) : Math.max(0, Math.min(100, current + amount));
}

function abandonStory() {
    _storyState = null;
}

function currentStoryNode() {
    if (!_storyState) return null;
    const deck = STORY_DECKS[_storyState.figureKey];
    return deck.nodes[_storyState.nodeId];
}

// Resolving a choice either moves to the next node, or — on a node whose
// chosen option points at "__HANDOFF__" — ends the story proper and
// starts the real, ongoing game via that deck's own handoff(storyState).
function chooseStoryOption(optionIndex) {
    const node = currentStoryNode();
    if (!node) return false;
    const option = node.choices[optionIndex];
    if (!option) return false;
    if (typeof option.apply === "function") option.apply(_storyState);
    // next is almost always a fixed node id, but a node whose single
    // "Continue" choice has to branch on a flag just set a moment ago
    // (a dice roll's outcome, say) can instead pass a function of the
    // story state.
    const next = typeof option.next === "function" ? option.next(_storyState) : option.next;
    if (next === "__HANDOFF__") {
        const deck = STORY_DECKS[_storyState.figureKey];
        deck.handoff(_storyState);
        _storyState = null;
        return true;
    }
    _storyState.nodeId = next;
    return true;
}

// Shared by every deck's handoff(): builds the real character, starts
// the real game, and marks the story as what it was — a legendary life,
// just one told as story rather than decision cards, so the rest of the
// game (titles, the family tree, continuing on as an heir) treats it
// exactly the same as the beat-driven figures.
function handoffToRealGame(opts) {
    const { figureKey, realmKey, name, gender, age, tier, traits, year, resumeHook } = opts;
    const character = createCharacter({ realmKey, tier, gender, age, name });
    if (traits) character.traits = traits.slice();
    character.sourceRealmKey = realmKey;
    character.royalHouseKey = realmKey;
    character.blurb = (LEGENDARY_FIGURES[figureKey] || {}).blurb || "";
    startNewGame("1461", realmKey, character);
    if (year != null) gameState.year = year;
    gameState.legendaryFigureKey = figureKey;
    gameState.legendaryFigureCharacterId = character.id;
    gameState.legendaryBeatsResolved = ((LEGENDARY_FIGURES[figureKey] || {}).beats || []).map(b => b.id);
    gameState.legendaryDeathsResolved = [];
    const story = getStoryState();
    gameState.legendaryStoryFlags = story ? story.flags : {};
    // What the story built up — her own gold, her own name, her
    // family's standing — carries into the real game rather than
    // vanishing the moment play actually starts.
    if (story) {
        gameState.player.gold = (gameState.player.gold || 0) + (story.gold || 0);
        gameState.player.prestige = (gameState.player.prestige || 0) + (story.prestige || 0);
        gameState.legendaryHouseStanding = story.houseStanding;
    }
    if (typeof resumeHook === "function") resumeHook(gameState, gameState.legendaryStoryFlags);
    return gameState;
}
