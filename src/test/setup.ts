// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Deviation from spec (see task report): tests intentionally mock `fetch` so
// they never hit the real Cloudinary API and need no real credentials, but
// src/lib/cloudinary.ts guards on these env vars being truthy before it ever
// calls fetch. Without a real .env file (none exists, and .env.example must
// stay untouched per the secrets policy), that guard fires first and the
// mocked-fetch tests never get exercised. Stub non-secret placeholder values
// here, for the test process only, so the guard clause passes through to the
// mocked fetch call as the tests intend.
vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'test-cloud')
vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'test-preset')

// Same issue for src/lib/supabaseClient.ts: it throws at module load time if
// these env vars are falsy. Tests that automock a module importing it
// transitively (e.g. `vi.mock('../hooks/useAuth')` in
// RequireAuth.test.tsx) load the real module graph to introspect its shape,
// which triggers that throw before the mock ever takes effect. Stub
// non-secret placeholder values here so module load succeeds.
vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
