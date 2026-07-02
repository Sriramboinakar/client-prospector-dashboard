import json, os, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from datetime import datetime

DATA_DIR = Path(__file__).parent.parent / "data"

def load_config():
    return {
        "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_email": os.getenv("SMTP_EMAIL", ""),
        "smtp_password": os.getenv("SMTP_PASSWORD", ""),
        "from_name": os.getenv("FROM_NAME", "Sriram - Client Prospector")
    }

def send_email(to_email, subject, body_html, reply_to=None):
    cfg = load_config()
    if not cfg["smtp_email"] or not cfg["smtp_password"]:
        return {"success": False, "error": "SMTP not configured. Set SMTP_EMAIL and SMTP_PASSWORD in .env"}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f'{cfg["from_name"]} <{cfg["smtp_email"]}>'
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
<div style="background:linear-gradient(135deg,#1a1a3e,#2a2a5a);padding:30px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:22px">Client Prospector AI</h1>
<p style="color:#8888cc;margin:8px 0 0;font-size:13px">Smart business growth solutions</p>
</div>
<div style="padding:30px">
{body_html}
</div>
<div style="background:#fafafa;padding:20px;text-align:center;border-top:1px solid #eee">
<p style="color:#888;font-size:12px;margin:0">Sent by Client Prospector AI Dashboard</p>
</div>
</div></body></html>"""

    msg.attach(MIMEText(html, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(cfg["smtp_server"], cfg["smtp_port"]) as server:
            server.starttls(context=context)
            server.login(cfg["smtp_email"], cfg["smtp_password"])
            server.sendmail(cfg["smtp_email"], to_email, msg.as_string())
        return {"success": True, "to": to_email, "subject": subject}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_campaign(campaign_id, clients):
    path = DATA_DIR / "campaigns.json"
    if not path.exists():
        return {"success": False, "error": "No campaigns found"}

    with open(path) as f:
        campaigns = json.load(f)

    campaign = None
    for c in campaigns:
        if c["id"] == campaign_id:
            campaign = c
            break

    if not campaign:
        return {"success": False, "error": "Campaign not found"}

    results = []
    target = campaign["target_status"]
    matched = [c for c in clients if c.get("status") == target or target == "all"]

    for client in matched:
        business = client.get("business", "there")
        contact = client.get("contact", "")
        email = contact if "@" in contact else ""

        if not email:
            results.append({"business": business, "success": False, "error": "No email address"})
            continue

        body = campaign["body"].replace("{name}", business).replace("{business}", business)
        body_html = body.replace("\n", "<br>")

        r = send_email(email, campaign["subject"], body_html)
        results.append({"business": business, **r})

    campaign["sent"] += len([r for r in results if r.get("success")])
    campaign["status"] = "sent"
    campaign["sent_at"] = datetime.now().isoformat()
    self._save(campaigns)

    return {"success": True, "total": len(matched), "sent": campaign["sent"], "results": results}

def _save(data):
    with open(DATA_DIR / "campaigns.json", "w") as f:
        json.dump(data, f, indent=2)
