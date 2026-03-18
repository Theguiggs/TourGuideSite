import { Amplify } from 'aws-amplify';
import outputs from '../../../amplify_outputs.json';

/**
 * Configure Amplify using the full amplify_outputs.json from the TourGuide backend.
 * This provides model_introspection data required by generateClient<Schema>()
 * for client.models.X.create/update/list to work correctly.
 *
 * amplify_outputs.json is copied from ../TourGuide/amplify_outputs.json.
 * Re-copy after each `npx ampx sandbox` deploy:
 *   cp ../TourGuide/amplify_outputs.json ./amplify_outputs.json
 *
 * No { ssr: true } — uses localStorage for tokens (cookie-based SSR storage
 * causes "Unable to get user session following successful sign-in" in Amplify v6).
 */
export function configureAmplify() {
  Amplify.configure(outputs as Parameters<typeof Amplify.configure>[0]);
}
