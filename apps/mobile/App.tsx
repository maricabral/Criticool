import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  Home,
  LogOut,
  Mic,
  Plus,
  Popcorn,
  Search,
  Send,
  User,
  UserPlus,
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
import type { StyleProp, ViewStyle } from 'react-native';
import type { AuthTokens, AuthUser, FeedItem, MovieSummary } from '@criticool/shared';
import { api, FriendRequest, FriendSummary, loadTokens, ReviewDetail, saveTokens } from './src/api';
import { colors } from './src/theme';

type Tab = 'feed' | 'search' | 'create' | 'friends' | 'profile';
const webNoOutline =
  Platform.OS === 'web' ? ({ outlineWidth: 0, outlineColor: 'transparent' } as const) : null;
const REVIEW_TAG_CATEGORIES = [
  {
    title: 'Company',
    tags: [
      'to watch with grandma',
      'date night chaos',
      'solo spiral',
      'group chat bait',
      'watch with enemies',
    ],
  },
  {
    title: 'Atmosphere',
    tags: [
      '420 friendly',
      'rainy day watch',
      'midnight movie',
      'airport layover',
      'couch locked',
    ],
  },
  {
    title: 'Feelings',
    tags: [
      'crying in public',
      'therapy invoice',
      'existential damage',
      'heart repaired',
      'tiny meltdown',
    ],
  },
  {
    title: 'Energy',
    tags: [
      'brain off bliss',
      'chaos cinema',
      'quiet banger',
      'full throttle',
      'slow burn fever',
    ],
  },
  {
    title: 'Snacks',
    tags: [
      'best with snacks',
      'pizza required',
      'popcorn mandatory',
      'wine pairing',
      'breakfast movie',
    ],
  },
  {
    title: 'Taste',
    tags: [
      'camp masterpiece',
      'oscar bait but fun',
      'prestige nonsense',
      'trash treasure',
      'secretly perfect',
    ],
  },
  {
    title: 'Social Risk',
    tags: [
      'first date test',
      'family safe-ish',
      'friendship ender',
      'room divider',
      'text your ex bait',
    ],
  },
  {
    title: 'Aftermath',
    tags: [
      'needed a walk',
      'instant rewatch',
      'never again',
      'stayed with me',
      'forgot immediately',
    ],
  },
  {
    title: 'Audience',
    tags: [
      'for film nerds',
      'for tired people',
      'for drama queens',
      'for dads somehow',
      'for weird little guys',
    ],
  },
  {
    title: 'Warnings',
    tags: [
      'bring tissues',
      'volume down',
      'too much yelling',
      'do not eat during',
      'check the runtime',
    ],
  },
];
const FEATURED_REVIEW_TAGS = [
  'to watch with grandma',
  '420 friendly',
  'date night chaos',
  'therapy invoice',
  'best with snacks',
  'instant rewatch',
  'bring tissues',
  'brain off bliss',
];

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
      <View style={styles.center}>
        <ActivityIndicator color={colors.pink} />
      </View>
    </SafeAreaView>
  );
}

function AuthScreen({ onAuth }: { onAuth: (response: { user: AuthUser; tokens: AuthTokens }) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response =
        mode === 'register'
          ? await api.register({ email, password, username, displayName })
          : await api.login({ email, password });
      await onAuth(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.auth}>
        <View style={styles.reel}>
          <View style={styles.tapeTail}>
            <View style={styles.tapeStripe} />
            <View style={styles.tapeStripe} />
            <View style={styles.tapeStripe} />
            <View style={styles.tapeStripe} />
            <View style={styles.tapeStripe} />
          </View>
          <View style={styles.reelHole} />
          <View style={[styles.reelHole, styles.reelHoleTwo]} />
          <View style={[styles.reelHole, styles.reelHoleThree]} />
          <View style={styles.reelGlasses}>
            <View style={styles.reelLens} />
            <View style={styles.reelLens} />
            <View style={[styles.reelGlare, styles.reelGlareLeft]} />
            <View style={[styles.reelGlare, styles.reelGlareRight]} />
          </View>
          <View style={styles.reelMouth} />
        </View>
        <View>
          <Text style={styles.logo}>CritiCool</Text>
          <Text style={styles.tagline}>Movie takes from your friends. Cute, quick, and private first.</Text>
        </View>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentButton, mode === 'register' && styles.segmentButtonActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Create account</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, mode === 'login' && styles.segmentButtonActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Log in</Text>
          </Pressable>
        </View>
        <View style={styles.form}>
          <Field value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
          <Field
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
          />
          {mode === 'register' ? (
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
            label={mode === 'register' ? 'Create account' : 'Log in'}
            onPress={submit}
            disabled={busy}
          />
        </View>
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
        {tab === 'search' ? (
          <SearchScreen tokens={tokens} onReviewMovie={openCreate} />
        ) : null}
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
            <ReviewDetailScreen tokens={tokens} reviewId={selectedReviewId} onBack={() => setSelectedReviewId(null)} />
          ) : (
            <ProfileScreen user={user} onSignOut={onSignOut} />
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
      <Header title="CritiCool" right={<IconButton icon={<Plus size={20} color={colors.ink} />} onPress={onCreate} />} />
      {items.length ? (
        <View style={styles.feedTape}>
          <View style={styles.feedEdgeLeft} />
          <View style={styles.feedEdgeRight} />
          <FilmPerfColumn style={styles.feedPerfLeft} />
          <FilmPerfColumn style={styles.feedPerfRight} />
          <FlatList
            data={items}
            keyExtractor={(item) => item.reviewId}
            contentContainerStyle={styles.feedFrames}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            onEndReached={loadMore}
            renderItem={({ item }) => <ReviewCard item={item} onPress={() => onOpenReview(item.reviewId)} />}
          />
        </View>
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
  return (
    <Pressable style={styles.reviewFrame} onPress={onPress}>
      <FramePerfRow style={styles.framePerfTop} />
      <FramePerfRow style={styles.framePerfBottom} />
      <Poster movie={item.movie} compact />
      <View style={styles.reviewCopy}>
        <Text numberOfLines={1} style={styles.movieTitle}>{item.movie.title}</Text>
        <Text numberOfLines={2} style={styles.quickTake}>
          {item.containsSpoilers ? 'Spoiler review' : item.quickTake || 'No quick take'}
        </Text>
        <View style={styles.takeRow}>
          <Rating value={item.rating} />
          <Text style={styles.bubble}>{item.commentCount} chats</Text>
        </View>
        {item.tags?.length ? <TagPills tags={item.tags.slice(0, 2)} /> : null}
        <View style={styles.miniAvatars}>
          <Avatar label={item.author.displayName || item.author.username} mini />
          <Text style={styles.frameAuthor}>@{item.author.username}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function FilmPerfColumn({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.filmPerfColumn, style]}>
      {Array.from({ length: 18 }).map((_, index) => (
        <View key={index} style={styles.filmPerfHole} />
      ))}
    </View>
  );
}

function FramePerfRow({ style }: { style: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.framePerfRow, style]}>
      {Array.from({ length: 10 }).map((_, index) => (
        <View key={index} style={styles.framePerfHole} />
      ))}
    </View>
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
      <Field value={query} onChangeText={setQuery} placeholder="Find a movie" autoCapitalize="none" icon={<Search size={18} color={colors.muted} />} />
      {busy ? <ActivityIndicator color={colors.pink} style={styles.inlineLoader} /> : null}
      <ScrollView contentContainerStyle={styles.stack}>
        {results.map((movie) => (
          <Pressable key={`${movie.tmdbId}-${movie.id ?? 'tmdb'}`} style={styles.resultRow} onPress={() => selectMovie(movie)}>
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
  onSelectMovie: (movie: MovieSummary) => void;
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

  const canPost = selectedMovie?.id && rating > 0;
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

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Voice dictation',
        'Tap the microphone on your keyboard to dictate the full review. Native in-app transcription needs a custom development build.',
      );
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      Alert.alert('Voice dictation unavailable', 'This browser does not expose speech recognition.');
      return;
    }

    setTranscribing(true);
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (!transcript) {
        return;
      }
      setBody((current) => {
        const trimmed = current.trim();
        return trimmed ? `${trimmed}\n\n${transcript}` : transcript;
      });
    };
    recognition.onerror = (event) => {
      Alert.alert('Dictation stopped', event.error ?? 'Please try again.');
    };
    recognition.onend = () => setTranscribing(false);
    recognition.start();
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
      setRating(0);
      setQuickTake('');
      setBody('');
      setSelectedTags([]);
      setTagQuery('');
      setShowAllTags(false);
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
      <Header title="New Review" right={<PrimaryButton label="Post" onPress={post} disabled={!canPost || busy} compact />} />
      {selectedMovie ? (
        <View style={styles.resultRow}>
          <Poster movie={selectedMovie} />
          <View style={styles.reviewCopy}>
            <Text style={styles.movieTitle}>{selectedMovie.title}</Text>
            <Text style={styles.mutedText}>{selectedMovie.releaseYear ?? 'TBA'}</Text>
          </View>
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
          {movieSearchBusy ? <ActivityIndicator color={colors.pink} style={styles.inlineLoader} /> : null}
          {movieResults.map((movie) => (
            <Pressable key={`${movie.tmdbId}-${movie.id ?? 'tmdb'}`} style={styles.resultRow} onPress={() => selectMovie(movie)}>
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
              <Popcorn size={32} color={active ? colors.pink : colors.ink} strokeWidth={active ? 3.4 : 2.6} />
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
                style={[styles.tagChip, active && styles.tagChipActive, disabled && styles.tagChipDisabled]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => setShowAllTags((current) => !current)}>
          <Text style={styles.secondaryButtonText}>{showAllTags ? 'Hide more tags' : 'Browse more tags'}</Text>
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
                        style={[styles.tagChip, active && styles.tagChipActive, disabled && styles.tagChipDisabled]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text style={[styles.tagChipText, active && styles.tagChipTextActive]}>{tag}</Text>
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
        <Text style={styles.spoilerText}>{containsSpoilers ? 'Contains spoilers' : 'Spoiler-free'}</Text>
      </Pressable>
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

  useEffect(() => {
    void api.review(tokens, reviewId).then(setReview).catch(() => onBack());
  }, [tokens, reviewId]);

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
      <View style={styles.detailBlock}>
        <View style={styles.authorRow}>
          <Avatar label={review.author.displayName} />
          <View>
            <Text style={styles.author}>@{review.author.username}</Text>
            <Text style={styles.mutedText}>{review.movie.title}</Text>
          </View>
        </View>
        <Rating value={review.rating} />
        {review.quickTake ? <Text style={styles.detailTitle}>{review.quickTake}</Text> : null}
        {review.tags?.length ? <TagPills tags={review.tags} /> : null}
        {showBody ? (
          <Text style={styles.bodyText}>{review.body || 'No full review.'}</Text>
        ) : (
          <PrimaryButton label="Reveal spoilers" onPress={() => setRevealed(true)} />
        )}
      </View>
      <View style={styles.notice}>
        <Text style={styles.emptyTitle}>Comments</Text>
        <Text style={styles.mutedText}>Threaded discussion is scaffolded for the next Phase 1 slice.</Text>
      </View>
    </ScrollView>
  );
}

function FriendsScreen({ tokens }: { tokens: AuthTokens }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; username: string; displayName: string; friendshipStatus: string | null }>>([]);
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
      void api.searchUsers(tokens, query).then(setUsers).catch(() => setUsers([]));
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
      <Header title="Friends" />
      <Field value={query} onChangeText={setQuery} placeholder="Search username" autoCapitalize="none" icon={<UserPlus size={18} color={colors.muted} />} />
      <ScrollView contentContainerStyle={styles.stack}>
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requests</Text>
            {loadingRequests ? <ActivityIndicator color={colors.pink} /> : null}
          </View>
          {incoming.length ? (
            incoming.map((request) => (
              <View key={request.id} style={styles.resultRow}>
                <Avatar label={request.requester.displayName} />
                <View style={styles.reviewCopy}>
                  <Text style={styles.movieTitle}>@{request.requester.username}</Text>
                  <Text style={styles.mutedText}>{request.requester.displayName} wants to be friends</Text>
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
            ))
          ) : (
            <Text style={styles.mutedText}>No incoming requests.</Text>
          )}
          {outgoing.length ? (
            <View style={styles.tagList}>
              {outgoing.map((request) => (
                <Text key={request.id} style={styles.tagPill}>
                  pending @{request.addressee.username}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {friends.length ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Friends</Text>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.resultRow}>
                <Avatar label={friend.displayName} />
                <View style={styles.reviewCopy}>
                  <Text style={styles.movieTitle}>@{friend.username}</Text>
                  <Text style={styles.mutedText}>{friend.displayName}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Find people</Text>
        {users.map((item) => (
          <View key={item.id} style={styles.resultRow}>
            <Avatar label={item.displayName} />
            <View style={styles.reviewCopy}>
              <Text style={styles.movieTitle}>@{item.username}</Text>
              <Text style={styles.mutedText}>{item.displayName}</Text>
            </View>
            <Pressable disabled={item.friendshipStatus !== null} onPress={() => void add(item.id)}>
              <Text style={styles.pill}>{item.friendshipStatus ?? 'Add'}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProfileScreen({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  return (
    <View style={styles.screen}>
      <Header title={`@${user.username}`} right={<IconButton icon={<LogOut size={20} color={colors.ink} />} onPress={onSignOut} />} />
      <View style={styles.profileBlock}>
        <Avatar label={user.displayName} large />
        <Text style={styles.profileName}>{user.displayName}</Text>
        <Text style={styles.mutedText}>{user.email}</Text>
      </View>
    </View>
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
      <TextInput placeholderTextColor={colors.muted} style={[styles.field, webNoOutline]} {...props} />
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
      style={[styles.primaryButton, compact && styles.compactButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
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
      { id: 'friends' as const, label: 'Friends', icon: Bell },
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
            <View style={[styles.tabIcon, active && styles.tabIconActive]}>
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
    return <Image source={{ uri: movie.posterUrl }} style={[styles.poster, compact && styles.posterCompact]} />;
  }
  return (
    <View style={[styles.poster, compact && styles.posterCompact, styles.posterFallback]}>
      <Popcorn size={24} color={colors.ink} />
    </View>
  );
}

function Avatar({ label, large, mini }: { label: string; large?: boolean; mini?: boolean }) {
  return (
    <View style={[styles.avatar, large && styles.avatarLarge, mini && styles.avatarMini]}>
      <Text style={[styles.avatarText, large && styles.avatarTextLarge, mini && styles.avatarTextMini]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <View style={styles.rating}>
      <Popcorn size={18} color={colors.ink} />
      <Text style={styles.ratingText}>{value.toFixed(1)}</Text>
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
  auth: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 18,
    padding: 22,
    backgroundColor: colors.surface,
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
  },
  tagline: {
    fontSize: 17,
    color: colors.muted,
    marginTop: 4,
  },
  segment: {
    gap: 10,
  },
  segmentButton: {
    minHeight: 46,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  segmentButtonActive: {
    backgroundColor: colors.pink,
  },
  segmentText: {
    fontWeight: '900',
    color: colors.ink,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  form: {
    gap: 10,
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
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  field: {
    flex: 1,
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
  compactButton: {
    minHeight: 38,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  error: {
    color: colors.danger,
    fontWeight: '800',
  },
  feedList: {
    gap: 18,
    paddingBottom: 22,
  },
  feedTape: {
    flex: 1,
    marginHorizontal: 4,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 4,
    borderColor: colors.ink,
    borderRadius: 32,
    backgroundColor: '#211d23',
    paddingHorizontal: 34,
    paddingVertical: 20,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 0,
    shadowOffset: { width: 7, height: 8 },
    overflow: 'hidden',
  },
  feedEdgeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 24,
    backgroundColor: '#2b262c',
  },
  feedEdgeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 24,
    backgroundColor: '#2b262c',
  },
  filmPerfColumn: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    width: 13,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  feedPerfLeft: {
    left: 9,
  },
  feedPerfRight: {
    right: 9,
  },
  filmPerfHole: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.cream,
  },
  feedFrames: {
    gap: 18,
    paddingBottom: 20,
    zIndex: 2,
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
    position: 'relative',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    minHeight: 150,
    borderWidth: 4,
    borderColor: '#0f0d10',
    borderRadius: 18,
    backgroundColor: colors.cream,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: colors.surface,
    shadowOpacity: 0.35,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  framePerfRow: {
    position: 'absolute',
    left: -2,
    right: -2,
    height: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  framePerfTop: {
    top: -13,
  },
  framePerfBottom: {
    bottom: -13,
  },
  framePerfHole: {
    width: 11,
    height: 5,
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
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
  },
  posterCompact: {
    width: 58,
    height: 86,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  movieTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    color: colors.ink,
    fontWeight: '900',
  },
  quickTake: {
    color: colors.ink,
    fontWeight: '800',
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
    fontWeight: '900',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  miniAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frameAuthor: {
    color: colors.muted,
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
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    backgroundColor: colors.cyan,
    overflow: 'hidden',
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
  notice: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.surface,
    gap: 6,
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
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  spoilerToggleOn: {
    backgroundColor: colors.orange,
  },
  spoilerText: {
    fontWeight: '900',
    color: colors.ink,
  },
  detailBlock: {
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    padding: 14,
    backgroundColor: colors.surface,
    gap: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 260,
    borderWidth: 3,
    borderColor: colors.ink,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  profileName: {
    color: colors.ink,
    fontSize: 26,
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
  tabText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  tabTextActive: {
    color: colors.pink,
  },
});
