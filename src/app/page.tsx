import Link from 'next/link';
import TrackPageView from '@/components/TrackPageView';
import CitiesSection from '@/components/CitiesSection';
import { AnalyticsEvents } from '@/lib/analytics';

export default function LandingPage() {
  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_LANDING_VISIT} />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Decouvrez les villes
              <span className="text-amber-400"> autrement</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-teal-100 leading-relaxed">
              Visites guidees audio immersives, creees par des guides locaux passionnes.
              Mettez vos ecouteurs, rangez votre telephone et laissez-vous guider.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                className="inline-flex items-center justify-center bg-amber-500 text-gray-900 font-bold px-8 py-4 rounded-xl hover:bg-amber-400 text-lg"
              >
                Telecharger sur Android
              </a>
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
                className="inline-flex items-center justify-center bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 border border-white/20 text-lg"
              >
                Telecharger sur iOS
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Pourquoi TourGuide ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Audio-First</h3>
              <p className="text-gray-600">
                Naviguez les yeux leves, telephone en poche. Le guidage audio spatial
                vous dirige naturellement vers chaque point d&apos;interet.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Guides Locaux</h3>
              <p className="text-gray-600">
                Chaque visite est creee par un guide local passionne qui connait
                les secrets et anecdotes de sa ville.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Disponible Hors-ligne</h3>
              <p className="text-gray-600">
                Telechargez vos visites a l&apos;avance et profitez-en meme sans
                connexion internet. Ideal en voyage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-teal-700">10+</div>
              <div className="text-gray-600 mt-1">Visites disponibles</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-700">5+</div>
              <div className="text-gray-600 mt-1">Villes</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-teal-700">4.7</div>
              <div className="text-gray-600 mt-1">Note moyenne</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cities Preview */}
      <CitiesSection />

      {/* Final CTA */}
      <section className="py-20 bg-teal-700 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Pret a explorer ?</h2>
          <p className="text-teal-100 text-lg mb-10">
            Telechargez TourGuide gratuitement et commencez votre premiere visite audio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
              className="inline-flex items-center justify-center bg-amber-500 text-gray-900 font-bold px-8 py-4 rounded-xl hover:bg-amber-400 text-lg"
            >
              Google Play
            </a>
            <a
              href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
              className="inline-flex items-center justify-center bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 border border-white/20 text-lg"
            >
              App Store
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
