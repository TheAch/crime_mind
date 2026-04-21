"""
Celery tasks for background scraping and analysis.
"""
from celery import shared_task
from .scraper import run_scrape_pipeline


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def async_scrape_task(self, force_id, year_month, source="police-api"):
    """Run scrape pipeline asynchronously."""
    try:
        job = run_scrape_pipeline(force_id, year_month, source)
        return {"job_id": job.id, "status": job.status,
                "records": job.records_cleaned, "dupes": job.duplicates_removed}
    except Exception as exc:
        self.retry(exc=exc)


@shared_task
def scrape_all_forces_task(year_month, source="police-api"):
    """Scrape all registered police forces."""
    from .models import PoliceForce
    from .scraper import scrape_police_forces
    forces = PoliceForce.objects.all()
    if not forces.exists():
        scrape_police_forces()
        forces = PoliceForce.objects.all()
    return [{"force": f.name, "status": run_scrape_pipeline(f.force_id, year_month, source).status}
            for f in forces]


@shared_task
def refresh_analysis_cache_task():
    """Refresh cached analysis results."""
    from .analysis import get_monthly_trends, get_region_summary, get_crime_type_breakdown
    get_monthly_trends()
    get_region_summary()
    get_crime_type_breakdown()
    return {"status": "refreshed"}
