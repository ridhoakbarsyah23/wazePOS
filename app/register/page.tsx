import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <Link href="/" className="auth-brand"><span className="auth-brand-mark"><span /><span /><span /></span>waze<span>POS</span></Link>
          <div>
            <span className="auth-aside-kicker">Mulai uji coba gratis</span>
            <h2>Langkah kecil untuk bisnis yang lebih besar.</h2>
            <p>Buat akun wazePOS dan mulai bangun operasional bisnis yang lebih rapi.</p>
          </div>
          <div className="auth-aside-note"><span>✓</span><span>Siap digunakan untuk berbagai jenis usaha.</span></div>
        </aside>
        <section className="auth-card">
          <Link href="/" className="auth-back">← Kembali ke beranda</Link>
          <span className="section-kicker">Mulai uji coba gratis</span>
          <h1>Buat akun wazePOS</h1>
          <p className="auth-description">Lengkapi data berikut untuk memulai perjalanan bisnis Anda.</p>
          <form className="auth-form">
            <label>Nama lengkap<input name="name" type="text" autoComplete="name" required placeholder="Nama lengkap Anda" /></label>
            <label>Email<input name="email" type="email" autoComplete="email" required placeholder="nama@email.com" /></label>
            <label>Kata sandi<input name="password" type="password" autoComplete="new-password" required placeholder="Buat kata sandi" /></label>
            <button className="button button-primary button-large full-width" type="submit">Buat akun</button>
          </form>
          <p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk sekarang</Link></p>
        </section>
      </div>
    </main>
  );
}
