# ParkWise — macOS Setup Guide

This guide is for running the existing ParkWise project locally on macOS.

## Requirements
- Node.js 20 or newer (`node -v`)
- npm (`npm -v`)
- A MongoDB Atlas cluster with network access configured for your current IP

## 1. Open the project
Extract the ZIP, open the `ParkWise---Your-Smart-Parking-System-main` folder in VS Code, then open **Terminal → New Terminal**.

## 2. Install dependencies
```bash
npm install
```

## 3. Create your local environment file
```bash
cp .env.example .env
```
Open `.env` and fill in your own values. Do not upload or share `.env`.

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<your-cluster>/<your_database>?retryWrites=true&w=majority
JWT_SECRET=<a-long-random-secret-at-least-32-characters>
JWT_EXPIRES_IN=1h
```

URL-encode special characters in your MongoDB username/password if needed. In Atlas, add your current IP under **Network Access**.

## 4. Check the database connection
```bash
npm run db:check
```
Do not continue until the database check succeeds.

## 5. Add demo parking locations and slots
```bash
npm run seed:demo
```
This populates standard demo parking locations and slots into your database.

## 6. Create an administrator account
```bash
npm run admin:create
```
Follow the interactive CLI prompts and keep the credentials private.

## 7. Start the app
For development:
```bash
npm run dev
```
Or production start:
```bash
npm start
```
Open http://localhost:5000 in your browser (Safari, Chrome, etc.). Stop the server with **Control + C**.

## Project Structure
- `frontend/`: All static UI pages (`index.html`, `dashboard.html`, `booking.html`, `locations.html`, `history.html`, `admin.html`), CSS styling, client-side JS logic, and uploads (`frontend/uploads/profiles`).
- `server/`: Express 5 backend, REST API routes, controllers, middleware, Mongoose models, and utilities.

## Verification
Run syntax linting:
```bash
npm run lint
```
