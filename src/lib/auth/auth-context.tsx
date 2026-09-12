'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { usePathname, useRouter } from 'next/navigation';
import { getOwnGuideProfile } from '@/lib/api/appsync-client';
import { describeAuthError, isDefinitiveAuthError } from '@/lib/auth/cognito-errors';
import { loginUrlFor, LOGIN_PATH, type LoginReason } from '@/lib/auth/return-to';
import { SESSION_REFUSAL_EVENT, type SessionRefusal } from '@/lib/auth/session-signals';

// 'tourist' = an authenticated Cognito user WITHOUT a GuideProfile (e.g. an app
// user logging in on the web to buy a tour, mon-1.3b). Tourists are NOT guides:
// isGuide/isAdmin stay false so guide/admin UI remains gated.
type AuthRole = 'guide' | 'admin' | 'tourist';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: AuthRole;
  guideId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuide: boolean;
  isAdmin: boolean;
  isTourist: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; role?: AuthRole; error?: string }>;
  signOut: () => Promise<void>;
  /** Re-resolve the current Cognito session into AuthUser (use after signup). */
  refreshUser: () => Promise<{ ok: boolean; role?: AuthRole; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Resolve the current Cognito user into an AuthUser.
 * - Checks cognito:groups for "admin"
 * - Otherwise looks up GuideProfile by userId in AppSync
 */
async function resolveAuthUser(): Promise<AuthUser | null> {
  const { userId } = await getCurrentUser();
  let attrs: Awaited<ReturnType<typeof fetchUserAttributes>>;
  let session: Awaited<ReturnType<typeof fetchAuthSession>>;
  try {
    [attrs, session] = await Promise.all([fetchUserAttributes(), fetchAuthSession()]);
  } catch (error) {
    // `signOut()` RÉVOQUE le jeton de rafraîchissement côté Cognito, pour tous
    // les onglets et toutes les sessions qui le partagent. On ne le fait que
    // sur une erreur d'authentification avérée (jeton révoqué, compte
    // supprimé…) ; une panne réseau ou un 5xx Cognito laisse les jetons en
    // place, et la prochaine page réessaiera.
    if (isDefinitiveAuthError(error)) {
      try { await amplifySignOut(); } catch { /* ignore */ }
    }
    return null;
  }

  const email = attrs.email ?? '';
  const displayName = attrs.name ?? attrs.preferred_username ?? email;
  const groups =
    (session.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined) ?? [];

  if (groups.includes('admin')) {
    return { id: userId, email, displayName, role: 'admin', guideId: null };
  }

  // Look up GuideProfile by Cognito userId — use userPool auth since user is authenticated.
  //
  // SÉCURITÉ — `getOwnGuideProfile`, jamais un `list({filter:{userId}})` brut :
  // quand `userId` était un champ LIBRE, une ligne plantée par un tiers sous le
  // `userId` d'un guide pouvait sortir à sa place (profil affiché faux, `id`
  // d'autrui dans toutes les écritures suivantes). Ce qui prouve l'appartenance
  // est `userId === sub`, en ÉGALITÉ STRICTE. Le champ `owner` n'a PAS disparu du
  // modèle — une règle de transition l'y garde en lecture pour les binaires déjà
  // distribués — mais il n'est plus écrit par personne, donc `null` sur toute
  // ligne neuve : il ne prouve plus rien et ne doit plus être lu. Voir
  // `@/lib/auth/guide-qualification`.
  const profile = await getOwnGuideProfile(userId, 'userPool');
  if (!profile) {
    // No guide profile → authenticated TOURIST (mon-1.3b: app user buying on web).
    return { id: userId, email, displayName, role: 'tourist', guideId: null };
  }

  return {
    id: userId,
    email,
    displayName: profile.displayName ?? displayName,
    role: 'guide',
    guideId: profile.id,
  };
}

/** Les chemins où une session perdue doit ramener à la connexion. */
function isGuardedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === LOGIN_PATH || pathname.startsWith('/guide/signup') || pathname.startsWith('/guide/reset-password')) return false;
  return pathname.startsWith('/guide') || pathname.startsWith('/admin');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Lot 6.4 — la session peut mourir PENDANT que l'onglet est ouvert : jeton
  // impossible à rafraîchir, déconnexion depuis un autre onglet, ou 401/403 du
  // proxy microservice. Avant, rien n'écoutait : l'utilisateur restait sur une
  // page qui échouait en silence. Ici on vide l'état et on renvoie à la
  // connexion avec le motif, en gardant la page pour y revenir.
  useEffect(() => {
    const leave = (reason: LoginReason) => {
      setUser(null);
      if (isGuardedPath(pathname)) router.replace(loginUrlFor(pathname, reason));
    };
    // Amplify émet `tokenRefresh_failure` AUSSI pour une erreur transitoire
    // (il garde alors les jetons). On ne quitte que sur une erreur avérée —
    // et sans `signOut()` : Amplify a déjà effacé les jetons, et une
    // révocation côté serveur toucherait les autres onglets.
    const stopHub = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'tokenRefresh_failure') {
        const error = (payload as { data?: { error?: unknown } }).data?.error;
        if (isDefinitiveAuthError(error)) leave('expired');
      } else if (payload.event === 'signedOut') {
        setUser((current) => (current ? null : current));
      }
    });
    const onRefusal = (event: Event) => {
      const refusal = (event as CustomEvent<SessionRefusal>).detail;
      if (refusal === 'expired') {
        // Un 401 du proxy peut venir d'un jeton périmé… ou d'un incident côté
        // proxy. On demande à Amplify un rafraîchissement : s'il rend des
        // jetons, la session est bonne et on ne bouge pas.
        fetchAuthSession({ forceRefresh: true })
          .then((session) => { if (!session.tokens?.accessToken) leave('expired'); })
          .catch(() => leave('expired'));
      } else if (refusal === 'revoked') {
        leave('revoked');
      }
    };
    window.addEventListener(SESSION_REFUSAL_EVENT, onRefusal);
    return () => {
      stopHub();
      window.removeEventListener(SESSION_REFUSAL_EVENT, onRefusal);
    };
  }, [pathname, router]);

  // Restore session on mount
  useEffect(() => {
    resolveAuthUser()
      .then((resolved) => {
        if (resolved) setUser(resolved);
      })
      .catch(() => {
        // No active session — normal for unauthenticated users
      })
      .finally(() => setIsLoading(false));
  }, []);

  const refreshUser = useCallback(async (): Promise<{ ok: boolean; role?: AuthRole; error?: string }> => {
    try {
      const resolved = await resolveAuthUser();
      if (!resolved) return { ok: false, error: 'Profil introuvable' };
      setUser(resolved);
      return { ok: true, role: resolved.role };
    } catch (error) {
      return { ok: false, error: describeAuthError(error, 'signIn') };
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; role?: AuthRole; error?: string }> => {
      try {
        await amplifySignIn({ username: email, password });
      } catch (error) {
        // If already authenticated (e.g. just after signup flow), resolve the existing session
        if (error instanceof Error && error.name === 'UserAlreadyAuthenticatedException') {
          return refreshUser();
        }
        return { ok: false, error: describeAuthError(error, 'signIn') };
      }

      const resolved = await resolveAuthUser();
      if (!resolved) {
        // Now only happens on a stale/invalid session (not "no guide profile").
        await amplifySignOut();
        return { ok: false, error: 'Session invalide — reconnectez-vous' };
      }
      setUser(resolved);
      return { ok: true, role: resolved.role };
    },
    [refreshUser],
  );

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut();
    } catch {
      // best-effort
    }
    // Le travail local du guide part avec lui. Sans cette purge, sur un poste
    // partagé, les brouillons de scènes, les prises audio en mémoire et la
    // session « à reprendre » du guide précédent restaient offerts au compte
    // suivant — qui pouvait même les réécrire sur ses propres scènes.
    try {
      const { clearStudioLocalState } = await import('@/lib/studio/studio-session-cleanup');
      await clearStudioLocalState();
    } catch {
      // best-effort : la déconnexion prime sur le ménage.
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isGuide: user?.role === 'guide' || user?.role === 'admin',
        isAdmin: user?.role === 'admin',
        isTourist: user?.role === 'tourist',
        isLoading,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Comme `useAuth`, mais rend null hors `AuthProvider` (pages statiques, tests). */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext);
}
