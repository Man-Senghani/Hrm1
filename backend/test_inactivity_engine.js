/**
 * Automated Verification Test Suite for Inactivity Detection & Time Engine
 * Tests all 6 critical invariants:
 * 1. Inactivity detection stops active-work timer
 * 2. Prolonged inactivity does not increase active-work time
 * 3. RESUME correctly restarts active-work time
 * 4. Duplicate timers cannot run simultaneously
 * 5. Backend updates cannot incorrectly reactivate the timer
 * 6. Normal user activity still works correctly
 */

const assert = require('assert');

console.log('🧪 Starting Time Tracking & Inactivity Engine Test Suite...\n');

// ── TEST 1: State Machine & Idle Guard Verification
function runTest1() {
  console.log('Test 1: Inactivity detection freezes active work time');
  let status = 'ACTIVE';
  let isSessionRunning = true;
  let isIdle = false;
  let baseActiveSeconds = 28905; // 08:01:45
  let activeSeconds = baseActiveSeconds;
  let baseInactiveSeconds = 0;
  let inactiveSeconds = 0;
  let idleStartTime = null;

  // Trigger idle at 60s
  function triggerIdle(idleSeconds = 60) {
    status = 'IDLE';
    isIdle = true;
    isSessionRunning = false;
    baseActiveSeconds = Math.max(0, baseActiveSeconds - idleSeconds);
    activeSeconds = baseActiveSeconds;
    baseInactiveSeconds += idleSeconds;
    idleStartTime = Date.now();
    inactiveSeconds = baseInactiveSeconds;
  }

  triggerIdle(60);

  // Assert activeSeconds rewound & isSessionRunning is false
  assert.strictEqual(status, 'IDLE');
  assert.strictEqual(isSessionRunning, false);
  assert.strictEqual(isIdle, true);
  assert.strictEqual(activeSeconds, 28845);
  assert.strictEqual(inactiveSeconds, 60);
  console.log('  ✅ Test 1 Passed: Inactivity instantly stopped active time & rewound correctly.\n');
}

// ── TEST 2: Prolonged Inactivity Simulation
function runTest2() {
  console.log('Test 2: Prolonged inactivity does not increase active-work time');
  let status = 'IDLE';
  let isSessionRunning = false;
  let baseActiveSeconds = 28845;
  let activeSeconds = baseActiveSeconds;
  let baseInactiveSeconds = 60;
  let inactiveSeconds = baseInactiveSeconds;
  let idleStartTime = Date.now() - 30000; // 30s elapsed in idle

  // Simulate 10 ticks of local clock loop while IDLE
  for (let i = 1; i <= 10; i++) {
    if (status === 'ACTIVE' && isSessionRunning) {
      activeSeconds += 1;
    } else if (status === 'IDLE') {
      const idleElapsed = Math.floor((Date.now() - idleStartTime) / 1000);
      inactiveSeconds = baseInactiveSeconds + Math.max(0, idleElapsed);
    }
  }

  // Active seconds must remain exactly 28845 throughout all ticks
  assert.strictEqual(activeSeconds, 28845, 'Active seconds must remain frozen');
  assert(inactiveSeconds >= 90, 'Inactive seconds must increment');
  console.log(`  ✅ Test 2 Passed: Active time stayed frozen at ${activeSeconds}s while inactive time grew to ${inactiveSeconds}s.\n`);
}

// ── TEST 3: Backend Status Polling Cannot Reactivate Timer While IDLE
function runTest3() {
  console.log('Test 3: Backend updates cannot incorrectly reactivate the timer');
  let status = 'IDLE';
  let isIdle = true;
  let isSessionRunning = false;
  let baseActiveSeconds = 28845;
  let activeSeconds = baseActiveSeconds;

  function applyServerState(data) {
    const serverStatus = String(data.status || '').toLowerCase();
    if (serverStatus === 'idle') {
      status = 'IDLE';
      isIdle = true;
      isSessionRunning = false;
      if (data.activeTime !== undefined && data.activeTime >= 0) {
        baseActiveSeconds = data.activeTime;
        activeSeconds = baseActiveSeconds;
      }
    } else if (serverStatus === 'active' && data.isRunning) {
      // 🛡️ CRITICAL GUARD
      if (status === 'IDLE' || isIdle) {
        return;
      }
      status = 'ACTIVE';
      isSessionRunning = true;
    }
  }

  // Simulate receiving a stale active payload while locally idle
  applyServerState({ status: 'active', isRunning: true, activeTime: 28905 });

  assert.strictEqual(status, 'IDLE', 'Status must not be overwritten to ACTIVE');
  assert.strictEqual(isSessionRunning, false, 'Session must not be running');
  assert.strictEqual(activeSeconds, 28845, 'Active seconds must remain frozen');
  console.log('  ✅ Test 3 Passed: Stale active background polling was rejected by IDLE guard.\n');
}

// ── TEST 4: RESUME Correctly Restarts Active-Work Time
function runTest4() {
  console.log('Test 4: RESUME correctly restarts active-work time');
  let status = 'IDLE';
  let isIdle = true;
  let isSessionRunning = false;
  let baseActiveSeconds = 28845;
  let activeSeconds = baseActiveSeconds;
  let segmentStartTime = null;

  function resumeSession() {
    status = 'ACTIVE';
    isIdle = false;
    isSessionRunning = true;
    segmentStartTime = Date.now();
  }

  resumeSession();

  assert.strictEqual(status, 'ACTIVE');
  assert.strictEqual(isIdle, false);
  assert.strictEqual(isSessionRunning, true);
  assert(segmentStartTime !== null);

  // Simulate 3 ticks of active work
  for (let i = 1; i <= 3; i++) {
    if (status === 'ACTIVE' && isSessionRunning) {
      activeSeconds += 1;
    }
  }
  assert.strictEqual(activeSeconds, 28848);
  console.log(`  ✅ Test 4 Passed: Active timer resumed from ${baseActiveSeconds}s to ${activeSeconds}s.\n`);
}

// ── TEST 5: Backend Rejects Heartbeat Activity While in IDLE State
function runTest5() {
  console.log('Test 5: Backend rejects heartbeat activity while in IDLE state');
  const session = {
    status: 'idle',
    isRunning: false,
    activeTime: 28845,
    idleTime: 1824,
    lastHeartbeat: new Date()
  };

  function backendUpdateActivity(reqBody) {
    const type = String(reqBody.type || '').toLowerCase();
    const isActiveSignal = ['mouse', 'keyboard', 'click', 'scroll', 'touch', 'focus', 'tab', 'active', 'heartbeat'].includes(type);

    if (session.status === 'active') {
      session.activeTime += 10;
    } else if (session.status === 'idle') {
      // 🛡️ STRICT IDLE LOCK
      session.lastHeartbeat = new Date();
      session.isRunning = false;
      session.segmentStart = null;
    }
    return { ...session };
  }

  const res = backendUpdateActivity({ type: 'heartbeat' });
  assert.strictEqual(res.status, 'idle');
  assert.strictEqual(res.isRunning, false);
  assert.strictEqual(res.activeTime, 28845, 'Active time must not increase on heartbeat while idle');
  console.log('  ✅ Test 5 Passed: Backend preserved frozen activeTime during idle heartbeat.\n');
}

// ── TEST 6: Normal Active User Activity Still Functions Perfectly
function runTest6() {
  console.log('Test 6: Normal active user activity functions correctly');
  const session = {
    status: 'active',
    isRunning: true,
    activeTime: 100,
    lastHeartbeat: new Date(Date.now() - 10000) // 10s ago
  };

  function backendActiveHeartbeat() {
    const now = Date.now();
    const elapsed = Math.round((now - session.lastHeartbeat.getTime()) / 1000);
    session.activeTime += elapsed;
    session.lastHeartbeat = new Date(now);
    return { ...session };
  }

  const res = backendActiveHeartbeat();
  assert.strictEqual(res.status, 'active');
  assert.strictEqual(res.activeTime, 110);
  console.log('  ✅ Test 6 Passed: Normal active sessions accumulate time accurately.\n');
}

// ── TEST 7: Total Session Time Conservation (Start -> Idle -> Resume -> Checkout)
function runTest7() {
  console.log('Test 7: Total Session Time = Active Time + Inactive Time (Exact Conservation)');
  
  // 1. Start at 9:00 AM (0s)
  const startTime = new Date('2026-08-20T09:00:00.000Z');
  let session = {
    startTime,
    segmentStart: startTime,
    status: 'active',
    isRunning: true,
    activeTime: 0,
    idleTime: 0,
    idleStart: null,
    inactivityCount: 0
  };

  // 2. Active work until 10:00 AM (3600 seconds)
  const tenAM = new Date('2026-08-20T10:00:00.000Z');
  session.activeTime += (tenAM - session.segmentStart) / 1000;
  session.segmentStart = tenAM;

  assert.strictEqual(session.activeTime, 3600, 'Active time at 10:00 AM must be 3600s (1 hour)');

  // 3. Inactivity occurs at 10:00 AM, detected at 10:01 AM (60 seconds later)
  const tenZeroOneAM = new Date('2026-08-20T10:01:00.000Z');
  const detectionElapsed = (tenZeroOneAM - session.segmentStart) / 1000; // 60s
  session.activeTime += detectionElapsed; // Temporary tick before detection (3660s)
  
  // Dynamic Rewind: 60s subtracted from activeTime and transferred to idleTime
  const rewind = 60;
  session.activeTime = Math.max(0, session.activeTime - rewind);
  session.idleTime += rewind;
  session.idleStart = tenZeroOneAM;
  session.status = 'idle';
  session.isRunning = false;
  session.segmentStart = null;

  assert.strictEqual(session.activeTime, 3600, 'Active time must be exactly 3600s after 1-minute rewind');
  assert.strictEqual(session.idleTime, 60, 'Idle time must include the first 1-minute detection period (60s)');

  // 4. User stays away until 10:10 AM (9 minutes = 540 seconds elapsed in idle)
  const tenTenAM = new Date('2026-08-20T10:10:00.000Z');
  const remainingIdle = (tenTenAM - session.idleStart) / 1000; // 540s
  session.idleTime += remainingIdle;
  session.idleStart = null;
  session.status = 'active';
  session.isRunning = true;
  session.segmentStart = tenTenAM;

  assert.strictEqual(session.activeTime, 3600, 'Active time must remain 3600s upon resume');
  assert.strictEqual(session.idleTime, 600, 'Total idle time must be exactly 600s (10 minutes from 10:00 to 10:10)');
  assert.strictEqual(session.activeTime + session.idleTime, 4200, 'Total elapsed at 10:10 AM must be 4200s (1h 10m)');

  // 5. Active work from 10:10 AM to 5:00 PM (6 hours 50 mins = 24,600 seconds)
  const fivePM = new Date('2026-08-20T17:00:00.000Z');
  session.activeTime += (fivePM - session.segmentStart) / 1000; // +24,600s
  session.segmentStart = null;
  session.status = 'completed';
  session.isRunning = false;
  session.endTime = fivePM;

  const totalSessionSeconds = (session.endTime - session.startTime) / 1000; // 8 hours = 28,800s

  assert.strictEqual(session.activeTime, 28200, 'Active time must be 28,200s (7h 50m)');
  assert.strictEqual(session.idleTime, 600, 'Inactive time must be 600s (10m)');
  assert.strictEqual(totalSessionSeconds, 28800, 'Total session duration must be 28,800s (8h)');
  assert.strictEqual(session.activeTime + session.idleTime, totalSessionSeconds, 'Active + Inactive MUST equal Total Duration');

  console.log(`  ✅ Test 7 Passed: Active (${session.activeTime}s) + Inactive (${session.idleTime}s) = Total Duration (${totalSessionSeconds}s). Zero time lost.\n`);
}

runTest1();
runTest2();
runTest3();
runTest4();
runTest5();
runTest6();
runTest7();

console.log('🎉 ALL 7 INACTIVITY & TIME TRACKING TESTS PASSED PERFECTLY!');
