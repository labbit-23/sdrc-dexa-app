import Link from 'next/link'
import BASE from '@/lib/basepath'

const modules = [
  { href: '/dicom-v2', icon: '🩻', eyebrow: 'Radiology operations', title: 'DICOM Operations', desc: 'Radiology studies · WhatsApp delivery', accent: '#6c63ff' },
  { href: '/ecg', icon: '♥', eyebrow: 'ECG · Mirth / Tricog', title: 'ECG Management', desc: 'Report delivery and send activity', accent: '#ff6f91' },
  { href: '/dicom', icon: '📡', eyebrow: 'Radiology operations · legacy', title: 'DICOM Operations (Classic)', desc: 'Previous dashboard · Mirth-backed', accent: '#9aa5b1' },
]

const bmdServices = [
  { href: '/list', icon: '🦴', title: 'Reports', desc: 'Bone density & body composition' },
  { href: '/fetch', icon: '▣', image: true, title: 'Data Collector', desc: 'Gather DEXA studies from scanner' },
  { href: '/archive-linker', icon: '↗', title: 'Archive linker', desc: 'Connect historical scans' },
]

function BmdGroup() {
  return <section className="bmd-group">
    <div className="bmd-heading"><div className="bmd-mark">🦴</div><div><div className="eyebrow">BMD workspace</div><div className="bmd-title">Bone density & body composition</div><div className="bmd-desc">Reporting, scanner collection, and longitudinal records in one place.</div></div></div>
    <div className="bmd-actions">{bmdServices.map(service => <Link href={service.href} key={service.href} className="bmd-action"><span className="bmd-action-icon">{service.image ? <img src={`${BASE}/dexa-scanner.png`} alt="" /> : service.icon}</span><span><strong>{service.title}</strong><small>{service.desc}</small></span><span className="arrow">↗</span></Link>)}</div>
  </section>
}

function ModuleCard({ module }) {
  const content = (
    <div className={`module-card ${module.featured ? 'featured' : ''} ${module.disabled ? 'disabled' : ''}`} style={{ '--accent': module.accent }}>
      <div className="card-topline">
        <div className="module-icon">{module.image ? <img src={`${BASE}/dexa-scanner.png`} alt="" /> : module.icon}</div>
        {module.disabled ? <span className="status-badge muted">Coming soon</span> : <span className="arrow">↗</span>}
      </div>
      <div className="eyebrow">{module.eyebrow}</div>
      <div className="module-title">{module.title}</div>
      <div className="module-desc">{module.desc}</div>
      <div className="card-line" />
    </div>
  )
  return module.disabled ? <div>{content}</div> : <Link href={module.href}>{content}</Link>
}

export default function HubPage() {
  return (
    <main className="hub-shell">
      <style>{`
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        body { background: #f5f8fb; }
        .hub-shell { height: 100vh; overflow: hidden; color: #102a43; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 85% 0%, rgba(33, 185, 173, .10), transparent 34%), #f5f8fb; }
        .hub-nav { height: 76px; display:flex; align-items:center; justify-content:space-between; padding: 0 clamp(22px, 5vw, 72px); background: rgba(255,255,255,.88); border-bottom: 1px solid #e4edf3; backdrop-filter: blur(18px); }
        .brand { display:flex; align-items:center; gap:13px; }
        .brand img { width: 106px; height: auto; display:block; }
        .brand-sdrc { width: 82px !important; max-height: 27px; object-fit: contain; }
        .brand-divider { height: 23px; width:1px; background:#dce7ed; }
        .brand-label { color:#6a8293; font-size:12px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; }
        .nav-chip { display:flex; align-items:center; gap:8px; padding:8px 13px; border:1px solid #dfecef; border-radius:999px; color:#557080; background:#fff; font-size:12px; font-weight:700; }
        .pulse { width:7px; height:7px; background:#20b486; border-radius:50%; box-shadow:0 0 0 4px #e5f7f0; }
        .hub-content { max-width:1180px; margin:0 auto; padding: clamp(30px, 5vh, 52px) 24px 26px; }
        .hero { display:flex; justify-content:space-between; align-items:end; gap:30px; margin-bottom:25px; }
        .kicker { display:flex; align-items:center; gap:9px; color:#0e8c85; font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; margin-bottom:15px; }
        .kicker:before { content:""; width:28px; height:2px; background:#13b1a6; }
        h1 { margin:0; color:#112f46; font-size:clamp(34px, 5vw, 58px); line-height:1.02; letter-spacing:-.055em; font-weight:850; }
        .hero-copy { max-width:550px; color:#718798; font-size:15px; line-height:1.7; margin:18px 0 0; }
        .hero-note { min-width:190px; padding:16px 18px; background:#fff; border:1px solid #e2edf2; border-radius:16px; box-shadow:0 14px 38px rgba(31, 73, 95, .06); }
        .hero-note-label { color:#8aa0ae; text-transform:uppercase; letter-spacing:.1em; font-size:10px; font-weight:800; }
        .hero-note-value { display:flex; align-items:center; gap:8px; margin-top:9px; color:#1e465d; font-size:13px; font-weight:750; }
        .module-grid { display:grid; grid-template-columns:repeat(6, 1fr); gap:18px; }
        .module-grid > a, .module-grid > div { grid-column:span 2; text-decoration:none; }
        .module-grid > :nth-child(1), .module-grid > :nth-child(2), .module-grid > :nth-child(3) { grid-column:span 2; }
        .module-card { position:relative; min-height:168px; overflow:hidden; padding:20px; border:1px solid #e2edf2; border-radius:20px; background:rgba(255,255,255,.9); box-shadow:0 12px 35px rgba(36,73,95,.055); transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .module-card:hover { transform:translateY(-4px); border-color:var(--accent); box-shadow:0 18px 42px rgba(36,73,95,.12); }
        .module-card.featured { min-height:190px; padding:23px; }
        .module-card:before { content:""; position:absolute; inset:0 0 auto; height:4px; background:var(--accent); }
        .module-card.disabled { opacity:.63; background:#f8fafb; }
        .module-card.disabled:hover { transform:none; box-shadow:0 12px 35px rgba(36,73,95,.055); border-color:#e2edf2; }
        .card-topline { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .module-icon { display:grid; place-items:center; width:54px; height:54px; color:var(--accent); border-radius:16px; background:color-mix(in srgb, var(--accent) 11%, white); font-size:30px; font-weight:700; }
        .module-icon img { width:37px; height:37px; object-fit:contain; }
        .arrow { color:#a9bbc5; font-size:22px; }
        .status-badge { padding:6px 9px; border-radius:999px; font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
        .status-badge.muted { background:#edf2f4; color:#81929d; }
        .eyebrow { color:var(--accent); font-size:10px; text-transform:uppercase; letter-spacing:.11em; font-weight:850; margin-bottom:8px; }
        .module-title { color:#173b52; font-size:19px; letter-spacing:-.025em; font-weight:800; }
        .module-card.featured .module-title { font-size:23px; }
        .module-desc { color:#718798; font-size:13px; line-height:1.55; margin-top:7px; max-width:310px; }
        .card-line { position:absolute; left:24px; right:24px; bottom:0; height:1px; background:linear-gradient(90deg, var(--accent), transparent); opacity:.35; }
        .bmd-group { display:flex; align-items:center; justify-content:space-between; gap:28px; margin-bottom:18px; padding:25px 28px; border:1px solid #dcebe9; border-radius:20px; background:linear-gradient(115deg,#f1fbfa,#fff 66%); box-shadow:0 12px 35px rgba(36,73,95,.055); }
        .bmd-heading { display:flex; align-items:center; gap:16px; min-width:280px; }
        .bmd-mark { display:grid; place-items:center; width:54px; height:54px; border-radius:16px; background:#dff7f3; font-size:29px; }
        .bmd-title { color:#173b52; font-size:21px; letter-spacing:-.03em; font-weight:800; }
        .bmd-desc { color:#718798; font-size:12px; line-height:1.5; margin-top:5px; }
        .bmd-actions { display:grid; grid-template-columns:repeat(3, minmax(125px, 1fr)); gap:9px; flex:1; }
        .bmd-action { display:flex; align-items:center; gap:9px; min-height:64px; padding:10px 12px; color:#4e6d7c; text-decoration:none; border:1px solid #e2efed; border-radius:13px; background:rgba(255,255,255,.8); }
        .bmd-action:hover { border-color:#13aa9f; background:#fff; }
        .bmd-action-icon { color:#0e8c85; font-size:21px; }
        .bmd-action-icon img { width:25px; height:25px; object-fit:contain; display:block; }
        .bmd-action strong, .bmd-action small { display:block; }
        .bmd-action strong { color:#21475b; font-size:12px; }
        .bmd-action small { color:#8297a2; font-size:10px; line-height:1.35; margin-top:3px; }
        .bmd-action .arrow { margin-left:auto; font-size:16px; }
        .hub-footer { display:flex; justify-content:space-between; gap:20px; margin-top:24px; padding-top:14px; border-top:1px solid #e2edf2; color:#8ca0ab; font-size:11px; }
        @media (max-width: 820px) { .hub-shell { height:auto; min-height:100vh; overflow:visible; } .bmd-group { display:block; } .bmd-actions { margin-top:20px; } }
        @media (max-width: 720px) { .hero { display:block; } .hero-note { margin-top:24px; } .module-grid { display:block; } .module-grid > a, .module-grid > div { display:block; margin-bottom:15px; } .module-card, .module-card.featured { min-height:190px; } .bmd-actions { grid-template-columns:1fr; } .hub-footer { display:block; line-height:2; } .brand-label { display:none; } }
      `}</style>
      <nav className="hub-nav">
        <div className="brand">
          <img src={`${BASE}/labit-logo.png`} alt="Labit" />
          <img className="brand-sdrc" src={`${BASE}/sdrc-logo.png`} alt="SDRC" />
          <span className="brand-divider" />
          <span className="brand-label">Radiology Information System</span>
        </div>
        <div className="nav-chip"><span className="pulse" /> SDRC Radiology</div>
      </nav>
      <section className="hub-content">
        <div className="hero">
          <div>
            <div className="kicker">Labit workspace</div>
            <h1>Radiology,<br />made connected.</h1>
            <p className="hero-copy">One calm workspace for reports, scanner data, archives, and radiology operations.</p>
          </div>
          <div className="hero-note"><div className="hero-note-label">Workspace status</div><div className="hero-note-value"><span className="pulse" /> All systems ready</div></div>
        </div>
        <BmdGroup />
        <div className="module-grid">{modules.map(module => <ModuleCard key={module.title} module={module} />)}</div>
        <footer className="hub-footer"><span>Labit · SDRC Diagnostics</span><span>Radiology Information System</span></footer>
      </section>
    </main>
  )
}
