import { StatusBar } from 'expo-status-bar';
import {
  Home,
  LogOut,
  MessageCircle,
  Mic,
  Plus,
  Popcorn,
  Search,
  Send,
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
  FriendRequest,
  FriendSummary,
  loadTokens,
  ReviewComment,
  ReviewDetail,
  saveTokens,
} from './src/api';
import { colors } from './src/theme';

type Tab = 'feed' | 'search' | 'create' | 'friends' | 'profile';
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
    tags: ['great performances', 'sharp writing', 'beautifully shot', 'strong soundtrack', 'style over story'],
  },
  {
    title: 'Audience',
    tags: ['for film nerds', 'crowd pleaser', 'not for everyone', 'good starter pick', 'best with snacks'],
  },
  {
    title: 'Content Notes',
    tags: ['bring tissues', 'intense scenes', 'check the runtime', 'volume down', 'kids may hate it'],
  },
  {
    title: 'Wildcards',
    tags: ['therapy invoice', 'brain off bliss', 'chaos cinema', 'trash treasure', 'secretly perfect'],
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

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) {
    return null;
  }

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) {
    return 'now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
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
    await saveTokens(null);
    setTokens(null);
    setUser(null);
  };

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
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWelcome = mode === 'welcome';
  const isRegister = mode === 'register';

  const submit = async () => {
    if (isWelcome) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
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

  const chooseMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError(null);
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
              <Text style={styles.authTitle}>{isRegister ? 'Create account' : 'Log in'}</Text>
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
                placeholder="Password"
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
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PrimaryButton
                label={isRegister ? 'Create account' : 'Log in'}
                onPress={submit}
                disabled={busy}
              />
              <Pressable
                style={styles.authLinkRow}
                onPress={() => chooseMode(isRegister ? 'login' : 'register')}
              >
                <Text style={styles.authLinkMuted}>
                  {isRegister ? 'Already have an account? ' : 'Need an account? '}
                  <Text style={styles.authLinkText}>
                    {isRegister ? 'Log in' : 'Create account'}
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

  const openCreate = (movie?: MovieSummary) => {
    if (movie) {
      setSelectedMovie(movie);
    }
    setTab('create');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {tab === 'feed' ? (
          <FeedScreen
            tokens={tokens}
            onCreate={() => openCreate()}
            onOpenReview={(id) => {
              setSelectedReviewId(id);
              setTab('profile');
            }}
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
        {tab === 'friends' ? <FriendsScreen tokens={tokens} /> : null}
        {tab === 'profile' ? (
          selectedReviewId ? (
            <ReviewDetailScreen
              tokens={tokens}
              reviewId={selectedReviewId}
              onBack={() => setSelectedReviewId(null)}
            />
          ) : (
            <ProfileScreen
              tokens={tokens}
              user={user}
              onOpenReview={setSelectedReviewId}
              onSignOut={onSignOut}
            />
          )
        ) : null}
      </View>
      <TabBar current={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

function FeedScreen({
  tokens,
  onCreate,
  onOpenReview,
}: {
  tokens: AuthTokens;
  onCreate: () => void;
  onOpenReview: (id: string) => void;
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
        right={<IconButton icon={<Plus size={20} color={colors.ink} />} onPress={onCreate} />}
      />
      {items.length ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.reviewId}
          contentContainerStyle={styles.feedList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <ReviewCard item={item} onPress={() => onOpenReview(item.reviewId)} />
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
      <View style={styles.ticketRail}>
        <View style={styles.ticketFrame}>
          <Popcorn size={34} color={colors.ink} />
          <Text style={styles.emptyTitle}>No friend reviews yet.</Text>
          <Text style={styles.mutedText}>Find friends or post your first movie take.</Text>
          <PrimaryButton label="Review a movie" onPress={onCreate} />
        </View>
      </View>
    </View>
  );
}

function ReviewCard({ item, onPress }: { item: FeedItem; onPress: () => void }) {
  const quickTake = item.containsSpoilers ? null : item.quickTake?.trim();
  const visibleTags = item.tags?.slice(0, 2) ?? [];
  const timeAgo = formatRelativeTime(item.createdAt);
  const reviewerName = item.author.displayName || item.author.username;
  const commentParticipants = item.commentParticipants ?? [];

  return (
    <Pressable style={styles.reviewFrame} onPress={onPress}>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewerRow}>
          <Avatar label={reviewerName} mini />
          <View style={styles.reviewerCopy}>
            <Text numberOfLines={1} style={styles.reviewerName}>
              {reviewerName}
            </Text>
            <Text numberOfLines={1} style={styles.reviewerHandle}>
              @{item.author.username}
              {timeAgo ? ` - ${timeAgo}` : ''}
            </Text>
          </View>
        </View>
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
        <Poster movie={item.movie} compact />
        <View style={styles.reviewCopy}>
          <Text numberOfLines={1} style={styles.movieTitle}>
            {item.movie.title}
          </Text>
          <View style={styles.cardRatingLine}>
            <PopcornRating value={item.rating} />
          </View>
          {quickTake ? (
            <Text numberOfLines={2} style={styles.quickTake}>
              {quickTake}
            </Text>
          ) : null}
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
      <ScrollView contentContainerStyle={styles.stack}>
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
            <Text style={styles.mutedText}>{selectedMovie.releaseYear ?? 'TBA'}</Text>
          </View>
          <Pressable style={styles.pillButton} onPress={clearSelectedMovie}>
            <Text style={styles.pillButtonText}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <>
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
          <View style={styles.tagPanel}>
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
                            <Text
                              style={[styles.tagChipText, active && styles.tagChipTextActive]}
                            >
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
          </View>
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
  reviewId,
  onBack,
}: {
  tokens: AuthTokens;
  reviewId: string;
  onBack: () => void;
}) {
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<ReviewComment | null>(null);
  const [postingComment, setPostingComment] = useState(false);
  const [transcribingComment, setTranscribingComment] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const loadReview = useCallback(async () => {
    try {
      setReview(await api.review(tokens, reviewId));
    } catch {
      onBack();
    }
  }, [tokens, reviewId, onBack]);

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
    if (!review || votingCommentId || comment.viewerVote === value) {
      return;
    }

    setVotingCommentId(comment.id);
    try {
      await api.voteComment(tokens, review.id, comment.id, value);
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
        <Poster movie={review.movie} compact />
        <View style={styles.reviewCopy}>
          <View style={styles.authorRow}>
            <Avatar label={review.author.displayName || review.author.username} mini />
            <Text style={styles.author}>@{review.author.username}</Text>
          </View>
          <Text numberOfLines={2} style={styles.detailMovieTitle}>
            {review.movie.title}
          </Text>
          <View style={styles.takeRow}>
            <Rating value={review.rating} size={22} />
            {review.containsSpoilers ? (
              <Text style={styles.detailSpoilerText}>Spoilers</Text>
            ) : (
              <Text style={styles.detailSafeText}>Spoiler-free</Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.detailInline}>
        {review.quickTake ? <Text style={styles.detailTitle}>{review.quickTake}</Text> : null}
        {review.tags?.length ? <TagPills tags={review.tags.slice(0, 2)} /> : null}
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
        {replyTo ? null : composer}
        {review.comments.length ? (
          <View style={styles.commentList}>
            {review.comments.map((comment) => (
              <CommentNode
                key={comment.id}
                activeReplyId={replyTo?.id ?? null}
                comment={comment}
                replyComposer={composer}
                onReply={startReply}
                onVote={voteComment}
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
  onReply,
  onVote,
  votingCommentId,
}: {
  activeReplyId: string | null;
  comment: ReviewComment;
  replyComposer: React.ReactNode;
  onReply: (comment: ReviewComment) => void;
  onVote: (comment: ReviewComment, value: -1 | 1) => void;
  votingCommentId: string | null;
}) {
  const voteDisabled = votingCommentId === comment.id;
  const canReply = comment.depth < 3;
  const showReplyComposer = activeReplyId === comment.id;
  const isRootComment = comment.depth === 0;

  return (
    <View style={isRootComment ? styles.commentThread : styles.commentReplyThread}>
      <View style={[styles.commentCard, comment.depth > 0 && styles.commentReplyCard]}>
        <View style={styles.commentCardBody}>
          <View style={styles.voteColumn}>
            <Pressable disabled={voteDisabled} onPress={() => onVote(comment, 1)} hitSlop={8}>
              <Text
                style={[styles.voteButton, comment.viewerVote === 1 && styles.voteButtonActive]}
              >
                ^
              </Text>
            </Pressable>
            <Text style={styles.voteScore}>{comment.score}</Text>
            <Pressable disabled={voteDisabled} onPress={() => onVote(comment, -1)} hitSlop={8}>
              <Text
                style={[styles.voteButton, comment.viewerVote === -1 && styles.voteButtonActive]}
              >
                v
              </Text>
            </Pressable>
          </View>
          <View style={styles.commentCopy}>
            <View style={styles.commentAuthorRow}>
              <Avatar label={comment.author.displayName || comment.author.username} mini />
              <View style={styles.reviewCopy}>
                <Text style={styles.author}>@{comment.author.username}</Text>
                <Text style={styles.commentMeta}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={styles.bodyText}>{comment.body}</Text>
            {canReply ? (
              <Pressable style={styles.commentReplyButton} onPress={() => onReply(comment)}>
                <Send size={14} color={colors.ink} />
                <Text style={styles.commentReplyText}>Reply</Text>
              </Pressable>
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
          onReply={onReply}
          onVote={onVote}
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

function FriendsScreen({ tokens }: { tokens: AuthTokens }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<
    Array<{ id: string; username: string; displayName: string; friendshipStatus: string | null }>
  >([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadFriendState = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const [incomingRows, outgoingRows, friendRows] = await Promise.all([
        api.incomingFriendRequests(tokens),
        api.outgoingFriendRequests(tokens),
        api.friends(tokens),
      ]);
      setIncoming(incomingRows);
      setOutgoing(outgoingRows);
      setFriends(friendRows);
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
      <ScrollView contentContainerStyle={styles.stack}>
        {incoming.length ? (
          <View style={styles.requestStrip}>
            {incoming.map((request) => (
              <View key={request.id} style={styles.requestPill}>
                <Text style={styles.requestText}>@{request.requester.username}</Text>
                <Pressable style={styles.acceptButton} onPress={() => void accept(request.id)}>
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.declineButton} onPress={() => void decline(request.id)}>
                  <Text style={styles.declineButtonText}>No</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {query.trim().length >= 2 ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Find people</Text>
            {users.map((item) => (
              <View key={item.id} style={styles.simplePersonRow}>
                <Avatar label={item.displayName} />
                <Text numberOfLines={1} style={styles.friendSearchName}>
                  @{item.username}
                </Text>
                <Pressable
                  disabled={item.friendshipStatus !== null}
                  onPress={() => void add(item.id)}
                  style={styles.friendAddAction}
                >
                  <Text style={styles.pill}>{item.friendshipStatus ?? 'Add'}</Text>
                </Pressable>
              </View>
            ))}
            {!users.length ? <Text style={styles.mutedText}>No matches yet.</Text> : null}
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friends</Text>
              <Text style={styles.bubble}>{friends.length}</Text>
            </View>
            {friends.length ? (
              <View style={styles.friendGrid}>
                {friends.map((friend) => (
                  <View key={friend.id} style={styles.friendBubble}>
                    <View style={styles.friendAvatarRing}>
                      <Avatar label={friend.displayName || friend.username} large />
                    </View>
                    <Text numberOfLines={1} style={styles.friendHandle}>
                      @{friend.username}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.mutedText}>Search a username to add friends.</Text>
            )}
            {outgoing.length ? (
              <View style={styles.pendingList}>
                {outgoing.map((request) => (
                  <Text key={request.id} style={styles.pendingText}>
                    pending @{request.addressee.username}
                  </Text>
                ))}
              </View>
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
  onOpenReview,
  onSignOut,
}: {
  tokens: AuthTokens;
  user: AuthUser;
  onOpenReview: (id: string) => void;
  onSignOut: () => void;
}) {
  const [reviews, setReviews] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);
  const [reviewQuery, setReviewQuery] = useState('');

  const loadReviews = useCallback(
    async (nextCursor?: string | null) => {
      setReviewLoadError(null);
      const response = await api.myReviews(tokens, nextCursor);
      setReviews((current) => (nextCursor ? [...current, ...response.items] : response.items));
      setCursor(response.nextCursor);
    },
    [tokens],
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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.stack}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Header
        title={`@${user.username}`}
        right={<IconButton icon={<LogOut size={20} color={colors.ink} />} onPress={onSignOut} />}
      />
      <View style={styles.profileBlock}>
        <Avatar label={user.displayName} large />
        <View style={styles.profileCopy}>
          <Text numberOfLines={1} style={styles.profileName}>
            {user.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.profileHandle}>
            @{user.username}
          </Text>
        </View>
        <View style={styles.profileStat}>
          {loading ? (
            <ActivityIndicator color={colors.pink} />
          ) : (
            <Text style={styles.profileStatValue}>{reviewLoadError ? '-' : reviews.length}</Text>
          )}
          <Text style={styles.profileStatLabel}>reviews</Text>
        </View>
      </View>
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My reviews</Text>
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
            placeholder="Search my reviews"
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
            <Text style={styles.mutedText}>Your movie takes will appear here after you post.</Text>
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

function IconButton({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable style={styles.iconButton} onPress={onPress}>
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
}: {
  label: string;
  large?: boolean;
  mini?: boolean;
  micro?: boolean;
}) {
  return (
    <View
      style={[
        styles.avatar,
        large && styles.avatarLarge,
        mini && styles.avatarMini,
        micro && styles.avatarMicro,
      ]}
    >
      <Text
        style={[
          styles.avatarText,
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

function PopcornRating({ value }: { value: number }) {
  const count = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <View style={styles.popcornRating} accessibilityLabel={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: count }).map((_, index) => (
        <Popcorn key={index} size={15} color={colors.ink} strokeWidth={2.7} />
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
  reel: {
    alignSelf: 'center',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 6,
    borderColor: colors.ink,
    backgroundColor: '#2a252b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 7, height: 8 },
    transform: [{ rotate: '-4deg' }],
  },
  tapeTail: {
    position: 'absolute',
    right: -88,
    bottom: -24,
    width: 104,
    height: 162,
    borderWidth: 6,
    borderLeftWidth: 0,
    borderColor: colors.ink,
    borderTopRightRadius: 90,
    borderBottomRightRadius: 90,
    backgroundColor: colors.cream,
    transform: [{ rotate: '24deg' }],
    justifyContent: 'space-around',
    paddingVertical: 16,
    zIndex: 0,
  },
  tapeStripe: {
    height: 6,
    backgroundColor: colors.ink,
  },
  reelHole: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff8ea',
    top: 28,
    zIndex: 1,
  },
  reelHoleTwo: {
    top: 104,
    left: 34,
  },
  reelHoleThree: {
    top: 104,
    right: 34,
  },
  reelGlasses: {
    position: 'absolute',
    top: 54,
    left: -12,
    right: -12,
    height: 54,
    borderWidth: 5,
    borderColor: colors.ink,
    borderRadius: 20,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 2,
  },
  reelLens: {
    width: 54,
    height: 38,
    borderRadius: 18,
    backgroundColor: '#fff8ea',
    borderWidth: 5,
    borderColor: '#fff8ea',
  },
  reelGlare: {
    position: 'absolute',
    top: 13,
    width: 36,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '-45deg' }],
  },
  reelGlareLeft: {
    left: 30,
  },
  reelGlareRight: {
    right: 30,
  },
  reelMouth: {
    position: 'absolute',
    bottom: 46,
    width: 72,
    height: 30,
    borderBottomWidth: 7,
    borderColor: colors.ink,
    borderRadius: 38,
    zIndex: 3,
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
  ticketRail: {
    borderWidth: 4,
    borderColor: colors.ink,
    borderRadius: 32,
    backgroundColor: '#211d23',
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 0,
    shadowOffset: { width: 7, height: 8 },
  },
  ticketFrame: {
    minHeight: 220,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
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
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 12,
    backgroundColor: colors.cream,
    padding: 10,
    gap: 10,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
  },
  reviewCardHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
    lineHeight: 17,
    fontWeight: '900',
  },
  reviewerHandle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  reviewCommentCluster: {
    minWidth: 42,
    alignItems: 'flex-end',
    gap: 4,
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
    width: 62,
    height: 92,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
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
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardRatingLine: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedSpoilerText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '900',
  },
  quickTake: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
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
    maxWidth: '48%',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  cardTagRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  stack: {
    gap: 12,
    paddingBottom: 22,
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
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 132,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 14,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileName: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
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
  friendHandle: {
    maxWidth: '100%',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
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
