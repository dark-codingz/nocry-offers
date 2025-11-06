import { redirect } from 'next/navigation'

export default function NewOfferPage() {
  // Redirecionar para /ofertas com query param
  redirect('/ofertas?new=1')
}
