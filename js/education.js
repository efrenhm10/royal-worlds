// education.js — choosing how a minor child is raised. A real decision
// with a real payoff at maturity, not a flavor toggle: the chosen focus
// grows the matching skill every year through childhood and leaves a
// trait behind once the child comes of age at 16.

const EDUCATION_FOCI = [
    { key: "diplomacy", name: "Diplomacy", skillKey: "diplomacy", trait: "Shrewd", desc: "Courts, treaties, and the art of being liked by people you need." },
    { key: "martial", name: "Martial", skillKey: "martial", trait: "Gallant", desc: "The sword, the lance, and command of men in the field." },
    { key: "stewardship", name: "Stewardship", skillKey: "stewardship", trait: "Just", desc: "Running an estate, a treasury, a household." },
    { key: "intrigue", name: "Intrigue", skillKey: "intrigue", trait: "Paranoid", desc: "Reading a room, keeping a secret, knowing who to trust." },
    { key: "learning", name: "Learning", skillKey: "learning", trait: "Zealous", desc: "Letters, law, and the schools — a scholar's upbringing." },
    { key: "piety", name: "Piety", skillKey: null, trait: "Pious", desc: "Raised close to the Church — prayer, scripture, and a confessor's eye." },
];

function setupEducation(gameState) {
    gameState.education = gameState.education || {};
}

function canSetEducation(person) {
    return !!person && person.alive && person.age < 16;
}

function getEducationFocus(gameState, personId) {
    setupEducation(gameState);
    return gameState.education[personId] || null;
}

function setEducationFocus(gameState, personId, focusKey) {
    setupEducation(gameState);
    const person = getPerson(gameState, personId);
    if (!canSetEducation(person)) return false;
    const focus = EDUCATION_FOCI.find(f => f.key === focusKey);
    if (!focus) return false;
    gameState.education[personId] = focusKey;
    logEvent(`${person.name} has been set to a course of education in ${focus.name.toLowerCase()}.`);
    return true;
}

// Yearly hook: every child with a focus assigned grows the matching skill
// a little, and graduates into the matching trait the year they turn 16
// — the upbringing becomes a permanent part of who they are.
function tickEducation(gameState) {
    setupEducation(gameState);
    Object.keys(gameState.education).forEach(personIdStr => {
        const personId = Number(personIdStr);
        const person = getPerson(gameState, personId);
        if (!person || !person.alive) { delete gameState.education[personId]; return; }
        const focus = EDUCATION_FOCI.find(f => f.key === gameState.education[personId]);
        if (!focus) { delete gameState.education[personId]; return; }

        if (person.age >= 16) {
            if (!person.traits.includes(focus.trait)) person.traits.push(focus.trait);
            logEvent(`${person.name} has come of age — their education in ${focus.name.toLowerCase()} complete.`);
            delete gameState.education[personId];
            return;
        }

        if (focus.skillKey) {
            person.skills[focus.skillKey] = Math.min(25, (person.skills[focus.skillKey] || 0) + randInt(1, 3));
        } else {
            person.piety = (person.piety || 0) + randInt(1, 3);
        }
    });
}
