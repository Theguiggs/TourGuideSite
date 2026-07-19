import type { FaqItem, HelpStep } from '../../aide/_content';

export const STEPS: HelpStep[] = [
  {id: 'create', n: 1, title: 'Create your tour', body: 'Open the studio, choose a title and city, then create your draft.', tip: 'A specific, evocative title helps travellers understand the experience.'},
  {id: 'details', n: 2, title: 'Add the details', body: 'Add a description, cover image, themes, difficulty, duration, distance and the languages you want to offer.'},
  {id: 'map', n: 3, title: 'Map the route', body: 'Place points of interest by address or on the map, reorder them and choose automatic, manual or GPX routing.'},
  {id: 'tell', n: 4, title: 'Tell each scene', body: 'Write your script, add photos, record your voice, import audio or generate narration from text.', tip: 'Synthetic voice is available when you prefer not to record.'},
  {id: 'translate', n: 5, title: 'Translate', body: 'Generate French, English, Spanish, German and Italian versions, then review every translation before submission.'},
  {id: 'preview', n: 6, title: 'Preview', body: 'Review the experience exactly as travellers will see and hear it.'},
  {id: 'publish', n: 7, title: 'Publish', body: 'Submit the tour for moderation. Once approved, it appears in the web and app catalogues.'},
];

export const TIPS = [
  'Keep scenes short, ideally one to three minutes.',
  'Use a conversational tone, as if you were guiding a friend.',
  'Start every scene with a reason to keep listening.',
  'Check every GPS point on the map.',
  'Review automatic translations before publishing.',
];

export const FAQ_GUIDES: FaqItem[] = [
  {q: 'Is creating a tour free?', a: 'Creating and publishing a tour is free. Some translation services may be offered as paid options.'},
  {q: 'Can my tour be multilingual?', a: 'Yes. Each language is translated, voiced and moderated independently.'},
  {q: 'Do I need recording experience?', a: 'No. You can record, import audio or use synthetic narration.'},
  {q: 'Can I update a published tour?', a: 'Yes. Pause it, create a new version or respond to moderation feedback.'},
];

export const FAQ_TRAVELLERS: FaqItem[] = [
  {q: 'How do I listen to a tour?', a: 'Download Murmure, choose a tour and start listening as you walk.'},
  {q: 'Does it work offline?', a: 'Yes. Download your tour before leaving and listen without a connection.'},
  {q: 'Which languages are available?', a: 'Tours can be available in French, English, Spanish, German and Italian.'},
  {q: 'Which devices are supported?', a: 'Android and iOS.'},
];

export const SUPPORT_EMAIL = 'tourguideyeup@gmail.com';
