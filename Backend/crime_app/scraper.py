"""
CrimeScope Data Scraper
========================
BeautifulSoup + Requests pipeline to scrape, parse, and clean
UK crime data from data.police.uk and related sources.
"""
import csv
import logging
import re
from datetime import datetime, date
from io import StringIO
from typing import Optional

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.utils import timezone

from .models import PoliceForce, CrimeCategory, CrimeRecord, ScrapeJob

logger = logging.getLogger(__name__)
API_BASE = getattr(settings, "UK_POLICE_API_BASE", "https://data.police.uk/api")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "CrimeScope/2.0 (academic-research; uk-crime-analysis)",
    "Accept": "application/json, text/html",
})
TIMEOUT = 30


def scrape_police_forces() -> list[PoliceForce]:
    """Scrape police forces — JSON API with BeautifulSoup HTML fallback."""
    created = []
    try:
        resp = SESSION.get(f"{API_BASE}/forces", timeout=TIMEOUT)
        resp.raise_for_status()
        for item in resp.json():
            force, is_new = PoliceForce.objects.update_or_create(
                force_id=item["id"], defaults={"name": item["name"]})
            if is_new:
                created.append(force)
        logger.info("Scraped %d forces via API", PoliceForce.objects.count())
        return created
    except (requests.RequestException, ValueError) as exc:
        logger.warning("API failed (%s), falling back to HTML", exc)

    # BeautifulSoup HTML fallback
    try:
        resp = SESSION.get("https://data.police.uk/docs/", timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        for link in soup.select("a[href*='/forces/']"):
            fid = link["href"].rstrip("/").split("/")[-1]
            name = link.get_text(strip=True)
            if fid and name:
                force, is_new = PoliceForce.objects.update_or_create(
                    force_id=fid, defaults={"name": name})
                if is_new:
                    created.append(force)
        logger.info("Scraped %d forces via HTML", len(created))
    except requests.RequestException as exc:
        logger.error("HTML scraping failed: %s", exc)
    return created


def scrape_crime_categories() -> list[CrimeCategory]:
    """Fetch crime categories from API."""
    cats = []
    try:
        resp = SESSION.get(f"{API_BASE}/crime-categories", timeout=TIMEOUT)
        resp.raise_for_status()
        for item in resp.json():
            cat, _ = CrimeCategory.objects.update_or_create(
                slug=item["url"], defaults={"name": item["name"]})
            cats.append(cat)
        logger.info("Scraped %d categories", len(cats))
    except (requests.RequestException, ValueError) as exc:
        logger.error("Category scrape failed: %s", exc)
    return cats


def scrape_crimes_for_force(force_id: str, year_month: str,
                             job: Optional[ScrapeJob] = None) -> list[dict]:
    """
    Scrape crime data for a force and month.
    Uses JSON API with BeautifulSoup HTML/CSV fallback.
    """
    raw = []
    force = PoliceForce.objects.filter(force_id=force_id).first()
    if not force:
        scrape_police_forces()
        force = PoliceForce.objects.filter(force_id=force_id).first()
    if not CrimeCategory.objects.exists():
        scrape_crime_categories()

    # ── JSON API ──────────────────────────────────────────────
    try:
        url = f"{API_BASE}/crimes-no-location"
        params = {"category": "all-crime", "force": force_id, "date": year_month}
        resp = SESSION.get(url, params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        for item in resp.json():
            loc = item.get("location") or {}
            street = loc.get("street", {})
            raw.append({
                "persistent_id": item.get("persistent_id", ""),
                "category_slug": item.get("category", "other-crime"),
                "location_name": street.get("name", ""),
                "latitude": _safe_float(loc.get("latitude")),
                "longitude": _safe_float(loc.get("longitude")),
                "street_name": street.get("name", ""),
                "date": item.get("month", year_month),
                "outcome": (item.get("outcome_status") or {}).get("category", ""),
                "context": item.get("context", ""),
            })
        logger.info("Fetched %d records from API", len(raw))
    except (requests.RequestException, ValueError) as exc:
        logger.warning("API failed (%s), trying HTML", exc)
        raw = _scrape_html_fallback(force_id, year_month)

    if job:
        job.records_fetched = len(raw)
        job.save(update_fields=["records_fetched"])
    return raw


def _scrape_html_fallback(force_id: str, year_month: str) -> list[dict]:
    """BeautifulSoup HTML/CSV scraping fallback."""
    records = []
    try:
        url = f"https://data.police.uk/data/fetch/{force_id}/{year_month}"
        resp = SESSION.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

        # Parse HTML tables
        table = soup.find("table")
        if table:
            headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
            for row in table.find_all("tr")[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if len(cells) >= len(headers):
                    rec = dict(zip(headers, cells))
                    records.append({
                        "persistent_id": rec.get("crime id", ""),
                        "category_slug": _slugify(rec.get("crime type", "other-crime")),
                        "location_name": rec.get("location", ""),
                        "latitude": _safe_float(rec.get("latitude")),
                        "longitude": _safe_float(rec.get("longitude")),
                        "street_name": rec.get("location", ""),
                        "date": year_month,
                        "outcome": rec.get("last outcome category", ""),
                        "context": "",
                    })

        # Parse CSV download links
        for link in soup.find_all("a", href=lambda h: h and h.endswith(".csv")):
            csv_url = link["href"]
            if not csv_url.startswith("http"):
                csv_url = f"https://data.police.uk{csv_url}"
            csv_resp = SESSION.get(csv_url, timeout=TIMEOUT)
            if csv_resp.ok:
                reader = csv.DictReader(StringIO(csv_resp.text))
                for row in reader:
                    records.append({
                        "persistent_id": row.get("Crime ID", ""),
                        "category_slug": _slugify(row.get("Crime type", "other-crime")),
                        "location_name": row.get("Location", ""),
                        "latitude": _safe_float(row.get("Latitude")),
                        "longitude": _safe_float(row.get("Longitude")),
                        "street_name": row.get("Location", ""),
                        "date": row.get("Month", year_month),
                        "outcome": row.get("Last outcome category", ""),
                        "context": "",
                    })
        logger.info("HTML fallback: %d records", len(records))
    except requests.RequestException as exc:
        logger.error("HTML scraping failed: %s", exc)
    return records


def clean_and_store_records(raw: list[dict], force: PoliceForce,
                            job: Optional[ScrapeJob] = None) -> tuple[int, int]:
    """
    Clean raw records and bulk-insert to database.

    Cleaning steps:
    1. Skip records missing category
    2. Normalise category slugs
    3. Parse/validate dates
    4. Deduplicate by persistent_id
    5. Validate UK coordinate bounds (lat 49-61, lng -11 to 2)
    6. Strip whitespace from text fields
    """
    cleaned = []
    dupes = 0
    existing_ids = set(CrimeRecord.objects.filter(force=force).values_list("persistent_id", flat=True))

    for rec in raw:
        if not rec.get("category_slug"):
            continue

        slug = _slugify(rec["category_slug"])
        category = CrimeCategory.objects.filter(slug=slug).first()
        if not category:
            category, _ = CrimeCategory.objects.get_or_create(
                slug=slug, defaults={"name": slug.replace("-", " ").title()})

        crime_date = _parse_date(rec.get("date", ""))
        if not crime_date:
            continue

        pid = rec.get("persistent_id", "").strip()
        if pid and pid in existing_ids:
            dupes += 1
            continue
        if pid:
            existing_ids.add(pid)

        lat, lng = rec.get("latitude"), rec.get("longitude")
        if lat is not None and lng is not None:
            if not (49.0 <= lat <= 61.0 and -11.0 <= lng <= 2.0):
                lat, lng = None, None

        cleaned.append(CrimeRecord(
            persistent_id=pid, category=category, force=force,
            location_name=(rec.get("location_name") or "").strip(),
            latitude=lat, longitude=lng,
            street_name=(rec.get("street_name") or "").strip(),
            date=crime_date,
            outcome=(rec.get("outcome") or "").strip(),
            context=(rec.get("context") or "").strip(),
            is_cleaned=True,
        ))

    stored = CrimeRecord.objects.bulk_create(cleaned, ignore_conflicts=True)
    count = len(stored)
    if job:
        job.records_cleaned = count
        job.duplicates_removed = dupes
        job.save(update_fields=["records_cleaned", "duplicates_removed"])
    logger.info("Stored %d, %d dupes", count, dupes)
    return count, dupes


def run_scrape_pipeline(force_id="metropolitan", year_month="2026-03",
                        source="police-api") -> ScrapeJob:
    """Execute full scrape → clean → store pipeline."""
    force, _ = PoliceForce.objects.get_or_create(
        force_id=force_id, defaults={"name": force_id.replace("-", " ").title()})

    job = ScrapeJob.objects.create(
        force=force, date_param=year_month, source=source,
        status="running", started_at=timezone.now())
    try:
        raw = scrape_crimes_for_force(force_id, year_month, job=job)
        clean_and_store_records(raw, force, job=job)
        job.status = "completed"
        job.completed_at = timezone.now()
        job.save()
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save()
        logger.exception("Pipeline failed: %s", exc)
    return job


# ── Helpers ───────────────────────────────────────────────────────────

def _safe_float(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (ValueError, TypeError):
        return None

def _parse_date(s: str) -> Optional[date]:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%d/%m/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None

def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_]+", "-", text).strip("-")
