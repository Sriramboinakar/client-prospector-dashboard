from flask import Flask, render_template, jsonify, request
import sys, json, os, random
from pathlib import Path
from datetime import datetime, date, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

ON_VERCEL = os.environ.get("VERCEL") == "1"
DATA_DIR = Path("/tmp/data") if ON_VERCEL else Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
if ON_VERCEL:
    seed_dir = Path(__file__).parent.parent / "data"
    for f in ["clients.json", "todos.json", "logs.json", "campaigns.json", "revenue.json", "my_profile.json"]:
        target = DATA_DIR / f
        if not target.exists() and (seed_dir / f).exists():
            import shutil
            shutil.copy2(seed_dir / f, target)

import scripts.prospector as prospector_mod
import scripts.email_sender as email_mod
prospector_mod.DATA_DIR = DATA_DIR
email_mod.DATA_DIR = DATA_DIR

from scripts.prospector import (
    ProspectFinder, OutreachManager, PipelineTracker,
    WebsiteInspo, MessageGenerator, EmailCampaign,
    NailArtIntegration, AIScoring
)
from scripts.email_sender import send_email, send_campaign

app = Flask(__name__)
CLIENTS_FILE = DATA_DIR / "clients.json"
REVENUE_FILE = DATA_DIR / "revenue.json"
TODOS_FILE = DATA_DIR / "todos.json"
LOGS_FILE = DATA_DIR / "logs.json"

def load_json(path):
    if not path.exists() or path.stat().st_size == 0:
        return []
    with open(path) as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def load_clients():
    return load_json(CLIENTS_FILE)

def save_clients(clients):
    save_json(CLIENTS_FILE, clients)

def load_revenue():
    return load_json(REVENUE_FILE)

def save_revenue(entries):
    save_json(REVENUE_FILE, entries)

STAGES = ["lead", "contacted", "interested", "closed"]

@app.route("/")
def dashboard():
    return render_template("index.html")

@app.route("/api/clients")
def get_clients():
    clients = load_clients()
    return jsonify(clients)

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
        "lead_score": int(data.get("lead_score", 50)),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "created": datetime.now().isoformat()
    }
    clients.append(client)
    save_clients(clients)
    log_action("client_added", f"Added client: {client['business']}")
    return jsonify(client), 201

@app.route("/api/clients/<int:client_id>/status", methods=["PUT"])
def update_status(client_id):
    data = request.json
    new_status = data["status"]
    clients = load_clients()
    for c in clients:
        if c["id"] == client_id:
            old = c.get("status")
            c["status"] = new_status
            save_clients(clients)
            log_action("status_change", f"{c['business']}: {old} -> {new_status}")
            return jsonify(c)
    return jsonify({"error": "not found"}), 404

@app.route("/api/clients/<int:client_id>", methods=["PUT"])
def update_client(client_id):
    data = request.json
    clients = load_clients()
    for c in clients:
        if c["id"] == client_id:
            c["business"] = data.get("business", c["business"])
            c["niche"] = data.get("niche", c["niche"])
            c["contact"] = data.get("contact", c["contact"])
            c["email"] = data.get("email", c.get("email", ""))
            c["phone"] = data.get("phone", c.get("phone", ""))
            c["notes"] = data.get("notes", c.get("notes", ""))
            c["location"] = data.get("location", c.get("location", "local"))
            if "lead_score" in data:
                c["lead_score"] = int(data["lead_score"])
            save_clients(clients)
            log_action("client_updated", f"Updated client: {c['business']}")
            return jsonify(c)
    return jsonify({"error": "not found"}), 404

@app.route("/api/clients/<int:client_id>", methods=["DELETE"])
def delete_client(client_id):
    clients = load_clients()
    clients = [c for c in clients if c["id"] != client_id]
    save_clients(clients)
    log_action("client_deleted", f"Deleted client #{client_id}")
    return jsonify({"ok": True})

@app.route("/api/clients/bulk", methods=["POST"])
def bulk_add_clients():
    data = request.json
    names = data.get("names", [])
    status = data.get("status", "lead")
    niche = data.get("niche", "")
    clients = load_clients()
    added = []
    for name in names:
        if not name.strip():
            continue
        new_id = max([c["id"] for c in clients], default=0) + 1
        client = {
            "id": new_id,
            "business": name.strip(),
            "status": status,
            "niche": niche,
            "location": "local",
            "notes": "",
            "contact": "dm",
            "lead_score": 50,
            "email": "",
            "phone": "",
            "created": datetime.now().isoformat()
        }
        clients.append(client)
        added.append(client)
    save_clients(clients)
    log_action("bulk_add", f"Added {len(added)} clients")
    return jsonify(added), 201

@app.route("/api/revenue", methods=["GET"])
def get_revenue():
    entries = load_revenue()
    today_str = date.today().isoformat()
    today_total = sum(e["amount"] for e in entries if e["date"] == today_str)
    today = date.today()
    week_total = 0
    month_total = 0
    all_total = sum(e["amount"] for e in entries)
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
    yesterday = today - timedelta(days=1)
    yesterday_total = sum(e["amount"] for e in entries if e["date"] == yesterday.isoformat())
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
        "note": data.get("note", ""),
        "service": data.get("service", "")
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

    pipeline = pt.get_pipeline(clients)
    stage_counts = {s: pipeline.get(s, 0) for s in STAGES}

    return jsonify({
        "prospector": {"name": "Prospect Finder", "emoji": "🎯", "data": prospects_with_messages},
        "outreach": {"name": "Outreach Manager", "emoji": "📩", "data": om.get_strategy()},
        "pipeline": {"name": "Pipeline Tracker", "emoji": "📊", "data": pipeline},
        "builder": {"name": "Website Builder AI", "emoji": "🛠️", "data": wi.get_recommendations()}
    })

@app.route("/api/ai-score", methods=["POST"])
def ai_score():
    data = request.json
    scorer = AIScoring()
    result = scorer.score(data)
    return jsonify(result)

@app.route("/api/campaigns", methods=["GET"])
def get_campaigns():
    ec = EmailCampaign()
    return jsonify(ec.get_campaigns())

@app.route("/api/campaigns", methods=["POST"])
def create_campaign():
    data = request.json
    ec = EmailCampaign()
    c = ec.create_campaign(
        name=data["name"],
        subject=data["subject"],
        body=data["body"],
        target_status=data.get("target_status", "lead")
    )
    log_action("campaign_created", f"Campaign: {c['name']}")
    return jsonify(c), 201

@app.route("/api/campaigns/<int:campaign_id>/send", methods=["POST"])
def send_campaign_route(campaign_id):
    clients = load_clients()
    result = send_campaign(campaign_id, clients)
    log_action("campaign_sent", f"Campaign #{campaign_id}")
    return jsonify(result)

@app.route("/api/nailart")
def nailart_data():
    ni = NailArtIntegration()
    return jsonify(ni.get_client_stats())

@app.route("/api/nailart/bookings")
def nailart_bookings():
    ni = NailArtIntegration()
    return jsonify(ni.get_bookings())

@app.route("/api/todos", methods=["GET"])
def get_todos():
    return jsonify(load_json(TODOS_FILE))

@app.route("/api/todos", methods=["POST"])
def add_todo():
    data = request.json
    todos = load_json(TODOS_FILE)
    todo = {
        "id": max([t["id"] for t in todos], default=0) + 1,
        "text": data["text"],
        "done": False,
        "priority": data.get("priority", "medium"),
        "category": data.get("category", "general"),
        "created": datetime.now().isoformat()
    }
    todos.append(todo)
    save_json(TODOS_FILE, todos)
    return jsonify(todo), 201

@app.route("/api/todos/<int:todo_id>", methods=["PUT"])
def toggle_todo(todo_id):
    todos = load_json(TODOS_FILE)
    for t in todos:
        if t["id"] == todo_id:
            t["done"] = not t["done"]
            save_json(TODOS_FILE, todos)
            return jsonify(t)
    return jsonify({"error": "not found"}), 404

@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    todos = load_json(TODOS_FILE)
    todos = [t for t in todos if t["id"] != todo_id]
    save_json(TODOS_FILE, todos)
    return jsonify({"ok": True})

@app.route("/api/logs")
def get_logs():
    logs = load_json(LOGS_FILE)
    return jsonify(sorted(logs, key=lambda l: l["timestamp"], reverse=True)[:50])

def log_action(action, detail):
    logs = load_json(LOGS_FILE)
    log = {
        "id": max([l["id"] for l in logs], default=0) + 1,
        "action": action,
        "detail": detail,
        "timestamp": datetime.now().isoformat()
    }
    logs.append(log)
    if len(logs) > 200:
        logs = logs[-200:]
    save_json(LOGS_FILE, logs)

@app.route("/api/send-email", methods=["POST"])
def send_email_route():
    data = request.json
    result = send_email(
        to_email=data["to"],
        subject=data["subject"],
        body_html=data["body"].replace("\n", "<br>"),
        reply_to=data.get("reply_to")
    )
    if result.get("success"):
        log_action("email_sent", f"To: {data['to']}, Subject: {data['subject']}")
    return jsonify(result)

@app.route("/api/stats")
def get_stats():
    clients = load_clients()
    total = len(clients)
    active = sum(1 for c in clients if c.get("status") != "closed")
    contacted = sum(1 for c in clients if c.get("status") in ("contacted", "interested"))
    closed = sum(1 for c in clients if c.get("status") == "closed")
    return jsonify({
        "total_clients": total,
        "active_leads": active,
        "contacted": contacted,
        "closed": closed,
        "conversion": round(closed / max(total, 1) * 100)
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
