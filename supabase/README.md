# Friends and presence migration

Apply `migrations/202610220001_friends_presence.sql` to the existing Supabase project before opening the Friends tab. In the Supabase Dashboard, open **SQL Editor**, create a query, paste the migration, and run it. It is safe to re-run: tables, policies, indexes, trigger, and publication changes use guarded or replaceable definitions.

The app uses `expo-camera` to scan friend QR codes. After package installation succeeds, create a new Expo development build so the camera native module and permission configuration are included. Expo Go may not match the native SDK setup.
