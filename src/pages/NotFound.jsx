import { Link, useLocation } from 'react-router-dom'

// Bu komponent App.jsx da path="*" route'iga bog'langan.
// "*" — belgilangan boshqa hech qaysi route mos kelmagan barcha manzillarni ushlaydi.
function NotFound() {
  const location = useLocation()

  return (
    <section className="text-center mx-auto">
      <div className="font-bold text-7xl text-white">404</div>
      <h1 className='text-5xl font-bold'>Sahifa topilmadi</h1>
      <br />
      <p>
        Siz kirmoqchi bo'lgan manzil: <code>{location.pathname}</code> mavjud emas
        yoki o'chirilgan.
      </p>
      <Link to="/" className="btn">
        Bosh sahifaga qaytish
      </Link>
    </section>
  )
}

export default NotFound
