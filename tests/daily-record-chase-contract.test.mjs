import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const gameCss = await readFile(new URL('../src/styles/game.css', import.meta.url), 'utf8');

test('Daily Run freezes the undisputed daily leader before the countdown', () => {
  assert.match(mainSource, /dailyRunService\.fetchTopScore\(challenge\.date\)/);
  assert.match(mainSource, /dailyAttempt\.recordTargetScore = dailyLeader\?\.score \?\? 0/);
  assert.match(mainSource, /if \(runGameMode === 'daily'\) beginDailyRecordChase\(\)/);
  assert.doesNotMatch(mainSource, /if \(runGameMode === 'daily'\) disableRecordChase\(\)/);
});

test('Daily Run only celebrates an authoritative new number one at game over', () => {
  assert.match(mainSource, /Number\(data\.leaderboardRank\) === 1/);
  assert.match(mainSource, /Number\(data\.score\) > frozenDailyTop/);
  assert.match(
    mainSource,
    /launchRecordCelebration\(\{ confirmed: true, previousTop: frozenDailyTop \}\)/
  );
  assert.match(
    mainSource,
    /function maybeCelebrateRecordAtGameOver\(\) \{\s*[\s\S]*?if \(runGameMode === 'daily'\) return;/
  );
});

test('the Daily warning uses the fixed HUD and canvas border presentation', () => {
  assert.match(mainSource, /runGameMode === 'daily' \? '#1 PACE' : 'NEW #1'/);
  assert.match(mainSource, /`Daily #1 target • \$\{warningText\}`/);
  assert.match(gameCss, /#record-chase\s*\{[\s\S]*?width:\s*1px;[\s\S]*?height:\s*1px;/);
  assert.match(gameCss, /canvas\.record-warning\s*\{\s*animation:/);
});
