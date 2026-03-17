# Code Review - agentdev

**Date**: 2026-03-17
**Reviewer**: GLM-5

---

## 🔴 Critical Issues

### 1. pool.ts - Promise.race Logic Bug

**Location**: `src/pool.ts:107-120`

**Problem**: 
```typescript
const promises = runningWorkers.map(async w => {
  const result = await this.executeTask(w);
  w.status = 'idle';
  return result;
});

const result = await Promise.race(promises);
results.push(result);
```

**Issue**: All promises start executing, but `Promise.race` only returns one result. Other workers' results are **lost**.

**Fix**: Track all running promises and collect results properly.

---

### 2. dag.ts - Race Returns Null

**Location**: `src/dag.ts:298-304`

**Problem**:
```typescript
const racePromises = Array.from(running.values()).map(p =>
  p.then(r => r, () => null as unknown as Result)
);
const result = await Promise.race(racePromises);
if (result) {
  results.push(result);
}
```

**Issue**: Same as pool.ts - other results are lost. Also, failed results are cast to null which loses error info.

---

### 3. spawn.ts - Missing Timeout Implementation

**Location**: `src/spawn.ts:65-68`

**Problem**:
```typescript
const response = await fetch(`${gateway.baseUrl}/api/v1/spawn`, {
  // ...
});
```

**Issue**: No timeout on fetch. The `gateway.timeout` is passed to the API but not used for the HTTP request itself.

---

## 🟡 Medium Issues

### 4. types.ts - Loose Type Definitions

**Location**: `src/types.ts:45-48`

**Problem**:
```typescript
raw?: unknown;
```

**Issue**: `unknown` is too permissive. Should be typed or use `Record<string, unknown>`.

---

### 5. coordinator.ts - Missing Error Propagation

**Location**: `src/coordinator.ts:93-95`

**Problem**:
```typescript
if (pending.length > 0) {
  throw new Error('Circular dependency detected or missing dependencies');
}
```

**Issue**: Doesn't identify which tasks have circular deps.

---

### 6. router.ts - Hardcoded Model Profiles

**Location**: `src/router.ts:23-69`

**Issue**: Model profiles are hardcoded. Should be configurable via file or API.

---

## 🟢 Minor Issues

### 7. Missing JSDoc Comments

Many public methods lack documentation.

### 8. No Input Validation

No validation for Task objects (e.g., empty id, invalid agent).

### 9. Console.log in Library Code

**Location**: `src/retry.ts:74`, `src/index.ts:121`

Should use a logger abstraction.

---

## 📊 Test Coverage Gaps

### Missing Tests

- `src/spawn.ts` - No tests (hard to test without mocking fetch)
- `src/reviewer.ts` - Only basic test
- `src/pool.ts` - WorkerPool not fully tested

### Edge Cases Not Tested

- DAG with single node
- Empty task queue
- Concurrent task failure handling
- Router with unknown task type

---

## ✅ Fixes Applied

1. ✅ Fixed pool.ts Promise.race bug
2. ✅ Fixed dag.ts race result collection
3. ✅ Added fetch timeout to spawn.ts
4. ✅ Added input validation to Coordinator
5. ✅ Improved error messages

---

## 📝 Recommendations

1. **Add integration tests** with mock HTTP server
2. **Use dependency injection** for fetch/API calls (easier to test)
3. **Add logging abstraction** instead of console.log
4. **Create configuration file** for model profiles (e.g., `models.json`)
5. **Add TypeScript strict mode** checks in CI
