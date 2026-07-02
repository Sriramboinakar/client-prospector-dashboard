import json, os, random, re
from pathlib import Path
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).parent.parent / "data"

def get_gemini():
    try:
        import google.generativeai as genai
        key = os.getenv("GEMINI_API_KEY") or ""
        if key:
            genai.configure(api_key=key)
            return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        pass
    return None

def ai_json(prompt, fallback):
    model = get_gemini()
    if not model:
        return fallback
    try:
        resp = model.generate_content(prompt + "\n\nRespond with ONLY valid JSON. No markdown, no code fences.")
        text = resp.text.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception:
        return fallback

NICHES = ["salons", "dentists", "restaurants", "real estate", "coaches", "e-com", "fashion", "photography"]

class ProspectFinder:
    def __init__(self):
        self.name = "Prospect Finder"
        self.emoji = "🎯"

    def generate_prospects(self, count=6):
        prompt = f"""Generate {count} realistic local business prospects in Hyderabad, India who need a website + AI features.
For each prospect include: business (name), niche, location (Hyderabad area), lead_score (0-100),
reason (why they need a site), contact (dm/email/phone), status ("active"), notes.
Return as a JSON array of objects."""
        result = ai_json(prompt, None)
        if result and isinstance(result, list):
            for i, p in enumerate(result):
                p["id"] = i + 1
                p.setdefault("status", "active")
                p.setdefault("contact", "dm")
            return sorted(result, key=lambda p: p.get("lead_score", 0), reverse=True)
        return [
            {"id":1,"business":"Shevvy Chin","niche":"fashion/style","location":"local","lead_score":90,"reason":"needs brand portfolio website","contact":"dm - hot lead","status":"active","notes":"Existing client"},
            {"id":2,"business":"Nail Art Girl","niche":"beauty/nails","location":"local","lead_score":85,"reason":"portfolio/booking site needed","contact":"dm - hot lead","status":"active","notes":"Existing client"},
            {"id":3,"business":"Hyderabad Bakers","niche":"food","location":"Banjara Hills","lead_score":72,"reason":"no online ordering","contact":"dm","status":"active","notes":""},
            {"id":4,"business":"Style Cuts Salon","niche":"salon","location":"Kukatpally","lead_score":65,"reason":"old website, needs redesign","contact":"email","status":"active","notes":""},
            {"id":5,"business":"Dr. Sharma Dental","niche":"dentist","location":"Jubilee Hills","lead_score":55,"reason":"wants online booking","contact":"phone","status":"active","notes":""},
            {"id":6,"business":"Click Studio","niche":"photography","location":"Hitech City","lead_score":45,"reason":"portfolio + client portal","contact":"dm","status":"active","notes":""}
        ]

class OutreachManager:
    def __init__(self):
        self.name = "Outreach Manager"
        self.emoji = "📩"

    def get_strategy(self):
        return {
            "best_platforms": [
                "Instagram DMs - best for local businesses (80% response rate)",
                "Email - best for established businesses",
                "WhatsApp - high open rate in India",
                "LinkedIn - best for B2B/startups"
            ],
            "timing": [
                "Tue-Thu 10am-12pm best send times",
                "Follow up after 3 days max 2 follow ups",
                "Weekend evenings also good for salon/beauty businesses"
            ],
            "pitch_tips": [
                "Mention their business name specifically",
                "Point out one thing to improve on their current site",
                "Lead with value ('I can get you more bookings'), not price",
                "Offer a free audit or sample AI demo",
                "Share a relevant portfolio example"
            ]
        }

class PipelineTracker:
    def __init__(self):
        self.name = "Pipeline Tracker"
        self.emoji = "📊"

    def get_pipeline(self, clients):
        stages = {"lead": 0, "contacted": 0, "interested": 0, "closed": 0}
        for c in clients:
            s = c.get("status", "lead")
            if s in stages:
                stages[s] += 1
        total = len(clients)
        closed = stages["closed"]
        rev_potential = sum(c.get("lead_score", 50) * 200 for c in clients)
        return {
            "leads": stages["lead"],
            "contacted": stages["contacted"],
            "interested": stages["interested"],
            "closed": closed,
            "total_clients": total,
            "revenue_potential": f"₹{rev_potential:,}",
            "conversion_rate": f"{round(closed / max(total, 1) * 100)}%"
        }

class MessageGenerator:
    def __init__(self):
        self.name = "Message Generator"
        self.emoji = "✍️"

    def generate(self, prospect):
        name = prospect.get("business", "there")
        niche = prospect.get("niche", "your industry")
        prompt = f"""Write 4 short outreach messages for a prospect named '{name}' in the '{niche}' niche.
Generate: 1 cold DM, 1 cold email, 1 WhatsApp message, 1 follow-up.
Make them personalized, friendly, and focused on getting them a website + AI features.
Return as a JSON object with keys: cold_dm, cold_email, whatsapp, follow_up."""
        result = ai_json(prompt, None)
        if result and isinstance(result, dict):
            return {"copy_paste": list(result.values())}
        return {
            "copy_paste": [
                f"Hey {name}! I build modern websites + AI chatbots for {niche} businesses. Would you be open to a quick chat?",
                f"Hi {name}, I help {niche} brands get more clients online. Free to see what I can build for you?",
                f"Hey {name}! Quick one — I do websites + AI for {niche}. Got 2 mins to check a sample?",
                f"Hi {name}, following up! I'd love to show you how I can help {niche} businesses grow online."
            ]
        }

class EmailCampaign:
    def __init__(self):
        self.name = "Email Campaign Manager"
        self.emoji = "📧"

    def get_campaigns(self):
        path = DATA_DIR / "campaigns.json"
        if not path.exists():
            return []
        with open(path) as f:
            return json.load(f)

    def save_campaigns(self, campaigns):
        with open(DATA_DIR / "campaigns.json", "w") as f:
            json.dump(campaigns, f, indent=2)

    def create_campaign(self, name, subject, body, target_status="lead"):
        campaigns = self.get_campaigns()
        c = {
            "id": max([c["id"] for c in campaigns], default=0) + 1,
            "name": name,
            "subject": subject,
            "body": body,
            "target_status": target_status,
            "sent": 0,
            "opened": 0,
            "replied": 0,
            "created": datetime.now().isoformat(),
            "status": "draft"
        }
        campaigns.append(c)
        self.save_campaigns(campaigns)
        return c

class NailArtIntegration:
    def __init__(self):
        self.name = "Nail Art Hub Data"
        self.emoji = "💅"

    def get_bookings(self):
        path = Path("C:/Users/SRIRAM/Desktop/nairarthub-website/data/bookings.json")
        if not path.exists():
            return []
        try:
            with open(path) as f:
                return json.load(f)
        except:
            return []

    def get_client_stats(self):
        bookings = self.get_bookings()
        if not bookings:
            return {"total": 0, "unique_clients": 0, "services": {}, "branches": {}, "revenue_total": 0}
        clients = set()
        services = {}
        branches = {}
        revenue = 0
        for b in bookings:
            clients.add(b.get("client_name", ""))
            svc = b.get("service_name", "Unknown")
            services[svc] = services.get(svc, 0) + 1
            br = b.get("branch_name", "Unknown")
            branches[br] = branches.get(br, 0) + 1
            revenue += b.get("total", 0)
        return {
            "total": len(bookings),
            "unique_clients": len(clients),
            "services": services,
            "branches": branches,
            "revenue_total": revenue
        }

class AIScoring:
    def __init__(self):
        self.name = "AI Lead Scorer"
        self.emoji = "🧠"

    def score(self, client):
        business = client.get("business", "")
        niche = client.get("niche", "")
        prompt = f"""Score this business prospect from 1-100 on how likely they are to buy a website + AI chatbot.

Business: {business}
Niche: {niche}
Location: {client.get("location", "local")}
Current notes: {client.get("notes", "")}

Return ONLY a JSON object with: score (0-100), reasoning (1 sentence), suggested_action (what to do next)."""
        result = ai_json(prompt, None)
        if result and "score" in result:
            return result
        return {"score": random.randint(40, 90), "reasoning": "Based on general market fit", "suggested_action": "Send initial outreach"}

class WebsiteInspo:
    def __init__(self):
        self.name = "Website Builder AI"
        self.emoji = "🛠️"

    def get_recommendations(self):
        return {
            "free_tools": [
                "Bolt.new - AI builds full sites from prompt",
                "Replit AI - Build & deploy fast",
                "GitHub Pages + templates - free hosting",
                "Vercel + Flask - deploy Python backends free"
            ],
            "what_to_charge": [
                "Basic business site (5 pages) - \u20b95-15k",
                "AI chatbot integration - \u20b910-20k extra",
                "E-commerce store - \u20b920-50k",
                "Custom web app + AI - \u20b950k-2L",
                "Monthly maintenance - \u20b92-5k/mo"
            ],
            "stack": [
                "Next.js / React for frontend",
                "Flask/FastAPI for backend",
                "Supabase/Firebase for database",
                "Vercel/Render for free hosting",
                "Gemini API for AI features"
            ]
        }
