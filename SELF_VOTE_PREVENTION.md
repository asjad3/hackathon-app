# Self-Vote Prevention Implementation

## Changes Made

### 1. Database Schema Update

**File:** `supabase/migrations/20260207_add_evidence_creator.sql`

Added `creator_hash` column to the `evidence` table to track who created each piece of evidence:

```sql
ALTER TABLE evidence
ADD COLUMN IF NOT EXISTS creator_hash VARCHAR(64);
```

This allows us to prevent users from voting on their own evidence.

### 2. Backend Type Updates

**File:** `server/supabase.ts`

Updated TypeScript types to include the new `creator_hash` field in the evidence table schema.

### 3. Storage Layer Updates

**File:** `server/storage.ts`

#### IStorage Interface

- Updated `createEvidence()` method signature to require `creatorHash` parameter

#### DatabaseStorage Implementation

- Modified `createEvidence()` to store the creator hash when evidence is submitted
- Added self-vote check in `createVote()` before allowing votes:

    ```typescript
    // Generate user's creator hash
    const userCreatorHash = createHash("sha256")
        .update(`${userId}:${salt}:creator`)
        .digest("hex");

    // Compare with evidence creator
    if (evidence.creator_hash === userCreatorHash) {
        return {
            success: false,
            error: "You cannot vote on your own evidence",
        };
    }
    ```

### 4. Routes Updates

**File:** `server/routes.ts`

- Added `createHash` import
- Updated evidence creation endpoint to generate and store creator hash:
    ```typescript
    const creatorHash = createHash("sha256")
        .update(`${userId}:${salt}:creator`)
        .digest("hex");
    ```
- Updated seed data function to include creator hash for demo evidence

## How It Works

### Hash Generation Strategy

1. **Creator Hash** (when creating evidence):
    - Format: `SHA256(userId:salt:creator)`
    - Stored in `evidence.creator_hash`
    - Independent of specific evidence ID

2. **Vote Hash** (when voting):
    - Format: `SHA256(userId:salt:evidenceId)`
    - Used for duplicate vote prevention
    - Different for each evidence item

3. **Comparison**:
    - When a user votes, we regenerate their creator hash
    - Compare it with the evidence's stored creator hash
    - If they match → reject the vote

### Why This Approach?

- **Maintains Anonymity**: Both creator and voter identities remain hashed
- **No Extra Lookups**: Creator hash is stored directly on evidence
- **Fast Comparison**: Simple string equality check
- **Prevents Self-Voting**: User cannot vote on evidence they created
- **Allows Multiple Evidence**: Same user can create multiple pieces of evidence

## Database Migration Required

Run this SQL in your Supabase dashboard:

```sql
-- Add creator tracking column
ALTER TABLE evidence
ADD COLUMN IF NOT EXISTS creator_hash VARCHAR(64);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_evidence_creator_hash ON evidence(creator_hash);
```

## User Experience

When a user tries to vote on their own evidence:

- Vote is rejected
- Error message: "You cannot vote on your own evidence"
- No points are deducted
- No database changes occur

## Testing

To test this feature:

1. Create a rumor as User A
2. Add evidence to the rumor as User A
3. Try to vote on that evidence as User A
    - **Expected**: Vote rejected with error message
4. Vote on the evidence as User B
    - **Expected**: Vote accepted normally

## Security Considerations

- Creator hash uses the same salt as vote hashes (from `VOTE_SALT` environment variable)
- Hashes are one-way (SHA-256) - cannot reverse to get original user ID
- Creator cannot be identified from the hash alone
- System prevents gaming through self-voting while maintaining privacy
