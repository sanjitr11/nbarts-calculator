const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('./nbarts.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS league_averages (
      season TEXT PRIMARY KEY,
      regular_season_ts REAL,
      playoffs_ts REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT,
      season TEXT,
      season_type TEXT,
      player_ts REAL,
      league_avg_ts REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_name, season, season_type)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_cache (
      player_name TEXT PRIMARY KEY,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Request queue to handle rate limiting
class RequestQueue {
  constructor(delayMs = 1500) {
    this.queue = [];
    this.processing = false;
    this.delayMs = delayMs;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Wait before processing next request
    setTimeout(() => {
      this.processing = false;
      this.process();
    }, this.delayMs);
  }
}

const requestQueue = new RequestQueue(1500); // 1.5 second delay between requests

// Helper function to get league average TS% from database or fetch it
async function getLeagueAverageTS(season, seasonType = 'regular') {
  return new Promise((resolve, reject) => {
    const column = seasonType === 'regular' ? 'regular_season_ts' : 'playoffs_ts';

    db.get(
      `SELECT ${column} as ts FROM league_averages WHERE season = ?`,
      [season],
      async (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        // If cached, return it
        if (row && row.ts !== null) {
          console.log(`Cache hit: League average for ${season} (${seasonType})`);
          resolve(row.ts);
          return;
        }

        // Otherwise, fetch it
        console.log(`Cache miss: Fetching league average for ${season} (${seasonType})`);
        try {
          const ts = await fetchLeagueAverageTS(season, seasonType);
          // Store in database
          const updateColumn = seasonType === 'regular' ? 'regular_season_ts' : 'playoffs_ts';
          db.run(
            `INSERT OR REPLACE INTO league_averages (season, ${updateColumn})
             VALUES (?, ?)`,
            [season, ts]
          );
          resolve(ts);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Fetch league average TS% from Basketball Reference
async function fetchLeagueAverageTS(season, seasonType = 'regular') {
  const year = parseInt(season.split('-')[0]) + 1;
  const url = seasonType === 'regular'
    ? `https://www.basketball-reference.com/leagues/NBA_${year}.html`
    : `https://www.basketball-reference.com/playoffs/NBA_${year}.html`;

  return requestQueue.add(async () => {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const leagueAverageTS = $('tfoot tr td[data-stat="ts_pct"]').first().text();
      return parseFloat(leagueAverageTS);
    } catch (error) {
      console.error(`Error fetching league average for ${season}:`, error.message);
      throw error;
    }
  });
}

// Helper function to normalize strings (remove accents and special characters)
function normalizeString(str) {
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z]/gi, '') // Remove non-alphabetic characters
    .toLowerCase();
}

// Fetch player data from Basketball Reference
async function fetchPlayerData(firstName, lastName) {
  // Normalize names to remove accents (e.g., "Dončić" -> "doncic")
  const normalizedFirstName = normalizeString(firstName);
  const normalizedLastName = normalizeString(lastName);

  const playerUrl = `https://www.basketball-reference.com/players/${normalizedLastName.charAt(0)}/${normalizedLastName.slice(0, 5)}${normalizedFirstName.slice(0, 2)}01.html`;

  console.log(`Player URL: ${playerUrl}`);

  return requestQueue.add(async () => {
    try {
      const response = await axios.get(playerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      console.log(`Successfully fetched player page, status: ${response.status}`);

      // Basketball Reference wraps some tables in HTML comments
      // We need to extract and parse them
      let htmlContent = response.data;

      // Remove HTML comments to access hidden tables
      htmlContent = htmlContent.replace(/<!--/g, '').replace(/-->/g, '');

      const $ = cheerio.load(htmlContent);

      // Get regular season data
      const regularSeasonData = {};
      const rsTableRows = $('#advanced tbody tr').not('.thead').toArray();

      console.log(`Found ${rsTableRows.length} rows in advanced table`);

      for (const row of rsTableRows) {
        const seasonElem = $(row).find('th[data-stat="year_id"] a');
        const tsElem = $(row).find('td[data-stat="ts_pct"]');

        if (seasonElem.length && tsElem.length && tsElem.text()) {
          const season = seasonElem.text().trim();
          const tsText = tsElem.text().trim();
          const playerTS = parseFloat(tsText);

          if (season && !isNaN(playerTS)) {
            regularSeasonData[season] = { playerTS };
            console.log(`  ${season}: TS% = ${playerTS}`);
          }
        }
      }

      console.log(`Total regular season entries: ${Object.keys(regularSeasonData).length}`);

      // Get playoffs data
      const playoffsData = {};
      const psTableRows = $('#advanced_post tbody tr').not('.thead').toArray();

      console.log(`Found ${psTableRows.length} rows in playoffs advanced table`);

      for (const row of psTableRows) {
        const seasonElem = $(row).find('th[data-stat="year_id"] a');
        const tsElem = $(row).find('td[data-stat="ts_pct"]');

        if (seasonElem.length && tsElem.length && tsElem.text()) {
          const season = seasonElem.text().trim();
          const tsText = tsElem.text().trim();
          const playerTS = parseFloat(tsText);

          if (season && !isNaN(playerTS)) {
            playoffsData[season] = { playerTS };
            console.log(`  ${season}: TS% = ${playerTS}`);
          }
        }
      }

      console.log(`Total playoffs entries: ${Object.keys(playoffsData).length}`);

      return { regularSeasonData, playoffsData };
    } catch (error) {
      console.error(`Error fetching player data:`, error.message);
      throw error;
    }
  });
}

// API endpoint to get player rTS% data
app.get('/api/player/:firstName/:lastName', async (req, res) => {
  const { firstName, lastName } = req.params;
  const { regular, playoffs } = req.query;

  const showRegular = regular === 'true';
  const showPlayoffs = playoffs === 'true';

  console.log(`\n=== NEW REQUEST ===`);
  console.log(`Player: ${firstName} ${lastName}`);
  console.log(`Show Regular: ${showRegular}, Show Playoffs: ${showPlayoffs}`);

  try {
    // Fetch player data
    console.log(`Fetching player data...`);
    const { regularSeasonData, playoffsData } = await fetchPlayerData(firstName, lastName);

    console.log(`Regular season seasons found: ${Object.keys(regularSeasonData).length}`);
    console.log(`Playoffs seasons found: ${Object.keys(playoffsData).length}`);

    const result = {
      regularSeasonData: null,
      playoffsData: null
    };

    // Process regular season data
    if (showRegular && Object.keys(regularSeasonData).length > 0) {
      const processedData = {};

      for (const season in regularSeasonData) {
        try {
          const leagueAvg = await getLeagueAverageTS(season, 'regular');
          processedData[season] = {
            playerTS: regularSeasonData[season].playerTS,
            leagueAverageTS: leagueAvg
          };
        } catch (error) {
          console.error(`Error getting league average for ${season}:`, error.message);
        }
      }

      result.regularSeasonData = processedData;
    }

    // Process playoffs data
    if (showPlayoffs && Object.keys(playoffsData).length > 0) {
      const processedData = {};

      for (const season in playoffsData) {
        try {
          const leagueAvg = await getLeagueAverageTS(season, 'playoffs');
          processedData[season] = {
            playerTS: playoffsData[season].playerTS,
            leagueAverageTS: leagueAvg
          };
        } catch (error) {
          console.error(`Error getting league average for ${season}:`, error.message);
        }
      }

      result.playoffsData = processedData;
    }

    console.log(`Sending response:`, JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error processing request:', error);

    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Player not found. Please check the entered names.' });
    } else if (error.response && error.response.status === 429) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else {
      res.status(500).json({ error: 'An error occurred while fetching data.' });
    }
  }
});

// Player search/autocomplete endpoint
app.get('/api/players/search', (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  const searchTerm = q.toLowerCase();

  db.all(
    `SELECT id, first_name, last_name, full_name, url_code
     FROM players
     WHERE LOWER(full_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(first_name) LIKE ?
     ORDER BY full_name
     LIMIT 10`,
    [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`],
    (err, rows) => {
      if (err) {
        console.error('Error searching players:', err);
        return res.status(500).json({ error: 'Error searching players' });
      }

      res.json(rows);
    }
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', queueLength: requestQueue.queue.length });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
