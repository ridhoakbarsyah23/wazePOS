"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { marketingFaqs } from "@/lib/marketing-content";
import { formatPlanAnnualPrice, getMarketingPlanCards, getPlanFeatureComparison } from "@/lib/plans";

type MarketingPageProps = {
  trialUrl: string;
  whatsappGeneralUrl: string;
  whatsappTrialUrl: string;
};

type IconName =
  | "arrow"
  | "bag"
  | "box"
  | "chart"
  | "check"
  | "chevron"
  | "clock"
  | "coffee"
  | "customer"
  | "dashboard"
  | "laundry"
  | "menu"
  | "people"
  | "receipt"
  | "restaurant"
  | "shield"
  | "spark"
  | "store"
  | "tag"
  | "whatsapp"
  | "x";

const iconPaths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  bag: <><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
  box: <><path d="m21 8-9 5-9-5"/><path d="m3 8 9-5 9 5v9l-9 5-9-5Z"/><path d="M12 13v9"/></>,
  chart: <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  chevron: <path d="m8 10 4 4 4-4"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  coffee: <><path d="M4 8h13v5a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8Z"/><path d="M17 10h1a3 3 0 0 1 0 6h-2"/><path d="M7 4v1M11 3v2"/></>,
  customer: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  laundry: <><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01M12 6h4"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2"/><path d="M16 14a5 5 0 0 1 5 5"/></>,
  receipt: <><path d="M5 3h14v19l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  restaurant: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M16 3v18M16 3c4 2 4 8 0 10"/></>,
  shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
  spark: <><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z"/><path d="m19 15 .7 2.3L22 18.5l-2.3 1.2L19 22l-.7-2.3-2.3-1.2 2.3-1.2L19 15Z"/></>,
  store: <><path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
  tag: <><path d="M20 13 11 22l-9-9V3h10l8 8a1.4 1.4 0 0 1 0 2Z"/><circle cx="7" cy="8" r="1.5"/></>,
  whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.2 7.5c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.7c.1.3 0 .5-.1.7l-.6.8c-.2.2-.1.4 0 .6.8 1.4 1.8 2.4 3.2 3.1.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.7.8c.3.1.4.3.4.5 0 .4-.2 1.2-.5 1.6-.5.6-1.3 1-2.2 1-1.2 0-3.2-.7-5.2-2.5C7.2 12.4 6.7 10.3 7 9c.2-.7.7-1.3 1.2-1.5Z"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

const benefits = [
  { icon: "clock" as const, title: "Transaksi lebih cepat", text: "Percepat proses transaksi agar antrean tetap lancar dan pelanggan terlayani dengan baik." },
  { icon: "box" as const, title: "Stok lebih terkendali", text: "Pantau jumlah dan pergerakan stok tanpa perlu melakukan pencatatan berulang." },
  { icon: "chart" as const, title: "Laporan lebih praktis", text: "Tinjau ringkasan penjualan tanpa menghabiskan waktu untuk rekapitulasi manual." },
  { icon: "customer" as const, title: "Pelanggan lebih terkelola", text: "Kelola data dan riwayat transaksi pelanggan untuk mendukung pelayanan yang lebih baik." },
  { icon: "people" as const, title: "Mendukung operasional tim", text: "Gunakan akun terpisah untuk membantu pembagian tugas antara pemilik usaha dan kasir." },
  { icon: "shield" as const, title: "Data lebih terorganisasi", text: "Kelola data operasional bisnis dalam satu sistem yang terpusat dan mudah diakses." },
];

const featureGroups = [
  { id: "cashier", label: "Kasir", icon: "receipt" as const, title: "Proses transaksi dalam satu alur yang efisien", text: "Kelola keranjang, diskon, pembayaran, struk, dan riwayat transaksi melalui alur kerja yang praktis.", bullets: ["Keranjang dan diskon", "Beragam metode pembayaran", "Struk dan riwayat transaksi"] },
  { id: "stock", label: "Produk dan Stok", icon: "box" as const, title: "Kelola produk dan pantau stok dengan mudah", text: "Atur produk, kategori, harga, serta pergerakan stok agar operasional harian tetap terkendali.", bullets: ["Produk dan kategori", "Stok masuk dan keluar", "Peringatan stok minimum"] },
  { id: "report", label: "Laporan", icon: "chart" as const, title: "Pahami kinerja bisnis tanpa rekapitulasi manual", text: "Tinjau pendapatan, tren penjualan, dan produk terlaris melalui laporan yang mudah dipahami.", bullets: ["Laporan harian dan bulanan", "Produk terlaris", "Ringkasan pendapatan"] },
  { id: "customer", label: "Pelanggan", icon: "customer" as const, title: "Kenali pelanggan bisnis Anda", text: "Kelola informasi dan riwayat transaksi pelanggan untuk mendukung pelayanan yang lebih baik.", bullets: ["Data pelanggan", "Riwayat transaksi", "Pencarian cepat"] },
  { id: "team", label: "Tim", icon: "people" as const, title: "Kelola operasional tim dengan lebih tertata", text: "Gunakan akun terpisah berdasarkan peran pemilik usaha dan kasir sesuai kebutuhan operasional.", bullets: ["Akun untuk beberapa pengguna", "Peran admin dan kasir", "Aktivitas lebih terorganisasi"] },
];

const businessTypes = [
  { icon: "store" as const, title: "Toko dan Warung", text: "Sederhanakan transaksi dan pantau ketersediaan barang dengan lebih mudah." },
  { icon: "coffee" as const, title: "Kedai Kopi", text: "Layani pesanan secara efisien sekaligus pantau perkembangan penjualan." },
  { icon: "restaurant" as const, title: "Restoran", text: "Kelola transaksi, pesanan, dan laporan penjualan dalam satu sistem." },
  { icon: "laundry" as const, title: "Usaha Laundry", text: "Catat transaksi dan kelola data pelanggan dengan lebih teratur." },
  { icon: "bag" as const, title: "Minimarket", text: "Kelola katalog produk dan stok barang secara lebih terkendali." },
  { icon: "tag" as const, title: "Usaha Ritel", text: "Dukung operasional harian ketika jumlah produk dan transaksi terus bertambah." },
];

const showcaseTabs = ["Dasbor", "Kasir", "Produk", "Stok", "Laporan", "Pelanggan"];

const pricingPlans = getMarketingPlanCards();
const featureComparison = getPlanFeatureComparison();

function TrackedLink({ href, event, className, children, external = false }: { href: string; event: Parameters<typeof trackEvent>[0]; className: string; children: React.ReactNode; external?: boolean }) {
  return <a href={href} className={className} onClick={() => trackEvent(event, { destination: href })} {...(external && href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
}

function Brand() {
  return <a href="#beranda" className="brand" aria-label="wazePOS — kembali ke beranda"><span className="brand-mark"><span /><span /><span /></span><span>waze<span>POS</span></span></a>;
}

function DashboardMockup({ mode = "hero", active = "Dasbor" }: { mode?: "hero" | "showcase"; active?: string }) {
  const previewNavigation: Array<{ label: string; icon: IconName }> = [
    { label: "Dasbor", icon: "dashboard" },
    { label: "Kasir", icon: "receipt" },
    { label: "Produk", icon: "box" },
    { label: "Stok", icon: "bag" },
    { label: "Laporan", icon: "chart" },
    { label: "Pelanggan", icon: "customer" },
  ];

  return (
    <div className={`app-window app-window--${mode}`} aria-label={`Ilustrasi konsep tampilan ${active} wazePOS`} role="img">
      <div className="window-bar"><span /><span /><span /><b>Pratinjau konsep</b></div>
      <div className="app-shell">
        <aside className="app-sidebar">
          <span className="mini-logo">w</span>
          {previewNavigation.map((item) => <span key={item.label} className={active === item.label ? "active" : ""}><Icon name={item.icon} size={15} /></span>)}
        </aside>
        <div className="app-content">
          <div className="mock-head"><div><small>Ringkasan bisnis</small><strong>{active}</strong></div><span className="mock-avatar">WP</span></div>
          <div className="metric-row">
            <div><span className="metric-icon green"><Icon name="chart" size={14}/></span><small>Penjualan</small><strong>Rp 4,8 jt</strong><em>Contoh data</em></div>
            <div><span className="metric-icon orange"><Icon name="receipt" size={14}/></span><small>Transaksi</small><strong>128</strong><em>Bulan berjalan</em></div>
            <div><span className="metric-icon purple"><Icon name="box" size={14}/></span><small>Produk</small><strong>246</strong><em>Terdata</em></div>
          </div>
          <div className="mock-grid">
            <div className="chart-card"><div className="mock-card-head"><strong>Tren penjualan</strong><span>7 hari</span></div><div className="bar-chart">{[36, 52, 45, 72, 57, 84, 68].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>Sen</span><span>Rab</span><span>Jum</span><span>Min</span></div></div>
            <div className="activity-card"><div className="mock-card-head"><strong>Aktivitas</strong><span>Lihat detail</span></div>{["Transaksi baru", "Stok diperbarui", "Pelanggan baru"].map((item, index) => <div className="activity" key={item}><span className={`dot dot-${index}`} /><div><b>{item}</b><small>Baru saja</small></div></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingPage({ trialUrl, whatsappGeneralUrl, whatsappTrialUrl }: MarketingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(featureGroups[0]);
  const [activeShowcase, setActiveShowcase] = useState(showcaseTabs[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showMobileComparison, setShowMobileComparison] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const updateHeader = () => setScrolled(window.scrollY > 18);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if (reduceMotion) {
      return () => window.removeEventListener("scroll", updateHeader);
    }

    const root = document.documentElement;
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    root.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
      window.removeEventListener("scroll", updateHeader);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#konten">Lewati ke konten</a>
      <header className={scrolled ? "site-header scrolled" : "site-header"}>
        <div className="container nav-wrap">
          <Brand />
          <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Navigasi utama">
            <a href="#beranda" onClick={closeMenu}>Beranda</a><a href="#fitur" onClick={closeMenu}>Fitur</a><a href="#cara-kerja" onClick={closeMenu}>Cara Kerja</a><a href="#harga" onClick={() => { closeMenu(); trackEvent("click_pricing"); }}>Harga</a><a href="#faq" onClick={closeMenu}>FAQ</a>
            <div className="nav-mobile-actions"><Link href="/login" className="button button-ghost" onClick={closeMenu}>Masuk</Link><TrackedLink href={trialUrl} event="click_try_free" className="button button-primary">Uji Coba Gratis <Icon name="arrow" size={18}/></TrackedLink></div>
          </nav>
          <button className={menuOpen ? "menu-backdrop open" : "menu-backdrop"} type="button" aria-label="Tutup menu navigasi" tabIndex={menuOpen ? 0 : -1} onClick={closeMenu}/>
          <div className="nav-actions"><Link href="/login" className="nav-login">Masuk</Link><TrackedLink href={trialUrl} event="click_try_free" className="button button-primary button-small">Uji Coba Gratis</TrackedLink></div>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen}><Icon name={menuOpen ? "x" : "menu"}/></button>
        </div>
      </header>

      <main id="konten">
        <section className="hero" id="beranda">
          <div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/>
          <div className="container hero-grid">
            <div className="hero-copy reveal">
              <span className="eyebrow"><Icon name="spark" size={16}/> Aplikasi kasir untuk bisnis yang terus tumbuh</span>
              <h1>Kelola kasir lebih mudah, <span>bisnis lebih teratur.</span></h1>
              <p>wazePOS membantu Anda mengelola transaksi, stok, produk, pelanggan, dan laporan penjualan melalui satu aplikasi yang mudah digunakan.</p>
              <div className="hero-actions"><TrackedLink href={trialUrl} event="click_try_free" className="button button-primary button-large">Mulai Uji Coba Gratis <Icon name="arrow" size={19}/></TrackedLink><a href="#demo" className="button button-white button-large" onClick={() => trackEvent("click_demo", { source: "hero" })}><Icon name="dashboard" size={19}/> Lihat Tampilan Aplikasi</a></div>
              <div className="supporting-values"><span><Icon name="check" size={16}/> Mudah digunakan</span><span><Icon name="check" size={16}/> Sesuai untuk beragam usaha</span><span><Icon name="check" size={16}/> Program uji coba tersedia</span></div>
            </div>
            <div className="hero-visual reveal delay-1"><div className="visual-backdrop"/><DashboardMockup/><div className="floating-card floating-card-one"><span><Icon name="check" size={16}/></span><div><b>Transaksi tercatat</b><small>Operasional lebih rapi</small></div></div><div className="floating-card floating-card-two"><span><Icon name="chart" size={16}/></span><div><b>Laporan ringkas</b><small>Mudah dipahami</small></div></div></div>
          </div>
          <div className="container business-strip"><span>Sesuai untuk</span>{["Toko", "Warung", "Kedai Kopi", "Restoran", "Usaha Laundry", "Ritel"].map((item) => <b key={item}>{item}</b>)}</div>
        </section>

        <section className="section problem-section">
          <div className="container split-heading" data-reveal><div><span className="section-kicker">Kendala operasional</span><h2>Masih kesulitan mengelola bisnis <span>secara manual?</span></h2></div><p>Ketika transaksi bertambah, stok semakin sulit dipantau dan laporan manual menyita waktu. wazePOS membantu menyederhanakan pekerjaan tersebut.</p></div>
          <div className="container problem-grid">
            {[{n:"01",t:"Transaksi masih manual",d:"Pencatatan mudah tercecer dan proses pembayaran menjadi lebih lambat."},{n:"02",t:"Stok sulit dipantau",d:"Jumlah barang tercatat tidak selalu sesuai dengan kondisi aktual."},{n:"03",t:"Penyusunan laporan memerlukan waktu",d:"Rekapitulasi penjualan berulang mengurangi waktu untuk mengembangkan bisnis."},{n:"04",t:"Data bisnis tersebar",d:"Informasi produk, pelanggan, dan transaksi tersimpan di berbagai tempat."}].map((item) => <article className="problem-card" key={item.n} data-reveal><span>{item.n}</span><h3>{item.t}</h3><p>{item.d}</p></article>)}
          </div>
          <div className="container bridge-copy" data-reveal><span><Icon name="arrow" size={20}/></span><p>Saatnya beralih dari pencatatan manual dan mengelola bisnis secara lebih praktis bersama <b>wazePOS.</b></p></div>
        </section>

        <section className="section benefits-section">
          <div className="container section-heading centered" data-reveal><span className="section-kicker">Lebih sederhana, lebih terkendali</span><h2>Fitur penting untuk bisnis Anda, <span>tersedia di wazePOS.</span></h2><p>Kelola aktivitas kasir dan operasional bisnis secara lebih praktis dalam satu sistem.</p></div>
            <div className="container benefits-grid">{benefits.map((item) => <article className="benefit-card" key={item.title} data-reveal><span className="icon-box"><Icon name={item.icon}/></span><h3>{item.title}</h3><p>{item.text}</p><a href="#fitur" className="card-link" onClick={() => trackEvent("click_feature", { source: "benefit", benefit: item.title })}>Lihat fitur <Icon name="arrow" size={16}/></a></article>)}</div>
        </section>

        <section className="section feature-section" id="fitur">
          <div className="container section-heading centered" data-reveal><span className="section-kicker">Fitur utama</span><h2>Dirancang untuk mendukung <span>operasional harian Anda.</span></h2><p>Akses fitur yang dibutuhkan melalui navigasi yang ringkas dan mudah dipahami.</p></div>
          <div className="container feature-tabs" role="tablist" aria-label="Kategori fitur" data-reveal>{featureGroups.map((feature) => <button key={feature.id} role="tab" aria-selected={activeFeature.id === feature.id} className={activeFeature.id === feature.id ? "active" : ""} onClick={() => { setActiveFeature(feature); trackEvent("click_feature", { feature: feature.id }); }}><Icon name={feature.icon} size={19}/>{feature.label}</button>)}</div>
          <div className="container feature-panel" role="tabpanel" data-reveal>
            <div className="feature-copy panel-swap" key={`copy-${activeFeature.id}`}><span className="icon-box icon-box-large"><Icon name={activeFeature.icon} size={27}/></span><h3>{activeFeature.title}</h3><p>{activeFeature.text}</p><ul>{activeFeature.bullets.map((bullet) => <li key={bullet}><span><Icon name="check" size={15}/></span>{bullet}</li>)}</ul><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="text-link" external>Konsultasikan kebutuhan Anda <Icon name="arrow" size={17}/></TrackedLink></div>
            <div className="feature-illustration panel-swap panel-swap-delay" key={`visual-${activeFeature.id}`}><div className="terminal-card"><div className="terminal-head"><div><span/><span/><span/></div><small>{activeFeature.label}</small></div><div className="terminal-body"><div className="product-row"><span className="product-thumb"><Icon name={activeFeature.icon}/></span><div><b>{activeFeature.bullets[0]}</b><small>Siap digunakan</small></div><span className="status-pill">Aktif</span></div><div className="product-row"><span className="product-thumb alt"><Icon name="check"/></span><div><b>{activeFeature.bullets[1]}</b><small>Tersinkron</small></div><span className="status-pill">Rapi</span></div><div className="action-bar"><span>Total aktivitas</span><strong>Dalam satu alur</strong><span className="action-bar-label">Ringkasan fitur <Icon name="check" size={15}/></span></div></div></div></div>
          </div>
        </section>

        <section className="section business-section">
          <div className="container section-heading" data-reveal><span className="section-kicker">Untuk beragam usaha</span><h2>Sesuai untuk berbagai <span>kebutuhan bisnis.</span></h2><p>Mulai dari usaha yang baru dirintis hingga bisnis dengan aktivitas operasional yang semakin berkembang.</p></div>
          <div className="container business-grid">{businessTypes.map((item) => <article className="business-card" key={item.title} data-reveal><span className="business-icon"><Icon name={item.icon}/></span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div>
        </section>

        <section className="section steps-section" id="cara-kerja">
          <div className="container steps-layout"><div className="steps-intro" data-reveal><span className="section-kicker light">Proses awal yang mudah</span><h2>Mulai berjualan dalam <span>tiga langkah sederhana.</span></h2><p>Proses penyiapan yang jelas membantu Anda lebih cepat fokus melayani pelanggan.</p><TrackedLink href={trialUrl} event="click_try_free" className="button button-light button-large">Mulai Uji Coba Gratis <Icon name="arrow" size={18}/></TrackedLink></div><div className="steps-list">{[{n:"01",i:"customer" as const,t:"Daftar Gratis",d:"Buat akun wazePOS untuk memulai uji coba."},{n:"02",i:"box" as const,t:"Siapkan Bisnis",d:"Tambahkan produk, harga, stok, dan informasi usaha."},{n:"03",i:"receipt" as const,t:"Mulai Berjualan",d:"Gunakan wazePOS untuk melayani transaksi dan mengelola bisnis."}].map((step) => <article key={step.n} data-reveal><span className="step-number">{step.n}</span><span className="step-icon"><Icon name={step.i}/></span><div><h3>{step.t}</h3><p>{step.d}</p></div></article>)}</div></div>
        </section>

        <section className="section showcase-section" id="demo">
          <div className="container section-heading centered" data-reveal><span className="section-kicker">Lihat lebih dekat</span><h2>Tampilan ringkas untuk <span>mendukung keputusan bisnis.</span></h2><p>Berikut pratinjau antarmuka wazePOS. Tampilan dapat menyesuaikan versi aplikasi yang tersedia.</p></div>
          <div className="container showcase-tabs" role="tablist" aria-label="Pratinjau halaman produk" data-reveal>{showcaseTabs.map((tab, index) => <button id={`showcase-tab-${index}`} key={tab} type="button" role="tab" aria-selected={activeShowcase === tab} aria-controls="showcase-panel" tabIndex={activeShowcase === tab ? 0 : -1} className={activeShowcase === tab ? "active" : ""} onClick={() => { setActiveShowcase(tab); trackEvent("click_demo", { screen: tab }); }}>{tab}</button>)}</div>
          <div id="showcase-panel" className="container showcase-frame" role="tabpanel" aria-labelledby={`showcase-tab-${showcaseTabs.indexOf(activeShowcase)}`} data-reveal><DashboardMockup key={activeShowcase} mode="showcase" active={activeShowcase}/></div>
        </section>

        <section className="section pricing-section" id="harga">
          <div className="container pricing-heading" data-reveal>
            <div><span className="section-kicker light">Paket wazePOS</span><h2>Dua pilihan paket untuk <span>mendukung pertumbuhan bisnis.</span></h2><p>Pilih Paket Tumbuh untuk operasional harian atau Paket Bisnis untuk pengelolaan tim kasir dan alur usaha yang lebih lengkap.</p></div>
          </div>
          <div className="container pricing-grid">
            {pricingPlans.map((plan) => {
              return (
                <article className={plan.popular ? "pricing-card popular" : "pricing-card"} key={plan.id} data-reveal>
                  {plan.popular && <span className="pricing-badge">Paling Populer</span>}
                  <div className="pricing-card-head"><span className="pricing-symbol"><Icon name={plan.id === "tumbuh" ? "chart" : "store"} size={25}/></span><div><span className="plan-type">Jenis paket</span><h3>wazePOS {plan.name}</h3><p>{plan.description}</p></div></div>
                  <div className="plan-price-block"><span className="price-label">Harga paket</span><div className="plan-price"><strong>{plan.price}</strong><span>/tahun</span></div></div>
                  <small className="annual-note">{plan.priceNote}</small>
                  <div className="plan-divider"/>
                  <strong className="feature-label">Fitur dalam paket:</strong>
                  <ul className="plan-features">{plan.features.map((feature) => <li key={feature}><span><Icon name="check" size={14}/></span>{feature}</li>)}</ul>
                  <TrackedLink href={`/register?plan=${plan.id}`} event="click_try_free" className={plan.popular ? "button button-primary button-large full-width" : "button button-soft button-large full-width"}>{plan.cta}<Icon name="arrow" size={17}/></TrackedLink>
                </article>
              );
            })}
          </div>
          <div className="container mt-12 rounded-3xl border border-white/15 bg-[#032d22]/30 p-[30px] max-[820px]:mt-8 max-[820px]:rounded-[19px] max-[820px]:px-3.5 max-[820px]:py-5" data-reveal>
            <div className="mb-[22px] flex items-end justify-between gap-6 max-[820px]:mb-4 max-[820px]:block">
              <div><span className="section-kicker light">Bandingkan paket</span><h3 className="mt-2.5 mb-0 text-[25px] tracking-[-0.8px] text-white max-[820px]:text-[21px]">Pilih paket yang paling sesuai.</h3></div>
              <p className="m-0 max-w-[410px] text-xs leading-[1.6] text-[#afd0c2] max-[820px]:mt-2 max-[820px]:text-[11px]">Semua fitur inti tersedia di Paket Tumbuh. Paket Bisnis menambahkan fitur untuk tim dan operasional yang lebih kompleks.</p>
            </div>
            <button
              type="button"
              className={showMobileComparison ? "pricing-comparison-toggle open" : "pricing-comparison-toggle"}
              aria-expanded={showMobileComparison}
              aria-controls="pricing-comparison-body"
              onClick={() => {
                const nextValue = !showMobileComparison;
                setShowMobileComparison(nextValue);
                trackEvent("click_pricing", { action: "toggle_comparison", expanded: nextValue });
              }}
            >
              <span>{showMobileComparison ? "Tutup Perbandingan" : "Lihat Perbandingan Lengkap"}</span>
              <Icon name="chevron" size={18}/>
            </button>
            <div id="pricing-comparison-body" className={showMobileComparison ? "pricing-comparison-body open" : "pricing-comparison-body"}>
              <div className="overflow-x-auto rounded-2xl border border-[#dce9e2] bg-white">
                <table className="w-full min-w-[620px] border-collapse text-[11px] text-[var(--ink)] max-[820px]:min-w-[580px]">
                <thead><tr><th className="border-b border-[#e8efeb] bg-[#f4faf7] px-[18px] py-3.5 text-left align-middle text-[10px] font-[850] tracking-[0.4px] text-[#6b7b73] uppercase max-[820px]:px-3.5 max-[820px]:py-[13px]" scope="col">Fitur</th><th className="w-[170px] border-b border-[#e8efeb] bg-[#eefaf4] px-[18px] py-3.5 text-center align-middle text-[10px] font-[850] tracking-[0.4px] text-[var(--green-700)] uppercase max-[820px]:px-3.5 max-[820px]:py-[13px]" scope="col"><span className="block text-[13px] tracking-[-0.2px]">Tumbuh</span><small className="mt-[3px] block text-[9px] font-[650] tracking-normal text-[#84928b] normal-case">{formatPlanAnnualPrice("tumbuh")}/tahun</small></th><th className="w-[170px] border-b border-[#e8efeb] bg-[#e2f7ec] px-[18px] py-3.5 text-center align-middle text-[10px] font-[850] tracking-[0.4px] text-[var(--green-700)] uppercase max-[820px]:px-3.5 max-[820px]:py-[13px]" scope="col"><span className="block text-[13px] tracking-[-0.2px]">Bisnis</span><small className="mt-[3px] block text-[9px] font-[650] tracking-normal text-[#84928b] normal-case">{formatPlanAnnualPrice("bisnis")}/tahun</small></th></tr></thead>
                <tbody>
                  {featureComparison.map((group) => (
                    <Fragment key={group.category}>
                      <tr><th className="border-b border-[#e8efeb] bg-[#eaf7f0] px-[18px] py-[9px] text-left align-middle text-[9px] font-semibold tracking-[0.7px] text-[var(--green-800)] uppercase max-[820px]:px-3.5" colSpan={3} scope="colgroup">{group.category}</th></tr>
                      {group.items.map((item) => (
                        <tr className="last:[&>th]:border-b-0 last:[&>td]:border-b-0" key={item.name}>
                          <th className="border-b border-[#e8efeb] px-[18px] py-3.5 text-left align-middle font-semibold max-[820px]:px-3.5 max-[820px]:py-[13px]" scope="row"><strong className="block text-[11px]">{item.name}</strong></th>
                          <td className="border-b border-[#e8efeb] px-[18px] py-3.5 text-center align-middle max-[820px]:px-3.5 max-[820px]:py-[13px]" aria-label={item.availability.tumbuh ? "Termasuk" : "Tidak tersedia"}>{item.availability.tumbuh ? <span className="inline-flex items-center justify-center gap-[5px] whitespace-nowrap text-[10px] font-extrabold text-[var(--green-700)] [&>svg]:shrink-0"><Icon name="check" size={15}/> <span className="max-[820px]:hidden">Termasuk</span></span> : <span className="inline-flex items-center justify-center gap-[5px] whitespace-nowrap text-[10px] font-extrabold text-[#a7b0ab] [&>svg]:shrink-0"><Icon name="x" size={15}/><span className="max-[820px]:hidden">-</span></span>}</td>
                          <td className="border-b border-[#e8efeb] px-[18px] py-3.5 text-center align-middle max-[820px]:px-3.5 max-[820px]:py-[13px]" aria-label={item.availability.bisnis ? "Termasuk" : "Tidak tersedia"}>{item.availability.bisnis ? <span className="inline-flex items-center justify-center gap-[5px] whitespace-nowrap text-[10px] font-extrabold text-[var(--green-700)] [&>svg]:shrink-0"><Icon name="check" size={15}/> <span className="max-[820px]:hidden">Termasuk</span></span> : <span className="inline-flex items-center justify-center gap-[5px] whitespace-nowrap text-[10px] font-extrabold text-[#a7b0ab] [&>svg]:shrink-0"><Icon name="x" size={15}/><span className="max-[820px]:hidden">-</span></span>}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                </table>
              </div>
              <div className="mt-[13px] flex justify-end gap-[18px] text-[10px] text-[#afd0c2] max-[820px]:justify-start max-[820px]:gap-3 max-[820px]:text-[9px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[5px] [&>span:first-child_svg]:text-[#87dfb4] [&>span:last-child_svg]:text-[#a7b0ab]"><span><Icon name="check" size={14}/> Termasuk dalam paket</span><span><Icon name="x" size={14}/> Tidak tersedia</span></div>
            </div>
          </div>
          <div className="container pricing-footnote" data-reveal><Icon name="shield" size={17}/><span>Harga berlaku untuk satu tahun. Silakan konfirmasikan ketentuan pajak dan ketersediaan fitur sebelum berlangganan.</span></div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="container faq-layout"><div className="faq-intro" data-reveal><span className="section-kicker">Pertanyaan yang sering diajukan</span><h2>Temukan informasi yang <span>Anda perlukan.</span></h2><p>Belum menemukan jawaban yang sesuai?</p><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="text-link" external>Hubungi tim kami <Icon name="arrow" size={17}/></TrackedLink></div><div className="faq-list">{marketingFaqs.map((faq, index) => { const isOpen = openFaq === index; return <article className={isOpen ? "faq-item open" : "faq-item"} key={faq.question}><h3><button id={`faq-question-${index}`} type="button" onClick={() => setOpenFaq(isOpen ? null : index)} aria-expanded={isOpen} aria-controls={`faq-answer-${index}`}>{faq.question}<span><Icon name="chevron"/></span></button></h3><div id={`faq-answer-${index}`} className="faq-answer" role="region" aria-labelledby={`faq-question-${index}`} aria-hidden={!isOpen}><p>{faq.answer}</p></div></article>; })}</div></div>
        </section>

        <section className="final-cta"><div className="container final-cta-inner" data-reveal><div><span className="section-kicker light">Mulai hari ini</span><h2>Siap mengelola bisnis dengan lebih mudah?</h2><p>Tinggalkan pencatatan manual dan kelola transaksi, stok, serta laporan bisnis secara lebih praktis bersama wazePOS.</p></div><div><TrackedLink href={trialUrl} event="click_try_free" className="button button-light button-large">Mulai Uji Coba Gratis <Icon name="arrow" size={18}/></TrackedLink><TrackedLink href={whatsappTrialUrl} event="click_whatsapp" className="button button-outline-light button-large" external><Icon name="whatsapp" size={20}/> Konsultasi via WhatsApp</TrackedLink></div></div></section>
      </main>

      <footer className="site-footer"><div className="container footer-main"><div className="footer-brand"><Brand/><p>Aplikasi kasir praktis untuk membantu bisnis melayani transaksi, memantau operasional, dan terus berkembang.</p><span>Jual. Pantau. Tumbuh.</span></div><div><h3>Navigasi</h3><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara Kerja</a><a href="#harga">Harga</a><a href="#faq">FAQ</a><Link href="/login">Masuk</Link></div><div><h3>Jenis Usaha</h3><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="" external>Toko dan Warung</TrackedLink><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="" external>Kedai Kopi</TrackedLink><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="" external>Restoran</TrackedLink><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="" external>Usaha Ritel</TrackedLink></div><div><h3>Hubungi Kami</h3><TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="footer-contact" external><Icon name="whatsapp" size={18}/> WhatsApp</TrackedLink></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} wazePOS. Hak cipta dilindungi.</span><span>Mendukung pertumbuhan bisnis di Indonesia.</span></div></footer>

      <TrackedLink href={whatsappGeneralUrl} event="click_whatsapp" className="floating-whatsapp" external><Icon name="whatsapp" size={25}/><span>Hubungi kami</span></TrackedLink>
    </>
  );
}
