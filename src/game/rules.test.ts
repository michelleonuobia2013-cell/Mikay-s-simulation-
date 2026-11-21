import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, STORY_ARCS } from './catalog';
import {
  addSimGramPost,
  clampDt,
  collectBusinessRevenue,
  completeHorrorExperience,
  createInitialPlayerState,
  depositToSavings,
  evaluateStoryChoice,
  findNearbyOnlinePlayers,
  getDistrictAt,
  isValidEmoteId,
  launchBusiness,
  moderateChatMessage,
  playCreatorExperience,
  publishCreatorExperience,
  purchaseProperty,
  purchaseVehicle,
  resolveWorldMovement,
  toggleSimGramLike,
  withdrawFromSavings,
  workCareerShift,
} from './rules';
import type { OnlinePlayerPresence } from './types';

test('clampDt clamps negative, NaN, and oversized frame deltas', () => {
  assert.equal(clampDt(-0.2), 0);
  assert.equal(clampDt(Number.NaN), 0);
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.8), 0.05);
});

test('purchaseProperty deducts Mikay Coins and prevents duplicate purchases', () => {
  const initial = createInitialPlayerState();
  const res = purchaseProperty(initial, 'old_town_loft', 'buy');
  assert.equal(res.ok, true);
  assert.equal(res.nextState.velorCoins, initial.velorCoins - 1200);
  assert.equal(res.nextState.ownedProperties.length, 1);

  const dup = purchaseProperty(res.nextState, 'old_town_loft', 'buy');
  assert.equal(dup.ok, false);
});

test('purchaseVehicle prevents purchase when funds are insufficient', () => {
  const initial = createInitialPlayerState();
  const broke = { ...initial, velorCoins: 100 };
  const res = purchaseVehicle(broke, 'hyper_coupe', 'buy');
  assert.equal(res.ok, false);
  assert.equal(res.nextState.ownedVehicles.length, 0);
});

test('workCareerShift grants salary, reputation, lumina, and updates parallel path', () => {
  const initial = createInitialPlayerState();
  const shift = workCareerShift(initial, 'doctor');
  assert.equal(shift.ok, true);
  assert.ok(shift.earned >= 320);
  assert.equal(shift.nextState.velorCoins, initial.velorCoins + shift.earned);
  assert.ok(shift.nextState.reputation > initial.reputation);
  assert.ok(shift.nextState.lumina > initial.lumina);
});

test('launchBusiness and collectBusinessRevenue grow empire safely', () => {
  const initial = createInitialPlayerState();
  const launch = launchBusiness(initial, 'sunset_bistro', 'Veloria Waves');
  assert.equal(launch.ok, true);
  assert.equal(launch.nextState.ownedBusinesses.length, 1);

  const rev = collectBusinessRevenue(launch.nextState);
  assert.ok(rev.collected > 0);
  assert.equal(rev.nextState.velorCoins, launch.nextState.velorCoins + rev.collected);
});

test('evaluateStoryChoice advances narrative and unlocks secret clue', () => {
  const initial = createInitialPlayerState();
  const arc = STORY_ARCS[0];
  const step1 = evaluateStoryChoice(initial, arc, 'start', 'c_secret');
  assert.equal(step1.nextNodeId, 'sanctuary_clue');
  const step2 = evaluateStoryChoice(step1.nextState, arc, 'sanctuary_clue', 'c_unlock');
  assert.equal(step2.nextNodeId, 'end_scholar');
  assert.ok(step2.nextState.secretsFound.includes('mirror_frame_key'));
  assert.ok(step2.nextState.completedStories.includes(arc.id));
});

test('moderateChatMessage redacts unsafe terms and PII for age-appropriate safety', () => {
  const clean = moderateChatMessage('See you at the Christmas plaza!');
  assert.equal(clean.allowed, true);
  assert.equal(clean.flagged, false);
  assert.equal(clean.cleaned, 'See you at the Christmas plaza!');

  const unsafe = moderateChatMessage('Hey loser email me at test@example.com');
  assert.equal(unsafe.allowed, true);
  assert.equal(unsafe.flagged, true);
  assert.ok(!unsafe.cleaned.includes('loser'));
  assert.ok(!unsafe.cleaned.includes('test@example.com'));
});

test('getDistrictAt and resolveWorldMovement map all districts and push out of buildings', () => {
  assert.equal(getDistrictAt(0, 0), 'city');
  assert.equal(getDistrictAt(-55, -55), 'luxury');
  assert.equal(getDistrictAt(-55, 55), 'sunset_bay');
  assert.equal(getDistrictAt(55, -55), 'old_town');
  assert.equal(getDistrictAt(55, 55), 'island');
  assert.equal(getDistrictAt(0, -80), 'sanctuary');

  const resolved = resolveWorldMovement(10, 10, [{ minX: 8, maxX: 12, minZ: 8, maxZ: 12 }], 0.5);
  const inside = resolved.x > 7.5 && resolved.x < 12.5 && resolved.z > 7.5 && resolved.z < 12.5;
  assert.equal(inside, false);
});

test('isValidEmoteId validates supported emotes and rejects arbitrary strings', () => {
  assert.equal(isValidEmoteId('wave'), true);
  assert.equal(isValidEmoteId('dance'), true);
  assert.equal(isValidEmoteId('laugh'), true);
  assert.equal(isValidEmoteId('clap'), true);
  assert.equal(isValidEmoteId('pose'), true);
  assert.equal(isValidEmoteId('teleport'), false);
  assert.equal(isValidEmoteId(123), false);
});

test('findNearbyOnlinePlayers returns players within radius sorted nearest-first', () => {
  const mkPlayer = (sessionId: string, name: string, pos: [number, number, number]): OnlinePlayerPresence => ({
    sessionId,
    username: sessionId,
    characterName: name,
    district: 'city',
    pos,
    rotY: 0,
    moving: false,
    inVehicle: false,
    appearance: DEFAULT_APPEARANCE,
    vipTier: 'Resident',
    isNpc: false,
  });

  const roster = [
    mkPlayer('far', 'Far Player', [25, 0, 14]),
    mkPlayer('mid', 'Mid Player', [7, 0, 14]),
    mkPlayer('near', 'Near Player', [2, 0, 14]),
  ];

  const nearby = findNearbyOnlinePlayers([0, 0, 14], roster, 12);
  assert.deepEqual(
    nearby.map((p) => p.sessionId),
    ['near', 'mid'],
  );
});

test('SimBank deposit and withdrawal maintain exact coin and savings balances', () => {
  const initial = createInitialPlayerState();
  const dep = depositToSavings(initial, 500);
  assert.equal(dep.ok, true);
  assert.equal(dep.nextState.velorCoins, initial.velorCoins - 500);
  assert.equal(dep.nextState.savingsCoins, initial.savingsCoins + 500);

  const over = withdrawFromSavings(dep.nextState, 99999);
  assert.equal(over.ok, false);

  const wd = withdrawFromSavings(dep.nextState, 300);
  assert.equal(wd.ok, true);
  assert.equal(wd.nextState.velorCoins, initial.velorCoins - 200);
  assert.equal(wd.nextState.savingsCoins, initial.savingsCoins + 200);
});

test('completeHorrorExperience awards Mikay Coins, Lumina, and marks completion', () => {
  const initial = createInitialPlayerState();
  const res = completeHorrorExperience(initial, 'the_last_floor', 0);
  assert.equal(res.ok, true);
  assert.ok(res.earnedCoins >= 300);
  assert.ok(res.earnedLumina >= 30);
  assert.ok(res.nextState.completedHorror.includes('the_last_floor'));
  assert.equal(res.nextState.velorCoins, initial.velorCoins + res.earnedCoins);
});

test('publishCreatorExperience validates input, creates experience, and rewards creator', () => {
  const initial = createInitialPlayerState();
  const invalid = publishCreatorExperience(initial, {
    title: 'ab',
    category: 'Campus',
    description: 'short',
    promptLine: 'hi',
  });
  assert.equal(invalid.ok, false);

  const created = publishCreatorExperience(initial, {
    title: 'Lavender Campus Mystery',
    category: 'Mystery',
    description: 'Solve who locked the Campus Bell Tower before midnight.',
    promptLine: 'A cold wind sweeps across the quad—inspect the Bell Tower door!',
    rewardCoins: 150,
  });
  assert.equal(created.ok, true);
  assert.ok(created.experience);
  assert.equal(created.nextState.customExperiences[0].id, created.experience.id);

  const played = playCreatorExperience(created.nextState, created.experience.id);
  assert.equal(played.ok, true);
  assert.equal(played.earnedCoins, 150);
});

test('addSimGramPost and toggleSimGramLike update feed state', () => {
  const initial = createInitialPlayerState();
  const posted = addSimGramPost(initial, 'Exploring Lavender Heights!', '#LavenderHeights');
  assert.equal(posted.ok, true);
  assert.equal(posted.nextState.simGramPosts[0].caption, 'Exploring Lavender Heights!');

  const targetId = initial.simGramPosts[0].id;
  const liked = toggleSimGramLike(posted.nextState, targetId);
  const entry = liked.simGramPosts.find((p) => p.id === targetId);
  assert.equal(entry?.liked, true);
});
