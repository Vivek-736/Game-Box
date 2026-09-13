export const runtimeInstruction = `## Daytona Game Runtime & Directory Environment

Every game is hosted and executed inside a dedicated, isolated Daytona cloud sandbox running Linux.

### Environment & Directory Structure:
- **Game Directory**: \`/home/daytona/game\`
  - All game code, assets, and source files live strictly inside \`/home/daytona/game\`.
- **Main Entry Point**: \`/home/daytona/game/index.html\`
  - The preview server automatically looks for and renders \`index.html\` as the game's root entry.
  - All HTML, embedded styles, script tags, or linked assets must resolve relative to this directory.

### Preview Server & Networking:
- **Port**: \`3000\`
- **Server**: An internal HTTP server runs in the background serving the game directory:
  \`python3 -m http.server 3000 --directory /home/daytona/game\`
- **Preview Integration**: The game is rendered directly inside the GameBox preview iframe via a secure streaming proxy connected to the sandbox preview port.

### Asset & Code Conventions:
- Keep asset paths relative (e.g. \`./style.css\`, \`./game.js\`, \`./assets/sprite.png\`).
- If using external assets or CDNs, ensure they load over HTTPS.
- Audio should be generated with the Web Audio API or sourced from reliable public royalty-free CDNs.
- Because the server serves static files directly over HTTP, single-file HTML (or clean multi-file HTML + JS + CSS) provides zero build step overhead, instant reloading, and maximum reliability.`;
