from django.contrib import admin
from .models import (
    PoliceForce, CrimeCategory, CrimeRecord, ScrapeJob,
    CrimeReport, CommunityMember, CommunityPost,
    CommunityReply, PostLike, SafetyAlert, NeighbourhoodWatch,
    AnalysisResult,
)

@admin.register(PoliceForce)
class PoliceForceAdmin(admin.ModelAdmin):
    list_display = ["name", "force_id", "created_at"]
    search_fields = ["name", "force_id"]

@admin.register(CrimeCategory)
class CrimeCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]

@admin.register(CrimeRecord)
class CrimeRecordAdmin(admin.ModelAdmin):
    list_display = ["category", "force", "location_name", "date", "is_cleaned"]
    list_filter = ["category", "force", "is_cleaned", "date"]
    search_fields = ["location_name", "street_name"]
    date_hierarchy = "date"

@admin.register(ScrapeJob)
class ScrapeJobAdmin(admin.ModelAdmin):
    list_display = ["force", "date_param", "status", "records_fetched", "records_cleaned"]
    list_filter = ["status", "force"]

@admin.register(CrimeReport)
class CrimeReportAdmin(admin.ModelAdmin):
    list_display = ["reference_number", "crime_type", "location", "severity", "status", "urgency", "is_anonymous", "created_at"]
    list_filter = ["status", "severity", "crime_type", "urgency", "is_anonymous"]
    search_fields = ["location", "description", "reference_number"]
    readonly_fields = ["reference_number"]

@admin.register(CommunityMember)
class CommunityMemberAdmin(admin.ModelAdmin):
    list_display = ["display_name", "role", "ward", "is_verified", "is_online", "reputation_score"]
    list_filter = ["role", "is_verified", "is_online"]
    search_fields = ["display_name", "ward"]

@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "is_pinned", "likes_count", "replies_count", "is_flagged", "created_at"]
    list_filter = ["category", "is_pinned", "is_flagged", "is_moderated"]
    search_fields = ["title", "body"]
    actions = ["pin_posts", "moderate_posts"]

    @admin.action(description="Pin selected posts")
    def pin_posts(self, request, queryset):
        queryset.update(is_pinned=True)

    @admin.action(description="Mark as moderated")
    def moderate_posts(self, request, queryset):
        queryset.update(is_moderated=True, is_flagged=False)

@admin.register(CommunityReply)
class CommunityReplyAdmin(admin.ModelAdmin):
    list_display = ["post", "author", "is_official_response", "likes_count", "created_at"]
    list_filter = ["is_official_response", "is_flagged"]

@admin.register(SafetyAlert)
class SafetyAlertAdmin(admin.ModelAdmin):
    list_display = ["area", "alert_type", "level", "is_active", "created_at"]
    list_filter = ["level", "is_active"]
    search_fields = ["area", "message"]

@admin.register(NeighbourhoodWatch)
class NeighbourhoodWatchAdmin(admin.ModelAdmin):
    list_display = ["name", "area", "coordinator", "is_active"]
    filter_horizontal = ["members"]

@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = ["analysis_type", "force", "created_at"]
    list_filter = ["analysis_type"]
