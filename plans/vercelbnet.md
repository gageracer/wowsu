# Vercel Blob + Battle.net OAuth Integration Plan

## Overview

Transform the guild roster system from a dev-only file-based system to a production-ready authenticated system using Vercel Blob storage and Battle.net OAuth.

### Goals
1. Move roster data from filesystem to Vercel Blob storage
2. Implement Battle.net OAuth for user authentication
3. Restrict roster updates to authorized guild members only
4. Maintain historical roster snapshots
5. Stay within Vercel's free tier limits

### Architecture

User → Battle.net OAuth → App Session → Protected API → Vercel Blob
                                            ↓
                                    Check Guild Membership
                                            ↓
                                    Verify Permissions

---

## Phase 1: Vercel Blob Setup

### 1.1 Install Dependencies

npm install @vercel/blob

### 1.2 Environment Variables

Create/update `.env.local`:

# Vercel Blob (auto-populated in production)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx

# For local development, get token from Vercel dashboard:
# Project Settings → Storage → Blob → Copy Token

### 1.3 Blob Storage Structure

blobs/
├── roster/current.json          # Current active roster
├── roster/history/
│   ├── 2025-01-28_153000.json  # Historical snapshots
│   ├── 2025-01-29_120000.json
│   └── ...
└── metadata/
    └── last-update.json         # Metadata about last update

### 1.4 Create Blob Utility Functions

**File**: `src/lib/server/blob-storage.ts`

import { put, list, head, del } from '@vercel/blob';
import type { RosterData } from '$lib/types/roster';

const BLOB_PREFIX = 'roster';

export async function getCurrentRoster(): Promise<RosterData | null> {
  try {
    const response = await fetch(
      `https://${process.env.VERCEL_BLOB_STORE_ID}.public.blob.vercel-storage.com/${BLOB_PREFIX}/current.json`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching current roster:', error);
    return null;
  }
}

export async function saveCurrentRoster(data: RosterData): Promise<string> {
  const blob = await put(`${BLOB_PREFIX}/current.json`, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json'
  });
  return blob.url;
}

export async function saveHistoricalRoster(
  data: RosterData,
  timestamp: string
): Promise<string> {
  const blob = await put(
    `${BLOB_PREFIX}/history/${timestamp}.json`,
    JSON.stringify(data, null, 2),
    {
      access: 'public',
      contentType: 'application/json'
    }
  );
  return blob.url;
}

export async function listHistoricalRosters(): Promise<string[]> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}/history/` });
  return blobs.map(b => b.pathname).sort().reverse();
}

---

## Phase 2: Battle.net OAuth Integration

### 2.1 Register Application

1. Go to https://develop.battle.net/access/clients
2. Click "Create Client"
3. Fill in details:
   - **Name**: Your Guild Roster Manager
   - **Redirect URIs**: 
     - Development: `http://localhost:5173/api/auth/battlenet/callback`
     - Production: `https://hiveguild.site/api/auth/battlenet/callback`
   - **Service**: World of Warcraft
4. Save `CLIENT_ID` and `CLIENT_SECRET`

### 2.2 Environment Variables

Add to `.env.local`:

# Battle.net OAuth
BATTLENET_CLIENT_ID=your_client_id_here
BATTLENET_CLIENT_SECRET=your_client_secret_here
BATTLENET_REDIRECT_URI=http://localhost:5173/api/auth/battlenet/callback

# Battle.net API Configuration
BATTLENET_REGION=eu
BATTLENET_NAMESPACE=profile-eu
BATTLENET_LOCALE=en_GB

# Your Guild Information
GUILD_NAME=The Hive Mind
GUILD_REALM=executus
GUILD_REGION=eu
GUILD_FACTION=alliance

# Authorized Ranks (rank indices that can update roster)
# Example: 0=Guild Master, 1=Officer, 2=Raider
AUTHORIZED_RANKS=0,1,2

### 2.3 Create Auth Endpoints

**File**: `src/routes/api/auth/battlenet/login/+server.ts`

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const clientId = process.env.BATTLENET_CLIENT_ID;
  const redirectUri = process.env.BATTLENET_REDIRECT_URI;
  const region = process.env.BATTLENET_REGION || 'eu';

  const authUrl = new URL(`https://${region}.battle.net/oauth/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'wow.profile');
  
  throw redirect(302, authUrl.toString());
};

**File**: `src/routes/api/auth/battlenet/callback/+server.ts`

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  
  if (!code) {
    throw error(400, 'No authorization code provided');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${process.env.BATTLENET_REGION}.battle.net/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(
            `${process.env.BATTLENET_CLIENT_ID}:${process.env.BATTLENET_CLIENT_SECRET}`
          )}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.BATTLENET_REDIRECT_URI
        })
      }
    );

    if (!tokenResponse.ok) {
      throw error(500, 'Failed to exchange authorization code');
    }

    const { access_token } = await tokenResponse.json();

    // Fetch user info
    const userInfo = await fetchUserInfo(access_token);
    
    // Check guild membership
    const guildMember = await checkGuildMembership(access_token, userInfo.id);

    if (!guildMember) {
      throw error(403, 'Not a member of the guild');
    }

    // Create session
    const session = {
      userId: userInfo.id,
      battleTag: userInfo.battletag,
      character: guildMember.character,
      rank: guildMember.rank,
      canUpdate: guildMember.canUpdate,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    cookies.set('session', JSON.stringify(session), {
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    throw redirect(302, '/roster');
  } catch (err) {
    console.error('Auth error:', err);
    throw error(500, 'Authentication failed');
  }
};

async function fetchUserInfo(accessToken: string) {
  const response = await fetch(
    `https://${process.env.BATTLENET_REGION}.battle.net/oauth/userinfo`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  return await response.json();
}

async function checkGuildMembership(accessToken: string, userId: number) {
  // Fetch user's WoW profile
  const profileResponse = await fetch(
    `https://${process.env.BATTLENET_REGION}.api.blizzard.com/profile/user/wow?namespace=${process.env.BATTLENET_NAMESPACE}&locale=${process.env.BATTLENET_LOCALE}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  const profile = await profileResponse.json();

  // Check all characters for guild membership
  for (const account of profile.wow_accounts) {
    for (const character of account.characters) {
      if (
        character.guild?.name === process.env.GUILD_NAME &&
        character.realm.slug === process.env.GUILD_REALM
      ) {
        const authorizedRanks = process.env.AUTHORIZED_RANKS.split(',').map(Number);
        return {
          character: character.name,
          rank: character.guild.rank,
          canUpdate: authorizedRanks.includes(character.guild.rank)
        };
      }
    }
  }

  return null;
}

**File**: `src/routes/api/auth/logout/+server.ts`

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.delete('session', { path: '/' });
  throw redirect(302, '/');
};

### 2.4 Create Auth Middleware

**File**: `src/lib/server/auth.ts`

import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export interface Session {
  userId: number;
  battleTag: string;
  character: string;
  rank: number;
  canUpdate: boolean;
  expiresAt: number;
}

export function getSession(event: RequestEvent): Session | null {
  const sessionCookie = event.cookies.get('session');
  
  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie) as Session;
    
    // Check if session expired
    if (session.expiresAt < Date.now()) {
      event.cookies.delete('session', { path: '/' });
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function requireAuth(event: RequestEvent): Session {
  const session = getSession(event);
  
  if (!session) {
    throw error(401, 'Authentication required');
  }

  return session;
}

export function requireUpdatePermission(event: RequestEvent): Session {
  const session = requireAuth(event);
  
  if (!session.canUpdate) {
    throw error(403, 'Insufficient permissions to update roster');
  }

  return session;
}

---

## Phase 3: Update API Endpoints with Auth

### 3.1 Update Data Endpoint

**File**: `src/routes/roster/api/data/+server.ts`

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentRoster } from '$lib/server/blob-storage';
import { dev } from '$app/environment';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Fallback: Import bundled data for initial deployment
import fallbackRosterData from '$lib/data/roster.json';

export const GET: RequestHandler = async () => {
  try {
    // In development, try filesystem first
    if (dev) {
      const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');
      if (existsSync(rosterPath)) {
        const rosterText = await readFile(rosterPath, 'utf-8');
        const rosterData = JSON.parse(rosterText);
        return json(rosterData);
      }
    }

    // In production, fetch from Vercel Blob
    const rosterData = await getCurrentRoster();
    
    if (rosterData) {
      return json(rosterData);
    }

    // Fallback to bundled data
    return json(fallbackRosterData);
  } catch (error) {
    console.error('Error reading roster:', error);
    return json(fallbackRosterData);
  }
};

### 3.2 Update Update Endpoint with Auth

**File**: `src/routes/roster/api/update/+server.ts`

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUpdatePermission } from '$lib/server/auth';
import { getCurrentRoster, saveCurrentRoster, saveHistoricalRoster } from '$lib/server/blob-storage';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { RosterMember } from '$lib/types/roster';
import { dev } from '$app/environment';

function parseLuaAutoExport(luaText: string): any[] | null {
  // ... (keep existing parsing function)
}

export const GET: RequestHandler = async ({ cookies }) => {
  // Check auth - only logged in users can check for updates
  const session = requireUpdatePermission({ cookies } as any);

  // Only works in dev mode
  if (!dev) {
    return json({ hasUpdate: false, error: 'Update check only available in development' });
  }

  try {
    const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
    if (!existsSync(luaPath)) {
      return json({ hasUpdate: false, error: 'Lua file not found' });
    }

    const luaText = await readFile(luaPath, 'utf-8');
    const luaData = parseLuaAutoExport(luaText);

    if (!luaData) {
      return json({ hasUpdate: false, error: 'Could not parse Lua file' });
    }

    const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

    // Get current roster from Blob storage
    const currentRoster = await getCurrentRoster();
    const currentLastUpdated = currentRoster?.lastUpdated || 0;

    return json({
      hasUpdate: luaLastUpdated > currentLastUpdated,
      luaData,
      luaLastUpdated,
      currentLastUpdated,
      updatedBy: session.character
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    return json({ hasUpdate: false, error: 'Failed to check for updates' });
  }
};

export const POST: RequestHandler = async ({ cookies }) => {
  // Require update permission
  const session = requireUpdatePermission({ cookies } as any);

  try {
    let luaData: any[];
    
    if (dev) {
      // In dev: read from Lua file
      const luaPath = join(process.cwd(), 'static', 'GuildRosterExport.lua');
      if (!existsSync(luaPath)) {
        return json({ success: false, error: 'Lua file not found' }, { status: 404 });
      }

      const luaText = await readFile(luaPath, 'utf-8');
      luaData = parseLuaAutoExport(luaText);

      if (!luaData) {
        return json({ success: false, error: 'Could not parse Lua file' }, { status: 400 });
      }
    } else {
      // In production: would need to upload Lua file or use different method
      return json(
        { success: false, error: 'Roster updates from Lua only available in development' },
        { status: 400 }
      );
    }

    // Get current roster from Blob storage
    const currentRoster = await getCurrentRoster();
    let currentMembers: RosterMember[] = [];

    if (currentRoster?.members) {
      currentMembers = currentRoster.members;

      // Save current roster as historical snapshot BEFORE overwriting
      if (currentRoster.lastUpdated) {
        const oldTimestamp = new Date(currentRoster.lastUpdated * 1000)
          .toISOString()
          .replace(/T/, '_')
          .replace(/:/g, '')
          .replace(/\..+/, '')
          .substring(0, 15);

        await saveHistoricalRoster(currentRoster, oldTimestamp);
        console.log(`Saved historical snapshot: ${oldTimestamp}`);
      }
    }

    // Create a map of existing roles
    const existingRoles = new Map();
    currentMembers.forEach((member: RosterMember) => {
      if (member.mainSpec && member.mainRole) {
        existingRoles.set(member.name, {
          spec: member.mainSpec,
          role: member.mainRole
        });
      }
    });

    // Merge: Apply existing roles to new roster
    const merged = luaData.map((newMember: any) => {
      const existingRole = existingRoles.get(newMember.name);
      if (existingRole) {
        return {
          ...newMember,
          mainSpec: existingRole.spec,
          mainRole: existingRole.role
        };
      }
      return newMember;
    });

    const luaLastUpdated = Math.max(...luaData.map((m: any) => m.lastOnline));

    // Create the new roster data
    const newRosterData = {
      version: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      lastUpdated: luaLastUpdated,
      members: merged,
      updatedBy: session.character,
      updatedAt: new Date().toISOString()
    };

    // Save to Blob storage
    await saveCurrentRoster(newRosterData);

    return json({
      success: true,
      memberCount: merged.length,
      rolesPreserved: existingRoles.size,
      lastUpdated: luaLastUpdated,
      updatedBy: session.character
    });
  } catch (error) {
    console.error('Error updating roster:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update roster'
      },
      { status: 500 }
    );
  }
};

---

## Phase 4: Update Frontend

### 4.1 Add Login/Logout UI

**File**: `src/routes/roster/+page.svelte` (add to top)

<script lang="ts">
  import RosterTable from '$lib/components/Roster.svelte';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();
  
  // Add session data
  let session = $state(data.session);
  let isLoggedIn = $derived(!!session);
  let canUpdate = $derived(session?.canUpdate || false);
  
  // ... rest of existing code ...

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/roster';
  }
</script>

<!-- Add login/user info UI -->
<div class="mb-4 flex items-center justify-between">
  <h1 class="text-3xl font-bold">Guild Roster</h1>
  
  <div class="flex items-center gap-4">
    {#if isLoggedIn}
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-400">
          Logged in as <strong>{session.character}</strong>
        </span>
        <button
          onclick={handleLogout}
          class="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
        >
          Logout
        </button>
      </div>
    {:else}
      <a
        href="/api/auth/battlenet/login"
        class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Login with Battle.net
      </a>
    {/if}
  </div>
</div>

<!-- Only show update notification if user can update -->
{#if canUpdate && showUpdateNotification}
  <!-- ... existing update notification code ... -->
{/if}

<!-- Rest of your roster code -->

### 4.2 Update Page Loader

**File**: `src/routes/roster/+page.ts`

Add session data:

import { getSession } from '$lib/server/auth';

export const load: PageLoad = async ({ fetch, cookies }) => {
  // Get session if exists
  const session = getSession({ cookies } as any);

  // ... rest of existing load code ...

  return {
    members,
    lastUpdated,
    version,
    luaData,
    luaLastUpdated,
    hasUpdate: !!(luaLastUpdated && luaLastUpdated > lastUpdated),
    session // Add session to return data
  };
};

---

## Phase 5: Migration Plan

### 5.1 Initial Data Migration

1. **One-time migration script** to upload current roster to Vercel Blob:

**File**: `scripts/migrate-to-blob.ts`

import { put } from '@vercel/blob';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function migrate() {
  // Read current roster
  const rosterPath = join(process.cwd(), 'src', 'lib', 'data', 'roster.json');
  const rosterData = await readFile(rosterPath, 'utf-8');

  // Upload to Blob
  const blob = await put('roster/current.json', rosterData, {
    access: 'public',
    contentType: 'application/json'
  });

  console.log('Migrated to Blob:', blob.url);
}

migrate();

Run with:
BLOB_READ_WRITE_TOKEN=your_token npx tsx scripts/migrate-to-blob.ts

### 5.2 Deployment Steps

1. **Deploy to Vercel with environment variables**
2. **Run migration script** to upload initial data
3. **Test authentication flow**
4. **Test roster updates** with authorized user
5. **Monitor Blob storage usage** in Vercel dashboard

---

## Phase 6: Monitoring & Optimization

### 6.1 Usage Monitoring

Create a simple dashboard to monitor:
- Blob storage size
- Number of API calls
- Historical snapshot count

### 6.2 Cost Optimization

**Free Tier Limits:**
- Blob: 500 MB, 1M operations/month
- Bandwidth: 100 GB/month

**Optimizations:**
- Cache roster data client-side (localStorage)
- Use SvelteKit's load cache
- Implement rate limiting on update endpoint
- Periodically clean old historical snapshots (keep last 30 days)

### 6.3 Cleanup Script

**File**: `src/routes/api/admin/cleanup-history/+server.ts`

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUpdatePermission } from '$lib/server/auth';
import { list, del } from '@vercel/blob';

export const POST: RequestHandler = async ({ cookies }) => {
  const session = requireUpdatePermission({ cookies } as any);

  // Only guild master (rank 0) can cleanup
  if (session.rank !== 0) {
    return json({ error: 'Only guild master can cleanup history' }, { status: 403 });
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const { blobs } = await list({ prefix: 'roster/history/' });
  
  let deleted = 0;
  for (const blob of blobs) {
    if (blob.uploadedAt.getTime() < thirtyDaysAgo) {
      await del(blob.url);
      deleted++;
    }
  }

  return json({ success: true, deleted });
};

---

## Phase 7: Additional Features

### 7.1 Manual Roster Upload (Production)

Since Lua files won't be available in production, add a manual upload feature:

<!-- Allow officers to upload exported Lua file -->
<input type="file" accept=".lua" onchange={handleFileUpload} />

### 7.2 Activity Log

Track who updated what and when:

// Save to Blob as roster/activity-log.json
{
  updates: [
    { timestamp, character, action: 'update', memberCount, ... }
  ]
}

### 7.3 API Rate Limiting

Implement simple rate limiting to protect Battle.net API quota.

---

## Cost Estimation

### Free Tier Usage Estimate

**Assumptions:**
- 50 members in roster (~50 KB JSON)
- 1 update per day
- 100 page views per day
- Keep 30 days of history

**Storage:**
- Current roster: 50 KB
- 30 historical snapshots: 50 KB × 30 = 1.5 MB
- **Total: ~2 MB** ✅ Well under 500 MB limit

**Operations:**
- Page loads: 100/day × 30 days = 3,000/month
- Updates: 1/day × 30 days = 30/month
- **Total: ~3,030/month** ✅ Well under 1M limit

**Bandwidth:**
- Page loads: 100/day × 50 KB × 30 days = ~150 MB/month
- **Total: ~150 MB** ✅ Well under 100 GB limit

**Conclusion:** Should easily stay within free tier!

---

## Implementation Timeline

### Week 1: Setup & Auth
- [ ] Create Battle.net application
- [ ] Set up Vercel Blob storage
- [ ] Implement OAuth endpoints
- [ ] Test authentication flow

### Week 2: Storage Migration
- [ ] Create Blob utility functions
- [ ] Migrate current roster to Blob
- [ ] Update API endpoints
- [ ] Test read/write operations

### Week 3: Frontend & Permissions
- [ ] Add login/logout UI
- [ ] Update roster page with auth
- [ ] Test permission system
- [ ] Add activity logging

### Week 4: Testing & Deployment
- [ ] End-to-end testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Document for guild officers

---

## Security Considerations

1. **Session Management**: Use httpOnly cookies
2. **CSRF Protection**: SvelteKit provides built-in protection
3. **Rate Limiting**: Implement on sensitive endpoints
4. **Environment Variables**: Never commit secrets to git
5. **Access Tokens**: Never expose Battle.net tokens to client
6. **Audit Log**: Track all roster modifications

---

## Rollback Plan

If issues occur:
1. Keep current filesystem-based system working in dev
2. Add feature flag to switch between Blob and filesystem
3. Keep bundled roster.json as fallback
4. Can revert to read-only mode if needed

---

## Questions to Consider

1. **Should non-officers see update UI?** Maybe read-only view?
2. **Manual upload in production?** Allow Lua file upload?
3. **Historical data retention?** 30 days? 90 days? Forever?
4. **Multiple characters?** What if user has multiple guild chars?
5. **Rank changes?** Re-check permissions on each request?

---

## Next Steps

1. Review this plan
2. Create Battle.net application
3. Set up Vercel Blob storage
4. Start with Phase 1 implementation
5. Test thoroughly in development
6. Deploy to production with monitoring
