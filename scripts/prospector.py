import json
import random
from pathlib import Path
from datetime import datetime, timedelta

DATA_DIR = Path(__file__).parent.parent / "data"

NICHES = ["local businesses", "startups", "restaurants", "real estate agents", "coaches", "salons", "dentists", "e-com stores"]
OUTREACH_TEMPLATES = {
    "cold_dm": [
        "Hey {name}! I saw your page and noticed you could benefit from a modern website. I build custom sites with AI features. Interested?",
        "Hi {name}, I help businesses like yours get more customers with a professional website + AI chatbot. Free consultation?",
        "Hey {name}, quick question — are you happy with your current website? I build affordable AI-powered sites."
    ],
    "cold_email": [
        "Subject: Website + AI upgrade for {business}\n\nHi {name},\n\nI help {niche} get more leads with custom websites and AI agents. Would you be open to a quick chat?\n\nBest,\nSriram",
        "Subject: Quick thought for {business}\n\nHey {name},\n\nNoticed {business} is growing. I build websites + AI assistants for {niche} that automate customer inquiries. Free to hop on a call?\n\nCheers,\nSriram"
    ],
    "follow_up": [
        "Hey {name}, just following up on my last message. I'd love to show you what I can build for {business}.",
        "Hi {name}, no pressure at all — but if you ever want to upgrade your online presence, I'm here."
    ]
}

class ProspectFinder:
    def __init__(self):
        self.name = "Prospect Finder"
        self.emoji = "🎯"

    def generate_prospects(self, count=5):
        prospects = [
            {
                "id": 1, "business": "Shevvy Chin", "niche": "fashion/style",
                "location": "local", "lead_score": 90,
                "reason": "website needed for brand portfolio + maybe e-commerce",
                "contact": "dm - hot lead", "status": "active",
                "notes": "Existing client - already in touch"
            },
            {
                "id": 2, "business": "Nail Art Girl", "niche": "beauty/nails",
                "location": "local", "lead_score": 85,
                "reason": "portfolio/booking site for nail art services",
                "contact": "dm - hot lead", "status": "active",
                "notes": "Existing client - discussed today"
            }
        ]
        return sorted(prospects, key=lambda p: p["lead_score"], reverse=True)

class OutreachManager:
    def __init__(self):
        self.name = "Outreach Manager"
        self.emoji = "📩"

    def get_strategy(self):
        return {
            "best_platforms": [
                "Instagram DMs - best for local businesses",
                "LinkedIn - best for startups & agencies",
                "Email - best for established businesses",
                "Twitter/X - best for tech/saas"
            ],
            "timing": [
                "Tue-Thu 10am-12pm best send times",
                "Follow up after 3 days",
                "Max 2 follow ups per prospect"
            ],
            "pitch_tips": [
                "Mention their business name",
                "Point out one specific thing to improve",
                "Lead with value, not price",
                "Offer a free audit/consultation"
            ]
        }

class PipelineTracker:
    def __init__(self):
        self.name = "Pipeline Tracker"
        self.emoji = "📊"

    def get_pipeline(self):
        return {
            "leads": random.randint(5, 20),
            "contacted": random.randint(2, 8),
            "interested": random.randint(1, 4),
            "closed": random.randint(0, 2),
            "revenue_potential": f"₹{random.randint(10, 100)}k - ₹{random.randint(100, 500)}k",
            "conversion_rate": f"{random.randint(5, 30)}%"
        }

class MessageGenerator:
    def __init__(self):
        self.name = "Message Generator"
        self.emoji = "✍️"

    def generate(self, prospect):
        name = prospect.get("business", "there")
        niche = prospect.get("niche", "your industry")
        return {
            "copy_paste": [
                f"Hey {name}! I saw your work and it's really good. I build websites + AI agents for {niche} businesses. Would you be open to seeing what I can do for you?",
                f"Hi {name}, quick one — I help {niche} brands get more clients with custom websites and AI chatbots. Free to chat?",
                f"Hey {name}, I'm Sriram. I build modern websites with built-in AI features for {niche}. Do you have 2 mins to see an example?",
                f"Hi! I noticed you're in {niche}. I just helped a similar brand automate their inquiries with an AI agent. Want me to show you how it works?",
                f"Hey {name}, I don't want to waste your time — I build affordable AI-powered websites for {niche} businesses. Interested in seeing some samples?",
                f"Yo {name}! Building websites + AI agents for {niche} right now. Lmk if you need one 🔥"
            ]
        }

class WebsiteInspo:
    def __init__(self):
        self.name = "Website Builder AI"
        self.emoji = "🛠️"

    def get_recommendations(self):
        return {
            "free_tools": [
                "Wix/WordPress - Quick sites for small businesses",
                "Bolt.new - AI builds full sites from prompt",
                "Replit AI - Build & deploy fast",
                "GitHub Pages + templates - free hosting"
            ],
            "what_to_offer": [
                "Basic business website (5 pages) - ₹5-15k",
                "AI chatbot integration - ₹10-20k extra",
                "E-commerce store - ₹20-50k",
                "Custom web app - ₹50k+"
            ],
            "stack": [
                "Next.js / React for frontend",
                "Flask/FastAPI for backend",
                "Supabase/Firebase for database",
                "Vercel/Render for free hosting"
            ]
        }

if __name__ == "__main__":
    print("=== 🎯 Prospect Finder ===")
    for p in ProspectFinder().generate_prospects(3):
        print(f"  Lead #{p['id']}: {p['business']} ({p['niche']}) - Score: {p['lead_score']}")
    print("\n=== 📩 Outreach Manager ===")
    o = OutreachManager().get_strategy()
    print(f"  Best platform: {o['best_platforms'][0]}")
    print("\n=== 📊 Pipeline Tracker ===")
    pl = PipelineTracker().get_pipeline()
    print(f"  Leads: {pl['leads']}, Contacted: {pl['contacted']}, Revenue: {pl['revenue_potential']}")
    print("\n=== 🛠️ Website Builder ===")
    w = WebsiteInspo().get_recommendations()
    print(f"  Try: {w['free_tools'][1]}")
