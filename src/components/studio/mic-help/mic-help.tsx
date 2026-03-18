'use client';

import { useState } from 'react';

interface MicHelpProps {
  onClose: () => void;
}

const BROWSER_INSTRUCTIONS = [
  {
    name: 'Chrome',
    icon: '🌐',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Paramètres du site"',
      'Trouvez "Microphone" et sélectionnez "Autoriser"',
      'Rechargez la page',
    ],
  },
  {
    name: 'Firefox',
    icon: '🦊',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Supprimer les permissions" pour le microphone',
      'Rechargez la page et acceptez la permission',
    ],
  },
  {
    name: 'Safari',
    icon: '🧭',
    steps: [
      'Allez dans Safari > Préférences > Sites web > Microphone',
      'Trouvez ce site et sélectionnez "Autoriser"',
      'Rechargez la page',
    ],
  },
  {
    name: 'Edge',
    icon: '📘',
    steps: [
      'Cliquez sur l\'icône 🔒 à gauche de la barre d\'adresse',
      'Cliquez sur "Autorisations du site"',
      'Activez "Microphone"',
      'Rechargez la page',
    ],
  },
];

export function MicHelp({ onClose }: MicHelpProps) {
  const [selectedBrowser, setSelectedBrowser] = useState(0);

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-lg max-w-lg" data-testid="mic-help">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">🎙️ Aide — Permission micro</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Le navigateur a bloqué l&apos;accès au microphone. Suivez les instructions pour votre navigateur :
      </p>

      {/* Browser tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-200">
        {BROWSER_INSTRUCTIONS.map((browser, index) => (
          <button
            key={browser.name}
            onClick={() => setSelectedBrowser(index)}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              selectedBrowser === index
                ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid={`browser-tab-${browser.name.toLowerCase()}`}
          >
            {browser.icon} {browser.name}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <ol className="space-y-2">
        {BROWSER_INSTRUCTIONS[selectedBrowser].steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-4 p-2 bg-blue-50 rounded text-xs text-blue-700">
        💡 <strong>Alternative :</strong> Vous pouvez aussi importer un fichier audio enregistré avec un autre outil.
      </div>
    </div>
  );
}
