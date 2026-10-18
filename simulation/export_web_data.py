#!/usr/bin/env python3
"""
Export the two-week simulation into a compact JSON bundle consumed by the
web dashboard (Vercel demo mode). Produces frontend/src/data/simulation.json.
"""
import json
from pathlib import Path

import pandas as pd

BASE = Path(__file__).resolve().parent
REPO = BASE.parent
DATA = BASE / "data"
DEST = REPO / "frontend" / "src" / "data"
DEST.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(DATA / "simulation_2weeks.csv")
alerts = pd.read_csv(DATA / "alerts.csv")
summary = json.loads((BASE / "output" / "summary.json").read_text())

PONDS = {"Tank_A": "pond_001", "Tank_B": "pond_002"}
NAMES = {"Tank_A": "Pond A (Tank 1)", "Tank_B": "Pond B (Tank 2)"}

bundle = {
    "generated_at": "2025-06-15T00:00:00Z",
    "period_days": summary["period_days"],
    "dt_minutes": summary["time_step_minutes"],
    "thresholds": summary["thresholds"],
    "summary": summary,
    "ponds": {},
}

for tank, pid in PONDS.items():
    sub = df[df.tank == tank].copy()
    sub["hbin"] = (sub["day"] - 1) * 24 + sub["hour"].astype(int)
    agg = sub.groupby("hbin").agg(
        ph=("ph", "mean"), do=("dissolved_oxygen", "mean"),
        temperature=("temperature", "mean"), turbidity=("turbidity", "mean"),
        water_level=("water_level", "mean"),
        act_inlet=("act_inlet_pump", "max"), act_drain=("act_drain_pump", "max"),
        act_aerator=("act_aerator", "max"), act_heater=("act_heater", "max"),
        act_feeder=("act_feeder", "max"),
    ).reset_index()

    series = []
    for _, r in agg.iterrows():
        h = int(r["hbin"])
        day = h // 24 + 1
        hour = h % 24
        series.append({
            "t": f"D{day:02d}T{hour:02d}:00",
            "day": day, "hour": hour,
            "ph": round(r["ph"], 3),
            "dissolved_oxygen": round(r["do"], 3),
            "temperature": round(r["temperature"], 3),
            "turbidity": round(r["turbidity"], 2),
            "water_level": round(r["water_level"], 3),
            "inlet": int(r["act_inlet"]), "drain": int(r["act_drain"]),
            "aerator": int(r["act_aerator"]), "heater": int(r["act_heater"]),
            "feeder": int(r["act_feeder"]),
        })

    ta = alerts[alerts.tank == tank].copy()
    ta = ta.sort_values(["day", "hour", "type"])
    alist = []
    for i, r in ta.iterrows():
        alist.append({
            "_id": f"{pid}-alert-{i+1}",
            "type": r["type"], "severity": r["severity"],
            "value": float(r["value"]), "message": r["message"],
            "day": int(r["day"]), "hour": float(r["hour"]),
            "createdAt": f"2025-06-{int(r['day']):02d}T{int(r['hour']):02d}:"
                         f"{int((r['hour'] % 1) * 60):02d}:00Z",
            "acknowledged": False,
        })

    bundle["ponds"][pid] = {
        "id": pid, "tank": tank, "name": NAMES[tank],
        "series": series, "alerts": alist,
    }

out = DEST / "simulation.json"
out.write_text(json.dumps(bundle, indent=2))
print(f"Wrote {out} ({out.stat().st_size/1024:.1f} KB)")
print(f"Ponds: {list(bundle['ponds'])}, "
      f"series points: {[len(v['series']) for v in bundle['ponds'].values()]}")
