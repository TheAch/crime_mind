"""
Seed demo data for the community policing portal.

Usage:
    python manage.py seed_community
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from crime_app.models import (
    CommunityMember, CommunityPost, CommunityReply,
    SafetyAlert, NeighbourhoodWatch,
)


class Command(BaseCommand):
    help = "Seed community policing demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding community members...")

        members = []
        member_data = [
            ("PC Sarah Chen", "officer", "Riverside Ward"),
            ("PCSO James Hall", "officer", "City Centre"),
            ("DCI Emily Roberts", "officer", "District Lead"),
            ("Mark Thompson", "resident", "Elm Street"),
            ("Fatima Al-Hassan", "resident", "Park Lane"),
            ("Tom Davies", "volunteer", "Westgate"),
            ("Neighbourhood Watch", "organisation", "Riverside Ward"),
        ]
        for name, role, ward in member_data:
            m, _ = CommunityMember.objects.get_or_create(
                display_name=name,
                defaults={"role": role, "ward": ward,
                           "is_verified": role == "officer",
                           "is_online": role == "officer",
                           "reputation_score": 100 if role == "officer" else 50})
            members.append(m)

        self.stdout.write("Seeding community posts...")
        posts_data = [
            (0, "Neighbourhood Watch Update — Riverside Ward",
             "We've seen a 15% drop in burglaries this quarter thanks to increased patrols and your reports. Keep an eye out for suspicious activity near garages.",
             "update", True),
            (3, "Suspicious activity on Elm Street after dark",
             "Noticed an unmarked van parked outside number 42 for three consecutive nights between 11pm-2am. Different people each time.",
             "concern", False),
            (6, "Community Safety Meeting — April 20th",
             "Join us at St. Andrew's Community Hall at 7pm. Topics include bike theft prevention, CCTV funding, and the new street lighting proposal.",
             "event", False),
            (2, "Operation Nightfall — Results",
             "Our targeted operation resulted in 12 arrests for drug-related offences in the Westgate area. Thank you for the community intelligence that made this possible.",
             "success", True),
            (4, "Thank you to officers on Park Lane!",
             "Quick response to a shoplifting incident yesterday. The officers were professional and kept everyone safe.",
             "praise", False),
            (5, "Volunteer patrol schedule — Week 16",
             "We need volunteers for Tuesday and Thursday evening shifts. Sign up via the community hub or reply here.",
             "volunteer", False),
        ]
        for idx, title, body, cat, pinned in posts_data:
            post, created = CommunityPost.objects.get_or_create(
                title=title,
                defaults={"author": members[idx], "body": body,
                           "category": cat, "is_pinned": pinned,
                           "likes_count": 30 + idx * 10,
                           "replies_count": 5 + idx * 3})
            if created:
                # Add a sample reply
                replier = members[(idx + 2) % len(members)]
                CommunityReply.objects.create(
                    post=post, author=replier,
                    body="Thanks for sharing this — very helpful for our area.",
                    is_official_response=replier.role == "officer")

        self.stdout.write("Seeding safety alerts...")
        alerts_data = [
            ("Riverside Ward", "Burglary spike", "high",
             "3 break-ins reported this week targeting ground-floor flats. Secure windows before leaving."),
            ("City Centre", "Pickpocketing", "medium",
             "Increased reports near market square. Keep valuables secure in busy areas."),
            ("Westgate", "Drug activity — reduced", "low",
             "Following Operation Nightfall, activity has decreased. Remain vigilant."),
        ]
        for area, atype, level, msg in alerts_data:
            SafetyAlert.objects.get_or_create(
                area=area, alert_type=atype,
                defaults={"level": level, "message": msg, "is_active": True,
                           "expires_at": timezone.now() + timedelta(days=14)})

        self.stdout.write("Seeding neighbourhood watches...")
        NeighbourhoodWatch.objects.get_or_create(
            name="Riverside Community Watch",
            defaults={"area": "Riverside Ward", "coordinator": members[0],
                       "description": "Active neighbourhood watch covering the Riverside area.",
                       "meeting_schedule": "First Monday of each month, 7pm at St. Andrew's Hall"})

        self.stdout.write(self.style.SUCCESS(
            f"Done: {CommunityMember.objects.count()} members, "
            f"{CommunityPost.objects.count()} posts, "
            f"{SafetyAlert.objects.count()} alerts"))
