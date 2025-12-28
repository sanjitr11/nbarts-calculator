# NBA Relative True Shooting % (rTS%) Calculator

A web application that calculates NBA players' relative True Shooting percentage (rTS%) by comparing their TS% against league averages for each season.

## Architecture

This application uses a client-server architecture to avoid rate limiting and improve performance:

- **Frontend**: HTML/CSS/JavaScript interface for user input and results display
- **Backend**: Express.js API server that handles web scraping and data caching
- **Database**: SQLite for caching league averages and player stats
- **Request Queue**: Rate-limited request queue to respect Basketball Reference's limits

## Features

- ✅ Backend API handles all web scraping
- ✅ SQLite database caches league averages (permanent) and player data (24hr)
- ✅ Request queue with 1.5-second delays between requests
- ✅ No CORS issues or client-side rate limiting
- ✅ Better error handling and user feedback
- ✅ Loading states during data fetching

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. Enter a player's first and last name
2. Select whether you want Regular Season or Playoffs data (or both)
3. Click Submit
4. Wait for the backend to fetch and process the data
5. View the results showing player TS%, league average TS%, and relative TS% (rTS%)

## How It Works

### Backend Flow

1. **Request received** - Frontend calls `/api/player/:firstName/:lastName`
2. **Check cache** - Backend checks if player data exists in cache
3. **Fetch player stats** - If not cached, scrape Basketball Reference for player data
4. **Get league averages** - For each season, get league average TS% (from cache or fetch)
5. **Calculate rTS%** - Combine player TS% with league averages
6. **Return data** - Send processed data back to frontend

### Caching Strategy

- **League Averages**: Cached permanently (never change once season ends)
- **Player Stats**: Could be extended to cache for 24 hours
- **SQLite Database**: Stores all cached data locally in `nbarts.db`

### Rate Limiting

- All requests to Basketball Reference go through a request queue
- 1.5-second delay between requests to avoid triggering rate limits
- Requests are processed sequentially to prevent overwhelming the source

## API Endpoints

### GET `/api/player/:firstName/:lastName`

Fetch player rTS% data

**Query Parameters:**
- `regular` (boolean) - Include regular season data
- `playoffs` (boolean) - Include playoffs data

**Example:**
```
GET /api/player/Kobe/Bryant?regular=true&playoffs=true
```

**Response:**
```json
{
  "regularSeasonData": {
    "2015-16": {
      "playerTS": 0.482,
      "leagueAverageTS": 0.541
    },
    ...
  },
  "playoffsData": {
    "2011-12": {
      "playerTS": 0.508,
      "leagueAverageTS": 0.527
    },
    ...
  }
}
```

### GET `/api/health`

Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "queueLength": 0
}
```

## Benefits Over Previous Implementation

| Feature | Old (Client-side) | New (Backend) |
|---------|------------------|---------------|
| Request Rate Limiting | ❌ Constant 429 errors | ✅ Controlled queue |
| CORS Issues | ❌ Required workarounds | ✅ No CORS issues |
| Caching | ❌ No caching | ✅ SQLite cache |
| Performance | ❌ Slow, many requests | ✅ Fast with cache |
| Error Handling | ❌ Basic alerts | ✅ Proper error responses |
| Scalability | ❌ Limited | ✅ Can handle multiple users |

## Files

- `server.js` - Express.js backend server with API endpoints
- `nbarts.js` - Frontend JavaScript (updated to use backend API)
- `index.html` - Main input page
- `result.html` - Results display page
- `styles.css` - Styling
- `nbarts.db` - SQLite database (created automatically)

## Future Improvements

- Add player name autocomplete
- Pre-populate database with common players
- Add career average calculations
- Implement player search by team
- Add data visualization (charts/graphs)
- Deploy to cloud platform (Heroku, Railway, etc.)

## License

MIT
