# Cerebro Integration Audit & Fixes

## Current Issues Identified

### 1. Task Model Inconsistencies
- **Problem**: Task types differ between frontend and backend
- **Frontend**: Uses `TaskStatus = 'READY' | 'EXECUTING' | 'COMPLETED' | 'FAILED'`
- **Backend**: Also defines `TaskStatus` enum but repository may use string casting
- **Impact**: Type mismatches, potential runtime errors

### 2. Recurring Task Schema Mismatch
- **Problem**: Database has both old columns (`scheduleType`, `enabled`) and new columns (`pattern`, `active`)
- **Backend**: Repository tries to write to both, but types don't align
- **Frontend**: Sends `scheduleType` but backend transforms to `pattern`
- **Impact**: NOT NULL constraint failures, confusing data model

### 3. Missing API Endpoints
- **Toggle endpoint**: `/api/recurring/:id/toggle` was missing (just added)
- **Clear all tasks**: `/api/tasks` DELETE endpoint exists but needs verification

### 4. State Management Issues
- **Problem**: Frontend state updates optimistically but doesn't handle failures
- **Problem**: Race conditions when multiple updates happen simultaneously
- **Problem**: Editing recurring tasks - form state gets out of sync

### 5. Model Override Handling
- **Problem**: Model aliases vs full IDs cause 404 errors
- **Problem**: No validation of model IDs before saving

## Required Fixes

### Backend Changes

1. **Standardize Task Types**
   - Ensure TaskStatus enum is used consistently
   - Add validation middleware for task creation

2. **Fix Recurring Task Schema**
   - Single source of truth for schedule types
   - Proper transformation layer

3. **Add Structured Logging**
   - Log all API requests/responses
   - Log task state transitions
   - Log errors with context

4. **Add Validation**
   - Validate task input before saving
   - Validate model IDs against available models
   - Return clear error messages

### Frontend Changes

1. **Standardize API Client**
   - Consistent error handling
   - Type-safe requests/responses
   - Retry logic for transient failures

2. **Fix State Management**
   - Proper form state handling for recurring tasks
   - Optimistic updates with rollback
   - Loading states for all async operations

3. **Add Error Handling**
   - Display API errors to user
   - Form validation before submit
   - Toast notifications for success/failure

## Implementation Plan

### Phase 1: Backend Stabilization
1. Fix task status consistency
2. Add request/response logging
3. Add validation middleware
4. Fix recurring task schema

### Phase 2: Frontend Stabilization
1. Fix API client error handling
2. Fix form state management
3. Add loading states
4. Add error display

### Phase 3: Integration Testing
1. Test task creation flow
2. Test recurring task flow
3. Test auto-execution flow
4. Test manual execution flow
