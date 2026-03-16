# Code Review Checklist

## Review Criteria

### Error Handling
- [ ] All async functions have try-catch
- [ ] Errors are properly typed
- [ ] User-facing errors are friendly

### TypeScript
- [ ] No `any` types without justification
- [ ] Proper type exports
- [ ] Generic types used appropriately

### Naming Conventions
- [ ] Variables: camelCase
- [ ] Classes: PascalCase
- [ ] Constants: UPPER_SNAKE_CASE
- [ ] Files: kebab-case

### Code Quality
- [ ] Functions are small and focused
- [ ] No duplicated code
- [ ] Comments explain "why", not "what"

### Security
- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] SQL injection prevention

### Performance
- [ ] No unnecessary re-renders (React)
- [ ] Proper memoization
- [ ] No N+1 queries

### Testing
- [ ] Unit tests for core logic
- [ ] Edge cases covered
- [ ] Mocks used appropriately

## Issue Severity

| Type | Description |
|------|-------------|
| 🔴 Error | Must fix before merge |
| 🟡 Warning | Should fix |
| 🔵 Suggestion | Nice to have |
