from flask import Flask, render_template, jsonify, request
import sys
import json
import os
from pathlib import Path
from datetime import datetime, date
sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.prospector import ProspectFinder, OutreachManager, PipelineTracker, WebsiteInspo, MessageGenerator

app = Flask(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
CLIENTS_FILE = DATA_DIR / "clients.json"
REVENUE_FILE = DATA_DIR / "revenue.json"

def load_clients():
    if not CLIENTS_FILE.exists():
        return []
    with open(CLIENTS_FILE) as f:
        return json.load(f)

def save_clients(clients):
    with open(CLIENTS_FILE, "w") as f:
        json.dump(clients, f, indent=2)

def load_revenue():
    if not REVENUE_FILE.exists():
        return []
    with open(REVENUE_FILE) as f:
        return json.load(f)

def save_revenue(entries):
    with open(REVENUE_FILE, "w") as f:
        json.dump(entries, f, indent=2)

STAGES = ["lead", "contacted", "interested", "closed"]

@app.route("/")
def dashboard():
    return render_template("index.html")

@app.route("/api/clients")
def get_clients():
    return jsonify(load_clients())

@app.route("/api/clients", methods=["POST"])
def add_client():
    data = request.json
    clients = load_clients()
    new_id = max([c["id"] for c in clients], default=0) + 1
    client = {
        "id": new_id,
        "business": data["business"],
        "status": data.get("status", "lead"),
        "niche": data.get("niche", ""),
        "location": data.get("location", "local"),
        "notes": data.get("notes", ""),
        "contact": data.get("contact", "dm"),
        "lead_score": int(data.get("lead_score", 50))
    }
    clients.append(client)
    save_clients(clients)
    return jsonify(client), 201

@app.route("/api/clients/<int:client_id>/status", methods=["PUT"])
def update_status(client_id):
    data = request.json
    new_status = data["status"]
    clients = load_clients()
    for c in clients:
        if c["id"] == client_id:
            c["status"] = new_status
            save_clients(clients)
            return jsonify(c)
    return jsonify({"error": "not found"}), 404

@app.route("/api/clients/<int:client_id>", methods=["DELETE"])
def delete_client(client_id):
    clients = load_clients()
    clients = [c for c in clients if c["id"] != client_id]
    save_clients(clients)
    return jsonify({"ok": True})

@app.route("/api/revenue", methods=["GET"])
def get_revenue():
    entries = load_revenue()
    today_str = date.today().isoformat()
    today_total = sum(e["amount"] for e in entries if e["date"] == today_str)
    week_total = 0
    month_total = 0
    all_total = sum(e["amount"] for e in entries)
    today = date.today()
    for e in entries:
        d = e["date"]
        if d.startswith(str(today.year) + "-" + str(today.month).zfill(2)):
            month_total += e["amount"]
        try:
            ed = date.fromisoformat(d)
            if today.isocalendar()[1] == ed.isocalendar()[1] and today.year == ed.year:
                week_total += e["amount"]
        except:
            pass
    yesterday = date.today()
    from datetime import timedelta
    yesterday_date = today - timedelta(days=1)
    yesterday_total = sum(e["amount"] for e in entries if e["date"] == yesterday_date.isoformat())
    return jsonify({
        "entries": entries,
        "today": today_total,
        "yesterday": yesterday_total,
        "this_week": week_total,
        "this_month": month_total,
        "all_time": all_total
    })

@app.route("/api/revenue", methods=["POST"])
def add_revenue():
    data = request.json
    entries = load_revenue()
    entry = {
        "id": max([e["id"] for e in entries], default=0) + 1,
        "client": data.get("client", "Unknown"),
        "amount": int(data["amount"]),
        "date": data.get("date", date.today().isoformat()),
        "note": data.get("note", "")
    }
    entries.append(entry)
    save_revenue(entries)
    return jsonify(entry), 201

@app.route("/api/revenue/<int:entry_id>", methods=["DELETE"])
def delete_revenue(entry_id):
    entries = load_revenue()
    entries = [e for e in entries if e["id"] != entry_id]
    save_revenue(entries)
    return jsonify({"ok": True})

@app.route("/api/agents")
def get_agents():
    clients = load_clients()
    pf = ProspectFinder()
    om = OutreachManager()
    pt = PipelineTracker()
    wi = WebsiteInspo()
    mg = MessageGenerator()

    prospects = pf.generate_prospects(6)
    prospects_with_messages = []
    for p in prospects:
        messages = mg.generate(p)
        prospects_with_messages.append({**p, "messages": messages["copy_paste"]})

    stage_counts = {s: 0 for s in STAGES}
    for c in clients:
        s = c.get("status", "lead")
        if s in stage_counts:
            stage_counts[s] += 1

    revenue_map = {"lead": 0, "contacted": 0, "interested": 25000, "closed": 50000}
    potential = sum(revenue_map.get(c.get("status", "lead"), 0) for c in clients)
    closed_count = stage_counts.get("closed", 0)
    total = len(clients)
    conv = round(closed_count / max(total, 1) * 100)

    return jsonify({
        "prospector": {"name": "Prospect Finder", "emoji": "🎯", "data": prospects_with_messages},
        "outreach": {"name": "Outreach Manager", "emoji": "📩", "data": om.get_strategy()},
        "pipeline": {
            "name": "Pipeline Tracker", "emoji": "📊",
            "data": {
                "leads": stage_counts.get("lead", 0),
                "contacted": stage_counts.get("contacted", 0),
                "interested": stage_counts.get("interested", 0),
                "closed": closed_count,
                "revenue_potential": f"₹{potential:,}",
                "conversion_rate": f"{conv}%",
                "total_clients": total
            }
        },
        "builder": {"name": "Website Builder AI", "emoji": "🛠️", "data": wi.get_recommendations()}
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
