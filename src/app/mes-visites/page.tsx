import { redirect } from 'next/navigation';

/** Ancienne adresse de « Mes achats » (lot 3.3) : liens et favoris redirigés. */
export default function MesVisitesAlias() {
  redirect('/mes-achats');
}
