"""
CrimeScope REST API Serializers
================================
Serializers for all models including community policing.
"""
from rest_framework import serializers
from .models import (
    PoliceForce, CrimeCategory, CrimeRecord, ScrapeJob,
    CrimeReport, CommunityMember, CommunityPost,
    CommunityReply, PostLike, SafetyAlert,
    NeighbourhoodWatch, AnalysisResult,
)


# ── Core Data ─────────────────────────────────────────────────────────

class PoliceForceSerializer(serializers.ModelSerializer):
    crime_count = serializers.IntegerField(read_only=True, default=0)
    class Meta:
        model = PoliceForce
        fields = ["id", "force_id", "name", "url", "telephone", "crime_count"]


class CrimeCategorySerializer(serializers.ModelSerializer):
    crime_count = serializers.IntegerField(read_only=True, default=0)
    class Meta:
        model = CrimeCategory
        fields = ["id", "slug", "name", "crime_count"]


class CrimeRecordSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    force_name = serializers.CharField(source="force.name", read_only=True, default="")
    class Meta:
        model = CrimeRecord
        fields = ["id", "persistent_id", "category", "category_name", "force",
                  "force_name", "location_name", "latitude", "longitude",
                  "street_name", "date", "outcome", "is_cleaned", "scraped_at"]


class CrimeRecordGeoSerializer(serializers.ModelSerializer):
    """Lightweight serializer for map markers."""
    cat = serializers.CharField(source="category.slug", read_only=True)
    class Meta:
        model = CrimeRecord
        fields = ["id", "cat", "latitude", "longitude", "date"]


# ── Scraping ──────────────────────────────────────────────────────────

class ScrapeJobSerializer(serializers.ModelSerializer):
    force_name = serializers.CharField(source="force.name", read_only=True, default="All")
    duration = serializers.SerializerMethodField()
    class Meta:
        model = ScrapeJob
        fields = ["id", "force", "force_name", "date_param", "status", "source",
                  "records_fetched", "records_cleaned", "duplicates_removed",
                  "error_message", "started_at", "completed_at", "created_at", "duration"]
    def get_duration(self, obj):
        d = obj.duration_seconds
        return f"{d:.1f}s" if d else None


class ScrapeJobCreateSerializer(serializers.Serializer):
    force_id = serializers.CharField(default="metropolitan")
    date = serializers.CharField(default="2026-03")
    source = serializers.ChoiceField(choices=["police-api", "ons", "home-office"], default="police-api")


# ── Crime Reports ─────────────────────────────────────────────────────

class CrimeReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrimeReport
        fields = ["id", "crime_type", "location", "latitude", "longitude",
                  "description", "severity", "status", "is_anonymous",
                  "reporter_name", "reporter_email", "reporter_phone",
                  "reference_number", "when_occurred", "urgency",
                  "created_at", "updated_at"]
        read_only_fields = ["status", "reference_number", "created_at", "updated_at"]


class CrimeReportCreateSerializer(serializers.ModelSerializer):
    """Separate create serializer that strips sensitive fields from response."""
    class Meta:
        model = CrimeReport
        fields = ["crime_type", "location", "latitude", "longitude",
                  "description", "severity", "is_anonymous", "reporter_name",
                  "reporter_email", "reporter_phone", "when_occurred", "urgency"]


# ── Community Policing ────────────────────────────────────────────────

class CommunityMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    post_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = CommunityMember
        fields = ["id", "display_name", "role", "role_display", "ward",
                  "avatar_initials", "bio", "is_verified", "is_online",
                  "reputation_score", "joined_at", "post_count"]
        read_only_fields = ["avatar_initials", "is_verified", "reputation_score"]


class CommunityMemberCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityMember
        fields = ["display_name", "role", "ward", "bio"]


class CommunityReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)
    author_role = serializers.CharField(source="author.role", read_only=True)
    author_avatar = serializers.CharField(source="author.avatar_initials", read_only=True)

    class Meta:
        model = CommunityReply
        fields = ["id", "post", "author", "author_name", "author_role",
                  "author_avatar", "body", "is_anonymous", "likes_count",
                  "is_official_response", "created_at"]
        read_only_fields = ["likes_count", "is_official_response"]


class CommunityPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)
    author_role = serializers.CharField(source="author.role", read_only=True)
    author_avatar = serializers.CharField(source="author.avatar_initials", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    recent_replies = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = ["id", "author", "author_name", "author_role", "author_avatar",
                  "title", "body", "category", "category_display",
                  "is_pinned", "is_anonymous", "location", "latitude", "longitude",
                  "likes_count", "replies_count", "created_at", "updated_at",
                  "recent_replies"]
        read_only_fields = ["likes_count", "replies_count", "is_pinned"]

    def get_recent_replies(self, obj):
        replies = obj.replies.order_by("-created_at")[:3]
        return CommunityReplySerializer(replies, many=True).data


class CommunityPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityPost
        fields = ["title", "body", "category", "is_anonymous", "location",
                  "latitude", "longitude"]


class SafetyAlertSerializer(serializers.ModelSerializer):
    issued_by_name = serializers.CharField(source="issued_by.display_name", read_only=True, default="")

    class Meta:
        model = SafetyAlert
        fields = ["id", "area", "alert_type", "level", "message", "force",
                  "issued_by", "issued_by_name", "latitude", "longitude",
                  "is_active", "expires_at", "created_at"]


class NeighbourhoodWatchSerializer(serializers.ModelSerializer):
    coordinator_name = serializers.CharField(source="coordinator.display_name", read_only=True, default="")
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = NeighbourhoodWatch
        fields = ["id", "name", "area", "force", "coordinator",
                  "coordinator_name", "description", "meeting_schedule",
                  "is_active", "member_count", "created_at"]

    def get_member_count(self, obj):
        return obj.members.count()


# ── Analysis ──────────────────────────────────────────────────────────

class AnalysisResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisResult
        fields = ["id", "analysis_type", "parameters", "result_data",
                  "force", "category", "created_at", "valid_until"]


# ── Request Serializers ───────────────────────────────────────────────

class PredictionRequestSerializer(serializers.Serializer):
    force_id = serializers.CharField(required=False)
    category_slug = serializers.CharField(required=False)
    months_ahead = serializers.IntegerField(min_value=1, max_value=12, default=6)


class CommunityStatsSerializer(serializers.Serializer):
    active_members = serializers.IntegerField()
    posts_this_week = serializers.IntegerField()
    officers_online = serializers.IntegerField()
    issues_resolved_pct = serializers.FloatField()
    community_rating = serializers.FloatField()
    active_alerts = serializers.IntegerField()
    watch_groups = serializers.IntegerField()
