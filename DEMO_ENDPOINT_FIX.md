# Quick Fix: Demo Endpoint Not Working

## Problem
The demo endpoints are returning HTML instead of JSON because the server hasn't picked up the new `demo-resolution.ts` file.

## Solution: Restart the Dev Server

1. **Stop the current server** (Ctrl+C in the terminal running `npm run dev`)

2. **Restart it:**
   ```bash
   npm run dev
   ```

3. **Wait for it to fully start** (you should see "serving on port 5000")

4. **Test again in browser console:**
   ```javascript
   fetch('/api/demo/resolution-candidates', {
     credentials: 'include'
   }).then(r => r.json()).then(console.log);
   ```

## Expected Response

You should see something like:
```json
{
  "total": 1,
  "canResolve": 0,
  "candidates": [
    {
      "id": "b29aaad6-f314-4041-9256-e889e383239d",
      "content": "New arena being built on campus...",
      "trustScore": 0.85,
      "canResolve": false,
      "reason": "Score ≥ 0.75 for only 5.2 hours (need 48)",
      "expectedStatus": "",
      ...
    }
  ]
}
```

## Then Test Force Resolve

Once the candidates endpoint works:

```javascript
fetch('/api/demo/force-resolve/b29aaad6-f314-4041-9256-e889e383239d', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json()).then(console.log);
```

## Alternative: Direct Database Update (If Server Issues Persist)

If restarting doesn't work, you can manually test resolution via Supabase SQL:

```sql
-- 1. Set the timestamp to 49 hours ago
UPDATE rumors
SET score_above_75_since = NOW() - INTERVAL '49 hours'
WHERE id = 'b29aaad6-f314-4041-9256-e889e383239d'
AND trust_score >= 0.75;

-- 2. Check if it would resolve
SELECT id, trust_score, score_above_75_since,
       (score_above_75_since <= NOW() - INTERVAL '48 hours') as can_resolve
FROM rumors
WHERE id = 'b29aaad6-f314-4041-9256-e889e383239d';

-- 3. Manually resolve (if you want to skip the endpoint entirely)
UPDATE rumors
SET status = 'Verified',
    resolved_at = NOW()
WHERE id = 'b29aaad6-f314-4041-9256-e889e383239d';

-- 4. Check your user stats
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 1;
```

---

**Most likely fix:** Just restart the dev server! 🔄
