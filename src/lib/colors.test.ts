// src/lib/colors.test.ts — run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS } from '../config/teams.ts';
import { cardColors, colorDistance, contrastWithWhite, MIN_CONTRAST, MIN_DISTANCE } from './colors.ts';

test('different colors: nothing changes', () => {
  const colors = cardColors(TEAMS.SAS!, TEAMS.DEN!);
  assert.deepEqual(colors, { away: TEAMS.SAS, home: TEAMS.DEN });
});

// Their red, a touch darker so the small white city name stays readable
const sixersRed = (hex: string) =>
  colorDistance(hex, TEAMS.PHI!.secondary) < 10 && contrastWithWhite(hex) >= MIN_CONTRAST;

test("Philadelphia at New York (same blue): the Knicks' orange is too light, so the Sixers go red", () => {
  const { away, home } = cardColors(TEAMS.PHI!, TEAMS.NYK!);
  assert.equal(home.primary, TEAMS.NYK!.primary);
  assert.ok(sixersRed(away.primary), away.primary);
});

test('New York at Philadelphia: the home team switches first, the Sixers go red', () => {
  const { away, home } = cardColors(TEAMS.NYK!, TEAMS.PHI!);
  assert.equal(away.primary, TEAMS.NYK!.primary);
  assert.ok(sixersRed(home.primary), home.primary);
});

test("every team's own color keeps small white text readable (WCAG AA, 4.5:1)", () => {
  for (const [id, team] of Object.entries(TEAMS)) {
    assert.ok(contrastWithWhite(team.primary) >= MIN_CONTRAST, `${id}: ${contrastWithWhite(team.primary).toFixed(2)}`);
  }
});

test('every one of the 870 home/away pairs ends up with two distinct, readable halves', () => {
  const ids = Object.keys(TEAMS);
  for (const a of ids) for (const h of ids) {
    if (a === h) continue;
    const { away, home } = cardColors(TEAMS[a]!, TEAMS[h]!);
    assert.ok(colorDistance(away.primary, home.primary) >= MIN_DISTANCE, `${a} @ ${h}: too close`);
    for (const c of [away, home]) {
      assert.ok(contrastWithWhite(c.primary) >= MIN_CONTRAST, `${a} @ ${h}: white text unreadable`);
    }
  }
});
