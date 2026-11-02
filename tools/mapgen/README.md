# Map shape generator

Regenerates `js/realm_shapes.js` (The Theater's territory outlines) from
a real historical-borders dataset.

## Usage

1. Download the source data (not committed here — ~3.4MB, third-party):
   ```
   curl -o ../../../mapdata/world_1492.geojson \
     https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1492.geojson
   ```
   (adjust the path to wherever you keep it — `generate.js` expects it at
   `../mapdata/world_1492.geojson` relative to this file by default; edit
   the `fs.readFileSync` path at the top of `generate.js` if you put it
   elsewhere.)

2. Run: `node generate.js` — writes `../../js/realm_shapes.js`.

## Why 1492, not 1461

No public-domain GeoJSON snapshot exists for 1461 specifically; 1492 is
the nearest year `historical-basemaps` provides. 15 of the game's 22
realms map directly onto that file's features (England, Scotland,
France, Portugal, Castile, Aragon, Brittany, Poland-Lithuania, Hungary,
Ottoman Empire, Papal States, Venice, Teutonic Knights, Denmark-
Norway+Sweden merged into Kalmar, Grand Duchy of Moscow). The other 7
(Burgundy, Austria, Bohemia, Milan, Florence, Naples, Wallachia) aren't
present as separate shapes in that file (lumped into one "Holy Roman
Empire" blob, or the Italian city-states just aren't included) — those
are hand-approximated lon/lat boxes in `HAND_DRAWN` inside `generate.js`,
run through the exact same projection so they sit consistently alongside
the real shapes. If the realm roster changes, or a better/closer-year
source is found, update `REALM_SOURCES`/`HAND_DRAWN` and re-run.
