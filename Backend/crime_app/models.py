"""
CrimeScope Models
=================
All database models for crime data, reports, community policing,
scrape jobs, and analysis results.
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


# ── Core Crime Data ───────────────────────────────────────────────────

class PoliceForce(models.Model):
    """UK police force / constabulary."""
    force_id = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    url = models.URLField(blank=True)
    telephone = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    engagement_methods = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CrimeCategory(models.Model):
    """Crime category (e.g., burglary, theft, violence)."""
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=200)

    class Meta:
        verbose_name_plural = "Crime categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class CrimeRecord(models.Model):
    """Individual crime record scraped from data.police.uk."""
    persistent_id = models.CharField(max_length=64, blank=True, db_index=True)
    category = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, related_name="crimes")
    force = models.ForeignKey(PoliceForce, on_delete=models.CASCADE, related_name="crimes", null=True)
    location_name = models.CharField(max_length=500, blank=True)
    latitude = models.FloatField(null=True, blank=True, db_index=True)
    longitude = models.FloatField(null=True, blank=True, db_index=True)
    street_name = models.CharField(max_length=300, blank=True)
    date = models.DateField(db_index=True)
    outcome = models.CharField(max_length=200, blank=True)
    context = models.TextField(blank=True)
    scraped_at = models.DateTimeField(auto_now_add=True)
    source_url = models.URLField(blank=True)
    is_cleaned = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["date", "category"]),
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["force", "date"]),
        ]

    def __str__(self):
        return f"{self.category} — {self.location_name} ({self.date})"


# ── Scraping ──────────────────────────────────────────────────────────

class ScrapeJob(models.Model):
    """Tracks scraping job execution."""
    STATUS = [("pending","Pending"), ("running","Running"), ("completed","Completed"), ("failed","Failed")]

    force = models.ForeignKey(PoliceForce, on_delete=models.SET_NULL, null=True)
    date_param = models.CharField(max_length=10)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    source = models.CharField(max_length=100, default="police-api")
    records_fetched = models.IntegerField(default=0)
    records_cleaned = models.IntegerField(default=0)
    duplicates_removed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Scrape {self.force} — {self.date_param} ({self.status})"

    @property
    def duration_seconds(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


# ── Crime Reports (Formal) ────────────────────────────────────────────

class CrimeReport(models.Model):
    """User-submitted crime incident report."""
    SEVERITY = [("Low","Low"), ("Medium","Medium"), ("High","High")]
    STATUS = [("Under Review","Under Review"), ("Acknowledged","Acknowledged"),
              ("Investigating","Investigating"), ("Resolved","Resolved")]

    crime_type = models.CharField(max_length=100)
    location = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY, default="Medium")
    status = models.CharField(max_length=20, choices=STATUS, default="Under Review")
    is_anonymous = models.BooleanField(default=False)
    reporter_name = models.CharField(max_length=200, blank=True)
    reporter_email = models.EmailField(blank=True)
    reporter_phone = models.CharField(max_length=30, blank=True)
    reference_number = models.CharField(max_length=20, unique=True, blank=True)
    when_occurred = models.CharField(max_length=200, blank=True)
    urgency = models.CharField(max_length=20, default="non-urgent")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report #{self.reference_number} — {self.crime_type} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            import uuid
            self.reference_number = f"CR-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


# ── Community Policing ────────────────────────────────────────────────

class CommunityMember(models.Model):
    """Community policing hub member profile."""
    ROLES = [("resident","Resident"), ("officer","Police Officer"),
             ("volunteer","Volunteer"), ("organisation","Organisation")]

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    display_name = models.CharField(max_length=200)
    role = models.CharField(max_length=20, choices=ROLES, default="resident")
    ward = models.CharField(max_length=200, blank=True, help_text="Local ward or neighbourhood")
    force = models.ForeignKey(PoliceForce, on_delete=models.SET_NULL, null=True, blank=True)
    badge_number = models.CharField(max_length=20, blank=True, help_text="For officers")
    avatar_initials = models.CharField(max_length=3, blank=True)
    bio = models.TextField(blank=True)
    is_verified = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    reputation_score = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reputation_score"]

    def __str__(self):
        return f"{self.display_name} ({self.get_role_display()})"

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            parts = self.display_name.split()
            self.avatar_initials = "".join(p[0] for p in parts[:2]).upper()
        super().save(*args, **kwargs)


class CommunityPost(models.Model):
    """Community feed post — discussions, alerts, events, praise."""
    CATEGORIES = [
        ("concern","Safety Concern"), ("update","Police Update"),
        ("event","Community Event"), ("success","Success Story"),
        ("praise","Praise / Thanks"), ("volunteer","Volunteer Call"),
        ("question","Question"), ("alert","Safety Alert"),
    ]

    author = models.ForeignKey(CommunityMember, on_delete=models.CASCADE, related_name="posts")
    title = models.CharField(max_length=300)
    body = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORIES, default="concern")
    is_pinned = models.BooleanField(default=False)
    is_anonymous = models.BooleanField(default=False)
    location = models.CharField(max_length=300, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    likes_count = models.IntegerField(default=0)
    replies_count = models.IntegerField(default=0)
    is_flagged = models.BooleanField(default=False)
    is_moderated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"{self.title} — {self.author.display_name}"


class CommunityReply(models.Model):
    """Reply to a community post."""
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(CommunityMember, on_delete=models.CASCADE, related_name="replies")
    body = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    likes_count = models.IntegerField(default=0)
    is_official_response = models.BooleanField(default=False, help_text="Official police response")
    is_flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_official_response", "created_at"]

    def __str__(self):
        return f"Reply by {self.author.display_name} on {self.post.title[:40]}"


class PostLike(models.Model):
    """Track who liked what post (prevent duplicate likes)."""
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="likes")
    member = models.ForeignKey(CommunityMember, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "member")


class SafetyAlert(models.Model):
    """Area-specific safety alerts from police or community watch."""
    LEVELS = [("low","Low"), ("medium","Medium"), ("high","High"), ("critical","Critical")]

    area = models.CharField(max_length=200)
    alert_type = models.CharField(max_length=100)
    level = models.CharField(max_length=10, choices=LEVELS)
    message = models.TextField()
    force = models.ForeignKey(PoliceForce, on_delete=models.SET_NULL, null=True, blank=True)
    issued_by = models.ForeignKey(CommunityMember, on_delete=models.SET_NULL, null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.area} — {self.alert_type} ({self.level})"

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False


class NeighbourhoodWatch(models.Model):
    """Neighbourhood watch group."""
    name = models.CharField(max_length=200)
    area = models.CharField(max_length=300)
    force = models.ForeignKey(PoliceForce, on_delete=models.SET_NULL, null=True, blank=True)
    coordinator = models.ForeignKey(CommunityMember, on_delete=models.SET_NULL, null=True, related_name="coordinated_watches")
    members = models.ManyToManyField(CommunityMember, blank=True, related_name="watch_groups")
    description = models.TextField(blank=True)
    meeting_schedule = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} — {self.area}"


# ── Analysis Cache ────────────────────────────────────────────────────

class AnalysisResult(models.Model):
    """Cached analysis/prediction results."""
    TYPES = [("trend","Trend"), ("forecast","Forecast"), ("hotspot","Hotspot"), ("seasonal","Seasonal")]

    analysis_type = models.CharField(max_length=20, choices=TYPES)
    parameters = models.JSONField(default=dict)
    result_data = models.JSONField(default=dict)
    force = models.ForeignKey(PoliceForce, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(CrimeCategory, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateTimeField(null=True)

    class Meta:
        ordering = ["-created_at"]
