// data.js — shared raw data: name pools, surname pools, trait pools.
// Era- and realm-agnostic; realms.js holds the per-bookmark realm rosters
// themselves. Name pools carried over directly from royal-worlds.html's
// own NOBLE_NAME_POOLS/MERCHANT_SURNAMES (already well-researched this
// session), keyed by the same lowercase culture keys realms.js uses.

const NAME_POOLS = {
    england: { M: ["Thomas", "John", "Robert", "Richard", "Edmund", "Walter", "Humphrey"], F: ["Margaret", "Alice", "Joan", "Eleanor", "Agnes", "Isabel", "Cecily"], surnames: ["Stafford", "Herbert", "Hastings", "Howard", "Devereux", "Beaumont", "Courtenay", "Percy", "Clifford", "Roos"] },
    burgundy: { M: ["Jean", "Philippe", "Guy", "Adolf", "Louis"], F: ["Marguerite", "Jeanne", "Isabelle", "Catherine", "Yolande"], surnames: ["de Croÿ", "de Lannoy", "van Borselen", "de Ligne", "de Lalaing"] },
    france: { M: ["Jean", "Louis", "Charles", "Guy", "Robert"], F: ["Jeanne", "Marguerite", "Isabelle", "Yolande", "Anne"], surnames: ["de Montmorency", "d'Albret", "de Brézé", "de Coucy", "de Chabannes"] },
    scotland: { M: ["James", "Robert", "Archibald", "David", "Alexander"], F: ["Margaret", "Euphemia", "Janet", "Mary", "Elizabeth"], surnames: ["Douglas", "Hamilton", "Lindsay", "Kennedy", "Erskine"] },
    castile: { M: ["Diego", "Alonso", "Pedro", "Íñigo", "Rodrigo"], F: ["Beatriz", "Leonor", "Mencía", "Teresa", "Catalina"], surnames: ["de Mendoza", "de Guzmán", "Manrique", "de Velasco", "de Ayala"] },
    portugal: { M: ["João", "Diogo", "Afonso", "Fernando", "Vasco"], F: ["Beatriz", "Filipa", "Isabel", "Leonor", "Joana"], surnames: ["de Meneses", "de Sousa", "Pereira", "de Castro", "de Almeida"] },
    brittany: { M: ["Jean", "Pierre", "Guy", "François", "Olivier"], F: ["Anne", "Marguerite", "Françoise", "Jeanne", "Isabeau"], surnames: ["de Rohan", "de Rieux", "de Laval", "du Guesclin", "de Malestroit"] },
    aragon: { M: ["Ferran", "Joan", "Alfons", "Pere", "Martí"], F: ["Elionor", "Joana", "Beatriu", "Isabel", "Violant"], surnames: ["de Cardona", "de Urrea", "de Luna", "de Moncada", "de Centelles"] },
    austria: { M: ["Maximilian", "Sigismund", "Albrecht", "Leopold", "Ernst"], F: ["Kunigunde", "Margarete", "Elisabeth", "Katharina", "Eleonore"], surnames: ["von Liechtenstein", "von Starhemberg", "von Kuenring", "von Auersperg", "von Rosenberg"] },
    italy: { M: ["Lorenzo", "Cosimo", "Giovanni", "Piero", "Niccolò", "Filippo"], F: ["Lucrezia", "Caterina", "Bianca", "Contessina", "Maddalena", "Clarice"], surnames: ["Ridolfi", "Pazzi", "Strozzi", "Tornabuoni", "Salviati", "Albizzi"] },
    milan: { M: ["Galeazzo", "Ludovico", "Ercole", "Gian", "Ascanio", "Bianco"], F: ["Bianca", "Ippolita", "Beatrice", "Caterina", "Chiara", "Camilla"], surnames: ["Trivulzio", "Borromeo", "Landriani", "Pallavicino", "Rossi", "Visconti"] },
    venice: { M: ["Marco", "Andrea", "Zaccaria", "Vettore", "Nicolò", "Pietro"], F: ["Cassandra", "Elena", "Marina", "Chiara", "Paola", "Franceschina"], surnames: ["Contarini", "Mocenigo", "Foscari", "Dandolo", "Morosini", "Barbarigo"] },
    naples: { M: ["Ferrante", "Alfonso", "Enrico", "Federico", "Giovanni", "Antonello"], F: ["Ippolita", "Eleonora", "Isabella", "Giulia", "Beatrice", "Sancia"], surnames: ["Caracciolo", "Sanseverino", "Carafa", "del Balzo", "Piccolomini", "Orsini"] },
    hungary: { M: ["Mátyás", "János", "László", "István", "Miklós"], F: ["Erzsébet", "Katalin", "Borbála", "Ilona", "Zsófia"], surnames: ["Hunyadi", "Szilágyi", "Báthory", "Zápolya", "Perényi"] },
    poland: { M: ["Kazimierz", "Władysław", "Jan", "Zygmunt", "Aleksander"], F: ["Jadwiga", "Zofia", "Elżbieta", "Anna", "Barbara"], surnames: ["Jagiellon", "Tarnowski", "Ossoliński", "Firlej", "Zborowski"] },
    bohemia: { M: ["Jiří", "Václav", "Jan", "Vladislav", "Oldřich"], F: ["Anna", "Kateřina", "Ludmila", "Markéta", "Barbora"], surnames: ["Poděbrady", "Rožmberk", "Šternberk", "Kolowrat", "Hasištejnský"] },
    wallachia: { M: ["Vlad", "Radu", "Mircea", "Basarab", "Vladislav"], F: ["Voichița", "Maria", "Anca", "Despina", "Cneajna"], surnames: ["Drăculești", "Basarab", "Craiovescu", "Buzescu", "Bălăceanu"] },
    ottoman: { M: ["Mehmed", "Bayezid", "Cem", "Mustafa", "Selim"], F: ["Gülbahar", "Mükrime", "Çiçek", "Sitti", "Hatice"], surnames: ["Osman", "Çandarlı", "Evrenosoğlu", "Mihaloğlu", "Turahanoğlu"] },
};
NAME_POOLS.florence = NAME_POOLS.italy;
NAME_POOLS.rome = NAME_POOLS.italy;

// Personality/temperament pool — a short descriptive trait assigned at
// character creation, the same lightweight "flavor that occasionally
// nudges an outcome" role royal-worlds.html's own trait system played.
const TEMPERAMENT_TRAITS = [
    "Shrewd", "Pious", "Ambitious", "Cautious", "Wrathful", "Generous",
    "Vengeful", "Just", "Craven", "Gallant", "Patient", "Zealous",
    "Deceitful", "Honest", "Gluttonous", "Temperate", "Paranoid", "Trusting",
];

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickNamePool(cultureKey) {
    return NAME_POOLS[cultureKey] || NAME_POOLS.england;
}

function generatePeriodName(cultureKey, gender) {
    const pool = pickNamePool(cultureKey);
    const first = randomFrom(pool[gender] || pool.M);
    const surname = randomFrom(pool.surnames);
    return `${first} ${surname}`;
}
