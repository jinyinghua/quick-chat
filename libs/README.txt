If your environment blocks CDN access (for example some code editors or preview proxies), download a bundled copy of supabase-js and place it at /libs/supabase-js.min.js

To get a UMD bundle you can download from jsdeliver and save locally:

curl -L "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/supabase.min.js" -o libs/supabase-js.min.js

Or use npm to fetch and bundle it during a build step. After placing the file, reload the page and the app will try to load the local fallback automatically.

Security note: do not commit real secrets to the repository. Keep only the library file here.