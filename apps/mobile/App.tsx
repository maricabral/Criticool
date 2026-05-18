import { StatusBar } from 'expo-status-bar';
import {
  Ban,
  Bell,
  Flag,
  Home,
  LogOut,
  MessageCircle,
  Mic,
  Plus,
  Popcorn,
  Search,
  Send,
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
import { colors } from './src/theme';

type Tab = 'feed' | 'search' | 'create' | 'friends' | 'profile';
type ProfileUser = Pick<AuthUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
type AppRouteSnapshot = {
  tab: Tab;
  selectedReviewId: string | null;
  selectedProfileUser: ProfileUser | null;
  showNotifications: boolean;
};
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
const FEATURED_REVIEW_TAGS = [
  'comfort watch',
  'date night',
  'great with friends',
  'thought-provoking',
  'instant rewatch',
  'bring tissues',
  'slow burn',
  'best with snacks',
];
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
    tmdbId: 11846,
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
const GENRE_BROWSE = [
  { title: 'Comedy', subtitle: 'easy watches' },
  { title: 'Horror', subtitle: 'late night' },
  { title: 'Drama', subtitle: 'big feelings' },
  { title: 'Sci-fi', subtitle: 'weird worlds' },
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

export default function App() {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = await loadTokens();
      if (stored) {
        try {
          setUser(await api.me(stored));
          setTokens(stored);
        } catch {
          await saveTokens(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  const onAuth = async (response: { user: AuthUser; tokens: AuthTokens }) => {
    await saveTokens(response.tokens);
    setTokens(response.tokens);
    setUser(response.user);
  };

  const signOut = async () => {
    if (tokens) {
      try {
        await api.logout(tokens);
      } catch {
        // Clear local state even if server logout fails
      }
    }
    await saveTokens(null);
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
    return <AuthScreen onAuth={onAuth} />;
  }

  return <AppShell tokens={tokens} user={user} onSignOut={signOut} />;
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

function AuthScreen({
  onAuth,
}: {
  onAuth: (response: { user: AuthUser; tokens: AuthTokens }) => void;
}) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'reset'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isWelcome = mode === 'welcome';
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  const submit = async () => {
    if (isWelcome) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (isReset) {
        await api.resetPassword({ email, password });
        setPassword('');
        setMode('login');
        setNotice('Password reset. Log in with the new password.');
        return;
      }
      const response = isRegister
        ? await api.register({ email, password, username, displayName })
        : await api.login({ email, password });
      await onAuth(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const chooseMode = (nextMode: 'login' | 'register' | 'reset') => {
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
              <Text style={styles.tagline}>
                Movie takes from your friends.{'\n'}Cute, quick, and private first.
              </Text>
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
                {isRegister ? 'Create account' : isReset ? 'Reset password' : 'Log in'}
              </Text>
            </View>
            <View style={styles.form}>
              <Field
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                autoCapitalize="none"
              />
              <Field
                value={password}
                onChangeText={setPassword}
                placeholder={isReset ? 'New password' : 'Password'}
                secureTextEntry
              />
              {isRegister ? (
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
              {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={isRegister ? 'Create account' : isReset ? 'Reset password' : 'Log in'}
                onPress={submit}
                disabled={busy}
              />
              {!isRegister && !isReset ? (
                <Pressable style={styles.authLinkRow} onPress={() => chooseMode('reset')}>
                  <Text style={styles.authLinkText}>Reset password</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.authLinkRow}
                onPress={() => chooseMode(isRegister || isReset ? 'login' : 'register')}
              >
                <Text style={styles.authLinkMuted}>
                  {isRegister || isReset ? 'Already have an account? ' : 'Need an account? '}
                  <Text style={styles.authLinkText}>
                    {isRegister || isReset ? 'Log in' : 'Create account'}
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
  onSignOut,
}: {
  tokens: AuthTokens;
  user: AuthUser;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>('feed');
  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<ProfileUser | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [routeStack, setRouteStack] = useState<AppRouteSnapshot[]>([]);

  const currentRoute = () => ({
    tab,
    selectedReviewId,
    selectedProfileUser,
    showNotifications,
  });

  const restoreRoute = (route: AppRouteSnapshot) => {
    setShowNotifications(route.showNotifications);
    setSelectedReviewId(route.selectedReviewId);
    setSelectedProfileUser(route.selectedProfileUser);
    setTab(route.tab);
  };

  const popRoute = () => {
    const previousRoute = routeStack.at(-1);
    if (!previousRoute) {
      return false;
    }
    setRouteStack((current) => current.slice(0, -1));
    restoreRoute(previousRoute);
    return true;
  };

  const openCreate = (movie?: MovieSummary) => {
    if (movie) {
      setSelectedMovie(movie);
    }
    setRouteStack([]);
    setShowNotifications(false);
    setTab('create');
  };

  const openReview = (id: string) => {
    if (!showNotifications && tab === 'profile' && selectedReviewId === id) {
      return;
    }
    setRouteStack((current) => [...current, currentRoute()]);
    setShowNotifications(false);
    setSelectedReviewId(id);
    setTab('profile');
  };

  const openUserProfile = (profileUser: ProfileUser) => {
    if (profileUser.id === 'deleted') {
      return;
    }
    if (
      !showNotifications &&
      tab === 'profile' &&
      !selectedReviewId &&
      (selectedProfileUser?.id ?? user.id) === profileUser.id
    ) {
      return;
    }
    if (profileUser.id === user.id) {
      setShowNotifications(false);
      setSelectedReviewId(null);
      setSelectedProfileUser(null);
      setTab('profile');
      return;
    }
    setRouteStack((current) => [...current, currentRoute()]);
    setShowNotifications(false);
    setSelectedReviewId(null);
    setSelectedProfileUser(profileUser.id === user.id ? null : profileUser);
    setTab('profile');
  };

  const closeReview = () => {
    if (!popRoute()) {
      setSelectedReviewId(null);
    }
  };

  const closeProfile = () => {
    if (!popRoute()) {
      setSelectedProfileUser(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {showNotifications ? (
          <NotificationsScreen
            tokens={tokens}
            onBack={() => setShowNotifications(false)}
            onOpenReview={openReview}
            onOpenUser={openUserProfile}
          />
        ) : tab === 'feed' ? (
          <FeedScreen
            tokens={tokens}
            onCreate={() => openCreate()}
            onOpenNotifications={() => setShowNotifications(true)}
            onOpenReview={openReview}
            onOpenUser={openUserProfile}
          />
        ) : null}
        {tab === 'search' ? <SearchScreen tokens={tokens} onReviewMovie={openCreate} /> : null}
        {tab === 'create' ? (
          <CreateScreen
            tokens={tokens}
            selectedMovie={selectedMovie}
            onSelectMovie={setSelectedMovie}
            onPosted={(id) => {
              setSelectedReviewId(id);
              setTab('profile');
            }}
          />
        ) : null}
        {tab === 'friends' ? <FriendsScreen tokens={tokens} onOpenUser={openUserProfile} /> : null}
        {tab === 'profile' ? (
          selectedReviewId ? (
            <ReviewDetailScreen
              tokens={tokens}
              currentUserId={user.id}
              reviewId={selectedReviewId}
              onBack={closeReview}
              onOpenUser={openUserProfile}
            />
          ) : (
            <ProfileScreen
              tokens={tokens}
              currentUserId={user.id}
              user={selectedProfileUser ?? user}
              onBack={selectedProfileUser ? closeProfile : undefined}
              onOpenReview={openReview}
              onOpenUser={openUserProfile}
              onSignOut={onSignOut}
            />
          )
        ) : null}
      </View>
      <TabBar
        current={tab}
        onChange={(nextTab) => {
          setShowNotifications(false);
          setSelectedReviewId(null);
          setSelectedProfileUser(null);
          setRouteStack([]);
          setTab(nextTab);
        }}
      />
    </SafeAreaView>
  );
}

function FeedScreen({
  tokens,
  onCreate,
  onOpenNotifications,
  onOpenReview,
  onOpenUser,
}: {
  tokens: AuthTokens;
  onCreate: () => void;
  onOpenNotifications: () => void;
  onOpenReview: (id: string) => void;
  onOpenUser: (user: ProfileUser) => void;
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
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
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

  return (
    <View style={styles.screen}>
      <Header
        title="CritiCool"
        right={
          <View style={styles.headerActionRow}>
            <IconButton
              icon={<Bell size={20} color={colors.ink} />}
              accessibilityLabel="Open notifications"
              onPress={onOpenNotifications}
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
  onOpenUser: (user: ProfileUser) => void;
}) {
  const quickTake = item.quickTake?.trim();
  const visibleTags = item.tags?.slice(0, 3) ?? [];
  const reviewerName = item.author.displayName || item.author.username;
  const commentParticipants = item.commentParticipants ?? [];
  const ratingLabel = Number.isInteger(item.rating)
    ? item.rating.toFixed(0)
    : item.rating.toFixed(1);
  const reviewDate = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${reviewerName}'s review of ${item.movie.title}`}
      style={styles.reviewFrame}
      onPress={onPress}
    >
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewTitleBlock}>
          <Text numberOfLines={1} style={styles.movieTitle}>
            {item.movie.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${reviewerName}'s profile`}
          style={styles.feedReviewerNameRow}
          onPress={(event) => {
            event.stopPropagation();
            onOpenUser(item.author);
          }}
        >
          <Avatar label={reviewerName} mini />
          <View style={styles.reviewerCopy}>
            <Text numberOfLines={1} style={styles.reviewerName}>
              {reviewerName}
            </Text>
            <Text numberOfLines={1} style={styles.reviewerHandle}>
              {reviewDate}
            </Text>
            {item.containsSpoilers ? <Text style={styles.feedSpoilerText}>Spoilers</Text> : null}
          </View>
        </Pressable>
      </View>
      <View style={styles.reviewCardBody}>
        <Poster movie={item.movie} compact />
        <View style={styles.feedReviewCopy}>
          <View style={styles.feedSignalBlock}>
            <View style={styles.quickTakeBlock}>
              {quickTake ? (
                <Text numberOfLines={2} style={styles.quickTake}>
                  {quickTake}
                </Text>
              ) : (
                <Text numberOfLines={1} style={styles.quickTakeMuted}>
                  Rated this movie
                </Text>
              )}
            </View>
            <View style={styles.cardRatingLine}>
              <PopcornRating value={item.rating} large />
              <Text style={styles.ratingScaleText}>{ratingLabel}/5</Text>
            </View>
          </View>
          {visibleTags.length ? (
            <View style={styles.cardTagRow}>
              {visibleTags.map((tag) => (
                <Text key={tag} numberOfLines={1} style={[styles.tagPill, styles.cardTagPill]}>
                  {tag}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.reviewCardFooter}>
        <View style={styles.reviewCommentCluster}>
          <View style={styles.commentBubble} accessibilityLabel={`${item.commentCount} comments`}>
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
                  onPress={() => onOpenUser(participant)}
                />
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
  const buzzMovies = useBuzzMovies(tokens);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const response = await api.searchMovies(tokens, query);
          setResults(response.items);
        } catch (err) {
          Alert.alert('Search failed', err instanceof Error ? err.message : 'Try again');
        } finally {
          setBusy(false);
        }
      })();
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, tokens]);

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
        onChangeText={setQuery}
        placeholder="Find a movie"
        autoCapitalize="none"
        icon={<Search size={18} color={colors.muted} />}
      />
      {busy ? <ActivityIndicator color={colors.pink} style={styles.inlineLoader} /> : null}
      <ScrollView contentContainerStyle={[styles.stack, styles.afterSearchFieldStack]}>
        {query.trim().length < 2 ? (
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
                  <View key={genre.title} style={styles.genreTile}>
                    <Text style={styles.genreTitle}>{genre.title}</Text>
                    <Text style={styles.mutedText}>{genre.subtitle}</Text>
                  </View>
                ))}
              </View>
            </Panel>
          </>
        ) : (
          results.map((movie) => (
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
          ))
        )}
      </ScrollView>
    </View>
  );
}

function CreateScreen({
  tokens,
  selectedMovie,
  onSelectMovie,
  onPosted,
}: {
  tokens: AuthTokens;
  selectedMovie: MovieSummary | null;
  onSelectMovie: (movie: MovieSummary | null) => void;
  onPosted: (id: string) => void;
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
    onSelectMovie(null);
    setMovieResults([]);
    resetReviewFields();
  };

  const canPost = Boolean(selectedMovie?.id && rating > 0);
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

  const post = async () => {
    if (!selectedMovie?.id || rating <= 0) {
      return;
    }
    setBusy(true);
    try {
      const review = await api.createReview(tokens, {
        movieId: selectedMovie.id,
        rating,
        quickTake,
        body,
        tags: selectedTags,
        containsSpoilers,
      });
      resetReviewFields();
      onSelectMovie(null);
      onPosted(review.id);
      Alert.alert('Posted', 'Your review is live.');
    } catch (err) {
      Alert.alert('Could not post', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.stack}>
      <Header
        title="New Review"
        right={
          selectedMovie ? (
            <PrimaryButton label="Post" onPress={post} disabled={!canPost || busy} compact />
          ) : undefined
        }
      />
      {selectedMovie ? (
        <View style={styles.resultRow}>
          <Poster movie={selectedMovie} />
          <View style={styles.reviewCopy}>
            <Text style={styles.movieTitle}>{selectedMovie.title}</Text>
            <Text style={styles.mutedText}>
              {selectedMovie.releaseYear ?? 'TBA'} | selected movie
            </Text>
          </View>
          <Pressable style={styles.pillButton} onPress={clearSelectedMovie}>
            <Text style={styles.pillButtonText}>Change</Text>
          </Pressable>
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
          <Text style={styles.label}>Rating</Text>
          <View style={styles.ratingPicker}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = rating >= value;
              return (
                <Pressable
                  key={value}
                  style={styles.ratingButton}
                  onPress={() => setRating(value)}
                  hitSlop={8}
                >
                  <Popcorn
                    size={28}
                    color={active ? colors.pink : colors.ink}
                    strokeWidth={active ? 3.4 : 2.6}
                  />
                </Pressable>
              );
            })}
          </View>
          <Field value={quickTake} onChangeText={setQuickTake} placeholder="Quick take" />
          <Panel tint="cyan">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pick up to 5 tags</Text>
              <Text style={styles.mutedText}>optional</Text>
            </View>
            <View style={styles.tagPicker}>
              {FEATURED_REVIEW_TAGS.map((tag) => {
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
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setShowAllTags((current) => !current)}
            >
              <Text style={styles.secondaryButtonText}>
                {showAllTags ? 'Hide more tags' : 'Browse more tags'}
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
          <PrimaryButton label="Post" onPress={post} disabled={!canPost || busy} />
        </>
      ) : null}
    </ScrollView>
  );
}

function ReviewDetailScreen({
  tokens,
  currentUserId,
  reviewId,
  onBack,
  onOpenUser,
}: {
  tokens: AuthTokens;
  currentUserId: string;
  reviewId: string;
  onBack: () => void;
  onOpenUser: (user: ProfileUser) => void;
}) {
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<ReviewComment | null>(null);
  const [commentSort, setCommentSort] = useState<'best' | 'new'>('best');
  const [postingComment, setPostingComment] = useState(false);
  const [transcribingComment, setTranscribingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [mutatingCommentId, setMutatingCommentId] = useState<string | null>(null);
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
    if (!replyTo) {
      return;
    }

    const focusTimer = setTimeout(() => commentInputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimer);
  }, [replyTo]);

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

  const reportReview = async () => {
    if (!review) {
      return;
    }
    try {
      await api.report(tokens, {
        targetType: 'review',
        targetId: review.id,
        reason: 'review report',
      });
      Alert.alert('Report sent', 'Thanks. This review was reported.');
    } catch (err) {
      Alert.alert('Could not report review', err instanceof Error ? err.message : 'Try again');
    }
  };

  const reportComment = async (comment: ReviewComment) => {
    try {
      await api.report(tokens, {
        targetType: 'comment',
        targetId: comment.id,
        reason: 'comment report',
      });
      Alert.alert('Report sent', 'Thanks. This comment was reported.');
    } catch (err) {
      Alert.alert('Could not report comment', err instanceof Error ? err.message : 'Try again');
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

  const composer = (
    <CommentComposer
      body={commentBody}
      inputRef={commentInputRef}
      mode={replyTo ? 'reply' : 'comment'}
      posting={postingComment}
      replyTo={replyTo}
      transcribing={transcribingComment}
      onCancelReply={() => setReplyTo(null)}
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.stack}>
      <Header title="Review" right={<PrimaryButton label="Back" onPress={onBack} compact />} />
      <View style={styles.detailHeaderCard}>
        <Text
          style={[
            styles.detailReviewStatus,
            review.containsSpoilers ? styles.detailSpoilerText : styles.detailSafeText,
          ]}
        >
          {review.containsSpoilers ? 'Spoilers' : 'Spoiler-free'}
        </Text>
        <Poster movie={review.movie} compact />
        <View style={[styles.reviewCopy, styles.detailHeaderCopy]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${review.author.displayName || review.author.username}'s profile`}
            style={styles.authorRow}
            onPress={() => onOpenUser(review.author)}
          >
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
      <View style={styles.detailInline}>
        {review.quickTake ? <Text style={styles.detailTitle}>{review.quickTake}</Text> : null}
        {review.tags?.length ? <TagPills tags={review.tags.slice(0, 2)} /> : null}
        {review.author.id !== currentUserId ? (
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={reportReview}>
              <Flag size={14} color={colors.ink} />
              <Text style={styles.secondaryButtonText}>Report</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={blockReviewAuthor}>
              <Ban size={14} color={colors.ink} />
              <Text style={styles.secondaryButtonText}>Block</Text>
            </Pressable>
          </View>
        ) : null}
        {showBody ? (
          <>
            {review.containsSpoilers ? (
              <Pressable style={styles.secondaryButton} onPress={() => setRevealed(false)}>
                <Text style={styles.secondaryButtonText}>Hide spoilers</Text>
              </Pressable>
            ) : null}
            <Text style={styles.bodyText}>{review.body || 'No full review.'}</Text>
          </>
        ) : (
          <PrimaryButton label="Reveal spoilers" onPress={() => setRevealed(true)} />
        )}
      </View>
      <View style={styles.commentsInline}>
        <View style={styles.sectionHeader}>
          <Text style={styles.emptyTitle}>Comments</Text>
          <Text style={styles.bubble}>{review.commentCount} chats</Text>
        </View>
        <View style={styles.segmentedControl}>
          {(['best', 'new'] as const).map((sort) => (
            <Pressable
              key={sort}
              style={[
                styles.segmentedButton,
                commentSort === sort && styles.segmentedButtonActive,
              ]}
              onPress={() => setCommentSort(sort)}
            >
              <Text
                style={[
                  styles.segmentedButtonText,
                  commentSort === sort && styles.segmentedButtonTextActive,
                ]}
              >
                {sort === 'best' ? 'Best' : 'New'}
              </Text>
            </Pressable>
          ))}
        </View>
        {replyTo ? null : composer}
        {review.comments.length ? (
          <View style={styles.commentList}>
            {review.comments.map((comment) => (
              <CommentNode
                key={comment.id}
                activeReplyId={replyTo?.id ?? null}
                comment={comment}
                replyComposer={composer}
                currentUserId={currentUserId}
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
                onReport={reportComment}
                onOpenUser={onOpenUser}
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
  onOpenUser,
  votingCommentId,
}: {
  activeReplyId: string | null;
  comment: ReviewComment;
  replyComposer: React.ReactNode;
  currentUserId: string;
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
  onOpenUser: (user: ProfileUser) => void;
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

  return (
    <View style={isRootComment ? styles.commentThread : styles.commentReplyThread}>
      <View style={[styles.commentCard, comment.depth > 0 && styles.commentReplyCard]}>
        <Text style={styles.commentDateTopRight}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </Text>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${comment.author.displayName || comment.author.username}'s profile`}
              disabled={isDeleted}
              style={styles.commentAuthorRow}
              onPress={() => onOpenUser(comment.author)}
            >
              <Avatar label={comment.author.displayName || comment.author.username} mini />
              <View style={styles.reviewCopy}>
                <Text style={styles.author}>@{comment.author.username}</Text>
              </View>
            </Pressable>
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
            ) : (
              <Text style={[styles.bodyText, isDeleted && styles.deletedCommentText]}>
                {comment.body}
              </Text>
            )}
            {!isEditing ? (
              <View style={styles.commentActionRow}>
                {canReply ? (
                  <Pressable style={styles.commentReplyButton} onPress={() => onReply(comment)}>
                    <Send size={14} color={colors.ink} />
                    <Text style={styles.commentReplyText}>Reply</Text>
                  </Pressable>
                ) : null}
                {canEdit ? (
                  <>
                    <Pressable
                      style={styles.commentReplyButton}
                      onPress={() => onStartEdit(comment)}
                    >
                      <Text style={styles.commentReplyText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      disabled={isMutating}
                      style={styles.commentReplyButton}
                      onPress={() => onDelete(comment)}
                    >
                      <Trash2 size={14} color={colors.ink} />
                      <Text style={styles.commentReplyText}>Delete</Text>
                    </Pressable>
                  </>
                ) : !isDeleted ? (
                  <Pressable style={styles.commentReplyButton} onPress={() => onReport(comment)}>
                    <Flag size={14} color={colors.ink} />
                    <Text style={styles.commentReplyText}>Report</Text>
                  </Pressable>
                ) : null}
              </View>
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
          onOpenUser={onOpenUser}
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
    </View>
  );
}

function NotificationsScreen({
  tokens,
  onBack,
  onOpenReview,
  onOpenUser,
}: {
  tokens: AuthTokens;
  onBack: () => void;
  onOpenReview: (id: string) => void;
  onOpenUser: (user: ProfileUser) => void;
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
    } catch (err) {
      Alert.alert('Could not load alerts', err instanceof Error ? err.message : 'Try again');
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (notification: NotificationItem) => {
    try {
      await api.markNotificationRead(tokens, notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - (notification.readAt ? 0 : 1)));
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
            <PrimaryButton label="Back" onPress={onBack} compact />
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.stack}>
        {items.length ? (
          items.map((notification) => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationRow,
                !notification.readAt && styles.notificationRowUnread,
              ]}
              onPress={() => void markRead(notification)}
            >
              <Avatar
                label={
                  notification.actor?.displayName ||
                  notification.actor?.username ||
                  notification.type
                }
                mini
                onPress={
                  notification.actor ? () => onOpenUser(notification.actor as ProfileUser) : undefined
                }
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
  onOpenUser: (user: ProfileUser) => void;
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

  const cancelRequest = async (request: FriendRequest) => {
    try {
      await api.cancelFriendRequest(tokens, request.id);
      setOutgoing((current) => current.filter((item) => item.id !== request.id));
      setUsers((current) =>
        current.map((user) =>
          user.id === request.addressee.id ? { ...user, friendshipStatus: null } : user,
        ),
      );
    } catch (err) {
      Alert.alert('Could not remove request', err instanceof Error ? err.message : 'Try again');
    }
  };

  const reportUser = async (id: string) => {
    try {
      await api.report(tokens, { targetType: 'user', targetId: id, reason: 'user report' });
      Alert.alert('Report sent', 'Thanks. This user was reported.');
    } catch (err) {
      Alert.alert('Could not report user', err instanceof Error ? err.message : 'Try again');
    }
  };

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
              const outgoingRequest = outgoing.find((request) => request.addressee.id === item.id);
              const canCancel = item.friendshipStatus === 'pending' ? outgoingRequest : null;
              return (
                <View key={item.id} style={styles.simplePersonRow}>
                  <Avatar
                    label={item.displayName}
                    onPress={
                      item.friendshipStatus === 'accepted' ? () => onOpenUser(item) : undefined
                    }
                  />
                  <Text numberOfLines={1} style={styles.friendSearchName}>
                    @{item.username}
                  </Text>
                  <Pressable
                    disabled={item.friendshipStatus !== null && !canCancel}
                    onPress={() => (canCancel ? void cancelRequest(canCancel) : void add(item.id))}
                    style={styles.friendAddAction}
                  >
                    <Text style={styles.pill}>
                      {canCancel ? 'Cancel' : item.friendshipStatus ?? 'Add'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.iconSmallButton} onPress={() => void reportUser(item.id)}>
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
                    <View key={friend.id} style={styles.friendBubble}>
                      <Avatar
                        label={friend.displayName || friend.username}
                        large
                        onPress={() => onOpenUser(friend)}
                      />
                      <Text numberOfLines={1} style={styles.friendHandle}>
                        @{friend.username}
                      </Text>
                      <View style={styles.friendMiniActions}>
                        <Pressable onPress={() => void reportUser(friend.id)}>
                          <Text style={styles.commentReplyText}>Report</Text>
                        </Pressable>
                        <Pressable onPress={() => void blockUser(friend.id)}>
                          <Text style={styles.commentReplyText}>Block</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>Search a username to add friends.</Text>
              )}
            </Panel>
            {outgoing.length ? (
              <Panel tint="pink">
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending</Text>
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
                      <Pressable onPress={() => void cancelRequest(request)}>
                        <Text style={styles.commentReplyText}>Cancel</Text>
                      </Pressable>
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
  currentUserId,
  user,
  onBack,
  onOpenReview,
  onOpenUser,
  onSignOut,
}: {
  tokens: AuthTokens;
  currentUserId: string;
  user: ProfileUser;
  onBack?: () => void;
  onOpenReview: (id: string) => void;
  onOpenUser: (user: ProfileUser) => void;
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
  const isCurrentUser = user.id === currentUserId;

  const loadReviews = useCallback(
    async (nextCursor?: string | null) => {
      setReviewLoadError(null);
      const response = isCurrentUser
        ? await api.myReviews(tokens, nextCursor)
        : await api.userReviews(tokens, user.id, nextCursor);
      setReviews((current) => (nextCursor ? [...current, ...response.items] : response.items));
      setCursor(response.nextCursor);
    },
    [isCurrentUser, tokens, user.id],
  );

  useEffect(() => {
    setReviewQuery('');
  }, [user.id]);

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
    if (!isCurrentUser) {
      setFriendCount(null);
      return;
    }
    void api
      .friends(tokens)
      .then((rows) => setFriendCount(rows.length))
      .catch(() => setFriendCount(null));
  }, [isCurrentUser, tokens]);

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
    return topTags.length ? topTags : ['sci-fi', 'thriller', 'drama'];
  }, [reviews]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.stack}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Header
        title={`@${user.username}`}
        right={
          isCurrentUser ? (
            <IconButton
              icon={<LogOut size={20} color={colors.ink} />}
              accessibilityLabel="Log out"
              onPress={onSignOut}
            />
          ) : (
            <PrimaryButton label="Back" onPress={onBack ?? (() => undefined)} compact />
          )
        }
      />
      <View style={styles.profileBlock}>
        <Avatar label={user.displayName} large />
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>
            {user.displayName}
          </Text>
          <View style={styles.profileInlineStats}>
            <Text style={styles.profileInlineText}>
              {loading || reviewLoadError ? '-' : reviews.length} reviews
            </Text>
            {isCurrentUser ? (
              <>
                <Text style={styles.profileInlineText}>|</Text>
                <Text style={styles.profileInlineText}>
                  {friendCount === null ? '-' : friendCount} friends
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.profileInlineText}>|</Text>
                <Text style={styles.profileInlineText}>friend</Text>
              </>
            )}
          </View>
          <View style={styles.profileTasteRow}>
            {tasteTags.map((tag) => (
              <Text key={tag} numberOfLines={1} style={styles.tagPill}>
                {tag}
              </Text>
            ))}
          </View>
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
            placeholder={isCurrentUser ? 'Search my reviews' : `Search @${user.username} reviews`}
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
              {isCurrentUser
                ? 'Your movie takes will appear here after you post.'
                : `@${user.username} has not posted reviews yet.`}
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

function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
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

function IconButton({
  icon,
  accessibilityLabel,
  onPress,
}: {
  icon: React.ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.iconButton}
      onPress={onPress}
    >
      {icon}
    </Pressable>
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
          <Pressable
            key={tab.id}
            style={[styles.tab, tab.id === 'create' && styles.tabCreate]}
            onPress={() => onChange(tab.id)}
          >
            <View
              style={[
                styles.tabIcon,
                tab.id === 'create' && styles.tabIconCreate,
                active && styles.tabIconActive,
                active && tab.id === 'create' && styles.tabIconCreateActive,
              ]}
            >
              <Icon
                size={tab.id === 'create' ? 18 : 16}
                color={active || tab.id === 'create' ? colors.surface : colors.muted}
              />
            </View>
            <Text
              style={[
                styles.tabText,
                tab.id === 'create' && styles.tabTextCreate,
                active && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Poster({ movie, compact }: { movie: MovieSummary; compact?: boolean }) {
  if (movie.posterUrl) {
    return (
      <Image
        source={{ uri: movie.posterUrl }}
        style={[styles.poster, compact && styles.posterCompact]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.poster, compact && styles.posterCompact, styles.posterFallback]}>
      <Popcorn size={24} color={colors.ink} />
    </View>
  );
}

function Avatar({
  label,
  large,
  mini,
  micro,
  onPress,
}: {
  label: string;
  large?: boolean;
  mini?: boolean;
  micro?: boolean;
  onPress?: () => void;
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

  const avatarStyle = [
    styles.avatar,
    toneStyles[toneIndex],
    large && styles.avatarLarge,
    mini && styles.avatarMini,
    micro && styles.avatarMicro,
  ];
  const avatarText = (
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
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${label}'s profile`}
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          onPress();
        }}
        style={({ pressed }) => [...avatarStyle, pressed && styles.avatarPressed]}
      >
        {avatarText}
      </Pressable>
    );
  }

  return (
    <View style={avatarStyle}>
      {avatarText}
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

function PopcornRating({ value, large }: { value: number; large?: boolean }) {
  const count = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <View style={styles.popcornRating} accessibilityLabel={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Popcorn
          key={index}
          size={large ? 21 : 15}
          color={index < count ? colors.ink : colors.muted}
          fill={index < count ? colors.yellow : 'transparent'}
          opacity={index < count ? 1 : 0.36}
          strokeWidth={2.8}
        />
      ))}
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
  noticeText: {
    color: colors.green,
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
    paddingHorizontal: 2,
  },
  headerTitle: {
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
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 178,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.cream,
    padding: 10,
    gap: 8,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  reviewCardHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewCardBody: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  reviewTitleBlock: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  reviewerHandle: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  reviewCommentCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
    flexShrink: 0,
  },
  feedReviewerNameRow: {
    width: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  commentParticipantRow: {
    minHeight: 22,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  avatarPressed: {
    opacity: 0.72,
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
    width: 72,
    height: 100,
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
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardRatingLine: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  quickTake: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'left',
  },
  quickTakeMuted: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  ratingScaleText: {
    color: colors.ink,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  feedSignalBlock: {
    flex: 1,
    minHeight: 58,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickTakeBlock: {
    width: '100%',
    gap: 3,
  },
  feedSpoilerText: {
    color: colors.orange,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
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
    minHeight: 32,
    minWidth: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 9,
    backgroundColor: colors.yellow,
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
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  genreTitle: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
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
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 3,
    paddingHorizontal: 7,
    fontSize: 10,
  },
  cardTagRow: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 5,
  },
  feedReviewCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
    gap: 6,
  },
  reviewCardFooter: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  stack: {
    gap: 12,
    paddingBottom: 22,
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
  commentComposer: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 22,
    backgroundColor: colors.cream,
    gap: 8,
    padding: 8,
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
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 22,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 10,
  },
  commentReplyThread: {
    gap: 8,
    marginLeft: 18,
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
    flexWrap: 'wrap',
    gap: 6,
  },
  commentEditBox: {
    gap: 8,
  },
  deletedCommentText: {
    color: colors.muted,
    fontStyle: 'italic',
  },
  commentReplyCard: {
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    paddingTop: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 82,
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
  ratingPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
  },
  detailHeaderCopy: {
    paddingRight: 92,
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
  tabCreate: {
    marginTop: -8,
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
  tabIconCreate: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderColor: colors.ink,
    backgroundColor: colors.pink,
    shadowColor: colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 3 },
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
  tabTextCreate: {
    color: colors.ink,
  },
  tabTextActive: {
    color: colors.pink,
  },
});
