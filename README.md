# Friends Arena

A simple real-time multiplayer party quiz. Players use a nickname and a four-character room code. No accounts or app installs are required.

## Run it on your computer

1. Install Node.js 18 or newer.
2. Unzip this project and open a terminal in the `friends_arena` folder.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000.

To test multiplayer locally, open the page in multiple browser tabs or devices on the same network using your computer's local network address.

## Put it online

Deploy this folder to a Node.js hosting provider that supports persistent WebSocket connections. Set the start command to `npm start`. Share the public HTTPS URL; friends open it and use the room code. The host and players do not need accounts inside the game.

## Rules

- 2–12 players per room.
- The host starts when at least two players have joined.
- Five multiple-choice questions, 15 seconds each.
- Correct answer = 10 points.
- Highest score wins. Ties are shared.
- Keep nicknames friendly. The game contains no weapons, military content, or profanity.

## Notes

This starter keeps rooms in server memory. Rooms disappear when the server restarts, and this single-process setup is intended for a small private group rather than large-scale production. For larger deployments, add persistent room storage and moderation/rate limiting.
