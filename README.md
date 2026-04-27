# Crimemind — UK Crime Intelligence Platform

A full-stack web application for scraping, cleaning, analysing, and predicting UK crime data with a community policing portal.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React (JSX), Recharts, Leaflet.js |
| **Backend** | Django 4.2, Django REST Framework |
| **Scraping** | BeautifulSoup4, Requests, lxml |
| **Analysis** | Pandas, NumPy, scikit-learn, statsmodels (ARIMA) |
| **Maps** | Leaflet.js with CartoDB dark tiles |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Task Queue** | Celery + Redis (optional) |

---

## Features

### Dashboard
- Interactive Leaflet map with crime hotspot markers
- Regional crime rankings with trend indicators
- Monthly trend area charts and crime type distribution

### Data Scraper
- BeautifulSoup pipeline with JSON API + HTML/CSV fallback
- Configurable force, date, and source selection
- Live progress logging with pipeline visualisation
- Automated data cleaning (dedup, coordinate validation, normalisation)

### Crime Analysis
- Monthly category bar charts and radar comparisons
- Day × hour crime frequency heatmap
- Regional horizontal comparison charts
- Year-over-year trend analysis

### Predictive Analytics
- ARIMA(2,1,2) with seasonal decomposition
- 6-month crime forecasts with confidence intervals
- Model metrics (MAE, RMSE, R², confidence)
- High-risk area prediction cards

### Report Portal
- Submit incident reports (anonymous option)
- Filter by status: Under Review / Investigating / Resolved
- Severity tracking (Low / Medium / High)
- Urgency levels and reference number generation

### Community Policing Hub
- **Community Feed**: Post concerns, praise, events, volunteer calls
- **Safety Alerts**: Area-specific alerts with severity levels
- **Report Crime**: Detailed crime report form with guidance
- **Resources**: Emergency numbers, Crimestoppers, Victim Support
- Local officer directory with online status
- Neighbourhood Watch group management
- Post likes, replies, flagging, and moderation
- Community stats and reputation system

---

## Project Structure

```
crimemind/
├── manage.py
├── requirements.txt
├── crime_project/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── crime_app/
    ├── models.py          # 12 models (crime, reports, community)
    ├── serializers.py     # DRF serializers for all models
    ├── views.py           # 30+ API endpoints
    ├── urls.py            # URL routing with DRF router
    ├── admin.py           # Full admin configuration
    ├── scraper.py         # BeautifulSoup scraping pipeline
    ├── analysis.py        # ARIMA, trends, heatmaps, hotspots
    ├── tasks.py           # Celery async tasks
    └── management/commands/
        ├── scrape_crimes.py    # CLI scraping
        └── seed_community.py   # Seed demo community data
```

---

## Setup

### Backend

```bash
cd crimescope
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Seed demo data
python manage.py scrape_crimes --sync-forces
python manage.py seed_community

# Start server
python manage.py runserver 8000
```

### Frontend

```bash
npx create-react-app crimescope-ui
cd crimescope-ui
npm install recharts leaflet lucide-react lodash

# Copy uk_crime_platform.jsx content into src/App.jsx
npm start
```

---

## API Endpoints

### Core Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forces/` | List police forces |
| GET | `/api/categories/` | Crime categories |
| GET | `/api/crimes/` | Query crime records |
| GET | `/api/crimes/geo/` | Map markers (lightweight) |

### Scraping
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scrape/trigger/` | Start scrape job |
| POST | `/api/scrape/sync-forces/` | Sync forces & categories |
| GET | `/api/scrape-jobs/` | Job history |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analysis/trends/` | Monthly trends |
| GET | `/api/analysis/regions/` | Regional summary |
| GET | `/api/analysis/breakdown/` | Crime type distribution |
| GET | `/api/analysis/heatmap/` | Day×hour heatmap |
| GET | `/api/analysis/hotspots/` | Hotspot detection |
| GET | `/api/analysis/yoy/` | Year-over-year comparison |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/predict/` | ARIMA crime forecast |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/` | List reports |
| POST | `/api/reports/` | Submit new report |
| PATCH | `/api/reports/{id}/update-status/` | Update status |
| GET | `/api/reports/stats/` | Report statistics |



### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/` | Aggregated summary |

---

## CLI Commands

```bash
# Scrape a specific force
python manage.py scrape_crimes --force metropolitan --date 2026-03

# Scrape all forces
python manage.py scrape_crimes --force all --date 2026-03

# Sync reference data
python manage.py scrape_crimes --sync-forces

# Seed community demo data
python manage.py seed_community
```

---

## Data Pipeline

```
 SCRAPE            PARSE             CLEAN             STORE            ANALYSE
┌──────────┐    ┌──────────┐    ┌──────────────┐   ┌──────────┐    ┌──────────────┐
│Beautiful │───▸│ Extract  │───▸│ Deduplicate  │──▸│ Django   │───▸│ ARIMA / ML   │
│  Soup +  │    │ tables,  │    │ Validate     │   │ ORM bulk │    │ Forecasting  │
│ Requests │    │ JSON,CSV │    │ Coordinates  │   │ insert   │    │ Hotspots     │
└──────────┘    └──────────┘    └──────────────┘   └──────────┘    └──────────────┘
```

---

## Environment Variables

---

## Production

```bash
export DB_ENGINE=django.db.backends.postgresql
export DB_NAME=crimescope
export DJANGO_SECRET_KEY=$(python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
export DJANGO_DEBUG=False

python manage.py collectstatic
gunicorn crime_project.wsgi:application --bind 0.0.0.0:8000 --workers 4
```
