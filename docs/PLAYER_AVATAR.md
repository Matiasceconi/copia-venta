# PLAYER AVATAR - Integration notes

This document explains how to integrate the new PlayerImageUploader component and the server upload endpoint added in the `feature/player-avatar-upload` branch.

Files added
- src/components/PlayerImageUploader.jsx  - React component to select/preview/upload avatar. Only visible to allowed roles.
- server/routes/players-upload.js         - Express route that accepts multipart uploads and returns imageUrl. Supports S3 if S3_BUCKET environment variable is present, otherwise saves to public/uploads.

Frontend integration
1. Import and render PlayerImageUploader inside your player edit modal or player card detail view.

Example integration inside an edit modal or profile component:

```jsx
import PlayerImageUploader from 'src/components/PlayerImageUploader';

function PlayerEditModal({ player, currentUser, onClose }) {
  return (
    <div>
      {/* other fields */}
      <PlayerImageUploader
        playerId={player.id}
        currentImageUrl={player.avatarUrl}
        currentUser={currentUser}
        onSaved={(imageUrl) => {
          // update local state / refetch player
        }}
      />
    </div>
  );
}
```

2. Ensure your app mounts the `server/routes/players-upload.js` router. For example in your Express app entrypoint:

```js
const playersUpload = require('./server/routes/players-upload');
app.use(playersUpload);
```

3. If using S3, set these environment variables:
- S3_BUCKET
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

If you don't configure S3, uploaded files will be saved under `public/uploads/players/<playerId>/...` and served from `/uploads/...`.

Backend / DB
- The upload endpoint returns { imageUrl } but does not automatically persist the url to the player's record. You can either let the endpoint update the DB (recommended) or let the frontend PATCH the player after upload. See server/routes/players-upload.js TODO comment.

Hiding edit actions on non-player rows
- The upload component does not modify list rendering. To avoid showing the edit button on rows that are events (e.g. "36'"), update your row rendering logic to only show action buttons when the item corresponds to a player.

Suggested conditional (JSX):

```jsx
{ isPlayer(item) && (
  <div className="actions">
    <button onClick={() => openEdit(item.id)}>Editar</button>
    <button onClick={() => deletePlayer(item.id)}>Eliminar</button>
  </div>
)}
```

Where `isPlayer(item)` is a helper that checks presence of player-specific fields:
```js
function isPlayer(item) {
  // Adjust to your data shape
  return !!(item && (item.dni || item.position || item.playerId || item.id));
}
```

Permissions
- The uploader component limits who can upload by inspecting `currentUser.roles` or `currentUser.role`. We consider the following normalized roles as allowed: `admin`, `administrador`, `preparador fisico`, `preparador`, `preparador_fisico`, `tecnico`.
- If your authentication/role system names roles differently, adapt the allowedRoles list in `PlayerImageUploader.jsx`.

Notes & next steps
- Install dependencies on the server if you plan to use S3: `npm install @aws-sdk/client-s3 multer`
- Add DB update logic in the upload endpoint to persist `avatarUrl` directly.
- Modify your player row/list to conditionally show actions only for players (not events like "36'").
- Add client-side image cropping/compression if needed.

