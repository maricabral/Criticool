# Agent Instructions

- After any code change that affects the mobile app, restart the running Expo app before final verification. If the emulator or Expo session is unstable, stop the existing session and start it again with `npm run dev:mobile`.
- If a code change affects the API used by the app, restart the API server as well before testing the mobile flow.
- If restarting is not possible in the current environment, state that clearly in the final response.
- For every UX design change, publish a visual HTML preview under `resources/mockups/preview/` and get user approval before implementing the app change.
- UX change summaries must include the preview file path so the user can inspect the visual result, not only a text description.
- The official in-app back control is the right-side pink `Back` pill shown in the approved mockups; use that instead of arrow-only back buttons for app headers.
- After completing requested changes for this project, create a git commit with the completed work unless the user explicitly asks not to commit.
