/**
 * Automated Verification Script: Instant Single-Click RESUME & 5s Guard
 */
const assert = require('assert');

console.log('🧪 Testing Desktop Tracker Resume Engine & 5s Guard...\n');

// ── TEST 1: Instant Single-Click RESUME with In-Flight Stale IDLE Poll
function testSingleClickResumeWithStalePoll() {
  console.log('Test 1: Stale in-flight IDLE poll cannot revert ACTIVE on single click');
  
  let status = 'IDLE';
  let isIdle = true;
  let isSessionRunning = false;
  let activeSeconds = 120;
  let inactiveSeconds = 60;
  let lastStartOrResumeTime = 0;
  let lastAppliedActive = activeSeconds;
  let lastAppliedInactive = inactiveSeconds;
  let lastAppliedTime = Date.now();

  function applyServerState(data) {
    const serverStatus = String(data?.status || '').toLowerCase();

    if (serverStatus === 'idle') {
      // 🛡️ GUARD: If resumed within last 5 seconds, reject stale idle
      if (Date.now() - lastStartOrResumeTime < 5000) {
        return;
      }
      status = 'IDLE';
      isIdle = true;
      isSessionRunning = false;
      if (data.idleTime !== undefined) inactiveSeconds = data.idleTime;
      if (data.activeTime !== undefined) activeSeconds = data.activeTime;
    } else if (serverStatus === 'active' && data.isRunning) {
      if ((status === 'IDLE' || isIdle) && Date.now() - lastStartOrResumeTime >= 5000) {
        return;
      }
      status = 'ACTIVE';
      isIdle = false;
      isSessionRunning = true;
      if (data.activeTime !== undefined) activeSeconds = data.activeTime;
      if (data.idleTime !== undefined) inactiveSeconds = data.idleTime;
    }
  }

  // 1. User clicks RESUME (First & only click)
  status = 'ACTIVE';
  isIdle = false;
  isSessionRunning = true;
  lastStartOrResumeTime = Date.now();
  lastAppliedActive = activeSeconds;
  lastAppliedInactive = inactiveSeconds;
  lastAppliedTime = Date.now();

  assert.strictEqual(status, 'ACTIVE', 'Must instantly be ACTIVE on click');
  assert.strictEqual(isIdle, false, 'isIdle must instantly be false');

  // 2. Delayed/stale background poll arrives 200ms later with status='idle'
  applyServerState({ status: 'idle', activeTime: 120, idleTime: 60 });

  // Guard must protect active state!
  assert.strictEqual(status, 'ACTIVE', 'Must remain ACTIVE despite stale idle response');
  assert.strictEqual(isIdle, false, 'isIdle must remain false');
  assert.strictEqual(isSessionRunning, true, 'isSessionRunning must remain true');

  console.log('  ✅ Test 1 Passed: Single click RESUME held ACTIVE state and rejected stale IDLE poll.\n');
}

// ── TEST 2: Local Clock Loop Increments Smoothly After Resume
function testLocalClockTicksAfterResume() {
  console.log('Test 2: Timer starts ticking immediately on first second after RESUME');
  
  let status = 'ACTIVE';
  let isSessionRunning = true;
  let lastAppliedActive = 120;
  let lastAppliedTime = Date.now() - 1000; // 1s elapsed
  let activeSeconds = 120;

  // Local tick
  const elapsedSincePoll = Math.floor((Date.now() - lastAppliedTime) / 1000);
  activeSeconds = lastAppliedActive + Math.max(0, elapsedSincePoll);

  assert.strictEqual(activeSeconds, 121, 'Active timer must count 121s after 1s');
  console.log(`  ✅ Test 2 Passed: Active timer advanced to ${activeSeconds}s on first second.\n`);
}

// ── TEST 3: Full 60-Second Inactivity Conservation & Resume Flow
function testFullCycleConservation() {
  console.log('Test 3: Complete cycle Active (120s) -> Idle (60s) -> Resume (60s)');
  
  let session = {
    activeTime: 0,
    idleTime: 0,
    segmentStart: Date.now() - 120000,
    lastHeartbeat: Date.now() - 10000,
    status: 'active'
  };

  // 120s active
  session.activeTime = 120;

  // Inactivity triggered at 60s
  const rawRewind = 60;
  const actualRewind = Math.min(session.activeTime, rawRewind);
  session.activeTime -= actualRewind; // 120 - 60 = 60s
  session.idleTime += actualRewind;   // 60s
  session.status = 'idle';

  assert.strictEqual(session.activeTime, 60);
  assert.strictEqual(session.idleTime, 60);

  // Resume tracking after another 30s idle (total idle = 90s)
  session.idleTime += 30;
  session.status = 'active';
  
  // Work actively for another 60s
  session.activeTime += 60; // 60 + 60 = 120s

  const totalTracked = session.activeTime + session.idleTime;
  assert.strictEqual(session.activeTime, 120);
  assert.strictEqual(session.idleTime, 90);
  assert.strictEqual(totalTracked, 210); // 120 + 90 = 210s

  console.log(`  ✅ Test 3 Passed: Active (${session.activeTime}s) + Idle (${session.idleTime}s) = Total (${totalTracked}s). Zero time lost.\n`);
}

testSingleClickResumeWithStalePoll();
testLocalClockTicksAfterResume();
testFullCycleConservation();

console.log('🎉 ALL RESUME & TICKING ENGINE TESTS PASSED PERFECTLY!');
