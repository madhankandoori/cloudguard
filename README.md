# CloudGuard

CloudGuard is a beginner-friendly dashboard that identifies cloud resources which may be wasting money. This first version uses safe sample data and does not access any cloud account.

## Start the project

Open PowerShell in this folder and run:

```powershell
node server.js
```

Then visit `http://localhost:3000`.

## File guide

- `server.js` is the backend: it provides the web page and API data.
- `public/index.html` is the page layout.
- `public/app.js` gets backend data and shows it in the dashboard.
- `public/styles.css` controls the appearance.

## Next milestone

Add a form to manually enter a resource. Later, we will use a database, accounts, and secure read-only AWS access.
