import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">TourGuide</h3>
            <p className="text-sm">
              Visites guidees audio immersives. Decouvrez les villes autrement, guidé par la voix.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalogue" className="hover:text-white">
                  Catalogue des tours
                </Link>
              </li>
              <li>
                <Link href="/privacy.html" className="hover:text-white">
                  Politique de confidentialite
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Telecharger</h4>
            <div className="flex flex-col gap-2">
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
                className="text-sm hover:text-white"
              >
                App Store (iOS)
              </a>
              <a
                href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                className="text-sm hover:text-white"
              >
                Google Play (Android)
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-center">
          &copy; {new Date().getFullYear()} TourGuide. Tous droits reserves.
        </div>
      </div>
    </footer>
  );
}
