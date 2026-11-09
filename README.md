# ICD-10-GM Diagnosis Search

A web-based search mask for ICD-10-GM 2025 diagnoses. Typing in the search field filters the list of diagnoses shown below it, by **code** (e.g. `E10`) or by **title** (e.g. `Cholera`).

Solution for Task 1 of the [RECOM interview tasks](https://github.com/RECOMGmbH/InterviewAufgaben) (WebDev / Werkstudent).

## Features

- Search by code prefix or by any part of the title
- Case- and accent-insensitive: `storung` finds "Störung"
- Ranked results: code matches first, then titles that start with the query, then other title matches
- Search while typing, with debouncing; outdated requests are cancelled
- Matched text is highlighted
- Loading, "no results" and "backend not reachable" states

## Architecture

```
┌───────────────────────┐   GET /api/search.php?q=…   ┌──────────────────────┐   SQL (PDO)    ┌──────────────┐
│  Angular + Material   │ ──────────────────────────▶ │  PHP 8.3 (Apache)    │ ─────────────▶ │  MySQL 8.4   │
│  localhost:4200       │ ◀────────────────────────── │  JSON API            │ ◀───────────── │  table       │
│  (ng serve + proxy)   │      [{code, title}, …]     │  localhost:8080      │                │  diagnoses   │
└───────────────────────┘                             └──────────────────────┘                └──────────────┘
                                                        Docker container                        Docker container
```

- **Frontend** (`frontend/`): Angular 22 (standalone components, zoneless, signals) with Angular Material. In development, the Angular dev server forwards `/api/*` to the PHP container (`proxy.conf.json`), so there are no CORS issues.
- **Backend** (`backend/`): plain PHP with PDO, no framework. `search.php` is the API; `import.php` loads the BfArM file into the database.
- **Database** (`db/init.sql`): one table `diagnoses(code PRIMARY KEY, title)`, created automatically when the MySQL container starts for the first time.

## Getting started

**Requirements:** Docker (with Docker Compose) and Node.js with npm.

```bash
# 1. Download the data file (see "Data" below) and put it here:
#    data/icd10gm2025syst_kodes.txt

# 2. Start MySQL and the PHP backend (waits until MySQL is ready)
docker compose up -d --build

# 3. Import the ICD-10-GM data (only needed once; can safely be run again)
docker compose exec backend php import.php
#    → Imported 16817 diagnoses

# 4. Start the frontend
cd frontend
npm install
npx ng serve
```

Open **http://localhost:4200**.

The API can also be called directly, e.g. http://localhost:8080/search.php?q=cholera

To stop everything: `docker compose down`. Add `-v` to also delete the database volume.

### Data

The data file is **not included in this repository**. It is published by the BfArM (Federal Institute for Drugs and Medical Devices) and must be downloaded from there:

1. Download the ZIP file `icd10gm2025syst-meta` (the same link as in the task description): https://www.bfarm.de/SharedDocs/Downloads/DE/Kodiersysteme/klassifikationen/icd-10-gm/version2025/icd10gm2025syst-meta_zip.html?nn=841246&cms_dlConfirm=true&cms_calledFromDoc=841246
2. Unzip it and copy `Klassifikationsdateien/icd10gm2025syst_kodes.txt` into the `data/` folder of this project, so the path is `data/icd10gm2025syst_kodes.txt`. If your copy is named `.csv`, rename it to `.txt`; the content is the same semicolon-separated format.

Only column 6 (code) and column 9 (title) are used. The hierarchy is ignored, as the task requires.

The file is semicolon-separated, has no header row, and is UTF-8 with Windows line endings. Titles can contain commas (e.g. "Diabetes mellitus, Typ 1"), so the import splits only on `;`.

## API

`GET /search.php?q=<text>`

| Case | Response |
|---|---|
| `q` has 2 or more characters | `200` with up to 50 results: `[{"code": "A00.0", "title": "Cholera durch …"}, …]` |
| `q` is missing or shorter than 2 characters | `200` with `[]` |
| Database error | `500` with `{"error": "Die Suche ist derzeit nicht verfügbar."}` |

## Project structure

```
icd-search/
├── docker-compose.yml          MySQL + PHP containers, healthcheck, volumes
├── data/                       BfArM source file
├── db/init.sql                 table definition (utf8mb4, accent/case-insensitive collation)
├── backend/
│   ├── Dockerfile              php:8.3-apache + pdo_mysql
│   ├── db.php                  PDO connection from environment variables
│   ├── import.php              CLI-only import (one transaction, prepared statement)
│   └── search.php              JSON search API
└── frontend/
    ├── proxy.conf.json         /api → http://localhost:8080
    └── src/app/
        ├── diagnosis.service.ts        HTTP call to the API
        ├── highlight.pipe.ts           splits text into matched / unmatched parts
        └── diagnosis-search/           search component (input, states, table)
```

## Why these technologies

- **Angular + Angular Material**: Angular is the frontend framework used in ENP Online. Material provides accessible, consistent components (form field, table, progress bar) and a theme, so the UI looks clean without much custom CSS. RxJS fits search-as-you-type well: `debounceTime` → `distinctUntilChanged` → `switchMap` handles waiting, duplicates and cancelling old requests.
- **Plain PHP 8.3 + PDO**: PHP is the backend language used in ENP Online. The API is a single endpoint, so a framework would add more setup than value. PDO prepared statements protect against SQL injection, and the connection settings come from environment variables.
- **MySQL 8.4**: the data is a simple relational table (code → title). The collation `utf8mb4_0900_ai_ci` makes searches case- and accent-insensitive directly in the database, and `utf8mb4` stores all German characters correctly. The code is the primary key, because it is unique in the source file.
- **Docker Compose**: one command starts the same environment on every machine, with no local PHP or MySQL installation. The backend reads the database host from `DB_HOST`, so moving the database to another server (Task 2) only needs a configuration change, not a code change.

## Design decisions

- **Search logic in SQL**: `code LIKE 'q%' OR title LIKE '%q%'`, ranked with `ORDER BY CASE …`, `LIMIT 50`. The user input is escaped for `LIKE` (`%`, `_`), so it is always searched as literal text.
- **Minimum 2 characters**: a single letter would match thousands of rows and is not useful.
- **Errors**: the API logs the real error to the server log and returns only a general message with status 500. The frontend catches errors per request (`catchError` inside `switchMap`), so the search keeps working after an error.
- **Highlighting without `innerHTML`**: the pipe returns text parts and the template wraps matches in `<mark>`. No HTML is generated from data, so there is no XSS risk.

## What I would improve with more time

- **Tests**: PHPUnit tests for the search ranking and the LIKE escaping, and Angular component tests for the search states. The project was created with `--minimal` (no test setup) because of limited disk space.
- **Full-text search**: a MySQL `FULLTEXT` index, or a search engine, for larger data sets and word-based relevance. `LIKE '%…%'` cannot use an index, but it is fast enough for about 17,000 rows.
- **Pagination or infinite scroll** instead of a fixed limit of 50 results.
- **Code search without the dot**: also find `A00.0` when the user types `A000`.
- **Production setup**: build the Angular app (`ng build`) and serve it from the same web server as the API (e.g. a frontend container with nginx), and put the passwords in a `.env` file or Docker secrets instead of `docker-compose.yml`.
- **Keyboard navigation and a detail view** for a selected diagnosis.
