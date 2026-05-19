#!/usr/bin/env node
/**
 * CritiCool Phase 1 QA Smoke Script
 *
 * Proves the Phase 1 Definition of Done by exercising:
 * - User signup (User A, B, C)
 * - Login
 * - Token refresh
 * - Logout
 * - Movie search/import
 * - Review creation
 * - Friendship: request, accept
 * - Feed visibility: friends see, strangers don't
 * - Review detail visibility
 * - Comments and voting
 * - Soft-delete review → hidden from feed
 * - Recreate review after delete (partial unique index)
 *
 * Usage: node scripts/qa-smoke.mjs [BASE_URL]
 * Default BASE_URL: http://localhost:3000
 */

const BASE = process.argv[2] ?? 'http://localhost:3000';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function request(method, path, { body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

function uniqueSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function run() {
  const suffix = uniqueSuffix();
  console.log(`\n🎬 CritiCool QA Smoke Test (suffix: ${suffix})\n`);
  console.log(`  Target: ${BASE}\n`);

  // ─── Health Check ───
  console.log('--- Health Check ---');
  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health endpoint responds 200');

  // ─── Register Users ───
  console.log('\n--- Auth: Register ---');
  const userARes = await request('POST', '/auth/register', {
    body: { email: `alice_${suffix}@test.local`, password: 'Password1!', username: `alice_${suffix}`, displayName: 'Alice' },
  });
  assert(userARes.status === 201, `User A registered (status ${userARes.status})`);
  const userA = { ...userARes.data.user, tokens: userARes.data.tokens };

  const userBRes = await request('POST', '/auth/register', {
    body: { email: `bob_${suffix}@test.local`, password: 'Password2!', username: `bob_${suffix}`, displayName: 'Bob' },
  });
  assert(userBRes.status === 201, `User B registered (status ${userBRes.status})`);
  const userB = { ...userBRes.data.user, tokens: userBRes.data.tokens };

  const userCRes = await request('POST', '/auth/register', {
    body: { email: `carol_${suffix}@test.local`, password: 'Password3!', username: `carol_${suffix}`, displayName: 'Carol' },
  });
  assert(userCRes.status === 201, `User C registered (status ${userCRes.status})`);
  const userC = { ...userCRes.data.user, tokens: userCRes.data.tokens };

  // ─── Duplicate Email ───
  console.log('\n--- Auth: Duplicate Email ---');
  const dupEmail = await request('POST', '/auth/register', {
    body: { email: `alice_${suffix}@test.local`, password: 'Password9!', username: `dup_${suffix}`, displayName: 'Dup' },
  });
  assert(dupEmail.status === 409, `Duplicate email rejected (status ${dupEmail.status})`);

  // ─── Duplicate Username ───
  console.log('\n--- Auth: Duplicate Username ---');
  const dupUser = await request('POST', '/auth/register', {
    body: { email: `dup_${suffix}@test.local`, password: 'Password9!', username: `alice_${suffix}`, displayName: 'Dup' },
  });
  assert(dupUser.status === 409, `Duplicate username rejected (status ${dupUser.status})`);

  // ─── Login ───
  console.log('\n--- Auth: Login ---');
  const loginRes = await request('POST', '/auth/login', {
    body: { email: `alice_${suffix}@test.local`, password: 'Password1!' },
  });
  assert(loginRes.status === 201 || loginRes.status === 200, `Login succeeds (status ${loginRes.status})`);
  assert(!!loginRes.data.tokens?.accessToken, 'Login returns access token');
  assert(!!loginRes.data.tokens?.refreshToken, 'Login returns refresh token');

  // ─── Token Refresh ───
  console.log('\n--- Auth: Refresh ---');
  const refreshRes = await request('POST', '/auth/refresh', {
    body: { refreshToken: userA.tokens.refreshToken },
  });
  assert(refreshRes.status === 201 || refreshRes.status === 200, `Refresh succeeds (status ${refreshRes.status})`);
  assert(refreshRes.data.tokens?.refreshToken !== userA.tokens.refreshToken, 'Refresh rotates token');
  userA.tokens = refreshRes.data.tokens;

  // ─── GET /me ───
  console.log('\n--- Auth: /me ---');
  const meRes = await request('GET', '/me', { token: userA.tokens.accessToken });
  assert(meRes.status === 200, `GET /me succeeds (status ${meRes.status})`);
  assert(meRes.data.username === `alice_${suffix}`, '/me returns correct username');

  // ─── Movie Search ───
  console.log('\n--- Movies: Search ---');
  const searchRes = await request('GET', '/movies/search?q=Inception', { token: userA.tokens.accessToken });
  assert(searchRes.status === 200, `Movie search succeeds (status ${searchRes.status})`);
  assert(Array.isArray(searchRes.data.items), 'Movie search returns items array');

  // ─── Movie Import (use tmdbId 550 = Fight Club as fallback if no results) ───
  console.log('\n--- Movies: Import ---');
  const tmdbId = searchRes.data.items?.[0]?.tmdbId ?? 550;
  const importRes = await request('POST', `/movies/tmdb/${tmdbId}/import`, { token: userA.tokens.accessToken });
  assert(importRes.status === 201 || importRes.status === 200, `Movie import succeeds (status ${importRes.status})`);
  const movieId = importRes.data?.id;
  assert(!!movieId, 'Imported movie has an id');

  // ─── Review Creation ───
  console.log('\n--- Reviews: Create ---');
  const reviewRes = await request('POST', '/reviews', {
    token: userA.tokens.accessToken,
    body: { movieId, rating: 4.5, quickTake: 'Amazing film!', containsSpoilers: false, tags: ['mind-bending'] },
  });
  assert(reviewRes.status === 201 || reviewRes.status === 200, `Review created (status ${reviewRes.status})`);
  const reviewId = reviewRes.data?.id;
  assert(!!reviewId, 'Review has an id');

  console.log('\n--- Movies: Detail ---');
  const movieDetailARes = await request('GET', `/movies/${movieId}`, { token: userA.tokens.accessToken });
  assert(movieDetailARes.status === 200, `Movie detail loads for reviewer (status ${movieDetailARes.status})`);
  assert(movieDetailARes.data?.viewerReview?.id === reviewId, 'Movie detail includes viewer existing review');

  // ─── Friendship: A → B ───
  console.log('\n--- Friendship: Request & Accept ---');
  const frReqRes = await request('POST', '/friend-requests', {
    token: userA.tokens.accessToken,
    body: { addresseeId: userB.id },
  });
  assert(frReqRes.status === 201 || frReqRes.status === 200, `Friend request A→B created (status ${frReqRes.status})`);

  const notifBRequestRes = await request('GET', '/notifications', { token: userB.tokens.accessToken });
  assert(notifBRequestRes.status === 200, 'B can load notifications');
  assert(
    notifBRequestRes.data.items?.some?.((item) => item.type === 'friend_request_received' && item.actor?.id === userA.id),
    'B receives friend request notification',
  );

  const incomingRes = await request('GET', '/friend-requests/incoming', { token: userB.tokens.accessToken });
  assert(incomingRes.status === 200, 'B sees incoming requests');
  const pendingReq = incomingRes.data?.find?.(r => r.requester?.id === userA.id);
  assert(!!pendingReq, 'B has pending request from A');

  const acceptRes = await request('POST', `/friend-requests/${pendingReq?.id}/accept`, { token: userB.tokens.accessToken });
  assert(acceptRes.status === 201 || acceptRes.status === 200, `Friend request accepted (status ${acceptRes.status})`);

  const notifARequestRes = await request('GET', '/notifications', { token: userA.tokens.accessToken });
  assert(
    notifARequestRes.data.items?.some?.((item) => item.type === 'friend_request_accepted' && item.actor?.id === userB.id),
    'A receives accepted friend request notification',
  );

  // ─── Feed Visibility: Friend ───
  console.log('\n--- Feed: Friend Visibility ---');
  const feedBRes = await request('GET', '/feed', { token: userB.tokens.accessToken });
  assert(feedBRes.status === 200, `User B feed loads (status ${feedBRes.status})`);
  const bSeesReview = feedBRes.data.items?.some?.(item => item.reviewId === reviewId);
  assert(bSeesReview, "User B (friend) sees User A's review in feed");

  const movieDetailBRes = await request('GET', `/movies/${movieId}`, { token: userB.tokens.accessToken });
  assert(movieDetailBRes.status === 200, 'Friend can load movie detail');
  assert(
    movieDetailBRes.data.friendsReviews?.some?.((item) => item.id === reviewId),
    'Movie detail includes recent friend review',
  );

  const friendReviewsRes = await request('GET', `/feed/users/${userA.id}`, { token: userB.tokens.accessToken });
  assert(friendReviewsRes.status === 200, `Friend profile reviews load (status ${friendReviewsRes.status})`);
  assert(
    friendReviewsRes.data.items?.some?.((item) => item.reviewId === reviewId),
    'Friend profile reviews include visible review',
  );

  // ─── Feed Visibility: Stranger ───
  console.log('\n--- Feed: Stranger Exclusion ---');
  const feedCRes = await request('GET', '/feed', { token: userC.tokens.accessToken });
  assert(feedCRes.status === 200, `User C feed loads (status ${feedCRes.status})`);
  const cSeesReview = feedCRes.data.items?.some?.(item => item.reviewId === reviewId);
  assert(!cSeesReview, "User C (stranger) does NOT see User A's review");

  const strangerProfileReviewsRes = await request('GET', `/feed/users/${userA.id}`, { token: userC.tokens.accessToken });
  assert(strangerProfileReviewsRes.status === 404, `Stranger cannot load friend profile reviews (status ${strangerProfileReviewsRes.status})`);

  // ─── Review Detail Visibility ───
  console.log('\n--- Review Detail: Visibility ---');
  const detailBRes = await request('GET', `/reviews/${reviewId}`, { token: userB.tokens.accessToken });
  assert(detailBRes.status === 200, 'Friend can access review detail');

  const detailCRes = await request('GET', `/reviews/${reviewId}`, { token: userC.tokens.accessToken });
  assert(detailCRes.status === 404, `Stranger gets 404 for review detail (status ${detailCRes.status})`);

  console.log('\n--- Review: Edit ---');
  const editReviewRes = await request('PATCH', `/reviews/${reviewId}`, {
    token: userA.tokens.accessToken,
    body: {
      rating: 4.0,
      quickTake: 'Amazing film, edited!',
      body: 'Edited long take for translation.',
      containsSpoilers: false,
      tags: ['mind-bending', 'instant rewatch'],
    },
  });
  assert(editReviewRes.status === 200, `Review edited (status ${editReviewRes.status})`);
  assert(editReviewRes.data?.quickTake === 'Amazing film, edited!', 'Edited review returns new quick take');

  console.log('\n--- Translations: Review Permissions ---');
  const translateReviewBRes = await request('POST', '/translations', {
    token: userB.tokens.accessToken,
    body: { targetType: 'review', targetId: reviewId, sourceLocale: 'en-US', targetLocale: 'pt-BR' },
  });
  assert(translateReviewBRes.status === 201 || translateReviewBRes.status === 200, `Friend can translate review (status ${translateReviewBRes.status})`);
  assert(translateReviewBRes.data?.fields?.body, 'Review translation returns user-generated body');

  const translateReviewCachedRes = await request('POST', '/translations', {
    token: userB.tokens.accessToken,
    body: { targetType: 'review', targetId: reviewId, sourceLocale: 'en-US', targetLocale: 'pt-BR' },
  });
  assert(translateReviewCachedRes.data?.cached === true, 'Review translation cache is reused');

  const translateReviewCRes = await request('POST', '/translations', {
    token: userC.tokens.accessToken,
    body: { targetType: 'review', targetId: reviewId, sourceLocale: 'en-US', targetLocale: 'pt-BR' },
  });
  assert(translateReviewCRes.status === 404, `Stranger cannot translate review (status ${translateReviewCRes.status})`);

  // ─── Comments ───
  console.log('\n--- Comments ---');
  const commentRes = await request('POST', `/reviews/${reviewId}/comments`, {
    token: userB.tokens.accessToken,
    body: { body: 'Totally agree!' },
  });
  assert(commentRes.status === 201 || commentRes.status === 200, `Comment created (status ${commentRes.status})`);
  const commentId = commentRes.data?.id;

  const notifACommentRes = await request('GET', '/notifications', { token: userA.tokens.accessToken });
  assert(
    notifACommentRes.data.items?.some?.((item) => item.type === 'review_commented' && item.commentId === commentId),
    'Review author receives comment notification',
  );

  const editCommentRes = await request('PATCH', `/reviews/${reviewId}/comments/${commentId}`, {
    token: userB.tokens.accessToken,
    body: { body: 'Totally agree, edited!' },
  });
  assert(editCommentRes.status === 200, `Comment edited (status ${editCommentRes.status})`);
  assert(editCommentRes.data?.body === 'Totally agree, edited!', 'Edited comment returns new body');

  const translateCommentARes = await request('POST', '/translations', {
    token: userA.tokens.accessToken,
    body: { targetType: 'comment', targetId: commentId, sourceLocale: 'en-US', targetLocale: 'pt-BR' },
  });
  assert(translateCommentARes.status === 201 || translateCommentARes.status === 200, `Review author can translate comment (status ${translateCommentARes.status})`);
  assert(translateCommentARes.data?.fields?.body, 'Comment translation returns user-generated body');

  const translateCommentCRes = await request('POST', '/translations', {
    token: userC.tokens.accessToken,
    body: { targetType: 'comment', targetId: commentId, sourceLocale: 'en-US', targetLocale: 'pt-BR' },
  });
  assert(translateCommentCRes.status === 404, `Stranger cannot translate comment (status ${translateCommentCRes.status})`);

  // Reply
  const replyRes = await request('POST', `/reviews/${reviewId}/comments`, {
    token: userA.tokens.accessToken,
    body: { body: 'Thanks!', parentCommentId: commentId },
  });
  assert(replyRes.status === 201 || replyRes.status === 200, `Reply created (status ${replyRes.status})`);
  assert(replyRes.data?.depth === 1, 'Reply has depth 1');
  const replyId = replyRes.data?.id;

  const notifBReplyRes = await request('GET', '/notifications', { token: userB.tokens.accessToken });
  assert(
    notifBReplyRes.data.items?.some?.((item) => item.type === 'comment_replied' && item.commentId === replyId),
    'Parent comment author receives reply notification',
  );

  // ─── Comment Vote ───
  console.log('\n--- Comment Votes ---');
  const voteRes = await request('POST', `/reviews/${reviewId}/comments/${commentId}/votes`, {
    token: userA.tokens.accessToken,
    body: { value: 1 },
  });
  assert(voteRes.status === 201 || voteRes.status === 200, `Vote created (status ${voteRes.status})`);
  assert(voteRes.data?.score >= 1, 'Comment score increased');

  const notifBVoteRes = await request('GET', '/notifications', { token: userB.tokens.accessToken });
  assert(
    notifBVoteRes.data.items?.some?.((item) => item.type === 'comment_voted' && item.commentId === commentId),
    'Comment author receives vote notification',
  );

  const removeVoteRes = await request('DELETE', `/reviews/${reviewId}/comments/${commentId}/votes`, {
    token: userA.tokens.accessToken,
  });
  assert(removeVoteRes.status === 200, `Vote removed (status ${removeVoteRes.status})`);
  assert(removeVoteRes.data?.viewerVote === 0, 'Vote removal clears viewer vote');

  const deleteCommentRes = await request('DELETE', `/reviews/${reviewId}/comments/${commentId}`, {
    token: userB.tokens.accessToken,
  });
  assert(deleteCommentRes.status === 200, `Comment soft-deleted (status ${deleteCommentRes.status})`);

  const detailAfterCommentDelete = await request('GET', `/reviews/${reviewId}?commentSort=new`, { token: userA.tokens.accessToken });
  assert(detailAfterCommentDelete.status === 200, 'Review detail supports comment sorting query');
  assert(detailAfterCommentDelete.data.commentCount === 1, 'Deleted comment excluded from visible comment count');

  const blockedCountCommentRes = await request('POST', `/reviews/${reviewId}/comments`, {
    token: userB.tokens.accessToken,
    body: { body: 'This comment should disappear after a block.' },
  });
  assert(blockedCountCommentRes.status === 201 || blockedCountCommentRes.status === 200, `Second comment created for block count check (status ${blockedCountCommentRes.status})`);
  const blockedCountCommentId = blockedCountCommentRes.data?.id;

  // Reports and Blocks
  console.log('\n--- Reports & Blocks ---');
  const reportReviewRes = await request('POST', '/reports', {
    token: userB.tokens.accessToken,
    body: {
      targetType: 'review',
      targetId: reviewId,
      reason: 'test review report',
      details: 'Smoke test review report details',
    },
  });
  assert(reportReviewRes.status === 201 || reportReviewRes.status === 200, `Review report created (status ${reportReviewRes.status})`);

  const reportUserRes = await request('POST', '/reports', {
    token: userC.tokens.accessToken,
    body: {
      targetType: 'user',
      targetId: userA.id,
      reason: 'test user report',
      details: 'Smoke test user report details',
    },
  });
  assert(reportUserRes.status === 201 || reportUserRes.status === 200, `User report created (status ${reportUserRes.status})`);

  const blockFriendRes = await request('POST', `/users/${userB.id}/block`, { token: userA.tokens.accessToken });
  assert(blockFriendRes.status === 201 || blockFriendRes.status === 200, `User A blocks User B (status ${blockFriendRes.status})`);

  const detailAfterBlock = await request('GET', `/reviews/${reviewId}`, { token: userA.tokens.accessToken });
  assert(detailAfterBlock.status === 200, 'Review author can reload detail after blocking commenter');
  assert(
    !JSON.stringify(detailAfterBlock.data.comments ?? []).includes(blockedCountCommentId),
    'Blocked comment author is removed from review detail comments',
  );
  assert(detailAfterBlock.data.commentCount === 1, 'Blocked comment author excluded from review detail count');

  const feedAfterBlock = await request('GET', '/feed', { token: userA.tokens.accessToken });
  const ownFeedReviewAfterBlock = feedAfterBlock.data.items?.find?.((item) => item.reviewId === reviewId);
  assert(ownFeedReviewAfterBlock?.commentCount === 1, 'Blocked comment author excluded from feed count');
  assert(
    !ownFeedReviewAfterBlock?.commentParticipants?.some?.((participant) => participant.id === userB.id),
    'Blocked comment author excluded from feed participant avatars',
  );

  const blockRes = await request('POST', `/users/${userA.id}/block`, { token: userC.tokens.accessToken });
  assert(blockRes.status === 201 || blockRes.status === 200, `User C blocks User A (status ${blockRes.status})`);

  const searchBlockedRes = await request('GET', `/users/search?q=alice_${suffix}`, { token: userC.tokens.accessToken });
  assert(
    !searchBlockedRes.data?.some?.((item) => item.id === userA.id),
    'Blocked user is hidden from user search',
  );

  const unblockRes = await request('DELETE', `/users/${userA.id}/block`, { token: userC.tokens.accessToken });
  assert(unblockRes.status === 200, `User C unblocks User A (status ${unblockRes.status})`);

  // ─── Soft Delete Review ───
  console.log('\n--- Review: Soft Delete ---');
  const delRes = await request('DELETE', `/reviews/${reviewId}`, { token: userA.tokens.accessToken });
  assert(delRes.status === 200 || delRes.status === 204, `Review soft-deleted (status ${delRes.status})`);

  // Verify hidden from feed
  const feedAfterDel = await request('GET', '/feed', { token: userB.tokens.accessToken });
  const stillVisible = feedAfterDel.data.items?.some?.(item => item.reviewId === reviewId);
  assert(!stillVisible, 'Deleted review hidden from friend feed');

  // ─── Recreate Review After Delete (partial unique index) ───
  console.log('\n--- Review: Recreate After Delete ---');
  const recreateRes = await request('POST', '/reviews', {
    token: userA.tokens.accessToken,
    body: { movieId, rating: 5.0, quickTake: 'Even better on rewatch!', containsSpoilers: false },
  });
  assert(
    recreateRes.status === 201 || recreateRes.status === 200,
    `Review recreated after delete (status ${recreateRes.status})`,
  );

  // ─── Logout ───
  console.log('\n--- Auth: Logout ---');
  const logoutRes = await request('POST', '/auth/logout', {
    body: { refreshToken: userA.tokens.refreshToken },
  });
  assert(logoutRes.status === 201 || logoutRes.status === 200, `Logout succeeds (status ${logoutRes.status})`);

  // Verify refresh token is revoked
  const postLogoutRefresh = await request('POST', '/auth/refresh', {
    body: { refreshToken: userA.tokens.refreshToken },
  });
  assert(postLogoutRefresh.status === 401, `Refresh after logout fails (status ${postLogoutRefresh.status})`);

  // ─── Summary ───
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(2);
});
