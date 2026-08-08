function About() {
  return (
    <section className="about-page">
      <span className="eyebrow">Loyiha haqida</span>
      <h1>Bu loyiha nima uchun yaratildi?</h1>
      <p>
        Bu — <strong>React Router</strong> mavzusini o'rgatish uchun yaratilgan kichik
        amaliy loyiha. U quyidagi 5 ta mavzuni bitta joyda birlashtiradi:
      </p>
      <ol className="topic-list">
        <li>
          <strong>React Router kirish</strong> — <code>BrowserRouter</code>,{' '}
          <code>Routes</code> va <code>Route</code> orqali sahifalarni ulash
          (<code>src/App.jsx</code> faylida).
        </li>
        <li>
          <strong>Dynamic routing</strong> — <code>/kitob/:id</code> marshruti orqali
          bitta shablon bilan cheksiz sondagi kitob sahifasini yaratish.
        </li>
        <li>
          <strong>useParams Hook</strong> — <code>src/pages/BookDetail.jsx</code>{' '}
          faylida URL'dagi <code>id</code> parametrini o'qib olish.
        </li>
        <li>
          <strong>Dinamik routingni yaratish</strong> — <code>BookCard</code>{' '}
          komponentidagi <code>Link</code> orqali har bir kitobga mos manzil hosil
          qilish.
        </li>
        <li>
          <strong>404 sahifasi</strong> — mos route topilmasa,{' '}
          <code>NotFound</code> komponenti ko'rsatiladi.
        </li>
      </ol>
    </section>
  )
}

export default About
