"""
Management command to scrape UK crime data.

Usage:
    python manage.py scrape_crimes --force metropolitan --date 2026-03
    python manage.py scrape_crimes --force all --date 2026-03
    python manage.py scrape_crimes --sync-forces
"""
from django.core.management.base import BaseCommand
from crime_app.scraper import run_scrape_pipeline, scrape_police_forces, scrape_crime_categories
from crime_app.models import PoliceForce


class Command(BaseCommand):
    help = "Scrape UK crime data from data.police.uk using BeautifulSoup"

    def add_arguments(self, parser):
        parser.add_argument("--force", type=str, default="metropolitan",
                            help="Police force ID or 'all'")
        parser.add_argument("--date", type=str, default="2026-03",
                            help="YYYY-MM format")
        parser.add_argument("--source", type=str, default="police-api",
                            choices=["police-api", "ons", "home-office"])
        parser.add_argument("--sync-forces", action="store_true",
                            help="Sync forces and categories only")

    def handle(self, *args, **options):
        if options["sync_forces"]:
            self.stdout.write("Syncing police forces and categories...")
            scrape_police_forces()
            scrape_crime_categories()
            self.stdout.write(self.style.SUCCESS(
                f"Done: {PoliceForce.objects.count()} forces synced"))
            return

        force_id = options["force"]
        year_month = options["date"]
        source = options["source"]

        if force_id == "all":
            forces = PoliceForce.objects.all()
            if not forces.exists():
                self.stdout.write("No forces found, syncing first...")
                scrape_police_forces()
                forces = PoliceForce.objects.all()
            for force in forces:
                self.stdout.write(f"Scraping {force.name}...")
                job = run_scrape_pipeline(force.force_id, year_month, source)
                self._report(job)
        else:
            self.stdout.write(f"Scraping {force_id} for {year_month}...")
            job = run_scrape_pipeline(force_id, year_month, source)
            self._report(job)

    def _report(self, job):
        if job.status == "completed":
            dur = f" ({job.duration_seconds:.1f}s)" if job.duration_seconds else ""
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {job.records_cleaned} stored, "
                f"{job.duplicates_removed} dupes removed{dur}"))
        else:
            self.stdout.write(self.style.ERROR(f"  ✗ {job.error_message}"))
