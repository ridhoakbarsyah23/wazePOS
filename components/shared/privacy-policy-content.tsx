import { getWhatsAppUrl } from "@/shared/config/site";

const sections = [
  {
    title: "Pengumpulan Data",
    body: "wazePOS mengumpulkan data yang diperlukan untuk menyediakan layanan, meliputi data akun seperti nama dan alamat email; data usaha seperti nama usaha, gerai, produk, transaksi, dan persediaan; serta data teknis dasar seperti informasi perangkat dan catatan aktivitas keamanan.",
  },
  {
    title: "Penggunaan Data",
    body: "Data digunakan untuk mendukung layanan kasir, penyusunan laporan, dan pengelolaan operasional usaha Anda. Data juga digunakan untuk menjaga keamanan akun dan meningkatkan kualitas layanan. wazePOS tidak menjual data pribadi Anda.",
  },
  {
    title: "Penyimpanan dan Keamanan Data",
    body: "Data disimpan pada infrastruktur basis data terkelola dengan akses terbatas. Untuk melindungi data, wazePOS menerapkan pengendalian akses berdasarkan peran pengguna serta pencatatan aktivitas keamanan pada area yang bersifat sensitif.",
  },
  {
    title: "Pengungkapan Data kepada Pihak Ketiga",
    body: "Data hanya dibagikan kepada penyedia layanan yang diperlukan untuk mendukung operasional wazePOS, seperti penyedia hosting dan layanan pembayaran. Penyedia layanan tersebut wajib mematuhi ketentuan kerahasiaan. wazePOS tidak membagikan data untuk keperluan periklanan pihak ketiga.",
  },
  {
    title: "Hak Pengguna",
    body: "Anda dapat mengajukan permintaan untuk mengakses, memperbaiki, atau menghapus data akun melalui pengaturan aplikasi atau dengan menghubungi tim wazePOS. Setiap permintaan akan melalui proses verifikasi untuk menjaga keamanan akun dan melindungi data Anda.",
  },
  {
    title: "Masa Penyimpanan Data",
    body: "Data operasional disimpan selama akun Anda aktif. Data yang tidak lagi diperlukan akan dihapus atau dianonimkan dengan mempertimbangkan kebutuhan operasional dan ketentuan hukum yang berlaku.",
  },
];

export function PrivacyPolicyContent() {
  const whatsappUrl = getWhatsAppUrl("general");

  return (
    <>
        <p className="mt-3 max-w-[60ch] text-pretty text-sm leading-7 text-[#556961]">
          Kebijakan Privasi ini menjelaskan pengumpulan, penggunaan, penyimpanan,
          dan perlindungan data Anda dalam penggunaan layanan wazePOS.
          Terakhir diperbarui pada September 2026. Untuk pertanyaan terkait
          kebijakan ini atau pengelolaan data Anda, silakan menghubungi tim wazePOS
          melalui{" "}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[#147554] underline decoration-[#9bcab2] underline-offset-4 hover:text-[#0d5e42]"
          >
            WhatsApp
          </a>
          .
        </p>

        <div className="mt-8 grid gap-3">
          {sections.map((section, index) => (
            <section
              key={section.title}
              aria-labelledby={`privacy-section-${index}`}
              className="rounded-2xl border border-[#dceae3] bg-white p-5 shadow-[0_10px_30px_rgba(18,77,56,0.06)]"
            >
              <h2
                id={`privacy-section-${index}`}
                className="m-0 text-base font-extrabold tracking-tight"
              >
                {section.title}
              </h2>
              <p className="m-0 mt-2 max-w-[62ch] text-sm leading-7 text-[#4f5e57]">
                {section.body}
              </p>
            </section>
          ))}
        </div>

    </>
  );
}
