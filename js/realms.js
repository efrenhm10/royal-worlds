// realms.js — the 1461 bookmark's realm roster: one entry per playable or
// NPC power, its ruling title, its actual historical ruler at that date,
// and the five realm attributes (wealth, stability, military strength,
// strategic vulnerability, religion) the rest of the game reads from.
//
// Tier numbers match the rank ladder in titles.js:
//   0 gentry, 1 knighted/landed, 2 baron, 3 count/earl, 4 duke/archduke,
//   5 king/queen, 6 emperor (rare recognition, not a starting tier).
//
// A note on accuracy: royal-worlds.html's old DYNASTIES table stored, for
// several realms, the scripted-event SUCCESSOR rather than the ruler who
// actually held the throne in 1461 (its "activatesOn" flag fired on that
// successor's own later accession, not on an accession that had already
// happened by 1461). Corrected here against the real historical record:
//   - France: was listed as "Charles VIII" (age 13) — but Charles VIII
//     wasn't born until 1470. The real 1461 king is Louis XI, who in fact
//     became king in 1461 itself, on Charles VII's death.
//   - Burgundy: was listed as "Mary of Burgundy" (age 20) — the real 1461
//     Duke is Philip the Good, who reigned until 1467.
//   - Portugal: was listed as "John II" (age 26) — John II wasn't born
//     until 1455. The real 1461 king is Afonso V.
//   - Scotland: was listed as "James IV" (age 15) — the real 1461 king is
//     James III, a child of about 9, under regency since his father's
//     death in 1460.
// Milan and Naples were already correct in the old table (their flags
// refer to their own later deaths, not an accession already in the past).
// England and Castile were never in that table at all; supplied here from
// general historical knowledge (Edward IV; Henry IV "the Impotent").

const REALMS = {
    england: {
        key: "england", name: "England", cultureKey: "england",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Edward IV", gender: "M", age: 19, traits: ["Gallant", "Ambitious"] },
        attributes: { wealth: 55, stability: 30, militaryStrength: 60, strategicVulnerability: 60 },
        religion: "Roman Catholic",
    },
    france: {
        key: "france", name: "France", cultureKey: "france",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Louis XI", gender: "M", age: 38, traits: ["Shrewd", "Paranoid"] },
        attributes: { wealth: 70, stability: 55, militaryStrength: 100, strategicVulnerability: 30 },
        religion: "Roman Catholic",
    },
    burgundy: {
        key: "burgundy", name: "Burgundy", cultureKey: "burgundy",
        titleM: "Duke", titleF: "Duchess", titleTier: 4,
        government: "hereditary", startable: true,
        ruler: { name: "Philip the Good", gender: "M", age: 67, traits: ["Gallant", "Patient"] },
        attributes: { wealth: 90, stability: 75, militaryStrength: 65, strategicVulnerability: 55 },
        religion: "Roman Catholic",
    },
    brittany: {
        key: "brittany", name: "Brittany", cultureKey: "brittany",
        titleM: "Duke", titleF: "Duchess", titleTier: 4,
        government: "hereditary", startable: true,
        ruler: { name: "Francis II", gender: "M", age: 23, traits: ["Cautious", "Just"] },
        attributes: { wealth: 45, stability: 60, militaryStrength: 30, strategicVulnerability: 50 },
        religion: "Roman Catholic",
    },
    castile: {
        key: "castile", name: "Castile", cultureKey: "castile",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Henry IV", gender: "M", age: 36, traits: ["Craven", "Trusting"] },
        attributes: { wealth: 60, stability: 35, militaryStrength: 65, strategicVulnerability: 40 },
        religion: "Roman Catholic",
    },
    aragon: {
        key: "aragon", name: "Aragon", cultureKey: "aragon",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "John II", gender: "M", age: 63, traits: ["Shrewd", "Wrathful"] },
        attributes: { wealth: 55, stability: 50, militaryStrength: 70, strategicVulnerability: 45 },
        religion: "Roman Catholic",
    },
    portugal: {
        key: "portugal", name: "Portugal", cultureKey: "portugal",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Afonso V", gender: "M", age: 29, traits: ["Zealous", "Gallant"] },
        attributes: { wealth: 50, stability: 65, militaryStrength: 40, strategicVulnerability: 25 },
        religion: "Roman Catholic",
    },
    austria: {
        key: "austria", name: "Austria", cultureKey: "austria",
        titleM: "Archduke", titleF: "Archduchess", titleTier: 4,
        government: "hereditary", startable: true,
        ruler: { name: "Frederick III", gender: "M", age: 46, traits: ["Patient", "Cautious"] },
        attributes: { wealth: 50, stability: 55, militaryStrength: 75, strategicVulnerability: 50 },
        religion: "Roman Catholic",
        note: "Also Holy Roman Emperor — the rare tier-6 recognition, held personally by this ruler rather than tied to the Austrian title itself.",
    },
    milan: {
        key: "milan", name: "Milan", cultureKey: "milan",
        titleM: "Duke", titleF: "Duchess", titleTier: 4,
        government: "hereditary", startable: true,
        ruler: { name: "Francesco Sforza", gender: "M", age: 60, traits: ["Shrewd", "Ambitious"] },
        attributes: { wealth: 75, stability: 65, militaryStrength: 50, strategicVulnerability: 55 },
        religion: "Roman Catholic",
    },
    venice: {
        key: "venice", name: "Venice", cultureKey: "venice",
        titleM: "Doge", titleF: "Doge", titleTier: 4,
        government: "elective", startable: true,
        ruler: { name: "Pasquale Malipiero", gender: "M", age: 74, traits: ["Patient", "Just"] },
        attributes: { wealth: 90, stability: 80, militaryStrength: 55, strategicVulnerability: 55 },
        religion: "Roman Catholic",
        note: "The Doge is elected, not inherited — a ruling family's children don't automatically succeed, though a well-placed dynasty keeps angling for the next election.",
    },
    naples: {
        key: "naples", name: "Naples", cultureKey: "naples",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Ferdinand I", gender: "M", age: 37, traits: ["Deceitful", "Vengeful"] },
        attributes: { wealth: 55, stability: 55, militaryStrength: 55, strategicVulnerability: 50 },
        religion: "Roman Catholic",
    },
    florence: {
        key: "florence", name: "Florence", cultureKey: "florence",
        titleM: "Signore", titleF: "Signora", titleTier: 3,
        government: "hereditary", startable: true,
        ruler: { name: "Piero di Cosimo de' Medici", gender: "M", age: 45, traits: ["Cautious", "Temperate"] },
        attributes: { wealth: 80, stability: 70, militaryStrength: 20, strategicVulnerability: 30 },
        religion: "Roman Catholic",
        note: "A republic in name, ruled in practice by the Medici — holds no formal crown, so its tier reads as Signore rather than a true monarch's.",
    },
    rome: {
        key: "rome", name: "The Papal States", cultureKey: "rome",
        titleM: "Pope", titleF: "Pope", titleTier: 6,
        government: "theocratic", startable: false,
        ruler: { name: "Pius II", gender: "M", age: 56, traits: ["Pious", "Zealous"] },
        attributes: { wealth: 60, stability: 60, militaryStrength: 15, strategicVulnerability: 45 },
        religion: "Roman Catholic",
        note: "Elected by conclave from the College of Cardinals, not inherited — this is the destination of the Church-career life path, not a starting dynasty. Present here as an NPC power for diplomacy and the Church-pressure systems.",
    },
    hungary: {
        key: "hungary", name: "Hungary", cultureKey: "hungary",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Matthias Corvinus", gender: "M", age: 18, traits: ["Ambitious", "Shrewd"] },
        attributes: { wealth: 55, stability: 50, militaryStrength: 60, strategicVulnerability: 70 },
        religion: "Roman Catholic",
    },
    poland: {
        key: "poland", name: "Poland", cultureKey: "poland",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "Casimir IV", gender: "M", age: 31, traits: ["Patient", "Just"] },
        attributes: { wealth: 50, stability: 65, militaryStrength: 70, strategicVulnerability: 40 },
        religion: "Roman Catholic",
    },
    bohemia: {
        key: "bohemia", name: "Bohemia", cultureKey: "bohemia",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "George of Poděbrady", gender: "M", age: 41, traits: ["Honest", "Cautious"] },
        attributes: { wealth: 45, stability: 45, militaryStrength: 55, strategicVulnerability: 45 },
        religion: "Catholic, with an unreconciled Hussite majority",
    },
    wallachia: {
        key: "wallachia", name: "Wallachia", cultureKey: "wallachia",
        titleM: "Voivode", titleF: "Voivodess", titleTier: 4,
        government: "hereditary", startable: true,
        ruler: { name: "Vlad III", gender: "M", age: 30, traits: ["Wrathful", "Vengeful"] },
        attributes: { wealth: 25, stability: 35, militaryStrength: 25, strategicVulnerability: 85 },
        religion: "Eastern Orthodox",
    },
    ottoman: {
        key: "ottoman", name: "The Ottoman Empire", cultureKey: "ottoman",
        titleM: "Sultan", titleF: "Sultana", titleTier: 6,
        government: "hereditary", startable: false,
        ruler: { name: "Mehmed II", gender: "M", age: 29, traits: ["Ambitious", "Zealous"] },
        attributes: { wealth: 75, stability: 80, militaryStrength: 90, strategicVulnerability: 20 },
        religion: "Sunni Islam",
        note: "Not a startable dynasty — this game's Church/Reformation/Crown-Authority systems are built around Catholic Europe. Present as the great outside power: a rival, a threat, a source of the Wallachian and Hungarian frontier's strategic vulnerability.",
    },
    scotland: {
        key: "scotland", name: "Scotland", cultureKey: "scotland",
        titleM: "King", titleF: "Queen", titleTier: 5,
        government: "hereditary", startable: true,
        ruler: { name: "James III", gender: "M", age: 9, traits: ["Trusting", "Patient"] },
        attributes: { wealth: 30, stability: 30, militaryStrength: 35, strategicVulnerability: 45 },
        religion: "Roman Catholic",
        note: "A child king under regency since his father James II's death in 1460.",
    },
};

function listRealms() {
    return Object.values(REALMS);
}

function listStartableRealms() {
    return listRealms().filter(r => r.startable);
}

function getRealm(key) {
    return REALMS[key];
}
