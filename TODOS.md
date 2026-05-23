# FIX-SEC: /_sim auth bypass + E-Stop API auth middleware

## Vulnerabilities Found

### 1. `/_sim` Auth Bypass
- `/_sim` is in both `publicPaths` (isProtectedRoute) and `skipAuthPaths` (authMiddleware)
- Uses startsWith matching → ALL `/_sim/*` are unauthenticated
- POST `/_sim/scenario`, `/_sim/speed`, `/_sim/fault` are mutation endpoints with NO auth
- Attacker on LAN can inject faults, manipulate simulator, trigger E-Stop chain reaction

### 2. E-Stop API Auth Inconsistency
- POST /api/hal/estop (activate) → NO inline auth (relies only on global middleware)
- PUT /api/hal/estop/safe-states/:deviceId → NO inline auth  
- POST /api/hal/estop/clear → HAS inline session validation (good)
- Inconsistency is a security gap — missing defense-in-depth

## Fix Plan

### Step 1: Fix `/_sim` auth bypass in security/auth.ts
- Remove `/_sim` from skipAuthPaths in authMiddleware()
- Keep GET safe but require auth for POST/PUT/DELETE

### Step 2: Fix `/_sim` auth bypass in hal-ui-server.ts
- Remove `/_sim` from publicPaths in isProtectedRoute()
- Same: GET stays readable, mutations require auth

### Step 3: Add inline auth to E-Stop activate endpoint
- POST /api/hal/estop → add session validation matching clear endpoint pattern

### Step 4: Add inline auth to E-Stop safe-states endpoint
- PUT /api/hal/estop/safe-states/:deviceId → add session validation

### Step 5: Verify build compiles and tests pass
