import { StatusBar } from 'expo-status-bar';
import {
  Ban,
  Bell,
  ChevronDown,
  Ellipsis,
  Flag,
  Home,
  LogOut,
  MessageCircle,
  Mic,
  Plus,
  Popcorn,
  Search,
  Send,
  Settings,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TextStyle } from 'react-native';
import type { AuthTokens, AuthUser, FeedItem, MovieSummary } from '@criticool/shared';
import {
  api,
  BlockedUserSummary,
  FriendRequest,
  FriendSummary,
  loadTokens,
  NotificationItem,
  ReviewComment,
  ReviewDetail,
  saveTokens,
  setOnSessionExpired,
  setOnTokensChanged,
} from './src/api';
import {
  closeReviewNavigation,
  openReviewNavigation,
  resolveActiveTab,
  type AppNavigationState,
  type Tab,
} from './src/navigationState';
import {
  supabase,
  supabaseAuthEnabled,
  supabaseRedirectUrl,
  supabaseResetRedirectUrl,
  supabaseSessionParamsFromUrl,
  tokensFromSupabaseSession,
  type SupabaseSession,
} from './src/supabase';
import { colors } from './src/theme';

const welcomeLogo = require('./assets/criticool-logo.png') as number;
const webNoOutline =
  Platform.OS === 'web'
    ? ({
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
        boxShadow: 'none',
      } as unknown as TextStyle)
    : null;
const REVIEW_TAG_CATEGORIES = [
  {
    title: 'Mood',
    tags: ['comfort watch', 'feel-good', 'heavy watch', 'cozy pick', 'thought-provoking'],
  },
  {
    title: 'Viewing Context',
    tags: ['date night', 'great with friends', 'family night', 'solo watch', 'rainy day watch'],
  },
  {
    title: 'Pace',
    tags: ['slow burn', 'fast-paced', 'tight runtime', 'needs patience', 'instant rewatch'],
  },
  {
    title: 'Craft',
    tags: [
      'great performances',
      'sharp writing',
      'beautifully shot',
      'strong soundtrack',
      'style over story',
    ],
  },
  {
    title: 'Audience',
    tags: [
      'for film nerds',
      'crowd pleaser',
      'not for everyone',
      'good starter pick',
      'best with snacks',
    ],
  },
  {
    title: 'Content Notes',
    tags: [
      'bring tissues',
      'intense scenes',
      'check the runtime',
      'volume down',
      'kids may hate it',
    ],
  },
  {
    title: 'Wildcards',
    tags: [
      'therapy invoice',
      'brain off bliss',
      'chaos cinema',
      'trash treasure',
      'secretly perfect',
    ],
  },
];
const REVIEW_RATING_MAX = 5;
const REVIEW_RATING_STEP = 0.5;
const REVIEW_RATING_SLOTS = [1, 2, 3, 4, 5] as const;
const BUZZ_MOVIES: MovieSummary[] = [
  {
    tmdbId: 558449,
    title: 'Gladiator II',
    releaseYear: 2024,
    overview: null,
    posterUrl: null,
    backdropUrl: null,
  },
  {
    tmdbId: 11806,
    title: 'Beethoven',
    releaseYear: 1992,
    overview: null,
    posterUrl: null,
    backdropUrl: null,
  },
  {
    tmdbId: 350,
    title: 'The Devil Wears Prada',
    releaseYear: 2006,
    overview: null,
    posterUrl: null,
    backdropUrl: null,
  },
  {
    tmdbId: 704,
    title: "A Hard Day's Night",
    releaseYear: 1964,
    overview: null,
    posterUrl: null,
    backdropUrl: null,
  },
];
type EditableReview = {
  id: string;
  movie: MovieSummary;
  rating: number;
  quickTake: string | null;
  body: string | null;
  tags: string[];
  containsSpoilers: boolean;
};

type ReportTarget = {
  targetType: 'user' | 'review' | 'comment';
  targetId: string;
  label: string;
};

type ReviewTranslationState = {
  quickTake: string | null;
  body: string | null;
  showTranslated: boolean;
};

type MenuAction = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
};

type GenreBrowseItem = {
  title: string;
  subtitle: string;
  tmdbGenreId: number;
};

const GENRE_BROWSE: GenreBrowseItem[] = [
  { title: 'Comedy', subtitle: 'easy watches', tmdbGenreId: 35 },
  { title: 'Horror', subtitle: 'late night', tmdbGenreId: 27 },
  { title: 'Drama', subtitle: 'big feelings', tmdbGenreId: 18 },
  { title: 'Sci-fi', subtitle: 'weird worlds', tmdbGenreId: 878 },
];

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function appendTranscript(
  setter: React.Dispatch<React.SetStateAction<string>>,
  transcript: string,
) {
  setter((current) => {
    const trimmed = current.trim();
    return trimmed ? `${trimmed}\n\n${transcript}` : transcript;
  });
}

function useBuzzMovies(tokens: AuthTokens) {
  const [movies, setMovies] = useState(BUZZ_MOVIES);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      BUZZ_MOVIES.map(async (movie) => {
        try {
          const response = await api.searchMovies(tokens, movie.title);
          return (
            response.items.find((item) => item.tmdbId === movie.tmdbId) ??
            response.items[0] ??
            movie
          );
        } catch {
          return movie;
        }
      }),
    ).then((rows) => {
      if (!cancelled) {
        setMovies(rows);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tokens]);

  return movies;
}

function startDictation({
  onTranscript,
  onEnd,
  unavailableMessage,
}: {
  onTranscript: (transcript: string) => void;
  onEnd: (active: boolean) => void;
  unavailableMessage: string;
}) {
  if (Platform.OS !== 'web') {
    Alert.alert('Voice dictation', unavailableMessage);
    return;
  }

  const speechGlobal = globalThis as typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  const Recognition = speechGlobal.SpeechRecognition ?? speechGlobal.webkitSpeechRecognition;
  if (!Recognition) {
    Alert.alert('Voice dictation unavailable', 'This browser does not expose speech recognition.');
    return;
  }

  onEnd(true);
  const recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript.trim();
    if (transcript) {
      onTranscript(transcript);
    }
  };
  recognition.onerror = (event) => {
    Alert.alert('Dictation stopped', event.error ?? 'Please try again.');
  };
  recognition.onend = () => onEnd(false);
  recognition.start();
}

function deviceLocaleFallback() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

function detectLikelyLocale(text: string) {
  const value = ` ${text.toLowerCase()} `;
  if (/[ãõçáéíóúâêôà]/i.test(text) || /\b(que|uma|para|com|não|muito|filme|achei)\b/.test(value)) {
    return 'pt';
  }
  if (/[¿¡ñ]/i.test(text) || /\b(una|para|con|pero|muy|película|está)\b/.test(value)) {
    return 'es';
  }
  if (/\b(the|and|with|movie|film|this|that|was|really|loved)\b/.test(value)) {
    return 'en';
  }
  return null;
}

function shouldOfferTranslation(text: string, targetLocale: string) {
  void targetLocale;
  return Boolean(text.trim());
}

function toEditableReview(review: ReviewDetail, movie = review.movie): EditableReview {
  return {
    id: review.id,
    movie,
    rating: review.rating,
    quickTake: review.quickTake,
    body: review.body,
    tags: review.tags,
    containsSpoilers: review.containsSpoilers,
  };
}

export default function App() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [passwordUpdateRequired, setPasswordUpdateRequired] = useState(false);

  const loadUserForTokens = useCallback(async (nextTokens: AuthTokens) => {
    setTokens(nextTokens);
    try {
      setUser(await api.me(nextTokens));
    } catch {
      setUser(null);
    }
  }, []);

  const onSupabaseSession = useCallback(
    async (session: SupabaseSession) => {
      await loadUserForTokens(tokensFromSupabaseSession(session));
    },
    [loadUserForTokens],
  );

  const handleSupabaseUrl = useCallback(
    async (url: string | null) => {
      if (!url || !supabase) {
        return;
      }
      const params = supabaseSessionParamsFromUrl(url);
      if (!params) {
        return;
      }
      if (url.includes('type=recovery')) {
        setPasswordUpdateRequired(true);
      }
      const { data, error } = await supabase.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) {
        Alert.alert('Could not restore session', error.message);
        return;
      }
      if (data.session) {
        await onSupabaseSession(data.session);
      }
    },
    [onSupabaseSession],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabaseAuthEnabled && supabase) {
        await saveTokens(null);
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          await onSupabaseSession(data.session);
        }
        if (!cancelled) {
          setBooting(false);
        }
        return;
      }

      const stored = await loadTokens();
      if (!cancelled && stored) {
        try {
          setUser(await api.me(stored));
          setTokens(stored);
        } catch {
          await saveTokens(null);
        }
      }
      if (!cancelled) {
        setBooting(false);
      }
    })();

    if (!supabaseAuthEnabled || !supabase) {
      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordUpdateRequired(true);
      }
      if (session) {
        void onSupabaseSession(session);
      } else {
        setTokens(null);
        setUser(null);
      }
    });
    const linkSubscription = Linking.addEventListener('url', (event) => {
      void handleSupabaseUrl(event.url);
    });
    void Linking.getInitialURL().then(handleSupabaseUrl);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [handleSupabaseUrl, onSupabaseSession]);

  const onLegacyAuth = async (response: { user: AuthUser; tokens: AuthTokens }) => {
    await saveTokens(response.tokens);
    setTokens(response.tokens);
    setUser(response.user);
  };

  const signOut = async () => {
    if (tokens) {
      try {
        if (tokens.provider === 'supabase') {
          await supabase?.auth.signOut();
        } else {
          await api.logout(tokens);
        }
      } catch {
        // Clear local state even if server logout fails
      }
    }
    await saveTokens(null);
    setPasswordUpdateRequired(false);
    setTokens(null);
    setUser(null);
  };

  useEffect(() => {
    setOnSessionExpired(() => {
      void signOut();
    });
    setOnTokensChanged((nextTokens) => {
      setTokens(nextTokens);
    });
    return () => {
      setOnSessionExpired(null);
      setOnTokensChanged(null);
    };
  });

  if (booting) {
    return <LoadingScreen />;
  }

  if (!tokens || !user) {
    if (tokens?.provider === 'supabase' && passwordUpdateRequired) {
      return (
        <PasswordUpdateScreen
          onComplete={() => setPasswordUpdateRequired(false)}
          onSignOut={signOut}
        />
      );
    }
    if (tokens?.provider === 'supabase') {
      return (
        <ProfileBootstrapScreen
          tokens={tokens}
          onUserChange={setUser}
          onSignOut={signOut}
        />
      );
    }
    return <AuthScreen onLegacyAuth={onLegacyAuth} onSupabaseSession={onSupabaseSession} />;
  }

  if (tokens.provider === 'supabase' && passwordUpdateRequired) {
    return (
      <PasswordUpdateScreen
        onComplete={() => setPasswordUpdateRequired(false)}
        onSignOut={signOut}
      />
    );
  }

  return <AppShell tokens={tokens} user={user} onUserChange={setUser} onSignOut={signOut} />;
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.loadingCenter}>
        <Image source={welcomeLogo} style={styles.loadingLogo} resizeMode="contain" />
        <ActivityIndicator color={colors.pink} />
      </View>
    </SafeAreaView>
  );
}

function ProfileBootstrapScreen({
  tokens,
  onUserChange,
  onSignOut,
}: {
  tokens: AuthTokens;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await api.bootstrapMe(tokens, {
        displayName: displayName.trim(),
        username: username.trim(),
      });
      onUserChange(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish profile');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.auth, styles.authFormScreen]}>
        <View style={styles.authPanel}>
          <View style={styles.authFormHeader}>
            <View style={styles.smallLogoBacking}>
              <Image source={welcomeLogo} style={styles.smallWelcomeLogo} resizeMode="contain" />
            </View>
            <Text style={styles.authTitle}>Finish profile</Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.mutedText}>
              Supabase owns login. CritiCool keeps the username and display name friends see.
            </Text>
            <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
            <Field
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={busy ? 'Saving...' : 'Start using CritiCool'}
              onPress={submit}
              disabled={busy || !displayName.trim() || !username.trim()}
            />
            <Pressable style={styles.authLinkRow} onPress={onSignOut}>
              <Text style={styles.authLinkText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordUpdateScreen({
  onComplete,
  onSignOut,
}: {
  onComplete: () => void;
  onSignOut: () => void;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!supabase) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await supabase.auth.updateUser({ password });
      if (response.error) {
        throw response.error;
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.auth, styles.authFormScreen]}>
        <View style={styles.authPanel}>
          <View style={styles.authFormHeader}>
            <View style={styles.smallLogoBacking}>
              <Image source={welcomeLogo} style={styles.smallWelcomeLogo} resizeMode="contain" />
            </View>
            <Text style={styles.authTitle}>Set new password</Text>
          </View>
          <View style={styles.form}>
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="New password"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton
              label={busy ? 'Saving...' : 'Save password'}
              onPress={submit}
              disabled={busy || password.length < 8}
            />
            <Pressable style={styles.authLinkRow} onPress={onSignOut}>
              <Text style={styles.authLinkText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthScreen({
  onLegacyAuth,
  onSupabaseSession,
}: {
  onLegacyAuth: (response: { user: AuthUser; tokens: AuthTokens }) => void;
  onSupabaseSession: (session: SupabaseSession) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'forgot'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [devResetToken, setDevResetToken] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWelcome = mode === 'welcome';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const usingSupabaseAuth = supabaseAuthEnabled && Boolean(supabase);

  const submit = async () => {
    if (isWelcome || isForgot) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (usingSupabaseAuth && supabase) {
        const response = isRegister
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: supabaseRedirectUrl },
            })
          : await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (response.error) {
          throw response.error;
        }
        if (response.data.session) {
          await onSupabaseSession(response.data.session);
        } else {
          setNotice('Check your email to verify this account.');
        }
        return;
      }
      const response = isRegister
        ? await api.register({ email, password, username, displayName })
        : await api.login({ email, password });
      await onLegacyAuth(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setDevResetToken(null);
    try {
      if (usingSupabaseAuth && supabase) {
        const response = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
          redirectTo: supabaseResetRedirectUrl,
        });
        if (response.error) {
          throw response.error;
        }
        setNotice('Check your email for a password reset link.');
        return;
      }
      const response = await api.forgotPassword(resetEmail);
      if (response.devToken) {
        setDevResetToken(response.devToken);
        setResetToken(response.devToken);
      }
      setNotice('If that email exists, a reset token is ready for this beta flow.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start reset');
    } finally {
      setBusy(false);
    }
  };

  const submitPasswordReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword({ token: resetToken, password: resetPassword });
      setEmail(resetEmail);
      setPassword('');
      setResetToken('');
      setResetPassword('');
      setDevResetToken(null);
      setNotice('Password updated. Log in with the new password.');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setBusy(false);
    }
  };

  const chooseMode = (nextMode: 'welcome' | 'login' | 'register' | 'forgot') => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.auth,
          isWelcome ? styles.authWelcome : styles.authFormScreen,
        ]}
      >
        {isWelcome ? (
          <View style={styles.authWelcomeContent}>
            <View style={styles.authBrand}>
              <View style={styles.logoBacking}>
                <Image source={welcomeLogo} style={styles.welcomeLogo} resizeMode="contain" />
              </View>
              <Text style={styles.logo}>CritiCool</Text>
              <Text style={styles.tagline}>be the critic, be cool</Text>
            </View>
            <View style={styles.authActions}>
              <PrimaryButton label="Create account" onPress={() => chooseMode('register')} />
              <Pressable style={styles.authSecondaryButton} onPress={() => chooseMode('login')}>
                <Text style={styles.authSecondaryButtonText}>Log in</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.authPanel}>
            <View style={styles.authFormHeader}>
              <View style={styles.smallLogoBacking}>
                <Image source={welcomeLogo} style={styles.smallWelcomeLogo} resizeMode="contain" />
              </View>
              <Text style={styles.authTitle}>
                {isForgot ? 'Reset password' : isRegister ? 'Create account' : 'Log in'}
              </Text>
            </View>
            <View style={styles.form}>
              {isForgot ? (
                <>
                  <Field
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="Account email"
                    autoCapitalize="none"
                  />
                  <PrimaryButton
                    label={usingSupabaseAuth ? 'Send reset email' : 'Request reset token'}
                    onPress={requestPasswordReset}
                    disabled={busy || !resetEmail.trim()}
                  />
                  {!usingSupabaseAuth ? (
                    <>
                      {devResetToken ? (
                        <View style={styles.notice}>
                          <Text style={styles.label}>Beta reset token</Text>
                          <Text selectable style={styles.devTokenText}>
                            {devResetToken}
                          </Text>
                        </View>
                      ) : null}
                      <Field
                        value={resetToken}
                        onChangeText={setResetToken}
                        placeholder="Reset token"
                        autoCapitalize="none"
                      />
                      <Field
                        value={resetPassword}
                        onChangeText={setResetPassword}
                        placeholder="New password"
                        secureTextEntry
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Field
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    autoCapitalize="none"
                  />
                  <Field
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry
                  />
                  {isRegister && !usingSupabaseAuth ? (
                    <>
                      <Field
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        autoCapitalize="none"
                      />
                      <Field
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Display name"
                      />
                    </>
                  ) : null}
                </>
              )}
              {notice ? <Text style={styles.mutedText}>{notice}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {isForgot ? (
                usingSupabaseAuth ? null : (
                  <PrimaryButton
                    label="Set new password"
                    onPress={submitPasswordReset}
                    disabled={busy || !resetToken.trim() || resetPassword.length < 8}
                  />
                )
              ) : (
                <PrimaryButton
                  label={isRegister ? 'Create account' : 'Log in'}
                  onPress={submit}
                  disabled={busy}
                />
              )}
              {!isRegister && !isForgot ? (
                <Pressable style={styles.authLinkRow} onPress={() => chooseMode('forgot')}>
                  <Text style={styles.authLinkText}>Forgot password?</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.authLinkRow}
                onPress={() => chooseMode(isRegister || isForgot ? 'login' : 'register')}
              >
                <Text style={styles.authLinkMuted}>
                  {isRegister
                    ? 'Already have an account? '
                    : isForgot
                      ? 'Remembered it? '
                      : 'Need an account? '}
                  <Text style={styles.authLinkText}>
                    {isRegister || isForgot ? 'Log in' : 'Create account'}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppShell({
  tokens,
  user,
  onUserChange,
  onSignOut,
}: {
  tokens: AuthTokens;
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>('feed');
  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<FriendSummary | null>(null);
  const [profileBackTab, setProfileBackTab] = useState<Tab | null>(null);
  const [reviewBackTab, setReviewBackTab] = useState<Tab | null>(null);
  const [editingReview, setEditingReview] = useState<EditableReview | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const deviceLocale = deviceLocaleFallback();
  const viewerLocale = user.locale && user.locale !== 'en-US' ? user.locale : deviceLocale;
  const showingOverlay = showNotifications;
  const navigationState: AppNavigationState<FriendSummary> = {
    tab,
    selectedProfileUser,
    profileBackTab,
    selectedReviewId,
    reviewBackTab,
  };
  const activeTab = resolveActiveTab(navigationState);

  const applyNavigationState = (nextState: AppNavigationState<FriendSummary>) => {
    setTab(nextState.tab);
    setSelectedProfileUser(nextState.selectedProfileUser);
    setProfileBackTab(nextState.profileBackTab);
    setSelectedReviewId(nextState.selectedReviewId);
    setReviewBackTab(nextState.reviewBackTab);
  };

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const response = await api.notifications(tokens);
      setUnreadNotifications(response.unreadCount);
    } catch {
      // The feed can still render if the alert count is temporarily unavailable.
    }
  }, [tokens]);

  useEffect(() => {
    void refreshUnreadNotifications();
  }, [refreshUnreadNotifications]);

  const openCreate = (movie?: MovieSummary) => {
    if (movie) {
      setSelectedMovie(movie);
    }
    setEditingReview(null);
    setSelectedProfileUser(null);
    setProfileBackTab(null);
    setReviewBackTab(null);
    setShowNotifications(false);
    setTab('create');
  };

  const openReview = (id: string, sourceTab?: Tab) => {
    setShowNotifications(false);
    applyNavigationState(openReviewNavigation(navigationState, id, sourceTab));
  };

  const openUserProfile = (profileUser: FriendSummary) => {
    const isOwnProfile = profileUser.id === user.id;
    const sourceTab = resolveActiveTab(navigationState);
    setSelectedProfileUser(isOwnProfile ? null : profileUser);
    setProfileBackTab(isOwnProfile || sourceTab === 'profile' ? null : sourceTab);
    setSelectedReviewId(null);
    setReviewBackTab(null);
    setShowNotifications(false);
    setTab('profile');
  };

  const startEditReview = (review: EditableReview) => {
    setEditingReview(review);
    setSelectedMovie(review.movie);
    setSelectedProfileUser(null);
    setProfileBackTab(null);
    setSelectedReviewId(null);
    setReviewBackTab(null);
    setShowNotifications(false);
    setTab('create');
  };

  const returnFromExternalProfile = () => {
    const nextTab = profileBackTab ?? 'friends';
    setSelectedProfileUser(null);
    setSelectedReviewId(null);
    setProfileBackTab(null);
    setReviewBackTab(null);
    setTab(nextTab);
  };

  const closeReview = () => {
    applyNavigationState(closeReviewNavigation(navigationState));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {showNotifications ? (
          <NotificationsScreen
            tokens={tokens}
            onUnreadCountChange={setUnreadNotifications}
            onBack={() => setShowNotifications(false)}
            onOpenReview={openReview}
          />
        ) : tab === 'feed' ? (
          <FeedScreen
            tokens={tokens}
            unreadNotifications={unreadNotifications}
            onRefreshNotifications={refreshUnreadNotifications}
            onCreate={() => openCreate()}
            onOpenNotifications={() => setShowNotifications(true)}
            onOpenReview={openReview}
            onOpenUser={openUserProfile}
          />
        ) : null}
        {!showingOverlay && tab === 'search' ? (
          <SearchScreen tokens={tokens} onReviewMovie={openCreate} />
        ) : null}
        {!showingOverlay && tab === 'create' ? (
          <CreateScreen
            tokens={tokens}
            selectedMovie={selectedMovie}
            editingReview={editingReview}
            onSelectMovie={setSelectedMovie}
            onPosted={(id) => {
              setEditingReview(null);
              openReview(id, 'profile');
            }}
            onUpdated={(id) => {
              setEditingReview(null);
              openReview(id, 'profile');
            }}
            onDeleted={() => {
              setEditingReview(null);
              setSelectedMovie(null);
              setSelectedReviewId(null);
              setProfileBackTab(null);
              setReviewBackTab(null);
              setTab('profile');
            }}
            onCancelEdit={() => {
              setEditingReview(null);
              setSelectedMovie(null);
            }}
          />
        ) : null}
        {!showingOverlay && tab === 'friends' ? (
          <FriendsScreen tokens={tokens} onOpenUser={openUserProfile} />
        ) : null}
        {!showingOverlay && tab === 'profile' ? (
          selectedReviewId ? (
            <ReviewDetailScreen
              tokens={tokens}
              currentUserId={user.id}
              viewerLocale={viewerLocale}
              reviewId={selectedReviewId}
              onBack={closeReview}
              onEditReview={(review) => startEditReview(toEditableReview(review))}
              onOpenUser={openUserProfile}
            />
          ) : (
            <ProfileScreen
              tokens={tokens}
              user={user}
              profileUser={selectedProfileUser}
              onBack={selectedProfileUser ? returnFromExternalProfile : undefined}
              onOpenReview={openReview}
              onOpenUser={openUserProfile}
              onUserChange={onUserChange}
              onSignOut={onSignOut}
            />
          )
        ) : null}
      </View>
      <TabBar
        current={activeTab}
        onChange={(nextTab) => {
          setShowNotifications(false);
          setSelectedProfileUser(null);
          setProfileBackTab(null);
          setSelectedReviewId(null);
          setReviewBackTab(null);
          if (nextTab !== 'create') {
            setEditingReview(null);
          }
          setTab(nextTab);
        }}
      />
    </SafeAreaView>
  );
}

function FeedScreen({
  tokens,
  unreadNotifications,
  onRefreshNotifications,
  onCreate,
  onOpenNotifications,
  onOpenReview,
  onOpenUser,
}: {
  tokens: AuthTokens;
  unreadNotifications: number;
  onRefreshNotifications: () => Promise<void>;
  onCreate: () => void;
  onOpenNotifications: () => void;
  onOpenReview: (id: string) => void;
  onOpenUser: (user: FriendSummary) => void;
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (nextCursor?: string | null) => {
      const response = await api.feed(tokens, nextCursor);
      setItems((current) => (nextCursor ? [...current, ...response.items] : response.items));
      setCursor(response.nextCursor);
    },
    [tokens],
  );

  useEffect(() => {
    void load();
    void onRefreshNotifications();
  }, [load, onRefreshNotifications]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), onRefreshNotifications()]);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await load(cursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasUnreadNotifications = unreadNotifications > 0;

  return (
    <View style={styles.screen}>
      <Header
        title="CritiCool"
        right={
          <View style={styles.headerActionRow}>
            <IconButton
              icon={<Bell size={20} color={hasUnreadNotifications ? colors.surface : colors.ink} />}
              onPress={onOpenNotifications}
              active={hasUnreadNotifications}
              accessibilityLabel={
                hasUnreadNotifications ? `${unreadNotifications} unread alerts` : 'Alerts'
              }
            />
            <IconButton
              icon={<Plus size={20} color={colors.ink} />}
              onPress={onCreate}
              accessibilityLabel="Create review"
            />
          </View>
        }
      />
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.reviewId}
          contentContainerStyle={styles.feedList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <ReviewCard
              item={item}
              onPress={() => onOpenReview(item.reviewId)}
              onOpenUser={onOpenUser}
            />
          )}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.reviewId}
          contentContainerStyle={styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={() => null}
          ListEmptyComponent={<EmptyFeed onCreate={onCreate} />}
        />
      )}
    </View>
  );
}

function EmptyFeed({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyPanel}>
        <Image source={welcomeLogo} style={styles.emptyMascot} resizeMode="contain" />
        <Text style={styles.emptyTitle}>No friend reviews yet.</Text>
        <Text style={styles.mutedText}>Find friends or post your first movie take.</Text>
        <PrimaryButton label="Review a movie" onPress={onCreate} />
      </View>
    </View>
  );
}

function ReviewCard({
  item,
  onPress,
  onOpenUser,
}: {
  item: FeedItem;
  onPress: () => void;
  onOpenUser?: (user: FriendSummary) => void;
}) {
  const quickTake = item.containsSpoilers ? null : item.quickTake?.trim();
  const visibleTags = item.tags?.slice(0, 2) ?? [];
  const reviewerName = item.author.displayName || item.author.username;
  const commentParticipants = item.commentParticipants ?? [];
  const reviewDate = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable style={styles.reviewFrame} onPress={onPress}>
      <View style={styles.reviewCardHeader}>
        <Pressable
          style={styles.feedReviewerRow}
          onPress={(event) => {
            event.stopPropagation();
            onOpenUser?.(item.author);
          }}
        >
          <Avatar label={reviewerName} mini />
          <View style={styles.feedReviewerCopy}>
            <Text numberOfLines={1} style={styles.reviewerName}>
              {reviewerName}
            </Text>
            <Text numberOfLines={1} style={styles.reviewerHandle}>
              @{item.author.username} - {reviewDate}
            </Text>
          </View>
        </Pressable>
        <View style={styles.reviewCommentCluster}>
          {item.containsSpoilers ? <Text style={styles.feedSpoilerText}>Spoilers</Text> : null}
          <View style={styles.commentBubble}>
            <MessageCircle size={13} color={colors.ink} strokeWidth={3} />
            <Text style={styles.commentBubbleText}>{item.commentCount}</Text>
          </View>
          {commentParticipants.length ? (
            <View style={styles.commentParticipantRow}>
              {commentParticipants.map((participant) => (
                <Avatar
                  key={participant.id}
                  label={participant.displayName || participant.username}
                  micro
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.reviewCardBody}>
        <View style={styles.feedPosterColumn}>
          <Poster movie={item.movie} feed />
        </View>
        <View style={styles.feedReviewMain}>
          <Text numberOfLines={1} style={styles.movieTitle}>
            {item.movie.title}
          </Text>
          {quickTake ? (
            <Text numberOfLines={2} style={styles.quickTake}>
              {quickTake}
            </Text>
          ) : null}
          <View style={styles.cardRatingLine}>
            <PopcornRating value={item.rating} large />
          </View>
          {visibleTags.length ? (
            <View style={styles.cardTagRow}>
              {visibleTags.map((tag) => (
                <Text
                  key={tag}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[
                    styles.tagPill,
                    styles.cardTagPill,
                    visibleTags.length > 1 ? styles.cardTagPillPair : styles.cardTagPillSolo,
                  ]}
                >
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function SearchScreen({
  tokens,
  onReviewMovie,
}: {
  tokens: AuthTokens;
  onReviewMovie: (movie: MovieSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GenreBrowseItem | null>(null);
  const searchRequestId = useRef(0);
  const buzzMovies = useBuzzMovies(tokens);
  const trimmedQuery = query.trim();
  const showingResults = trimmedQuery.length >= 2 || selectedGenre !== null;

  useEffect(() => {
    if (selectedGenre) {
      return;
    }

    const requestId = ++searchRequestId.current;
    if (trimmedQuery.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const response = await api.searchMovies(tokens, trimmedQuery);
          if (!cancelled && searchRequestId.current === requestId) {
            setResults(response.items);
          }
        } catch (err) {
          if (!cancelled && searchRequestId.current === requestId) {
            Alert.alert('Search failed', err instanceof Error ? err.message : 'Try again');
          }
        } finally {
          if (!cancelled && searchRequestId.current === requestId) {
            setBusy(false);
          }
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedGenre, tokens, trimmedQuery]);

  const handleQueryChange = (text: string) => {
    if (selectedGenre) {
      setSelectedGenre(null);
    }
    setQuery(text);
  };

  const clearGenre = () => {
    searchRequestId.current += 1;
    setSelectedGenre(null);
    setResults([]);
    setBusy(false);
  };

  const browseGenre = async (genre: GenreBrowseItem) => {
    const requestId = ++searchRequestId.current;
    setSelectedGenre(genre);
    setQuery('');
    setResults([]);
    setBusy(true);
    try {
      const response = await api.browseMoviesByGenre(tokens, genre.tmdbGenreId);
      if (searchRequestId.current === requestId) {
        setResults(response.items);
      }
    } catch (err) {
      if (searchRequestId.current === requestId) {
        Alert.alert('Genre search failed', err instanceof Error ? err.message : 'Try again');
      }
    } finally {
      if (searchRequestId.current === requestId) {
        setBusy(false);
      }
    }
  };

  const selectMovie = async (movie: MovieSummary) => {
    try {
      const localMovie = movie.id ? movie : await api.importMovie(tokens, movie.tmdbId);
      onReviewMovie(localMovie);
    } catch (err) {
      Alert.alert('Movie import failed', err instanceof Error ? err.message : 'Try again');
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Search" />
      <Field
        value={query}
        onChangeText={handleQueryChange}
        placeholder="Find a movie"
        autoCapitalize="none"
        icon={<Search size={18} color={colors.muted} />}
      />
      {busy ? <ActivityIndicator color={colors.pink} style={styles.inlineLoader} /> : null}
      <ScrollView contentContainerStyle={[styles.stack, styles.afterSearchFieldStack]}>
        {!showingResults ? (
          <>
            <Panel tint="yellow">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Buzz movies</Text>
                <Text style={styles.mutedText}>popular now</Text>
              </View>
              <MoviePosterRow movies={buzzMovies} onPress={selectMovie} />
            </Panel>
            <Panel tint="cyan">
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse by genre</Text>
                <Text style={styles.mutedText}>pick a mood</Text>
              </View>
              <View style={styles.genreGrid}>
                {GENRE_BROWSE.map((genre) => (
                  <Pressable
                    key={genre.title}
                    style={({ pressed }) => [
                      styles.genreTile,
                      pressed ? styles.genreTilePressed : null,
                    ]}
                    onPress={() => browseGenre(genre)}
                    accessibilityRole="button"
                    accessibilityLabel={`Browse ${genre.title} movies`}
                  >
                    <Text style={styles.genreTitle}>{genre.title}</Text>
                    <Text style={styles.mutedText}>{genre.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            </Panel>
          </>
        ) : (
          <>
            {selectedGenre ? (
              <View style={styles.sectionHeader}>
                <View style={styles.genreResultTitleGroup}>
                  <Text style={styles.sectionTitle}>{selectedGenre.title} movies</Text>
                  <Text style={styles.mutedText}>{selectedGenre.subtitle}</Text>
                </View>
                <Pressable style={styles.pillButton} onPress={clearGenre}>
                  <Text style={styles.pillButtonText}>Clear</Text>
                </Pressable>
              </View>
            ) : null}
            {results.map((movie) => (
              <Pressable
                key={`${movie.tmdbId}-${movie.id ?? 'tmdb'}`}
                style={styles.resultRow}
                onPress={() => selectMovie(movie)}
              >
                <Poster movie={movie} />
                <View style={styles.reviewCopy}>
                  <Text style={styles.movieTitle}>{movie.title}</Text>
                  <Text style={styles.mutedText}>{movie.releaseYear ?? 'TBA'}</Text>
                </View>
                <Text style={styles.pill}>Review</Text>
              </Pressable>
            ))}
            {!busy && results.length === 0 ? (
              <Panel tint="yellow">
                <Text style={styles.sectionTitle}>No movies found</Text>
                <Text style={styles.mutedText}>Try another search.</Text>
              </Panel>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CreateScreen({
  tokens,
  selectedMovie,
  editingReview,
  onSelectMovie,
  onPosted,
  onUpdated,
  onDeleted,
  onCancelEdit,
}: {
  tokens: AuthTokens;
  selectedMovie: MovieSummary | null;
  editingReview: EditableReview | null;
  onSelectMovie: (movie: MovieSummary | null) => void;
  onPosted: (id: string) => void;
  onUpdated: (id: string) => void;
  onDeleted: () => void;
  onCancelEdit: () => void;
}) {
  const [movieQuery, setMovieQuery] = useState('');
  const [movieResults, setMovieResults] = useState<MovieSummary[]>([]);
  const [movieSearchBusy, setMovieSearchBusy] = useState(false);
  const [rating, setRating] = useState(0);
  const [quickTake, setQuickTake] = useState('');
  const [body, setBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [showAllTags, setShowAllTags] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const bodyInputRef = useRef<TextInput>(null);
  const buzzMovies = useBuzzMovies(tokens);
  const isEditing = Boolean(editingReview);

  const visibleTagCategories = useMemo(() => {
    const needle = tagQuery.trim().toLowerCase();
    return REVIEW_TAG_CATEGORIES.map((category) => ({
      ...category,
      tags: needle
        ? category.tags.filter(
            (tag) => tag.includes(needle) || category.title.toLowerCase().includes(needle),
          )
        : category.tags,
    })).filter((category) => category.tags.length > 0);
  }, [tagQuery]);

  useEffect(() => {
    if (editingReview) {
      onSelectMovie(editingReview.movie);
      setRating(editingReview.rating);
      setQuickTake(editingReview.quickTake ?? '');
      setBody(editingReview.body ?? '');
      setSelectedTags(editingReview.tags);
      setTagQuery('');
      setShowAllTags(false);
      setContainsSpoilers(editingReview.containsSpoilers);
    }
  }, [editingReview, onSelectMovie]);

  useEffect(() => {
    if (selectedMovie || movieQuery.trim().length < 2) {
      setMovieResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      void (async () => {
        setMovieSearchBusy(true);
        try {
          const response = await api.searchMovies(tokens, movieQuery);
          setMovieResults(response.items);
        } catch (err) {
          Alert.alert('Search failed', err instanceof Error ? err.message : 'Try again');
        } finally {
          setMovieSearchBusy(false);
        }
      })();
    }, 350);
    return () => clearTimeout(timeout);
  }, [movieQuery, selectedMovie, tokens]);

  const selectMovie = async (movie: MovieSummary) => {
    try {
      const localMovie = movie.id ? movie : await api.importMovie(tokens, movie.tmdbId);
      onSelectMovie(localMovie);
      setMovieQuery('');
      setMovieResults([]);
    } catch (err) {
      Alert.alert('Movie import failed', err instanceof Error ? err.message : 'Try again');
    }
  };

  const resetReviewFields = () => {
    setRating(0);
    setQuickTake('');
    setBody('');
    setSelectedTags([]);
    setTagQuery('');
    setShowAllTags(false);
    setContainsSpoilers(false);
  };

  const clearSelectedMovie = () => {
    if (isEditing) {
      onCancelEdit();
    }
    onSelectMovie(null);
    setMovieResults([]);
    resetReviewFields();
  };

  const canSubmit = Boolean(selectedMovie?.id && rating > 0);
  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : current.length < 5
          ? [...current, tag]
          : current,
    );
  };

  const startReviewDictation = () => {
    bodyInputRef.current?.focus();
    startDictation({
      onTranscript: (transcript) => appendTranscript(setBody, transcript),
      onEnd: setTranscribing,
      unavailableMessage:
        'Tap the microphone on your keyboard to dictate the full review. Native in-app transcription needs a custom development build.',
    });
  };

  const submit = async () => {
    if (!selectedMovie?.id || rating <= 0) {
      return;
    }
    setBusy(true);
    try {
      const review = editingReview
        ? await api.updateReview(tokens, editingReview.id, {
            rating,
            quickTake,
            body,
            tags: selectedTags,
            containsSpoilers,
          })
        : await api.createReview(tokens, {
            movieId: selectedMovie.id,
            rating,
            quickTake,
            body,
            tags: selectedTags,
            containsSpoilers,
          });
      resetReviewFields();
      onSelectMovie(null);
      if (editingReview) {
        onUpdated(review.id);
        Alert.alert('Saved', 'Your review was updated.');
      } else {
        onPosted(review.id);
        Alert.alert('Posted', 'Your review is live.');
      }
    } catch (err) {
      Alert.alert(
        editingReview ? 'Could not save' : 'Could not post',
        err instanceof Error ? err.message : 'Try again',
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteReview = async () => {
    if (!editingReview) {
      return;
    }
    setBusy(true);
    try {
      await api.deleteReview(tokens, editingReview.id);
      resetReviewFields();
      onSelectMovie(null);
      onDeleted();
      Alert.alert('Deleted', 'Your review was removed.');
    } catch (err) {
      Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteReview = () => {
    Alert.alert('Delete review?', 'This removes it from friends feeds and movie detail.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteReview() },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.stack}>
      <Header
        title={isEditing ? 'Edit Review' : 'New Review'}
        right={
          selectedMovie ? (
            <PrimaryButton
              label={isEditing ? 'Save' : 'Post'}
              onPress={submit}
              disabled={!canSubmit || busy}
              compact
            />
          ) : undefined
        }
      />
      {selectedMovie ? (
        <View style={styles.resultRow}>
          <Poster movie={selectedMovie} />
          <View style={styles.reviewCopy}>
            <Text style={styles.movieTitle}>{selectedMovie.title}</Text>
            <Text style={styles.mutedText}>
              {selectedMovie.releaseYear ?? 'TBA'} |{' '}
              {isEditing ? 'editing review' : 'selected movie'}
            </Text>
          </View>
          {!isEditing ? (
            <Pressable style={styles.pillButton} onPress={clearSelectedMovie}>
              <Text style={styles.pillButtonText}>Change</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <Panel tint="pink">
            <Text style={styles.sectionTitle}>What did you watch?</Text>
            <Text style={styles.mutedText}>
              Search for a movie first. Rating and review fields appear after you pick one.
            </Text>
          </Panel>
          <Field
            value={movieQuery}
            onChangeText={setMovieQuery}
            placeholder="Find a movie"
            autoCapitalize="none"
            icon={<Search size={18} color={colors.muted} />}
          />
          {movieSearchBusy ? (
            <ActivityIndicator color={colors.pink} style={styles.inlineLoader} />
          ) : null}
          {movieResults.map((movie) => (
            <Pressable
              key={`${movie.tmdbId}-${movie.id ?? 'tmdb'}`}
              style={styles.resultRow}
              onPress={() => selectMovie(movie)}
            >
              <Poster movie={movie} />
              <View style={styles.reviewCopy}>
                <Text style={styles.movieTitle}>{movie.title}</Text>
                <Text style={styles.mutedText}>{movie.releaseYear ?? 'TBA'}</Text>
              </View>
              <Text style={styles.pill}>Pick</Text>
            </Pressable>
          ))}
          {movieQuery.trim().length < 2 ? (
            <>
              <Panel tint="yellow">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Buzz movies to review</Text>
                  <Text style={styles.mutedText}>quick start</Text>
                </View>
                <MoviePosterRow movies={buzzMovies.slice(0, 3)} onPress={selectMovie} />
              </Panel>
              <Panel tint="cyan">
                <Text style={styles.sectionTitle}>Prompt ideas</Text>
                <View style={styles.tagPicker}>
                  {['comfort watch', 'best with snacks', 'date night', 'thought-provoking'].map(
                    (tag) => (
                      <Pressable
                        key={tag}
                        style={styles.tagChip}
                        onPress={() =>
                          setSelectedTags((current) => [...new Set([...current, tag])])
                        }
                      >
                        <Text style={styles.tagChipText}>{tag}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </Panel>
            </>
          ) : null}
        </>
      )}
      {selectedMovie ? (
        <>
          <View style={styles.ratingHeader}>
            <Text style={styles.label}>Rating</Text>
            <Text style={styles.ratingPickerValue}>
              {rating > 0 ? `${formatRating(rating)}/5` : '--/5'}
            </Text>
          </View>
          <RatingPicker value={rating} onChange={setRating} />
          <Field value={quickTake} onChangeText={setQuickTake} placeholder="Quick take" />
          <Panel tint="cyan">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pick up to 5 tags</Text>
              <Text style={styles.mutedText}>
                {selectedTags.length ? `${selectedTags.length} selected` : 'optional'}
              </Text>
            </View>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setShowAllTags((current) => !current)}
            >
              <Text style={styles.secondaryButtonText}>
                {showAllTags ? 'Hide tags' : 'Browse tags'}
              </Text>
            </Pressable>
            {showAllTags ? (
              <>
                <Field
                  value={tagQuery}
                  onChangeText={setTagQuery}
                  placeholder="Search tags"
                  autoCapitalize="none"
                  icon={<Search size={18} color={colors.muted} />}
                />
                {visibleTagCategories.map((category) => (
                  <View key={category.title} style={styles.tagGroup}>
                    <Text style={styles.tagGroupTitle}>{category.title}</Text>
                    <View style={styles.tagPicker}>
                      {category.tags.map((tag) => {
                        const active = selectedTags.includes(tag);
                        const disabled = selectedTags.length >= 5 && !active;
                        return (
                          <Pressable
                            key={tag}
                            disabled={disabled}
                            style={[
                              styles.tagChip,
                              active && styles.tagChipActive,
                              disabled && styles.tagChipDisabled,
                            ]}
                            onPress={() => toggleTag(tag)}
                          >
                            <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>
                              {tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </Panel>
          <View style={styles.textAreaWrap}>
            <TextInput
              ref={bodyInputRef}
              value={body}
              onChangeText={setBody}
              placeholder="Full review"
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.textArea, webNoOutline]}
            />
            <Pressable
              style={[styles.dictationButton, transcribing && styles.dictationButtonActive]}
              onPress={startReviewDictation}
              disabled={transcribing}
              hitSlop={8}
            >
              <Mic size={24} color={transcribing ? colors.surface : colors.ink} />
            </Pressable>
          </View>
          <Pressable
            style={[styles.spoilerToggle, containsSpoilers && styles.spoilerToggleOn]}
            onPress={() => setContainsSpoilers((current) => !current)}
          >
            <Text style={styles.spoilerText}>Contains spoilers</Text>
            <View style={[styles.toggleTrack, containsSpoilers && styles.toggleTrackOn]}>
              <View style={[styles.toggleKnob, containsSpoilers && styles.toggleKnobOn]} />
            </View>
          </Pressable>
          <PrimaryButton
            label={isEditing ? 'Save review' : 'Post'}
            onPress={submit}
            disabled={!canSubmit || busy}
          />
          {isEditing ? (
            <Pressable
              style={[styles.secondaryButton, styles.dangerButton]}
              onPress={confirmDeleteReview}
              disabled={busy}
            >
              <Trash2 size={15} color={colors.ink} />
              <Text style={styles.secondaryButtonText}>Delete review</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function ReviewDetailScreen({
  tokens,
  currentUserId,
  viewerLocale,
  reviewId,
  onBack,
  onEditReview,
  onOpenUser,
}: {
  tokens: AuthTokens;
  currentUserId: string;
  viewerLocale: string;
  reviewId: string;
  onBack: () => void;
  onEditReview: (review: ReviewDetail) => void;
  onOpenUser: (user: FriendSummary) => void;
}) {
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [showCommentComposer, setShowCommentComposer] = useState(false);
  const [replyTo, setReplyTo] = useState<ReviewComment | null>(null);
  const [commentSort, setCommentSort] = useState<'best' | 'new'>('best');
  const [reviewActionMenuOpen, setReviewActionMenuOpen] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [transcribingComment, setTranscribingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [mutatingCommentId, setMutatingCommentId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reviewTranslation, setReviewTranslation] = useState<ReviewTranslationState | null>(null);
  const [translatingReview, setTranslatingReview] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const loadReview = useCallback(async () => {
    try {
      setReview(await api.review(tokens, reviewId, commentSort));
    } catch {
      onBack();
    }
  }, [tokens, reviewId, commentSort, onBack]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  useEffect(() => {
    setReviewTranslation(null);
    setReviewActionMenuOpen(false);
    setShowCommentComposer(false);
    setReplyTo(null);
    setCommentBody('');
  }, [reviewId]);

  useEffect(() => {
    if (!replyTo) {
      return;
    }

    const focusTimer = setTimeout(() => commentInputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [replyTo]);

  useEffect(() => {
    if (!showCommentComposer || replyTo) {
      return;
    }

    const focusTimer = setTimeout(() => commentInputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [showCommentComposer, replyTo]);

  const postComment = async () => {
    const body = commentBody.trim();
    if (!body || !review) {
      return;
    }

    setPostingComment(true);
    try {
      await api.createComment(tokens, review.id, {
        body,
        parentCommentId: replyTo?.id ?? null,
      });
      setCommentBody('');
      if (!replyTo) {
        setShowCommentComposer(false);
      }
      setReplyTo(null);
      await loadReview();
    } catch (err) {
      Alert.alert('Could not comment', err instanceof Error ? err.message : 'Try again');
    } finally {
      setPostingComment(false);
    }
  };

  const voteComment = async (comment: ReviewComment, value: -1 | 1) => {
    if (!review || votingCommentId || comment.deletedAt) {
      return;
    }

    if (comment.viewerVote === value) {
      return;
    }

    setVotingCommentId(comment.id);
    try {
      if (comment.viewerVote && comment.viewerVote !== value) {
        await api.removeCommentVote(tokens, review.id, comment.id);
      } else {
        await api.voteComment(tokens, review.id, comment.id, value);
      }
      await loadReview();
    } catch (err) {
      Alert.alert('Could not vote', err instanceof Error ? err.message : 'Try again');
    } finally {
      setVotingCommentId(null);
    }
  };

  const startCommentDictation = () => {
    commentInputRef.current?.focus();
    startDictation({
      onTranscript: (transcript) => appendTranscript(setCommentBody, transcript),
      onEnd: setTranscribingComment,
      unavailableMessage:
        'Tap the microphone on your keyboard to dictate a comment. Native in-app transcription needs a custom development build.',
    });
  };

  const startReply = (comment: ReviewComment) => {
    setShowCommentComposer(false);
    setCommentBody('');
    setReplyTo(comment);
  };

  const startEditComment = (comment: ReviewComment) => {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const saveCommentEdit = async (comment: ReviewComment) => {
    const body = editingBody.trim();
    if (!review || !body) {
      return;
    }

    setMutatingCommentId(comment.id);
    try {
      await api.updateComment(tokens, review.id, comment.id, body);
      setEditingCommentId(null);
      setEditingBody('');
      await loadReview();
    } catch (err) {
      Alert.alert('Could not edit comment', err instanceof Error ? err.message : 'Try again');
    } finally {
      setMutatingCommentId(null);
    }
  };

  const deleteComment = async (comment: ReviewComment) => {
    if (!review) {
      return;
    }

    setMutatingCommentId(comment.id);
    try {
      await api.deleteComment(tokens, review.id, comment.id);
      if (replyTo?.id === comment.id) {
        setReplyTo(null);
      }
      await loadReview();
    } catch (err) {
      Alert.alert('Could not delete comment', err instanceof Error ? err.message : 'Try again');
    } finally {
      setMutatingCommentId(null);
    }
  };

  const openReport = (target: ReportTarget) => {
    setReportTarget(target);
    setReportReason('');
    setReportDetails('');
  };

  const submitReport = async () => {
    if (!reportTarget || reportReason.trim().length < 3) {
      return;
    }
    setSubmittingReport(true);
    try {
      await api.report(tokens, {
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason: reportReason.trim(),
        details: reportDetails.trim() || undefined,
      });
      setReportTarget(null);
      setReportReason('');
      setReportDetails('');
      Alert.alert('Report sent', 'Thanks. The report was sent.');
    } catch (err) {
      Alert.alert('Could not report', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSubmittingReport(false);
    }
  };

  const blockReviewAuthor = async () => {
    if (!review || review.author.id === currentUserId) {
      return;
    }
    try {
      await api.blockUser(tokens, review.author.id);
      Alert.alert('User blocked', `@${review.author.username} will be hidden from your app.`);
      onBack();
    } catch (err) {
      Alert.alert('Could not block user', err instanceof Error ? err.message : 'Try again');
    }
  };

  const toggleReviewTranslation = async () => {
    if (!review || translatingReview) {
      return;
    }

    if (reviewTranslation?.showTranslated) {
      setReviewTranslation((current) =>
        current ? { ...current, showTranslated: false } : current,
      );
      return;
    }

    if (reviewTranslation) {
      setReviewTranslation({ ...reviewTranslation, showTranslated: true });
      return;
    }

    setTranslatingReview(true);
    try {
      const sourceText = [review.quickTake, review.body].filter(Boolean).join('\n');
      const response = await api.translate(tokens, {
        targetType: 'review',
        targetId: review.id,
        targetLocale: viewerLocale,
        sourceLocale: detectLikelyLocale(sourceText) ?? undefined,
      });
      setReviewTranslation({
        quickTake: response.fields.quickTake ?? null,
        body: response.fields.body ?? null,
        showTranslated: true,
      });
    } catch (err) {
      Alert.alert('Could not translate', err instanceof Error ? err.message : 'Try again');
    } finally {
      setTranslatingReview(false);
    }
  };

  const composer = (
    <CommentComposer
      body={commentBody}
      inputRef={commentInputRef}
      mode={replyTo ? 'reply' : 'comment'}
      posting={postingComment}
      replyTo={replyTo}
      transcribing={transcribingComment}
      onCancelReply={() => {
        setReplyTo(null);
        setCommentBody('');
      }}
      onCancelComment={() => {
        setShowCommentComposer(false);
        setCommentBody('');
      }}
      onChangeBody={setCommentBody}
      onDictate={startCommentDictation}
      onSubmit={postComment}
    />
  );

  if (!review) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  const showBody = !review.containsSpoilers || revealed;
  const reviewText = [review.quickTake, review.body].filter(Boolean).join('\n');
  const canTranslateReview = showBody && shouldOfferTranslation(reviewText, viewerLocale);
  const showTranslatedReview = Boolean(reviewTranslation?.showTranslated);
  const visibleQuickTake =
    showTranslatedReview && reviewTranslation?.quickTake
      ? reviewTranslation.quickTake
      : review.quickTake;
  const visibleBody =
    showTranslatedReview && reviewTranslation?.body ? reviewTranslation.body : review.body;
  const reviewTranslationLabel = translatingReview
    ? 'Translating...'
    : showTranslatedReview
      ? 'Show original'
      : 'Translate';
  const toggleCommentSort = () => {
    setCommentSort((current) => (current === 'best' ? 'new' : 'best'));
  };
  const reviewActions: MenuAction[] = [
    ...(canTranslateReview
      ? [
          {
            label: reviewTranslationLabel,
            onPress: toggleReviewTranslation,
            disabled: translatingReview,
          },
        ]
      : []),
    ...(review.author.id === currentUserId
      ? [
          {
            label: 'Edit review',
            onPress: () => onEditReview(review),
          },
        ]
      : [
          {
            label: 'Report review',
            onPress: () =>
              openReport({
                targetType: 'review',
                targetId: review.id,
                label: `@${review.author.username}'s review`,
              }),
          },
          {
            label: 'Block user',
            onPress: blockReviewAuthor,
            danger: true,
          },
        ]),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.stack}>
      <Header title="Review" right={<BackButton onPress={onBack} />} />
      <View style={styles.detailHeaderCard}>
        <Text
          style={[
            styles.detailReviewStatus,
            review.containsSpoilers ? styles.detailSpoilerText : styles.detailSafeText,
          ]}
        >
          {review.containsSpoilers ? 'Spoilers' : 'Spoiler-free'}
        </Text>
        <View style={styles.detailMovieRow}>
          <Poster movie={review.movie} compact />
          <View style={[styles.reviewCopy, styles.detailHeaderCopy]}>
            <Pressable style={styles.authorRow} onPress={() => onOpenUser(review.author)}>
              <Avatar label={review.author.displayName || review.author.username} mini />
              <Text style={styles.author}>@{review.author.username}</Text>
            </Pressable>
            <Text numberOfLines={2} style={styles.detailMovieTitle}>
              {review.movie.title}
            </Text>
            <View style={styles.takeRow}>
              <Rating value={review.rating} size={22} />
            </View>
          </View>
        </View>
        <View style={styles.detailReviewHighlight}>
          {showBody ? (
            <>
              {visibleQuickTake ? <Text style={styles.detailTitle}>{visibleQuickTake}</Text> : null}
              {visibleBody ? (
                <Text style={styles.detailReviewBody}>{visibleBody}</Text>
              ) : (
                <Text style={styles.detailReviewBody}>No full review.</Text>
              )}
              {review.containsSpoilers ? (
                <Pressable style={styles.secondaryButton} onPress={() => setRevealed(false)}>
                  <Text style={styles.secondaryButtonText}>Hide spoilers</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={styles.spoilerGate}>
              <Text style={styles.mutedText}>This review contains spoilers.</Text>
              <PrimaryButton label="Reveal spoilers" onPress={() => setRevealed(true)} />
            </View>
          )}
        </View>
        <View style={styles.detailFooterRow}>
          <View style={styles.detailTagBlock}>
            {review.tags?.length ? <TagPills tags={review.tags} /> : null}
          </View>
          <ActionIconButton
            accessibilityLabel="Review actions"
            active={reviewActionMenuOpen}
            onPress={() => setReviewActionMenuOpen((current) => !current)}
            icon={<Ellipsis size={18} color={colors.ink} />}
          />
        </View>
        {reviewActionMenuOpen ? (
          <ActionMenu
            actions={reviewActions}
            placement="review"
            onSelect={() => setReviewActionMenuOpen(false)}
          />
        ) : null}
        {reportTarget ? (
          <ReportComposer
            target={reportTarget}
            reason={reportReason}
            details={reportDetails}
            submitting={submittingReport}
            onChangeReason={setReportReason}
            onChangeDetails={setReportDetails}
            onCancel={() => setReportTarget(null)}
            onSubmit={submitReport}
          />
        ) : null}
      </View>
      <View style={styles.commentsInline}>
        <View style={styles.sectionHeader}>
          <View style={styles.commentsTitleGroup}>
            <Text style={styles.emptyTitle}>Comments</Text>
            <Text style={styles.bubble}>{review.commentCount} chats</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle comment sort"
            style={styles.commentSortButton}
            onPress={toggleCommentSort}
          >
            <Text style={styles.commentSortText}>{commentSort === 'best' ? 'Best' : 'New'}</Text>
            <ChevronDown size={14} color={colors.surface} />
          </Pressable>
        </View>
        {replyTo ? null : showCommentComposer ? (
          composer
        ) : (
          <Pressable
            accessibilityRole="button"
            style={styles.joinDiscussionButton}
            onPress={() => setShowCommentComposer(true)}
          >
            <View style={styles.joinDiscussionCopy}>
              <Text style={styles.joinDiscussionTitle}>Join discussion</Text>
              <Text style={styles.joinDiscussionHint}>Type or dictate a comment</Text>
            </View>
            <View style={styles.joinDiscussionIcon}>
              <MessageCircle size={20} color={colors.surface} />
            </View>
          </Pressable>
        )}
        {review.comments.length ? (
          <View style={styles.commentList}>
            {review.comments.map((comment) => (
              <CommentNode
                key={comment.id}
                activeReplyId={replyTo?.id ?? null}
                comment={comment}
                replyComposer={composer}
                currentUserId={currentUserId}
                viewerLocale={viewerLocale}
                tokens={tokens}
                onOpenUser={onOpenUser}
                editingCommentId={editingCommentId}
                editingBody={editingBody}
                mutatingCommentId={mutatingCommentId}
                onReply={startReply}
                onVote={voteComment}
                onStartEdit={startEditComment}
                onCancelEdit={() => {
                  setEditingCommentId(null);
                  setEditingBody('');
                }}
                onChangeEditBody={setEditingBody}
                onSaveEdit={saveCommentEdit}
                onDelete={deleteComment}
                onReport={(comment) =>
                  openReport({
                    targetType: 'comment',
                    targetId: comment.id,
                    label: `@${comment.author.username}'s comment`,
                  })
                }
                votingCommentId={votingCommentId}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyComments}>
            <MessageCircle size={24} color={colors.ink} />
            <Text style={styles.mutedText}>No comments yet. Start the thread.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function CommentNode({
  activeReplyId,
  comment,
  replyComposer,
  currentUserId,
  viewerLocale,
  tokens,
  onOpenUser,
  editingCommentId,
  editingBody,
  mutatingCommentId,
  onReply,
  onVote,
  onStartEdit,
  onCancelEdit,
  onChangeEditBody,
  onSaveEdit,
  onDelete,
  onReport,
  votingCommentId,
}: {
  activeReplyId: string | null;
  comment: ReviewComment;
  replyComposer: React.ReactNode;
  currentUserId: string;
  viewerLocale: string;
  tokens: AuthTokens;
  onOpenUser: (user: FriendSummary) => void;
  editingCommentId: string | null;
  editingBody: string;
  mutatingCommentId: string | null;
  onReply: (comment: ReviewComment) => void;
  onVote: (comment: ReviewComment, value: -1 | 1) => void;
  onStartEdit: (comment: ReviewComment) => void;
  onCancelEdit: () => void;
  onChangeEditBody: (body: string) => void;
  onSaveEdit: (comment: ReviewComment) => void;
  onDelete: (comment: ReviewComment) => void;
  onReport: (comment: ReviewComment) => void;
  votingCommentId: string | null;
}) {
  const voteDisabled = votingCommentId === comment.id;
  const isDeleted = Boolean(comment.deletedAt);
  const canReply = comment.depth < 3 && !isDeleted;
  const canEdit = comment.author.id === currentUserId && !isDeleted;
  const showReplyComposer = activeReplyId === comment.id;
  const isEditing = editingCommentId === comment.id;
  const isMutating = mutatingCommentId === comment.id;
  const isRootComment = comment.depth === 0;
  const [translatedComment, setTranslatedComment] = useState<string | null>(null);
  const [showTranslatedComment, setShowTranslatedComment] = useState(false);
  const [translatingComment, setTranslatingComment] = useState(false);
  const [commentMenuOpen, setCommentMenuOpen] = useState(false);
  const canTranslateComment = !isDeleted && shouldOfferTranslation(comment.body, viewerLocale);
  const visibleCommentBody =
    showTranslatedComment && translatedComment ? translatedComment : comment.body;
  const commentTranslationLabel = translatingComment
    ? 'Translating...'
    : showTranslatedComment
      ? 'Show original'
      : 'Translate';

  useEffect(() => {
    setTranslatedComment(null);
    setShowTranslatedComment(false);
    setCommentMenuOpen(false);
  }, [comment.id, comment.updatedAt]);

  const toggleCommentTranslation = async () => {
    if (showTranslatedComment) {
      setShowTranslatedComment(false);
      return;
    }
    if (translatedComment) {
      setShowTranslatedComment(true);
      return;
    }

    setTranslatingComment(true);
    try {
      const response = await api.translate(tokens, {
        targetType: 'comment',
        targetId: comment.id,
        targetLocale: viewerLocale,
        sourceLocale: detectLikelyLocale(comment.body) ?? undefined,
      });
      const nextText = response.fields.body;
      if (nextText) {
        setTranslatedComment(nextText);
        setShowTranslatedComment(true);
      }
    } catch (err) {
      Alert.alert('Could not translate', err instanceof Error ? err.message : 'Try again');
    } finally {
      setTranslatingComment(false);
    }
  };

  const commentActions: MenuAction[] = [
    ...(canTranslateComment
      ? [
          {
            label: commentTranslationLabel,
            onPress: toggleCommentTranslation,
            disabled: translatingComment,
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            label: 'Edit comment',
            onPress: () => onStartEdit(comment),
          },
          {
            label: 'Delete comment',
            onPress: () => onDelete(comment),
            disabled: isMutating,
            danger: true,
          },
        ]
      : !isDeleted
        ? [
            {
              label: 'Report comment',
              onPress: () => onReport(comment),
            },
          ]
        : []),
  ];

  return (
    <View style={isRootComment ? styles.commentThread : styles.commentReplyThread}>
      <View style={[styles.commentCard, comment.depth > 0 && styles.commentReplyCard]}>
        <View style={styles.commentCardBody}>
          <View style={styles.voteColumn}>
            <Pressable
              disabled={voteDisabled || isDeleted}
              onPress={() => onVote(comment, 1)}
              hitSlop={8}
            >
              <Text
                style={[styles.voteButton, comment.viewerVote === 1 && styles.voteButtonActive]}
              >
                ^
              </Text>
            </Pressable>
            <Text style={styles.voteScore}>{comment.score}</Text>
            <Pressable
              disabled={voteDisabled || isDeleted}
              onPress={() => onVote(comment, -1)}
              hitSlop={8}
            >
              <Text
                style={[styles.voteButton, comment.viewerVote === -1 && styles.voteButtonActive]}
              >
                v
              </Text>
            </Pressable>
          </View>
          <View style={styles.commentCopy}>
            <View style={styles.commentMetaRow}>
              <Pressable style={styles.commentAuthorRow} onPress={() => onOpenUser(comment.author)}>
                <Avatar label={comment.author.displayName || comment.author.username} mini />
                <View style={styles.reviewCopy}>
                  <Text numberOfLines={1} style={styles.author}>
                    @{comment.author.username}
                  </Text>
                </View>
              </Pressable>
              <Text style={styles.commentDate}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {isEditing ? (
              <View style={styles.commentEditBox}>
                <TextInput
                  value={editingBody}
                  onChangeText={onChangeEditBody}
                  multiline
                  style={[styles.commentInput, webNoOutline]}
                />
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.acceptButton}
                    disabled={isMutating || !editingBody.trim()}
                    onPress={() => onSaveEdit(comment)}
                  >
                    <Text style={styles.acceptButtonText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.declineButton} onPress={onCancelEdit}>
                    <Text style={styles.declineButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : isDeleted ? (
              <Text style={[styles.bodyText, styles.deletedCommentText]}>{comment.body}</Text>
            ) : (
              <Text style={styles.bodyText}>{visibleCommentBody}</Text>
            )}
            {!isEditing ? (
              <>
                <View style={styles.commentActionRow}>
                  <View style={styles.commentPrimaryActions}>
                    {canReply ? (
                      <ActionIconButton
                        accessibilityLabel="Reply to comment"
                        onPress={() => onReply(comment)}
                        icon={<Send size={15} color={colors.ink} />}
                      />
                    ) : null}
                  </View>
                  {commentActions.length ? (
                    <ActionIconButton
                      accessibilityLabel="Comment actions"
                      active={commentMenuOpen}
                      small
                      onPress={() => setCommentMenuOpen((current) => !current)}
                      icon={<Ellipsis size={15} color={colors.ink} />}
                    />
                  ) : null}
                </View>
                {commentMenuOpen ? (
                  <ActionMenu
                    actions={commentActions}
                    compact
                    placement="comment"
                    onSelect={() => setCommentMenuOpen(false)}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        </View>
        {showReplyComposer ? <View style={styles.activeReplyComposer}>{replyComposer}</View> : null}
      </View>
      {comment.replies.map((reply) => (
        <CommentNode
          key={reply.id}
          activeReplyId={activeReplyId}
          comment={reply}
          replyComposer={replyComposer}
          currentUserId={currentUserId}
          viewerLocale={viewerLocale}
          tokens={tokens}
          onOpenUser={onOpenUser}
          editingCommentId={editingCommentId}
          editingBody={editingBody}
          mutatingCommentId={mutatingCommentId}
          onReply={onReply}
          onVote={onVote}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onChangeEditBody={onChangeEditBody}
          onSaveEdit={onSaveEdit}
          onDelete={onDelete}
          onReport={onReport}
          votingCommentId={votingCommentId}
        />
      ))}
    </View>
  );
}

function CommentComposer({
  body,
  inputRef,
  mode,
  posting,
  replyTo,
  transcribing,
  onCancelReply,
  onCancelComment,
  onChangeBody,
  onDictate,
  onSubmit,
}: {
  body: string;
  inputRef: React.RefObject<TextInput | null>;
  mode: 'comment' | 'reply';
  posting: boolean;
  replyTo: ReviewComment | null;
  transcribing: boolean;
  onCancelReply: () => void;
  onCancelComment?: () => void;
  onChangeBody: (value: string) => void;
  onDictate: () => void;
  onSubmit: () => void;
}) {
  const isReply = mode === 'reply' && replyTo;

  return (
    <View style={styles.commentComposer}>
      {isReply ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>Replying to @{replyTo.author.username}</Text>
          <Pressable onPress={onCancelReply}>
            <Text style={styles.replyCancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.commentInputWrap}>
        <TextInput
          ref={inputRef}
          value={body}
          onChangeText={onChangeBody}
          placeholder={isReply ? 'Write a reply' : 'Join the discussion'}
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.commentInput, styles.commentInputWithMic, webNoOutline]}
        />
        <Pressable
          style={[styles.commentDictationButton, transcribing && styles.dictationButtonActive]}
          onPress={onDictate}
          disabled={transcribing}
          hitSlop={8}
        >
          <Mic size={22} color={transcribing ? colors.surface : colors.ink} />
        </Pressable>
      </View>
      <PrimaryButton
        label={isReply ? 'Post reply' : 'Post comment'}
        onPress={onSubmit}
        disabled={posting || !body.trim()}
        compact
      />
      {!isReply && onCancelComment ? (
        <Pressable style={styles.composerCancelButton} onPress={onCancelComment}>
          <Text style={styles.composerCancelText}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReportComposer({
  target,
  reason,
  details,
  submitting,
  onChangeReason,
  onChangeDetails,
  onCancel,
  onSubmit,
}: {
  target: ReportTarget;
  reason: string;
  details: string;
  submitting: boolean;
  onChangeReason: (value: string) => void;
  onChangeDetails: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.reportComposer}>
      <Text style={styles.label}>Report {target.label}</Text>
      <Field value={reason} onChangeText={onChangeReason} placeholder="Reason" />
      <TextInput
        value={details}
        onChangeText={onChangeDetails}
        placeholder="Details"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.commentInput, webNoOutline]}
      />
      <View style={styles.actionRow}>
        <Pressable
          style={styles.acceptButton}
          disabled={submitting || reason.trim().length < 3}
          onPress={onSubmit}
        >
          <Text style={styles.acceptButtonText}>Send</Text>
        </Pressable>
        <Pressable style={styles.declineButton} onPress={onCancel}>
          <Text style={styles.declineButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NotificationsScreen({
  tokens,
  onUnreadCountChange,
  onBack,
  onOpenReview,
}: {
  tokens: AuthTokens;
  onUnreadCountChange: (count: number) => void;
  onBack: () => void;
  onOpenReview: (id: string) => void;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.notifications(tokens);
      setItems(response.items);
      setUnreadCount(response.unreadCount);
      onUnreadCountChange(response.unreadCount);
    } catch (err) {
      Alert.alert('Could not load alerts', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange, tokens]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (notification: NotificationItem) => {
    try {
      await api.markNotificationRead(tokens, notification.id);
      const readAt = new Date().toISOString();
      const nextItems = items.map((item) =>
        item.id === notification.id ? { ...item, readAt } : item,
      );
      const nextUnreadCount = nextItems.filter((item) => !item.readAt).length;
      setItems(nextItems);
      setUnreadCount(nextUnreadCount);
      onUnreadCountChange(nextUnreadCount);
      if (notification.reviewId) {
        onOpenReview(notification.reviewId);
      }
    } catch (err) {
      Alert.alert('Could not update alert', err instanceof Error ? err.message : 'Try again');
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead(tokens);
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnreadCount(0);
      onUnreadCountChange(0);
    } catch (err) {
      Alert.alert('Could not update alerts', err instanceof Error ? err.message : 'Try again');
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Alerts"
        right={
          <View style={styles.headerActionRow}>
            {unreadCount ? (
              <PrimaryButton label="Read all" onPress={markAllRead} compact />
            ) : loading ? (
              <ActivityIndicator color={colors.pink} />
            ) : null}
            <BackButton onPress={onBack} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.stack}>
        {items.length ? (
          items.map((notification) => (
            <Pressable
              key={notification.id}
              style={[styles.notificationRow, !notification.readAt && styles.notificationRowUnread]}
              onPress={() => void markRead(notification)}
            >
              <Avatar
                label={
                  notification.actor?.displayName ||
                  notification.actor?.username ||
                  notification.type
                }
                mini
              />
              <View style={styles.reviewCopy}>
                <Text style={styles.author}>{notificationTitle(notification)}</Text>
                <Text style={styles.commentMeta}>
                  {new Date(notification.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {!notification.readAt ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyProfileState}>
            <Bell size={28} color={colors.ink} />
            <Text style={styles.emptyTitle}>No alerts yet</Text>
            <Text style={styles.mutedText}>Friend requests and replies will land here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function notificationTitle(notification: NotificationItem) {
  const actor = notification.actor?.displayName || notification.actor?.username || 'Someone';
  const messages: Record<NotificationItem['type'], string> = {
    friend_request_received: `${actor} sent you a friend request`,
    friend_request_accepted: `${actor} accepted your friend request`,
    review_commented: `${actor} commented on your review`,
    comment_replied: `${actor} replied to your comment`,
    comment_voted: `${actor} voted on your comment`,
  };
  return messages[notification.type];
}

function FriendsScreen({
  tokens,
  onOpenUser,
}: {
  tokens: AuthTokens;
  onOpenUser: (user: FriendSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<
    Array<{
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      friendshipStatus: string | null;
    }>
  >([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [blocked, setBlocked] = useState<BlockedUserSummary[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadFriendState = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const [incomingRows, outgoingRows, friendRows, blockedRows] = await Promise.all([
        api.incomingFriendRequests(tokens),
        api.outgoingFriendRequests(tokens),
        api.friends(tokens),
        api.blockedUsers(tokens),
      ]);
      setIncoming(incomingRows);
      setOutgoing(outgoingRows);
      setFriends(friendRows);
      setBlocked(blockedRows);
    } catch (err) {
      Alert.alert('Could not load friends', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoadingRequests(false);
    }
  }, [tokens]);

  useEffect(() => {
    void loadFriendState();
  }, [loadFriendState]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const timeout = setTimeout(() => {
      void api
        .searchUsers(tokens, query)
        .then(setUsers)
        .catch(() => setUsers([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, tokens]);

  const add = async (id: string) => {
    try {
      const request = await api.sendFriendRequest(tokens, id);
      setOutgoing((current) => [request, ...current.filter((item) => item.id !== request.id)]);
      setUsers((current) =>
        current.map((user) => (user.id === id ? { ...user, friendshipStatus: 'pending' } : user)),
      );
    } catch (err) {
      Alert.alert('Could not send request', err instanceof Error ? err.message : 'Try again');
    }
  };

  const accept = async (id: string) => {
    try {
      await api.acceptFriendRequest(tokens, id);
      await loadFriendState();
    } catch (err) {
      Alert.alert('Could not accept request', err instanceof Error ? err.message : 'Try again');
    }
  };

  const decline = async (id: string) => {
    try {
      await api.declineFriendRequest(tokens, id);
      setIncoming((current) => current.filter((request) => request.id !== id));
    } catch (err) {
      Alert.alert('Could not decline request', err instanceof Error ? err.message : 'Try again');
    }
  };

  const blockUser = async (id: string) => {
    try {
      await api.blockUser(tokens, id);
      setUsers((current) => current.filter((item) => item.id !== id));
      setFriends((current) => current.filter((item) => item.id !== id));
      setOutgoing((current) => current.filter((request) => request.addressee.id !== id));
      setIncoming((current) => current.filter((request) => request.requester.id !== id));
      await loadFriendState();
    } catch (err) {
      Alert.alert('Could not block user', err instanceof Error ? err.message : 'Try again');
    }
  };

  const unblockUser = async (id: string) => {
    try {
      await api.unblockUser(tokens, id);
      setBlocked((current) => current.filter((item) => item.id !== id));
      await loadFriendState();
    } catch (err) {
      Alert.alert('Could not unblock user', err instanceof Error ? err.message : 'Try again');
    }
  };

  const openUserReport = (id: string, username: string) => {
    setReportTarget({ targetType: 'user', targetId: id, label: `@${username}` });
    setReportReason('');
    setReportDetails('');
  };

  const submitReport = async () => {
    if (!reportTarget || reportReason.trim().length < 3) {
      return;
    }
    setSubmittingReport(true);
    try {
      await api.report(tokens, {
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason: reportReason.trim(),
        details: reportDetails.trim() || undefined,
      });
      setReportTarget(null);
      setReportReason('');
      setReportDetails('');
      Alert.alert('Report sent', 'Thanks. The report was sent.');
    } catch (err) {
      Alert.alert('Could not report', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSubmittingReport(false);
    }
  };

  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);
  const incomingByUserId = useMemo(
    () => new Map(incoming.map((request) => [request.requester.id, request])),
    [incoming],
  );
  const outgoingUserIds = useMemo(
    () => new Set(outgoing.map((request) => request.addressee.id)),
    [outgoing],
  );

  return (
    <View style={styles.screen}>
      <Header
        title="Friends"
        right={loadingRequests ? <ActivityIndicator color={colors.pink} /> : undefined}
      />
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Search username"
        autoCapitalize="none"
        icon={<UserPlus size={18} color={colors.muted} />}
      />
      <ScrollView contentContainerStyle={[styles.stack, styles.afterSearchFieldStack]}>
        {reportTarget ? (
          <ReportComposer
            target={reportTarget}
            reason={reportReason}
            details={reportDetails}
            submitting={submittingReport}
            onChangeReason={setReportReason}
            onChangeDetails={setReportDetails}
            onCancel={() => setReportTarget(null)}
            onSubmit={submitReport}
          />
        ) : null}
        {incoming.length ? (
          <Panel tint="yellow">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Incoming</Text>
              <Text style={styles.mutedText}>{incoming.length} requests</Text>
            </View>
            {incoming.map((request) => (
              <View key={request.id} style={styles.friendRequestCard}>
                <Avatar label={request.requester.displayName || request.requester.username} />
                <View style={styles.reviewCopy}>
                  <Text numberOfLines={1} style={styles.movieTitle}>
                    @{request.requester.username}
                  </Text>
                  <Text style={styles.mutedText}>wants to be friends</Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.acceptButton} onPress={() => void accept(request.id)}>
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </Pressable>
                  <Pressable style={styles.declineButton} onPress={() => void decline(request.id)}>
                    <Text style={styles.declineButtonText}>No</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Panel>
        ) : null}

        {query.trim().length >= 2 ? (
          <Panel>
            <Text style={styles.sectionTitle}>Find people</Text>
            {users.map((item) => {
              const incomingRequest = incomingByUserId.get(item.id);
              const alreadyFriends = friendIds.has(item.id) || item.friendshipStatus === 'accepted';
              const pendingOutgoing =
                outgoingUserIds.has(item.id) || item.friendshipStatus === 'pending';
              const label = alreadyFriends
                ? 'Friends'
                : incomingRequest
                  ? 'Respond'
                  : pendingOutgoing
                    ? 'Pending'
                    : 'Add';
              return (
                <View key={item.id} style={styles.simplePersonRow}>
                  <Avatar label={item.displayName} />
                  <Text numberOfLines={1} style={styles.friendSearchName}>
                    @{item.username}
                  </Text>
                  <Pressable
                    disabled={alreadyFriends || (pendingOutgoing && !incomingRequest)}
                    onPress={() =>
                      incomingRequest ? void accept(incomingRequest.id) : void add(item.id)
                    }
                    style={styles.friendAddAction}
                  >
                    <Text style={styles.pill}>{label}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.iconSmallButton}
                    onPress={() => openUserReport(item.id, item.username)}
                  >
                    <Flag size={14} color={colors.ink} />
                  </Pressable>
                  <Pressable style={styles.iconSmallButton} onPress={() => void blockUser(item.id)}>
                    <Ban size={14} color={colors.ink} />
                  </Pressable>
                </View>
              );
            })}
            {!users.length ? <Text style={styles.mutedText}>No matches yet.</Text> : null}
          </Panel>
        ) : (
          <>
            <Panel>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your friends</Text>
                <Text style={styles.bubble}>{friends.length}</Text>
              </View>
              {friends.length ? (
                <View style={styles.friendGrid}>
                  {friends.map((friend) => (
                    <Pressable
                      key={friend.id}
                      style={styles.friendBubble}
                      onPress={() => onOpenUser(friend)}
                    >
                      <Avatar label={friend.displayName || friend.username} large />
                      <Text numberOfLines={1} style={styles.friendHandle}>
                        @{friend.username}
                      </Text>
                      <View style={styles.friendMiniActions}>
                        <Pressable onPress={() => openUserReport(friend.id, friend.username)}>
                          <Text style={styles.commentReplyText}>Report</Text>
                        </Pressable>
                        <Pressable onPress={() => void blockUser(friend.id)}>
                          <Text style={styles.commentReplyText}>Block</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>Search a username to add friends.</Text>
              )}
            </Panel>
            {outgoing.length ? (
              <Panel tint="pink">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Outgoing</Text>
                  <Text style={styles.mutedText}>pending</Text>
                </View>
                <View style={styles.friendGrid}>
                  {outgoing.slice(0, 6).map((request) => (
                    <View key={request.id} style={styles.friendBubble}>
                      <View style={styles.friendSuggestion}>
                        <View style={styles.statusDot} />
                        <Avatar
                          label={request.addressee.displayName || request.addressee.username}
                          large
                        />
                      </View>
                      <Text numberOfLines={1} style={styles.friendHandle}>
                        @{request.addressee.username}
                      </Text>
                    </View>
                  ))}
                </View>
              </Panel>
            ) : null}
            {blocked.length ? (
              <Panel>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Blocked</Text>
                  <Text style={styles.bubble}>{blocked.length}</Text>
                </View>
                <View style={styles.friendGrid}>
                  {blocked.map((blockedUser) => (
                    <View key={blockedUser.id} style={styles.friendBubble}>
                      <Avatar label={blockedUser.displayName || blockedUser.username} large />
                      <Text numberOfLines={1} style={styles.friendHandle}>
                        @{blockedUser.username}
                      </Text>
                      <Pressable onPress={() => void unblockUser(blockedUser.id)}>
                        <Text style={styles.commentReplyText}>Unblock</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Panel>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ProfileScreen({
  tokens,
  user,
  profileUser,
  onBack,
  onOpenReview,
  onOpenUser,
  onUserChange,
  onSignOut,
}: {
  tokens: AuthTokens;
  user: AuthUser;
  profileUser: FriendSummary | null;
  onBack?: () => void;
  onOpenReview: (id: string) => void;
  onOpenUser: (user: FriendSummary) => void;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const [reviews, setReviews] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);
  const [reviewQuery, setReviewQuery] = useState('');
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const activeProfile = profileUser ?? user;
  const isOwnProfile = !profileUser;

  const loadReviews = useCallback(
    async (nextCursor?: string | null) => {
      setReviewLoadError(null);
      const response = isOwnProfile
        ? await api.myReviews(tokens, nextCursor)
        : await api.userReviews(tokens, activeProfile.id, nextCursor);
      setReviews((current) => (nextCursor ? [...current, ...response.items] : response.items));
      setCursor(response.nextCursor);
    },
    [activeProfile.id, isOwnProfile, tokens],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await loadReviews();
      } catch (err) {
        setReviewLoadError(err instanceof Error ? err.message : 'Try again');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadReviews]);

  useEffect(() => {
    if (!isOwnProfile) {
      setFriendCount(null);
      return;
    }
    void api
      .friends(tokens)
      .then((rows) => setFriendCount(rows.length))
      .catch(() => setFriendCount(null));
  }, [isOwnProfile, tokens]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadReviews();
    } catch (err) {
      setReviewLoadError(err instanceof Error ? err.message : 'Try again');
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      await loadReviews(cursor);
    } catch (err) {
      setReviewLoadError(err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoadingMore(false);
    }
  };

  const retryReviews = async () => {
    setLoading(true);
    try {
      await loadReviews();
    } catch (err) {
      setReviewLoadError(err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  };
  const filteredReviews = useMemo(() => {
    const needle = reviewQuery.trim().toLowerCase();
    if (!needle) {
      return reviews;
    }

    return reviews.filter((review) => {
      const searchable = [
        review.movie.title,
        review.movie.releaseYear?.toString(),
        review.quickTake,
        review.containsSpoilers ? 'spoilers' : 'spoiler-free',
        review.author.username,
        review.author.displayName,
        ...review.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    });
  }, [reviewQuery, reviews]);
  const tasteTags = useMemo(() => {
    const counts = new Map<string, number>();
    reviews.forEach((review) => {
      review.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    const topTags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([tag]) => tag);
    return topTags;
  }, [reviews]);
  if (isOwnProfile && showSettings) {
    return (
      <AccountSettingsScreen
        tokens={tokens}
        user={user}
        onBack={() => setShowSettings(false)}
        onUserChange={onUserChange}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.stack}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Header
        title={`@${activeProfile.username}`}
        right={
          onBack ? (
            <BackButton onPress={onBack} />
          ) : isOwnProfile ? (
            <View style={styles.headerActionRow}>
              <IconButton
                icon={<Settings size={20} color={colors.ink} />}
                onPress={() => setShowSettings(true)}
                accessibilityLabel="Account settings"
              />
              <IconButton
                icon={<LogOut size={20} color={colors.ink} />}
                onPress={onSignOut}
                accessibilityLabel="Log out"
              />
            </View>
          ) : undefined
        }
      />
      <View style={styles.profileBlock}>
        <Avatar label={activeProfile.displayName || activeProfile.username} large />
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>
            {activeProfile.displayName || activeProfile.username}
          </Text>
          <View style={styles.profileInlineStats}>
            <Text style={styles.profileInlineText}>
              {loading || reviewLoadError ? '-' : reviews.length} reviews
            </Text>
            {isOwnProfile ? (
              <>
                <Text style={styles.profileInlineText}>|</Text>
                <Text style={styles.profileInlineText}>
                  {friendCount === null ? '-' : friendCount} friends
                </Text>
              </>
            ) : null}
          </View>
          {tasteTags.length ? (
            <View style={styles.profileTasteRow}>
              {tasteTags.map((tag) => (
                <Text key={tag} numberOfLines={1} style={styles.tagPill}>
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {loading ? (
            <ActivityIndicator color={colors.pink} />
          ) : !reviewLoadError ? (
            <Text style={styles.bubble}>{reviews.length}</Text>
          ) : null}
        </View>
        {!reviewLoadError && reviews.length ? (
          <Field
            value={reviewQuery}
            onChangeText={setReviewQuery}
            placeholder={isOwnProfile ? 'Search my reviews' : 'Search reviews'}
            autoCapitalize="none"
            icon={<Search size={18} color={colors.muted} />}
          />
        ) : null}
        {reviewLoadError ? (
          <View style={styles.notice}>
            <Text style={styles.error}>Could not load reviews.</Text>
            <Text style={styles.mutedText}>{reviewLoadError}</Text>
            <PrimaryButton label="Try again" onPress={retryReviews} disabled={loading} compact />
          </View>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard
              key={review.reviewId}
              item={review}
              onPress={() => onOpenReview(review.reviewId)}
              onOpenUser={onOpenUser}
            />
          ))
        )}
        {!loading && !reviewLoadError && reviews.length && !filteredReviews.length ? (
          <View style={styles.emptyProfileState}>
            <Search size={28} color={colors.ink} />
            <Text style={styles.emptyTitle}>No matching reviews</Text>
            <Text style={styles.mutedText}>Try another movie, tag, or quick take.</Text>
          </View>
        ) : null}
        {!loading && !reviewLoadError && !reviews.length ? (
          <View style={styles.emptyProfileState}>
            <Popcorn size={30} color={colors.ink} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.mutedText}>
              {isOwnProfile
                ? 'Your movie takes will appear here after you post.'
                : 'No visible reviews from this friend yet.'}
            </Text>
          </View>
        ) : null}
        {cursor && !reviewLoadError ? (
          <PrimaryButton
            label={loadingMore ? 'Loading...' : 'Load more'}
            onPress={loadMore}
            disabled={loadingMore}
            compact
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function AccountSettingsScreen({
  tokens,
  user,
  onBack,
  onUserChange,
  onSignOut,
}: {
  tokens: AuthTokens;
  user: AuthUser;
  onBack: () => void;
  onUserChange: (user: AuthUser) => void;
  onSignOut: () => void;
}) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.pendingEmail ?? user.email);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const usingSupabaseAuth = tokens.provider === 'supabase' && Boolean(supabase);

  useEffect(() => {
    setDisplayName(user.displayName);
    setUsername(user.username);
    setEmail(user.pendingEmail ?? user.email);
  }, [user.displayName, user.email, user.pendingEmail, user.username]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateMe(tokens, {
        displayName: displayName.trim(),
        username: username.trim(),
        ...(usingSupabaseAuth ? {} : { email: email.trim() }),
      });
      onUserChange(updated);
      setMessage(
        updated.pendingEmail ? 'Account updated. Verify the pending email.' : 'Account updated.',
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update account');
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase) {
      return;
    }
    setVerifying(true);
    setMessage(null);
    try {
      const response = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: supabaseResetRedirectUrl,
      });
      if (response.error) {
        throw response.error;
      }
      setMessage('Password reset email sent.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send password reset');
    } finally {
      setVerifying(false);
    }
  };

  const requestVerificationToken = async () => {
    setVerifying(true);
    setMessage(null);
    setDevVerificationToken(null);
    try {
      const response = await api.requestEmailVerification(tokens);
      if (response.devToken) {
        setDevVerificationToken(response.devToken);
        setVerificationToken(response.devToken);
        setMessage('Verification token ready for this beta flow.');
      } else {
        setMessage(
          response.emailVerifiedAt ? 'Email is already verified.' : 'Verification requested.',
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not request verification');
    } finally {
      setVerifying(false);
    }
  };

  const verifyEmail = async () => {
    setVerifying(true);
    setMessage(null);
    try {
      const response = await api.verifyEmailToken(verificationToken);
      onUserChange(response.user);
      setVerificationToken('');
      setDevVerificationToken(null);
      setMessage('Email verified.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not verify email');
    } finally {
      setVerifying(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      await api.deleteMe(tokens);
      onSignOut();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not delete account');
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert('Delete account permanently?', 'This removes your account and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteAccount() },
    ]);
  };

  const saveDisabled =
    saving || !displayName.trim() || !username.trim() || (!usingSupabaseAuth && !email.trim());
  const emailStatus = user.pendingEmail
    ? 'Pending'
    : user.emailVerifiedAt
      ? 'Verified'
      : 'Unverified';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.stack, styles.accountSettingsStack]}
    >
      <Header title="Account settings" right={<BackButton onPress={onBack} />} />
      <Panel tint="cyan">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.bubble}>{emailStatus}</Text>
        </View>
        <View style={styles.form}>
          <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
          <Field
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
          />
          {!usingSupabaseAuth ? (
            <Field value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
          ) : null}
          <PrimaryButton
            label={saving ? 'Saving...' : usingSupabaseAuth ? 'Save profile' : 'Save account'}
            onPress={saveProfile}
            disabled={saveDisabled}
            compact
          />
        </View>
      </Panel>
      {usingSupabaseAuth ? (
        <Panel>
          <View style={styles.form}>
            <Text style={styles.label}>Login email</Text>
            <Text style={styles.mutedText}>{user.email}</Text>
            <Pressable
              style={[styles.secondaryButton, styles.centeredButton]}
              disabled={verifying}
              onPress={sendPasswordReset}
            >
              <Text style={styles.secondaryButtonText}>
                {verifying ? 'Sending...' : 'Send pwd reset'}
              </Text>
            </Pressable>
          </View>
        </Panel>
      ) : (
        <Panel>
          <View style={styles.form}>
            <Text style={styles.label}>Email verification</Text>
            <Text style={styles.mutedText}>Current login email: {user.email}</Text>
            {user.pendingEmail ? (
              <Text style={styles.mutedText}>Pending email: {user.pendingEmail}</Text>
            ) : null}
            <Pressable
              style={styles.secondaryButton}
              disabled={verifying}
              onPress={requestVerificationToken}
            >
              <Text style={styles.secondaryButtonText}>
                {user.pendingEmail ? 'Get email-change token' : 'Get verification token'}
              </Text>
            </Pressable>
            {devVerificationToken ? (
              <Text selectable style={styles.devTokenText}>
                {devVerificationToken}
              </Text>
            ) : null}
            <Field
              value={verificationToken}
              onChangeText={setVerificationToken}
              placeholder="Verification token"
              autoCapitalize="none"
            />
            <PrimaryButton
              label="Verify email"
              onPress={verifyEmail}
              disabled={verifying || !verificationToken.trim()}
              compact
            />
          </View>
        </Panel>
      )}
      {message ? (
        <Text style={message.includes('Could not') ? styles.error : styles.mutedText}>
          {message}
        </Text>
      ) : null}
      <View style={styles.deleteAccountRow}>
        <Pressable
          style={[
            styles.secondaryButton,
            styles.centeredButton,
            styles.dangerButton,
            styles.deleteAccountButton,
          ]}
          disabled={deleting}
          onPress={confirmDeleteAccount}
        >
          <Text style={styles.secondaryButtonText}>
            {deleting ? 'Deleting...' : 'Delete account permanently'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

function Panel({
  children,
  tint,
}: {
  children: React.ReactNode;
  tint?: 'yellow' | 'cyan' | 'pink' | 'green';
}) {
  const tintStyle = {
    yellow: styles.panelYellow,
    cyan: styles.panelCyan,
    pink: styles.panelPink,
    green: styles.panelGreen,
  }[tint ?? 'yellow'];
  return <View style={[styles.panel, tint && tintStyle]}>{children}</View>;
}

function MoviePosterRow({
  movies,
  onPress,
}: {
  movies: MovieSummary[];
  onPress: (movie: MovieSummary) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.posterRow}
    >
      {movies.map((movie) => (
        <Pressable
          key={`${movie.tmdbId}-${movie.title}`}
          style={styles.miniMovie}
          onPress={() => onPress(movie)}
        >
          <Poster movie={movie} />
          <Text numberOfLines={2} style={styles.miniMovieTitle}>
            {movie.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Field({
  icon,
  ...props
}: React.ComponentProps<typeof TextInput> & { icon?: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      {icon}
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.field, webNoOutline]}
        {...props}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.primaryButton,
        compact && styles.compactButton,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      <Text style={[styles.primaryButtonText, disabled && styles.primaryButtonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return <PrimaryButton label="Back" onPress={onPress} compact />;
}

function IconButton({
  icon,
  onPress,
  active,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  active?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconButton, active && styles.iconButtonActive]}
      onPress={onPress}
    >
      {icon}
    </Pressable>
  );
}

function ActionIconButton({
  icon,
  onPress,
  disabled,
  active,
  small,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  small?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.actionIconButton,
        small && styles.actionIconButtonSmall,
        active && styles.actionIconButtonActive,
        disabled && styles.actionIconButtonDisabled,
      ]}
    >
      {icon}
    </Pressable>
  );
}

function ActionMenu({
  actions,
  onSelect,
  compact,
  placement = 'comment',
}: {
  actions: MenuAction[];
  onSelect?: () => void;
  compact?: boolean;
  placement?: 'review' | 'comment';
}) {
  return (
    <View
      style={[
        styles.moreMenu,
        placement === 'review' ? styles.moreMenuReviewOverlay : styles.moreMenuCommentOverlay,
        compact && styles.moreMenuCompact,
      ]}
    >
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          disabled={action.disabled}
          onPress={() => {
            if (action.disabled) {
              return;
            }
            onSelect?.();
            void action.onPress();
          }}
          style={[styles.moreMenuItem, action.disabled && styles.moreMenuItemDisabled]}
        >
          <Text
            style={[
              styles.moreMenuText,
              action.danger && styles.moreMenuTextDanger,
              action.disabled && styles.moreMenuTextDisabled,
            ]}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const tabs = useMemo(
    () => [
      { id: 'feed' as const, label: 'Feed', icon: Home },
      { id: 'search' as const, label: 'Search', icon: Search },
      { id: 'create' as const, label: 'Post', icon: Plus },
      { id: 'friends' as const, label: 'Friends', icon: Users },
      { id: 'profile' as const, label: 'Me', icon: User },
    ],
    [],
  );
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.id;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <View
              style={[
                styles.tabIcon,
                active && styles.tabIconActive,
                active && tab.id === 'create' && styles.tabIconCreateActive,
              ]}
            >
              <Icon size={16} color={active ? colors.surface : colors.muted} />
            </View>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Poster({
  movie,
  compact,
  feed,
}: {
  movie: MovieSummary;
  compact?: boolean;
  feed?: boolean;
}) {
  if (movie.posterUrl) {
    return (
      <Image
        source={{ uri: movie.posterUrl }}
        style={[styles.poster, compact && styles.posterCompact, feed && styles.feedPosterImage]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.poster,
        compact && styles.posterCompact,
        feed && styles.feedPosterImage,
        styles.posterFallback,
      ]}
    >
      <Popcorn size={24} color={colors.ink} />
    </View>
  );
}

function Avatar({
  label,
  large,
  mini,
  micro,
}: {
  label: string;
  large?: boolean;
  mini?: boolean;
  micro?: boolean;
}) {
  const toneStyles = [
    styles.avatarCyan,
    styles.avatarPink,
    styles.avatarYellow,
    styles.avatarGreen,
  ];
  const toneIndex =
    label.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % toneStyles.length;
  const lightText = toneIndex === 0 || toneIndex === 1;

  return (
    <View
      style={[
        styles.avatar,
        toneStyles[toneIndex],
        large && styles.avatarLarge,
        mini && styles.avatarMini,
        micro && styles.avatarMicro,
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          !lightText && styles.avatarTextDark,
          large && styles.avatarTextLarge,
          mini && styles.avatarTextMini,
          micro && styles.avatarTextMicro,
        ]}
      >
        {label.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

function Rating({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <View style={styles.rating}>
      <Popcorn size={size} color={colors.ink} />
      <Text style={styles.ratingText}>{value.toFixed(1)}</Text>
    </View>
  );
}

type PopcornFill = 'empty' | 'half' | 'full';

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(REVIEW_RATING_MAX, value));
}

function roundRatingToStep(value: number) {
  return Math.round(clampRating(value) / REVIEW_RATING_STEP) * REVIEW_RATING_STEP;
}

function formatRating(value: number) {
  const score = clampRating(value);
  return Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
}

function popcornFillFor(value: number, index: number): PopcornFill {
  const score = roundRatingToStep(value);
  const amount = score - index;
  if (amount >= 1) {
    return 'full';
  }
  if (amount >= REVIEW_RATING_STEP) {
    return 'half';
  }
  return 'empty';
}

function PopcornGlyph({
  fill,
  size,
  activeColor,
  inactiveColor,
  fillColor,
  activeStrokeWidth = 2.8,
  inactiveStrokeWidth = 2.2,
}: {
  fill: PopcornFill;
  size: number;
  activeColor: string;
  inactiveColor: string;
  fillColor: string;
  activeStrokeWidth?: number;
  inactiveStrokeWidth?: number;
}) {
  const overlayWidth = fill === 'half' ? size / 2 : size;

  return (
    <View style={[styles.popcornGlyph, { width: size, height: size }]} pointerEvents="none">
      <Popcorn
        size={size}
        color={inactiveColor}
        fill="transparent"
        strokeWidth={inactiveStrokeWidth}
      />
      {fill !== 'empty' ? (
        <View style={[styles.popcornGlyphOverlay, { width: overlayWidth }]} pointerEvents="none">
          <View style={{ width: size, height: size }}>
            <Popcorn
              size={size}
              color={activeColor}
              fill={fillColor}
              strokeWidth={activeStrokeWidth}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.ratingPicker}>
      {REVIEW_RATING_SLOTS.map((slot, index) => {
        const halfValue = slot - REVIEW_RATING_STEP;
        const fill = popcornFillFor(value, index);
        const nextValue = value === slot ? halfValue : slot;
        return (
          <Pressable
            key={slot}
            accessibilityHint={`Tap again after selecting to switch this popcorn to ${formatRating(
              halfValue,
            )}.`}
            accessibilityLabel={`Set rating to ${formatRating(nextValue)} out of 5 popcorns`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === slot || value === halfValue }}
            hitSlop={8}
            onPress={() => onChange(nextValue)}
            style={styles.ratingButton}
          >
            <PopcornGlyph
              fill={fill}
              size={38}
              activeColor={colors.pink}
              inactiveColor={colors.ink}
              fillColor={colors.yellow}
              activeStrokeWidth={3.4}
              inactiveStrokeWidth={2.6}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function PopcornRating({ value, large }: { value: number; large?: boolean }) {
  const score = Math.max(0, Math.min(5, value));
  const scoreLabel = formatRating(score);
  const size = large ? 27 : 15;

  return (
    <View style={styles.popcornRating} accessibilityLabel={`${scoreLabel} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = popcornFillFor(score, index);
        return (
          <PopcornGlyph
            key={index}
            fill={fill}
            size={size}
            activeColor={colors.ink}
            inactiveColor={colors.muted}
            fillColor={colors.yellow}
          />
        );
      })}
      <Text style={styles.popcornRatingText}>{scoreLabel}/5</Text>
    </View>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  return (
    <View style={styles.tagList}>
      {tags.map((tag) => (
        <Text key={tag} style={styles.tagPill}>
          {tag}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.cream,
  },
  loadingLogo: {
    width: 156,
    height: 156,
  },
  auth: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: colors.surface,
  },
  authWelcome: {
    justifyContent: 'center',
  },
  authFormScreen: {
    justifyContent: 'flex-start',
  },
  authWelcomeContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 48,
  },
  authBrand: {
    alignItems: 'center',
    gap: 8,
  },
  logoBacking: {
    width: 206,
    height: 206,
    borderRadius: 103,
    backgroundColor: '#ffe4ee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 0,
    shadowOffset: { width: 5, height: 6 },
  },
  welcomeLogo: {
    width: 184,
    height: 184,
    borderRadius: 48,
  },
  authActions: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  authSecondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSecondaryButtonText: {
    color: colors.ink,
    fontWeight: '900',
  },
  authPanel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    flexGrow: 1,
    justifyContent: 'center',
    gap: 20,
  },
  authFormHeader: {
    alignItems: 'center',
    gap: 12,
  },
  smallLogoBacking: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#ffe4ee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  smallWelcomeLogo: {
    width: 70,
    height: 70,
    borderRadius: 20,
  },
  authTitle: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
  },
  logo: {
    fontSize: 52,
    lineHeight: 48,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 17,
    lineHeight: 23,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    gap: 9,
  },
  authLinkRow: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLinkMuted: {
    color: colors.muted,
    fontWeight: '800',
    textAlign: 'center',
  },
  authLinkText: {
    color: colors.ink,
    fontWeight: '900',
  },
  app: {
    flex: 1,
    paddingBottom: 72,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 27,
    fontWeight: '900',
    color: colors.ink,
  },
  headerSpacer: {
    width: 40,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 3 },
  },
  iconButtonActive: {
    backgroundColor: colors.pink,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  actionIconButtonSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  actionIconButtonActive: {
    backgroundColor: colors.cyan,
  },
  actionIconButtonDisabled: {
    opacity: 0.45,
  },
  moreMenu: {
    position: 'absolute',
    zIndex: 20,
    elevation: 6,
    minWidth: 158,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.cream,
    padding: 6,
    gap: 4,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  moreMenuReviewOverlay: {
    right: 12,
    bottom: 58,
  },
  moreMenuCommentOverlay: {
    right: 0,
    bottom: 40,
  },
  moreMenuCompact: {
    minWidth: 146,
  },
  moreMenuItem: {
    minHeight: 32,
    borderRadius: 9,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  moreMenuItemDisabled: {
    opacity: 0.55,
  },
  moreMenuText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  moreMenuTextDanger: {
    color: colors.danger,
  },
  moreMenuTextDisabled: {
    color: colors.muted,
  },
  fieldWrap: {
    minHeight: 46,
    maxHeight: 46,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  field: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: colors.ink,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: colors.ink,
    shadowOpacity: 0.13,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  primaryButtonDisabled: {
    backgroundColor: '#d8c7aa',
    shadowOpacity: 0,
  },
  compactButton: {
    minHeight: 38,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
  primaryButtonTextDisabled: {
    color: '#6d6358',
  },
  error: {
    color: colors.danger,
    fontWeight: '800',
  },
  feedList: {
    gap: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyPanel: {
    minHeight: 220,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  emptyMascot: {
    width: 94,
    height: 94,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  mutedText: {
    color: colors.muted,
    fontWeight: '700',
  },
  reviewCard: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 12,
  },
  reviewFrame: {
    minHeight: 188,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.cream,
    padding: 10,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  reviewCardHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingRight: 62,
  },
  reviewCardBody: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  reviewTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  feedReviewerRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedReviewerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  reviewerRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewerName: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '900',
  },
  reviewerHandle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
  },
  reviewCommentCluster: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 58,
    alignItems: 'flex-end',
    gap: 4,
    zIndex: 1,
  },
  reviewTopMeta: {
    width: 90,
    minHeight: 60,
    alignItems: 'flex-end',
    gap: 1,
  },
  feedReviewDate: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
  },
  feedReviewerNameRow: {
    maxWidth: '100%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  commentParticipantRow: {
    minHeight: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 2,
  },
  framePerfRow: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.7,
  },
  framePerfTop: {
    top: -10,
  },
  framePerfBottom: {
    bottom: -10,
  },
  framePerfHole: {
    width: 10,
    height: 4,
    backgroundColor: colors.cream,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cyan,
  },
  avatarCyan: {
    backgroundColor: colors.cyan,
  },
  avatarPink: {
    backgroundColor: colors.pink,
  },
  avatarYellow: {
    backgroundColor: colors.yellow,
  },
  avatarGreen: {
    backgroundColor: colors.green,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  avatarMicro: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginLeft: -6,
  },
  avatarText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: 18,
  },
  avatarTextDark: {
    color: colors.ink,
  },
  avatarTextLarge: {
    fontSize: 36,
  },
  avatarTextMini: {
    fontSize: 12,
  },
  avatarTextMicro: {
    fontSize: 9,
  },
  author: {
    fontWeight: '900',
    color: colors.ink,
  },
  movieRow: {
    flexDirection: 'row',
    gap: 12,
  },
  poster: {
    width: 76,
    height: 112,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
    overflow: 'hidden',
  },
  posterCompact: {
    width: 64,
    height: 88,
  },
  feedPosterImage: {
    width: 84,
    height: 112,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  movieTitle: {
    color: colors.ink,
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '900',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    color: colors.ink,
    fontWeight: '800',
  },
  popcornRating: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  popcornRatingText: {
    marginLeft: 4,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  cardRatingLine: {
    width: '100%',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  feedSpoilerText: {
    color: colors.orange,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  quickTake: {
    maxWidth: '100%',
    color: colors.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'left',
  },
  feedPosterColumn: {
    width: 84,
    height: 112,
  },
  feedReviewMain: {
    flex: 1,
    minWidth: 0,
    gap: 7,
    paddingTop: 1,
  },
  feedSignalBlock: {
    flex: 1,
    width: '100%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 0,
    paddingRight: 56,
  },
  feedRatingLane: {
    width: 176,
    maxWidth: '100%',
    alignItems: 'flex-start',
    gap: 8,
  },
  takeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  bubble: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  commentBubble: {
    minHeight: 24,
    minWidth: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 7,
    backgroundColor: colors.surface,
  },
  commentBubbleText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionBlock: {
    gap: 10,
  },
  panel: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  panelYellow: {
    backgroundColor: colors.cream,
  },
  panelCyan: {
    backgroundColor: '#c8eef4',
  },
  panelPink: {
    backgroundColor: '#f0b5d1',
  },
  panelGreen: {
    backgroundColor: '#c7e9d2',
  },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  commentsTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  segmentedControl: {
    minHeight: 38,
    flexDirection: 'row',
    gap: 8,
  },
  segmentedButton: {
    flex: 1,
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  segmentedButtonActive: {
    backgroundColor: colors.pink,
  },
  segmentedButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentedButtonTextActive: {
    color: colors.surface,
  },
  commentSortButton: {
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.pink,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  commentSortText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  posterRow: {
    gap: 14,
    paddingRight: 12,
  },
  miniMovie: {
    width: 82,
    gap: 7,
  },
  miniMovieTitle: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  genreTile: {
    width: '47.5%',
    minHeight: 64,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    gap: 4,
    padding: 10,
  },
  genreTilePressed: {
    transform: [{ translateY: 1 }],
    backgroundColor: colors.yellow,
  },
  genreTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  genreResultTitleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  acceptButton: {
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    paddingHorizontal: 10,
  },
  acceptButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  declineButton: {
    minHeight: 34,
    minWidth: 42,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
  },
  declineButtonText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 7,
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: '#9bddea',
    overflow: 'hidden',
  },
  cardTagPill: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 9,
    fontSize: 10,
  },
  cardTagPillSolo: {
    maxWidth: '100%',
  },
  cardTagPillPair: {
    flexShrink: 1,
    maxWidth: '48%',
  },
  cardTagRow: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignContent: 'center',
    flexWrap: 'nowrap',
    rowGap: 5,
    columnGap: 6,
  },
  feedPosterSlot: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 104,
    padding: 7,
    paddingRight: 8,
  },
  feedReviewCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    bottom: 8,
    justifyContent: 'space-between',
  },
  stack: {
    gap: 12,
    paddingBottom: 22,
  },
  accountSettingsStack: {
    flexGrow: 1,
  },
  afterSearchFieldStack: {
    paddingTop: 12,
  },
  inlineLoader: {
    marginTop: 12,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.surface,
  },
  pill: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: colors.ink,
    fontWeight: '900',
    backgroundColor: colors.yellow,
    overflow: 'hidden',
  },
  pillButton: {
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
  },
  pillButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  notice: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.surface,
    gap: 6,
  },
  deleteAccountRow: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 12,
  },
  deleteAccountButton: {
    backgroundColor: '#ffe0cf',
  },
  devTokenText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  commentComposer: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.cream,
    gap: 8,
    padding: 8,
  },
  joinDiscussionButton: {
    minHeight: 62,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 13,
    shadowColor: colors.ink,
    shadowOpacity: 0.13,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  joinDiscussionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  joinDiscussionTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  joinDiscussionHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  joinDiscussionIcon: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 19,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCancelButton: {
    alignSelf: 'center',
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  composerCancelText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  reportComposer: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.cream,
    gap: 8,
    padding: 10,
  },
  activeReplyComposer: {
    marginTop: 10,
  },
  commentsInline: {
    gap: 12,
    paddingBottom: 8,
  },
  replyBanner: {
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.yellow,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  replyBannerText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  replyCancel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  commentInput: {
    minHeight: 86,
    borderWidth: 0,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.ink,
    padding: 12,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  commentInputWrap: {
    position: 'relative',
  },
  commentInputWithMic: {
    paddingRight: 56,
  },
  commentDictationButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  emptyComments: {
    minHeight: 88,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
  },
  commentList: {
    gap: 10,
  },
  commentThread: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 10,
  },
  commentReplyThread: {
    gap: 8,
    marginLeft: 18,
    paddingLeft: 9,
    borderLeftWidth: 2,
    borderLeftColor: '#d8c7aa',
  },
  commentCard: {
    gap: 10,
    position: 'relative',
  },
  commentDateTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  commentPrimaryActions: {
    minWidth: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUtilityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginLeft: 'auto',
  },
  commentEditBox: {
    gap: 8,
  },
  deletedCommentText: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  commentReplyCard: {
    paddingTop: 2,
  },
  commentCardBody: {
    flexDirection: 'row',
    gap: 10,
  },
  voteColumn: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    paddingVertical: 4,
  },
  voteButton: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 18,
    fontWeight: '900',
  },
  voteButtonActive: {
    color: colors.pink,
  },
  voteScore: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  commentCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  commentAuthorRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentMetaRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentDate: {
    flexShrink: 0,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  commentMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  commentReplyButton: {
    alignSelf: 'flex-start',
    minHeight: 28,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  commentReplyText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  label: {
    color: colors.ink,
    fontWeight: '900',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingPickerValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingButton: {
    flex: 1,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  popcornGlyph: {
    position: 'relative',
  },
  popcornGlyphOverlay: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
  },
  tagPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPanel: {
    gap: 8,
  },
  tagGroup: {
    gap: 8,
  },
  tagGroupTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  tagChip: {
    minHeight: 30,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
  },
  tagChipActive: {
    backgroundColor: colors.cyan,
  },
  tagChipDisabled: {
    opacity: 0.35,
  },
  tagChipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  tagChipTextActive: {
    color: colors.surface,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: 12,
  },
  centeredButton: {
    alignSelf: 'center',
  },
  dangerButton: {
    backgroundColor: '#ffd8bd',
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  textAreaWrap: {
    minHeight: 138,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.surface,
    position: 'relative',
  },
  textArea: {
    minHeight: 132,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: colors.ink,
    padding: 12,
    paddingRight: 56,
    textAlignVertical: 'top',
    fontWeight: '700',
  },
  dictationButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  dictationButtonActive: {
    backgroundColor: colors.pink,
  },
  spoilerToggle: {
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  spoilerToggleOn: {
    backgroundColor: '#ffd8bd',
  },
  spoilerText: {
    fontWeight: '900',
    color: colors.ink,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 13,
    backgroundColor: colors.surface,
    padding: 2,
  },
  toggleTrackOn: {
    backgroundColor: colors.orange,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
  },
  detailBlock: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.surface,
    gap: 12,
  },
  detailInline: {
    gap: 12,
    paddingBottom: 4,
  },
  detailHeaderCard: {
    gap: 12,
    position: 'relative',
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
  },
  detailMovieRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailHeaderCopy: {
    paddingRight: 92,
  },
  detailReviewHighlight: {
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    paddingTop: 2,
    gap: 8,
  },
  spoilerGate: {
    minHeight: 92,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
  },
  detailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailTagBlock: {
    flex: 1,
    minWidth: 0,
  },
  detailReviewStatus: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  detailSpoilerText: {
    color: colors.orange,
    fontWeight: '900',
  },
  detailSafeText: {
    color: colors.muted,
    fontWeight: '900',
  },
  detailMovieTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
  },
  detailTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
    fontWeight: '900',
  },
  detailReviewBody: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  bodyText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  profileBlock: {
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  profileCopy: {
    width: '100%',
    alignItems: 'center',
    gap: 9,
  },
  profileName: {
    color: colors.ink,
    fontSize: 26,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
  },
  profileHandle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  profileStat: {
    width: 74,
    minHeight: 70,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  profileStatValue: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
  },
  profileStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  profileInlineStats: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileInlineText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  profileTasteRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  emptyProfileState: {
    minHeight: 150,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
  },
  requestStrip: {
    gap: 8,
  },
  requestPill: {
    minHeight: 40,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestText: {
    flex: 1,
    color: colors.ink,
    fontWeight: '900',
  },
  friendRequestCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 10,
  },
  simplePersonRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendSearchName: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontWeight: '900',
  },
  friendAddAction: {
    marginLeft: 'auto',
  },
  iconSmallButton: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  friendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 22,
  },
  friendBubble: {
    width: '30%',
    minWidth: 84,
    alignItems: 'center',
    gap: 6,
  },
  friendAvatarRing: {
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.cyan,
    padding: 2,
  },
  friendSuggestion: {
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
    zIndex: 1,
  },
  friendHandle: {
    maxWidth: '100%',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  friendMiniActions: {
    flexDirection: 'row',
    gap: 8,
  },
  notificationRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 10,
  },
  notificationRowUnread: {
    backgroundColor: colors.cream,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
  },
  pendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pendingText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    borderTopWidth: 3,
    borderTopColor: colors.ink,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    borderColor: colors.pink,
    backgroundColor: colors.pink,
  },
  tabIconCreateActive: {
    borderColor: colors.ink,
    backgroundColor: colors.pink,
  },
  tabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  tabTextActive: {
    color: colors.pink,
  },
});
