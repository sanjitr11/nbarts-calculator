const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./nbarts.db');

// Create table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS league_averages (
    season TEXT PRIMARY KEY,
    regular_season_ts REAL,
    playoffs_ts REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Request queue to handle rate limiting
class RequestQueue {
  constructor(delayMs = 2000) {
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

const requestQueue = new RequestQueue(2000); // 2 second delay

async function fetchLeagueAverageTS(year, seasonType = 'regular') {
  const url = seasonType === 'regular'
    ? `https://www.basketball-reference.com/leagues/NBA_${year}.html`
    : `https://www.basketball-reference.com/playoffs/NBA_${year}.html`;

  return requestQueue.add(async () => {
    try {
      console.log(`Fetching ${seasonType} season ${year}...`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const leagueAverageTS = $('tfoot tr td[data-stat="ts_pct"]').first().text();
      const ts = parseFloat(leagueAverageTS);

      if (isNaN(ts)) {
        console.log(`  ⚠️  No TS% found for ${seasonType} ${year}`);
        return null;
      }

      console.log(`  ✓ ${seasonType} ${year}: ${ts}`);
      return ts;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`  ⚠️  No data for ${seasonType} ${year} (404)`);
        return null;
      }
      console.error(`  ✗ Error fetching ${seasonType} ${year}:`, error.message);
      return null;
    }
  });
}

async function populateLeagueAverages() {
  console.log('🏀 Populating NBA League Averages Database...\n');

  // NBA seasons from 1980 to 2024 (adjust as needed)
  const startYear = 1980;
  const endYear = 2025;

  for (let year = startYear; year <= endYear; year++) {
    const season = `${year - 1}-${String(year).slice(2)}`;

    // Fetch regular season
    const regularTS = await fetchLeagueAverageTS(year, 'regular');

    // Fetch playoffs
    const playoffsTS = await fetchLeagueAverageTS(year, 'playoffs');

    // Save to database
    if (regularTS || playoffsTS) {
      db.run(
        `INSERT OR REPLACE INTO league_averages (season, regular_season_ts, playoffs_ts)
         VALUES (?, ?, ?)`,
        [season, regularTS, playoffsTS],
        (err) => {
          if (err) {
            console.error(`Error saving ${season}:`, err.message);
          }
        }
      );
    }
  }

  // Wait for queue to finish
  const waitForQueue = setInterval(() => {
    if (requestQueue.queue.length === 0 && !requestQueue.processing) {
      clearInterval(waitForQueue);

      // Show summary
      db.get(
        'SELECT COUNT(*) as count FROM league_averages',
        (err, row) => {
          if (!err) {
            console.log(`\n✅ Done! ${row.count} seasons cached in database.`);
          }
          db.close();
        }
      );
    }
  }, 1000);
}

populateLeagueAverages().catch(console.error);
