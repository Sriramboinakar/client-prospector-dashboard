import instaloader
import json
import os
import time
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def scrape_profile(username, max_posts=20):
    L = instaloader.Instaloader()
    profile_data = {"username": username, "posts": [], "followers": 0, "following": 0, "bio": ""}
    try:
        profile = instaloader.Profile.from_username(L.context, username)
        profile_data["followers"] = profile.followers
        profile_data["following"] = profile.followees
        profile_data["bio"] = profile.biography
        profile_data["full_name"] = profile.full_name
        profile_data["profile_pic_url"] = str(profile.profile_pic_url)
        count = 0
        for post in profile.get_posts():
            if count >= max_posts:
                break
            profile_data["posts"].append({
                "shortcode": post.shortcode,
                "url": f"https://instagram.com/p/{post.shortcode}",
                "caption": post.caption if post.caption else "",
                "likes": post.likes,
                "comments": post.comments,
                "timestamp": post.date_utc.isoformat(),
                "media_type": "video" if post.is_video else "image",
                "video_views": post.video_view_count if post.is_video else 0
            })
            count += 1
        print(f"✅ Scraped {count} posts from @{username}")
    except Exception as e:
        print(f"⚠️ Could not scrape @{username}: {e}")
        print("   Using sample data instead. Run with --login for real data.")
        profile_data = generate_sample_data(username)
    return profile_data

def generate_sample_data(username):
    import random
    topics = ["coding", "travel", "fitness", "food", "tech", "photography"]
    captions = [
        "Just dropped a new project! Check it out 🚀",
        "Morning grind 💪 never give up on your dreams",
        "Beautiful sunset today 🌅 #nature #vibes",
        "New tutorial coming soon! Which topic?",
        "Weekend mode ON 😎",
        "Grateful for this journey 🙏",
        "Behind the scenes of today's shoot 📸",
        "Hot take: consistency beats talent every time",
        "Who else loves late night coding sessions? 🌙",
        "Throwback to last week's adventure ✈️"
    ]
    posts = []
    for i in range(min(10, len(captions))):
        posts.append({
            "shortcode": f"sample{i}",
            "url": f"https://instagram.com/p/sample{i}",
            "caption": captions[i],
            "likes": random.randint(10, 500),
            "comments": random.randint(0, 30),
            "timestamp": f"2025-0{i+1:02d}-01T12:00:00",
            "media_type": random.choice(["image", "video"]),
            "video_views": random.randint(100, 5000)
        })
    return {
        "username": username,
        "posts": posts,
        "followers": random.randint(100, 5000),
        "following": random.randint(50, 500),
        "bio": "Content creator | Building in public 🚀",
        "full_name": username,
        "profile_pic_url": ""
    }

def fetch_all(use_login=False):
    if use_login:
        L = instaloader.Instaloader()
        try:
            L.load_session_from_file("sriramm01")
            print("✅ Logged in with saved session")
        except:
            print("⚠️ No saved session. Login required.")
            username = input("Instagram username: ")
            password = input("Instagram password: ")
            try:
                L.login(username, password)
                L.save_session_to_file()
            except:
                print("❌ Login failed. Using sample data.")
                my_data = generate_sample_data("sriramm01")
                with open(DATA_DIR / "my_profile.json", "w") as f:
                    json.dump(my_data, f, indent=2)
                return
        profile = instaloader.Profile.from_username(L.context, "sriramm01")
        my_data = {"username": "sriramm01", "posts": [], "followers": profile.followers,
                    "following": profile.followees, "bio": profile.biography,
                    "full_name": profile.full_name, "profile_pic_url": str(profile.profile_pic_url)}
        count = 0
        for post in profile.get_posts():
            if count >= 20: break
            my_data["posts"].append({
                "shortcode": post.shortcode,
                "url": f"https://instagram.com/p/{post.shortcode}",
                "caption": post.caption if post.caption else "",
                "likes": post.likes, "comments": post.comments,
                "timestamp": post.date_utc.isoformat(),
                "media_type": "video" if post.is_video else "image",
                "video_views": post.video_view_count if post.is_video else 0
            })
            count += 1
    else:
        print("Fetching with sample data (no login)...")
        my_data = generate_sample_data("sriramm01")

    with open(DATA_DIR / "my_profile.json", "w") as f:
        json.dump(my_data, f, indent=2)
    print(f"✅ Saved {len(my_data['posts'])} posts for @{my_data['username']}")
    print(f"   Followers: {my_data['followers']}, Following: {my_data['following']}")

if __name__ == "__main__":
    import sys
    use_login = "--login" in sys.argv
    if use_login:
        import getpass
        user = None
        pwd = None
        for i, arg in enumerate(sys.argv):
            if arg == "--user" and i+1 < len(sys.argv):
                user = sys.argv[i+1]
            if arg == "--pass" and i+1 < len(sys.argv):
                pwd = sys.argv[i+1]
        if user and pwd:
            import instaloader
            L = instaloader.Instaloader()
            try:
                L.login(user, pwd)
                L.save_session_to_file()
                profile = instaloader.Profile.from_username(L.context, "sriramm01")
                my_data = {"username": "sriramm01", "posts": [], "followers": profile.followers,
                           "following": profile.followees, "bio": profile.biography,
                           "full_name": profile.full_name, "profile_pic_url": str(profile.profile_pic_url)}
                count = 0
                for post in profile.get_posts():
                    if count >= 20: break
                    my_data["posts"].append({
                        "shortcode": post.shortcode,
                        "url": f"https://instagram.com/p/{post.shortcode}",
                        "caption": post.caption if post.caption else "",
                        "likes": post.likes, "comments": post.comments,
                        "timestamp": post.date_utc.isoformat(),
                        "media_type": "video" if post.is_video else "image",
                        "video_views": post.video_view_count if post.is_video else 0
                    })
                    count += 1
                from pathlib import Path
                with open(Path(__file__).parent.parent / "data" / "my_profile.json", "w") as f:
                    json.dump(my_data, f, indent=2)
                print(f"✅ Saved {count} real posts from @sriramm01")
                print(f"   Followers: {my_data['followers']}, Following: {my_data['following']}")
            except Exception as e:
                print(f"❌ Login failed: {e}")
        else:
            fetch_all(use_login=True)
    else:
        fetch_all(use_login=False)
