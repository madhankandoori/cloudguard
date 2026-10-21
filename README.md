# CloudGuard

CloudGuard is a cloud cost and waste advisor. It helps users record cloud resources, understand their monthly spending, and identify resources that may need review.

**Live website:** [cloudguard-b04o.onrender.com](https://cloudguard-b04o.onrender.com)

## What CloudGuard does

Users can create an account and keep their cloud-cost data private. They can add servers, databases, and storage resources manually or import a CSV file. The dashboard calculates totals and provides practical cost-saving suggestions.

## Features

- Private user accounts with email and password sign-in
- Add, edit, and delete cloud resources
- Resource tags for project, environment, and cloud provider
- Support for AWS, Microsoft Azure, Google Cloud, and Other providers
- Monthly total, yearly cost forecast, and budget progress
- Budget alerts for spending above the chosen limit
- Smart recommendations for resources needing review
- Reports grouped by project, environment, and cloud provider
- Search, status filters, project filters, and provider filters
- CSV import and downloadable CSV reports
- Responsive dashboard for desktop and mobile use

## Technology used

- **Node.js** — web server
- **HTML, CSS, and JavaScript** — dashboard interface
- **Supabase** — authentication and private database storage
- **Render** — free cloud deployment
- **GitHub** — source-code hosting and version history

## How users use it

1. Open the live website and create a free account.
2. Add a cloud resource or import a CSV file.
3. Set a monthly budget and warning limit.
4. Review charts, alerts, recommendations, and forecasts.
5. Reduce, resize, or remove resources that may waste money.

## Run CloudGuard locally

Open PowerShell in this folder and run:

```powershell
node server.js
```

Then open [http://localhost:3000](http://localhost:3000).

## Important note

CloudGuard currently uses costs entered manually or imported from CSV. It does not automatically connect to AWS, Azure, or Google Cloud billing accounts yet.

## Project goal

This project was built as a cloud-computing learning project. Its goal is to make cloud-cost tracking simpler for students, developers, and small teams.
