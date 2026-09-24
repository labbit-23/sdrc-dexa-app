# sdrc-dexa-app

Standalone Next.js radiology dashboard — runs on the SDRC Ubuntu server. Started as
a DEXA (bone density) reporting app; also serves DICOM/CT viewing (`/dicom`,
`/dicom-v2`) against Orthanc, an ECG viewer (`/ecg`), and scan archive linking
(`/archive-linker`). Name kept as-is to avoid touching the live repo/PM2/deploy
config for a cosmetic rename.

Reads DEXA scan data from Supabase (uploaded by the Windows collector on the GE Lunar workstation)
and generates bone density (osteo) PDF reports on demand.

## Ports

| App             | Port |
|-----------------|------|
| Labbit          | 3000 |
| sdrc-website    | 3001 |
| BMD dev (local) | 3002 |
| **sdrc-dexa-app** | **3010** |

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local — add Supabase URL + keys
npm run dev       # development
npm run build && npm start   # production
```

## URL structure

| URL | Description |
|-----|-------------|
| `/list` | Patient list — all patients with osteo scans |
| `/bmd/report/osteo/[mrn]` | Report viewer with toolbar (PDF download, letterhead) |
| `/bmd/render/osteo/[mrn]` | Raw HTML render (Puppeteer targets this) |
| `/api/pdf?mrn=[mrn]` | PDF download |
| `/api/pdf?mrn=[mrn]&lh=1` | PDF download (letterhead margins) |

## Data flow

```
GE Lunar (Windows)
  └─ collector_osteo_ui.py
       └─ Supabase Storage  raw-osteo/{mrn}/{ts}/
       └─ Supabase DB       bmd_patients · bmd_scans · bmd_results
            └─ sdrc-dexa-app (Ubuntu)
                 └─ /bmd/render/osteo/[mrn]   ← HTML
                 └─ /api/pdf?mrn=[mrn]         ← Puppeteer PDF
```

## PM2 (production)

```bash
npm install -g pm2
pm2 start npm --name sdrc-dexa-app -- start
pm2 save
pm2 startup   # follow the printed command to enable on boot
```

## Upgrading

```bash
git pull
npm install
npm run build
pm2 restart sdrc-dexa-app
```
