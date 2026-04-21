"""
CrimeScope URL Configuration
All endpoints prefixed with /api/ (set in project urls.py).
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"forces", views.PoliceForceViewSet)
router.register(r"categories", views.CrimeCategoryViewSet)
router.register(r"crimes", views.CrimeRecordViewSet)
router.register(r"scrape-jobs", views.ScrapeJobViewSet)
router.register(r"reports", views.CrimeReportViewSet)

# Community policing
router.register(r"community/members", views.CommunityMemberViewSet)
router.register(r"community/posts", views.CommunityPostViewSet)
router.register(r"community/alerts", views.SafetyAlertViewSet)
router.register(r"community/watches", views.NeighbourhoodWatchViewSet)

urlpatterns = [
    path("", include(router.urls)),

    # Scraper
    path("scrape/trigger/", views.TriggerScrapeView.as_view(), name="scrape-trigger"),
    path("scrape/sync-forces/", views.SyncForcesView.as_view(), name="sync-forces"),

    # Analysis
    path("analysis/trends/", views.MonthlyTrendsView.as_view(), name="trends"),
    path("analysis/regions/", views.RegionSummaryView.as_view(), name="regions"),
    path("analysis/breakdown/", views.CrimeBreakdownView.as_view(), name="breakdown"),
    path("analysis/heatmap/", views.HeatmapView.as_view(), name="heatmap"),
    path("analysis/hotspots/", views.HotspotView.as_view(), name="hotspots"),
    path("analysis/yoy/", views.YoYView.as_view(), name="yoy"),

    # Predictions
    path("predict/", views.ForecastView.as_view(), name="forecast"),

    # Community
    path("community/stats/", views.CommunityStatsView.as_view(), name="community-stats"),

    # Dashboard
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
]
