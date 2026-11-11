import geopandas as gpd
import pandas as pd

PAVEMENT = "data/auscultation-chaussee-2024.gpkg"
TRUCK = "data/bdgeo_camion.geojson"
OUTPUT = "data/pavement_2024_a3.geojson"

# Load data
pavement = gpd.read_file(PAVEMENT)
truck = gpd.read_file(TRUCK)

pavement["ID_TRC"] = pd.to_numeric(pavement["ID_TRC"]).astype("Int64")
truck["id_trc"] = pd.to_numeric(truck["id_trc"]).astype("Int64")

# Reduce truck data to one record per road ID.
# If an ID contains conflicting classes, leave its class blank and flag it.
truck_classes = {}

for row in truck[["id_trc", "cam_class"]].itertuples(index=False):
    if pd.isna(row.id_trc) or pd.isna(row.cam_class):
        continue

    road_id = int(row.id_trc)
    truck_class = int(row.cam_class)

    if road_id not in truck_classes:
        truck_classes[road_id] = set()

    truck_classes[road_id].add(truck_class)

truck_summary = pd.DataFrame(
    [
        {
            "ID_TRC": road_id,
            "classes": sorted(classes)
        }
        for road_id, classes in truck_classes.items()
    ]
)

truck_summary["truck_class"] = truck_summary["classes"].apply(
    lambda x: x[0] if len(x) == 1 else None
)

truck_summary["truck_conflict"] = truck_summary["classes"].apply(
    lambda x: len(x) > 1
)

labels = {
    1: "Permitted at all times",
    2: "Permitted daytime; prohibited 19:00-07:00",
    3: "Prohibited except local delivery",
}

truck_summary["truck_regulation"] = truck_summary.apply(
    lambda row:
        "Conflicting regulation records"
        if row["truck_conflict"]
        else labels.get(row["truck_class"]),
    axis=1
)

truck_summary = truck_summary.drop(columns=["classes"])

# Join truck regulation to pavement using the shared road-segment ID
joined = pavement.merge(truck_summary, on="ID_TRC", how="left")

joined["truck_regulation"] = joined["truck_regulation"].fillna(
    "No matching truck regulation"
)

# Keep only fields needed by the web map
joined = joined[
    [
        "ID_TRC",
        "Rue",
        "Arrondissement",
        "Indice_PCI",
        "Etat_PCI",
        "truck_class",
        "truck_regulation",
        "geometry",
    ]
]

# Same web-map processing used for A2
joined["geometry"] = joined.geometry.simplify(5, preserve_topology=True)
joined = joined.to_crs(epsg=4326)

from pathlib import Path
Path(OUTPUT).write_text(joined.to_json(drop_id=True), encoding="utf-8")

print("A3 dataset created:", OUTPUT)
print("Total pavement segments:", len(joined))
print("Matched truck regulation:", joined["truck_class"].notna().sum())
print(
    "No matching regulation:",
    (joined["truck_regulation"] == "No matching truck regulation").sum()
)
print(
    "Conflicting records:",
    (joined["truck_regulation"] == "Conflicting regulation records").sum()
)
print("Truck class counts:")
print(joined["truck_class"].value_counts(dropna=False).sort_index())