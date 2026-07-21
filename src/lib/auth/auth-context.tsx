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
import { getGuideProfileByUserId } from '@/lib/api/appsync-client';

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
  } catch {
    // Stale tokens (user deleted from pool, token expired, etc.) — clear session
    try { await amplifySignOut(); } catch { /* ignore */ }
    return null;
  }

  const email = attrs.email ?? '';
  const displayName = attrs.name ?? attrs.preferred_username ?? email;
  const groups =
    (session.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined) ?? [];

  if (groups.includes('admin')) {
    return { id: userId, email, displayName, role: 'admin', guideId: null };
  }

  // Look up GuideProfile by Cognito userId — use userPool auth since user is authenticated
  const profile = await getGuideProfileByUserId(userId, 'userPool');
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

function parseAmplifyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('UserNotFoundException') || msg.includes('NotAuthorizedException')) {
      return 'Email ou mot de passe incorrect';
    }
    if (msg.includes('UserNotConfirmedException')) {
      return 'Compte non confirmé — vérifiez votre email';
    }
    if (msg.includes('PasswordResetRequiredException')) {
      return 'Réinitialisation du mot de passe requise';
    }
    if (msg.includes('TooManyRequestsException') || msg.includes('LimitExceededException')) {
      return 'Trop de tentatives — réessayez dans quelques minutes';
    }
    return msg;
  }
  return 'Erreur de connexion';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      return { ok: false, error: parseAmplifyError(error) };
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
        return { ok: false, error: parseAmplifyError(error) };
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
