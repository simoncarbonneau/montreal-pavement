# Montréal Arterial Pavement Condition — 2024 Snapshot

## Project

The larger project looks at whether pavement condition on Montréal's arterial roads shows a pattern in relation to designated truck routes.

The map is for Montréal borough infrastructure planners and road-maintenance teams.

For this A2 version, users can explore the 2024 pavement-condition data by toggling condition classes and clicking road segments to inspect the street name, borough, PCI score and condition.

The truck-route comparison is not included yet, so this version does not make any claim about whether truck traffic is related to pavement condition.

The larger project uses two datasets: Montréal's pavement-condition data and the truck-route dataset. This A2 focuses only on the 2024 pavement-condition data.

## Data source

- **Dataset:** Indicateurs de condition des chaussées du réseau routier
- **Publisher:** Ville de Montréal
- **Dataset page:** [Données Québec](https://www.donneesquebec.ca/recherche/dataset/vmtl-condition-chaussees-reseau-routier)
- **Licence:** CC BY 4.0
- **Data used:** 2024 arterial network (RAAV)
- **Accessed:** September 30, 2026

## Data processing

The pipeline is in `notebooks/pavement_pipeline.ipynb`.

- Read the source GeoPackage with GeoPandas. Its original CRS is EPSG:32188.
- Keep `Rue`, `Arrondissement`, `Indice_PCI` and `Etat_PCI`, along with the line geometry, for the web map.
- Simplify the line geometry with a 5-metre tolerance for the web.
- Convert the data to EPSG:4326 for Leaflet.
- Write `data/pavement_2024.geojson` with six decimal places of coordinate precision.
- Use the final validation cell to check the feature count, CRS, Montréal bounds, required properties, geometry type and file size.

The validation currently passes with 17,176 road segments. The geometry type is LineString.

## How to run

1. Open the project folder in VS Code.
2. Open `site/index.html` with Live Server.
3. The map should load 17,176 road segments.
4. Use the top-right condition controls to toggle pavement-condition classes.
5. Click a road segment to inspect its street name, borough, PCI score and condition.

## Not in this iteration

I left the truck-route comparison out of A2 because it needs a second dataset and another spatial join. For this version, I focused on getting the pavement-condition map working properly first.

## Testing

- The notebook validation cell prints `All checks passed`.
- The page reports 17,176 road segments loaded.
- I tested the condition controls by switching the pavement-condition categories on and off.
- I clicked several road segments and checked that the street, borough, PCI score and condition appeared correctly.
- When I first loaded the adapted map, the Montréal pavement data worked but the page still had the old Vancouver sewer title. I corrected the text in `index.html`, reloaded the page and checked it again.
- I gave the map to someone who had not seen the project before. He immediately used the condition filters and clicked road segments without help. He noticed that the road-segment count stayed at 17,176 even when categories were hidden, so I changed the counter to update with the visible condition layers. I also made the road lines slightly thicker to make them easier to click.
- I also checked the source data for duplicate segment IDs and identical geometries. No duplicate `ID_TRC` values or identical road geometries were found.

## AI disclosure

**Lane:** Bring your own agent (Blue).

I used ChatGPT, GPT-5.6 Sol, and Codex in VS Code during A2. ChatGPT helped me understand the assignment requirements, troubleshoot problems and turn tasks into specific prompts for Codex. It also helped draft some wording for the page and README.

Codex in VS Code (model version not shown) inspected my project files and made bounded changes to the notebook, `app.js`, `index.html`, `style.css` and `README.md`. I generally asked it to work on one file or one behaviour at a time.

I decided to keep A2 focused on pavement condition and leave the truck-route comparison for later. I ran the notebook and tested the changes myself. The first run failed because GeoPandas was not installed, so I installed it and reran the notebook successfully. I checked that the validation printed `All checks passed`, confirmed that 17,176 road segments loaded, tested the condition switches and clicked several road segments to check the popup information. I also corrected page wording, source information and HTML formatting after reviewing the results.

AI helped with the implementation, but I made the scope decisions, ran the tests and decided what went into the final version.

## A3 Feature Tests — Written Before Implementation

### Test 1 — Truck regulation filter
**Action:** Select one truck regulation class.

**Expected:** Only 2024 pavement segments associated with that truck regulation class remain visible. Segments remain coloured according to pavement condition, and the displayed statistics update for the selected group.

### Test 2 — Return to all arterial pavement
**Action:** After selecting a truck regulation class, select “All arterial roads.”

**Expected:** All 17,176 pavement segments are shown again and the statistics return to values for the complete 2024 arterial pavement dataset.

### Test 3 — Edge case: no matching truck regulation
**Action:** Display pavement segments whose ID_TRC has no matching record in the truck regulation dataset.

**Expected:** The application handles these segments without errors, identifies them as having no matching truck regulation, and continues to display their pavement information normally.