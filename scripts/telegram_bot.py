import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
from scripts.agents import Ideator, Planner, Analyst, DMManager

load_dotenv(Path(__file__).parent.parent / ".env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def generate_report():
    analyst = Analyst()
    ideator = Ideator()
    planner = Planner()
    dm = DMManager()
    metrics = analyst.analyze()
    ideas = ideator.analyze()
    calendar = planner.generate_calendar(3)
    dm_data = dm.get_suggestions()
    report = f"🤖 **AI Content Report**\n"
    report += f"📊 **Analytics**\n"
    report += f"  ┣ Followers: {metrics['followers']}\n"
    report += f"  ┣ Avg Likes: {metrics['avg_likes']}\n"
    report += f"  ┣ Engagement: {metrics['engagement_rate']}%\n"
    report += f"  ┗ Posts: {metrics['total_posts']}\n\n"
    report += f"💡 **Top Ideas**\n"
    for idea in ideas[:2]:
        report += f"  ┗ {idea}\n"
    report += f"\n📅 **Next 3 Days**\n"
    for day in calendar:
        report += f"  ┗ {day['date']}: {day['post_type']} @ {day['best_time']}\n"
    report += f"\n💬 **DM Tips**\n"
    report += f"  ┗ {dm_data['best_practices'][0]}"
    return report

def send_report():
    if not TOKEN or TOKEN == "your_telegram_bot_token_here":
        print("❌ Telegram not configured. Set TELEGRAM_BOT_TOKEN in .env")
        return
    try:
        import requests
        report = generate_report()
        url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
        payload = {"chat_id": CHAT_ID, "text": report, "parse_mode": "Markdown"}
        r = requests.post(url, json=payload)
        if r.status_code == 200:
            print("✅ Report sent to Telegram!")
        else:
            print(f"❌ Telegram error: {r.text}")
    except Exception as e:
        print(f"❌ Failed to send: {e}")

if __name__ == "__main__":
    send_report()
