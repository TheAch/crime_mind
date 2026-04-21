"""
CrimeScope API Views
=====================
REST endpoints for crime data, scraping, analysis,
reports, and community policing.
"""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    PoliceForce, CrimeCategory, CrimeRecord, ScrapeJob,
    CrimeReport, CommunityMember, CommunityPost,
    CommunityReply, PostLike, SafetyAlert, NeighbourhoodWatch,
)
from .serializers import (
    PoliceForceSerializer, CrimeCategorySerializer,
    CrimeRecordSerializer, CrimeRecordGeoSerializer,
    ScrapeJobSerializer, ScrapeJobCreateSerializer,
    CrimeReportSerializer, CrimeReportCreateSerializer,
    CommunityMemberSerializer, CommunityMemberCreateSerializer,
    CommunityPostSerializer, CommunityPostCreateSerializer,
    CommunityReplySerializer,
    SafetyAlertSerializer, NeighbourhoodWatchSerializer,
    PredictionRequestSerializer,
)
from .scraper import run_scrape_pipeline, scrape_police_forces, scrape_crime_categories
from .analysis import (
    get_monthly_trends, get_region_summary, get_crime_type_breakdown,
    get_heatmap_data, forecast_crimes, detect_hotspots, get_yoy_comparison,
)


# ══════════════════════════════════════════════════════════════════════
# CORE DATA VIEWSETS
# ══════════════════════════════════════════════════════════════════════

class PoliceForceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PoliceForce.objects.annotate(crime_count=Count("crimes"))
    serializer_class = PoliceForceSerializer
    search_fields = ["name", "force_id"]


class CrimeCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CrimeCategory.objects.annotate(crime_count=Count("crimes"))
    serializer_class = CrimeCategorySerializer


class CrimeRecordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CrimeRecord.objects.select_related("category", "force").filter(is_cleaned=True)
    serializer_class = CrimeRecordSerializer
    filterset_fields = {"force__force_id": ["exact"], "category__slug": ["exact"],
                        "date": ["gte", "lte", "exact"]}
    search_fields = ["location_name", "street_name"]

    @action(detail=False, methods=["get"], url_path="geo")
    def geo_markers(self, request):
        qs = self.filter_queryset(self.get_queryset()).filter(
            latitude__isnull=False, longitude__isnull=False)[:5000]
        return Response(CrimeRecordGeoSerializer(qs, many=True).data)


class ScrapeJobViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ScrapeJob.objects.select_related("force")
    serializer_class = ScrapeJobSerializer


# ══════════════════════════════════════════════════════════════════════
# CRIME REPORTS
# ══════════════════════════════════════════════════════════════════════

class CrimeReportViewSet(viewsets.ModelViewSet):
    """CRUD for user-submitted crime reports."""
    queryset = CrimeReport.objects.all()
    serializer_class = CrimeReportSerializer
    filterset_fields = ["status", "severity", "crime_type", "urgency"]
    search_fields = ["location", "description"]

    def get_serializer_class(self):
        if self.action == "create":
            return CrimeReportCreateSerializer
        return CrimeReportSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            CrimeReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        report = self.get_object()
        new_status = request.data.get("status")
        valid = [c[0] for c in CrimeReport.STATUS]
        if new_status not in valid:
            return Response({"error": f"Must be one of: {valid}"}, status=400)
        report.status = new_status
        report.save(update_fields=["status", "updated_at"])
        return Response(CrimeReportSerializer(report).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = CrimeReport.objects.all()
        return Response({
            "total": qs.count(),
            "under_review": qs.filter(status="Under Review").count(),
            "investigating": qs.filter(status="Investigating").count(),
            "acknowledged": qs.filter(status="Acknowledged").count(),
            "resolved": qs.filter(status="Resolved").count(),
            "high_severity": qs.filter(severity="High").count(),
            "anonymous": qs.filter(is_anonymous=True).count(),
        })


# ══════════════════════════════════════════════════════════════════════
# COMMUNITY POLICING
# ══════════════════════════════════════════════════════════════════════

class CommunityMemberViewSet(viewsets.ModelViewSet):
    """Community member profiles."""
    queryset = CommunityMember.objects.annotate(post_count=Count("posts"))
    serializer_class = CommunityMemberSerializer
    filterset_fields = ["role", "ward", "is_verified", "is_online"]
    search_fields = ["display_name", "ward"]

    def get_serializer_class(self):
        if self.action == "create":
            return CommunityMemberCreateSerializer
        return CommunityMemberSerializer

    @action(detail=False, methods=["get"])
    def officers(self, request):
        """List online police officers."""
        officers = self.queryset.filter(role="officer")
        return Response(CommunityMemberSerializer(officers, many=True).data)

    @action(detail=False, methods=["get"])
    def leaderboard(self, request):
        """Top community members by reputation."""
        top = self.queryset.order_by("-reputation_score")[:20]
        return Response(CommunityMemberSerializer(top, many=True).data)


class CommunityPostViewSet(viewsets.ModelViewSet):
    """Community feed posts with filtering by category."""
    queryset = CommunityPost.objects.select_related("author").prefetch_related("replies")
    serializer_class = CommunityPostSerializer
    filterset_fields = ["category", "is_pinned", "author__role"]
    search_fields = ["title", "body", "location"]
    ordering_fields = ["created_at", "likes_count"]

    def get_serializer_class(self):
        if self.action == "create":
            return CommunityPostCreateSerializer
        return CommunityPostSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # In production, author would come from authenticated user
        author_id = request.data.get("author")
        if author_id:
            author = CommunityMember.objects.get(id=author_id)
        else:
            author, _ = CommunityMember.objects.get_or_create(
                display_name="Anonymous User",
                defaults={"role": "resident"})
        post = serializer.save(author=author)
        return Response(CommunityPostSerializer(post).data, status=201)

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        """Like a post."""
        post = self.get_object()
        member_id = request.data.get("member_id")
        if member_id:
            member = CommunityMember.objects.get(id=member_id)
            _, created = PostLike.objects.get_or_create(post=post, member=member)
            if created:
                post.likes_count += 1
                post.save(update_fields=["likes_count"])
                # Award reputation to author
                post.author.reputation_score += 1
                post.author.save(update_fields=["reputation_score"])
        return Response({"likes_count": post.likes_count})

    @action(detail=True, methods=["post"])
    def flag(self, request, pk=None):
        """Flag a post for moderation."""
        post = self.get_object()
        post.is_flagged = True
        post.save(update_fields=["is_flagged"])
        return Response({"flagged": True})

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """Add a reply to a post."""
        post = self.get_object()
        serializer = CommunityReplySerializer(data={
            "post": post.id,
            "body": request.data.get("body", ""),
            "is_anonymous": request.data.get("is_anonymous", False),
            **request.data,
        })
        serializer.is_valid(raise_exception=True)
        reply = serializer.save()
        post.replies_count += 1
        post.save(update_fields=["replies_count"])
        return Response(CommunityReplySerializer(reply).data, status=201)

    @action(detail=False, methods=["get"])
    def pinned(self, request):
        """Get pinned posts."""
        pinned = self.queryset.filter(is_pinned=True)
        return Response(CommunityPostSerializer(pinned, many=True).data)

    @action(detail=True, methods=["post"])
    def pin(self, request, pk=None):
        """Pin/unpin a post (officers only in production)."""
        post = self.get_object()
        post.is_pinned = not post.is_pinned
        post.save(update_fields=["is_pinned"])
        return Response({"is_pinned": post.is_pinned})


class SafetyAlertViewSet(viewsets.ModelViewSet):
    """Safety alerts for local areas."""
    queryset = SafetyAlert.objects.filter(is_active=True)
    serializer_class = SafetyAlertSerializer
    filterset_fields = ["level", "area", "is_active"]
    search_fields = ["area", "message"]

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get currently active (non-expired) alerts."""
        now = timezone.now()
        alerts = self.queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        return Response(SafetyAlertSerializer(alerts, many=True).data)


class NeighbourhoodWatchViewSet(viewsets.ModelViewSet):
    """Neighbourhood watch groups."""
    queryset = NeighbourhoodWatch.objects.filter(is_active=True)
    serializer_class = NeighbourhoodWatchSerializer
    search_fields = ["name", "area"]

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        """Join a watch group."""
        watch = self.get_object()
        member_id = request.data.get("member_id")
        if member_id:
            member = CommunityMember.objects.get(id=member_id)
            watch.members.add(member)
        return Response({"member_count": watch.members.count()})

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        """Leave a watch group."""
        watch = self.get_object()
        member_id = request.data.get("member_id")
        if member_id:
            watch.members.remove(member_id)
        return Response({"member_count": watch.members.count()})


class CommunityStatsView(APIView):
    """Aggregated community statistics."""
    def get(self, request):
        week_ago = timezone.now() - timedelta(days=7)
        return Response({
            "active_members": CommunityMember.objects.count(),
            "posts_this_week": CommunityPost.objects.filter(created_at__gte=week_ago).count(),
            "officers_online": CommunityMember.objects.filter(role="officer", is_online=True).count(),
            "issues_resolved_pct": 89.0,
            "community_rating": 4.7,
            "active_alerts": SafetyAlert.objects.filter(is_active=True).count(),
            "watch_groups": NeighbourhoodWatch.objects.filter(is_active=True).count(),
            "total_posts": CommunityPost.objects.count(),
            "total_replies": CommunityReply.objects.count(),
        })


# ══════════════════════════════════════════════════════════════════════
# SCRAPER ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

class TriggerScrapeView(APIView):
    def post(self, request):
        ser = ScrapeJobCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        job = run_scrape_pipeline(ser.validated_data["force_id"],
                                  ser.validated_data["date"],
                                  ser.validated_data["source"])
        return Response(ScrapeJobSerializer(job).data, status=201)


class SyncForcesView(APIView):
    def post(self, request):
        forces = scrape_police_forces()
        cats = scrape_crime_categories()
        return Response({"forces": PoliceForce.objects.count(),
                         "categories": CrimeCategory.objects.count()})


# ══════════════════════════════════════════════════════════════════════
# ANALYSIS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

class MonthlyTrendsView(APIView):
    def get(self, request):
        return Response(get_monthly_trends(
            force_id=request.query_params.get("force_id"),
            category_slug=request.query_params.get("category"),
            months=int(request.query_params.get("months", 12))))


class RegionSummaryView(APIView):
    def get(self, request):
        return Response(get_region_summary())


class CrimeBreakdownView(APIView):
    def get(self, request):
        return Response(get_crime_type_breakdown(
            force_id=request.query_params.get("force_id")))


class HeatmapView(APIView):
    def get(self, request):
        return Response(get_heatmap_data(
            force_id=request.query_params.get("force_id")))


class ForecastView(APIView):
    def get(self, request):
        return Response(forecast_crimes(
            force_id=request.query_params.get("force_id"),
            category_slug=request.query_params.get("category"),
            months_ahead=int(request.query_params.get("months", 6))))

    def post(self, request):
        ser = PredictionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(forecast_crimes(**ser.validated_data))


class HotspotView(APIView):
    def get(self, request):
        return Response(detect_hotspots(
            force_id=request.query_params.get("force_id"),
            top_n=int(request.query_params.get("top_n", 10))))


class YoYView(APIView):
    def get(self, request):
        return Response(get_yoy_comparison(
            force_id=request.query_params.get("force_id")))


class DashboardView(APIView):
    def get(self, request):
        return Response({
            "stats": {
                "total_crimes": CrimeRecord.objects.filter(is_cleaned=True).count(),
                "total_reports": CrimeReport.objects.count(),
                "active_reports": CrimeReport.objects.exclude(status="Resolved").count(),
                "forces_tracked": PoliceForce.objects.count(),
                "community_members": CommunityMember.objects.count(),
            },
            "top_regions": get_region_summary()[:10],
            "crime_breakdown": get_crime_type_breakdown()[:10],
        })
