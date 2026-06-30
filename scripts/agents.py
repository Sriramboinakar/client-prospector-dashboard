import json
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

DATA_DIR = Path(__file__).parent.parent / "data"

def load_my_data():
    path = DATA_DIR / "my_profile.json"
    if not path.exists():
        return {"username": "sriramm01", "posts": [], "followers": 0, "following": 0, "bio": ""}
    with open(path) as f:
        return json.load(f)

class Ideator:
    def __init__(self):
        self.name = "Ideator"
        self.emoji = "💡"

    def analyze(self):
        data = load_my_data()
        posts = data.get("posts", [])
        bio = data.get("bio", "")
        ideas = []
        if posts:
            top_posts = sorted(posts, key=lambda p: p["likes"], reverse=True)[:3]
            ideas.append(f"Your top post got {top_posts[0]['likes']} likes - create more content like that")
            topics = set()
            for p in posts:
                cap = (p.get("caption") or "").lower()
                for word in cap.split():
                    if len(word) > 4 and word.isalpha():
                        topics.add(word)
            if topics:
                ideas.append(f"Trending keywords from your captions: {', '.join(list(topics)[:5])}")
        ideas.append("Post a carousel - carousels get 3x more saves")
        ideas.append("Try a trending audio reel this week")
        if data.get("followers", 0) > 0:
            ideas.append(f"Engagement rate: ~{len(posts)/max(data['followers'],1)*100:.1f}% - aim for 3%+")
        return ideas

class Planner:
    def __init__(self):
        self.name = "Planner"
        self.emoji = "📅"

    def generate_calendar(self, days=7):
        calendar = []
        today = datetime.now()
        post_types = ["Reel", "Carousel", "Photo", "Reel", "Carousel", "Photo", "Story Series"]
        best_times = ["7:00 PM", "12:00 PM", "6:00 PM", "8:00 AM", "7:30 PM", "1:00 PM", "6:30 PM"]
        for i in range(days):
            d = today + timedelta(days=i)
            calendar.append({
                "date": d.strftime("%a, %b %d"),
                "post_type": post_types[i % len(post_types)],
                "best_time": best_times[i % len(best_times)],
                "tip": random.choice([
                    "Use 3-5 hashtags", "Add CTA in caption",
                    "Post when followers are active", "Use trending audio",
                    "Include location tag", "Reply to comments within 1hr"
                ])
            })
        return calendar


class Analyst:
    def __init__(self):
        self.name = "Analyst"
        self.emoji = "📊"

    def analyze(self):
        data = load_my_data()
        posts = data.get("posts", [])
        total_likes = sum(p["likes"] for p in posts)
        total_comments = sum(p["comments"] for p in posts)
        followers = data.get("followers", 1)
        metrics = {
            "total_posts": len(posts),
            "total_likes": total_likes,
            "total_comments": total_comments,
            "avg_likes": round(total_likes / max(len(posts), 1)),
            "avg_comments": round(total_comments / max(len(posts), 1)),
            "engagement_rate": round((total_likes + total_comments) / followers * 100, 2),
            "followers": followers,
            "following": data.get("following", 0),
            "best_performing": []
        }
        if posts:
            sorted_posts = sorted(posts, key=lambda p: p["likes"], reverse=True)
            metrics["best_performing"] = sorted_posts[:3]
            videos = [p for p in posts if p.get("media_type") == "video"]
            if videos:
                metrics["avg_video_views"] = round(sum(v.get("video_views", 0) for v in videos) / len(videos))
        return metrics

class DMManager:
    def __init__(self):
        self.name = "DM Manager"
        self.emoji = "💬"

    def get_suggestions(self):
        return {
            "auto_replies": [
                {"trigger": "price", "reply": "Thanks for reaching out! Check my bio for pricing info 📌"},
                {"trigger": "collab", "reply": "Hi! I'm open to collaborations. Please DM me your portfolio/website."},
                {"trigger": "promote", "reply": "Thanks for the interest! I'll check out your page and get back to you."},
                {"trigger": "how much", "reply": "Pricing details are in my bio link! Let me know if you have specific questions."}
            ],
            "quick_responses": [
                "Thanks for the love! 🙌",
                "Appreciate it! 🔥",
                "Glad you liked it! 💯"
            ],
            "best_practices": [
                "Reply within 1 hour for best engagement",
                "Keep replies under 2 sentences",
                "Use emojis - they increase response rate by 30%",
                "Tag relevant accounts when appropriate"
            ]
        }

if __name__ == "__main__":
    print("=== Ideator ===")
    for idea in Ideator().analyze():
        print(f"  - {idea}")
    print("\n=== Planner ===")
    for day in Planner().generate_calendar(3):
        print(f"  {day['date']}: {day['post_type']} at {day['best_time']} - {day['tip']}")
    print("\n=== Analyst ===")
    m = Analyst().analyze()
    print(f"  Avg Likes: {m['avg_likes']}, Engagement: {m['engagement_rate']}%")
    print("\n=== DM Manager ===")
    dm = DMManager().get_suggestions()
    print(f"  {len(dm['auto_replies'])} auto-reply rules ready")
