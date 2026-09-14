import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <Link href="/" className="auth-brand"><span className="auth-brand-mark"><span /><span /><span /></span>waze<span>POS</span></Link>
          <div>
            <span className="auth-aside-kicker">Operasional lebih teratur</span>
            <h2>Kelola bisnis dengan tenang.</h2>
            <p>Satukan transaksi, stok, dan laporan bisnis dalam satu tempat yang mudah digunakan.</p>
          </div>
          <div className="auth-aside-note"><span>✓</span><span>Data bisnis lebih mudah dipantau setiap hari.</span></div>
        </aside>
        <section className="auth-card">
          <Link href="/" className="auth-back">← Kembali ke beranda</Link>
          <span className="section-kicker">Selamat datang kembali</span>
          <h1>Masuk ke akun Anda</h1>
          <p className="auth-description">Masukkan data akun untuk melanjutkan ke wazePOS.</p>
          <form className="auth-form">
            <label>Email<input name="email" type="email" autoComplete="email" required placeholder="nama@email.com" /></label>
            <label><span className="auth-label-row">Kata sandi <Link href="/register">Lupa kata sandi?</Link></span><input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi" /></label>
            <button className="button button-primary button-large full-width" type="submit">Masuk ke akun</button>
          </form>
          <p className="auth-switch">Belum punya akun? <Link href="/register">Daftar sekarang</Link></p>
        </section>
      </div>
    </main>
  );
}
