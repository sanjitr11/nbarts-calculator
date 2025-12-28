const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./nbarts.db');

// Create players table
db.run(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    url_code TEXT,
    from_year INTEGER,
    to_year INTEGER,
    position TEXT,
    height TEXT,
    weight INTEGER,
    birth_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create index for fast searching
db.run(`CREATE INDEX IF NOT EXISTS idx_player_names ON players(full_name, last_name, first_name)`);

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

async function fetchPlayersForLetter(letter) {
  const url = `https://www.basketball-reference.com/players/${letter}/`;

  return requestQueue.add(async () => {
    try {
      console.log(`\nFetching players starting with '${letter.toUpperCase()}'...`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const players = [];

      // Find the player table
      $('#players tbody tr').each((i, row) => {
        const $row = $(row);

        // Get player data
        const nameLink = $row.find('th[data-stat="player"] a');
        const fullName = nameLink.text().trim();
        const urlPath = nameLink.attr('href');

        if (!fullName || !urlPath) return;

        // Extract URL code (e.g., /players/a/abdulka01.html -> abdulka01)
        const urlCode = urlPath.match(/\/players\/[a-z]\/([^.]+)\.html/)?.[1];

        // Split name into first and last
        const nameParts = fullName.split(' ');
        const lastName = nameParts[nameParts.length - 1];
        const firstName = nameParts.slice(0, -1).join(' ');

        players.push({
          id: urlCode,
          firstName,
          lastName,
          fullName,
          urlCode
        });
      });

      console.log(`  Found ${players.length} players`);
      return players;
    } catch (error) {
      console.error(`  Error fetching players for '${letter}':`, error.message);
      return [];
    }
  });
}

async function savePlayersToDB(players) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO players
      (id, first_name, last_name, full_name, url_code)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const player of players) {
      stmt.run(
        player.id,
        player.firstName,
        player.lastName,
        player.fullName,
        player.urlCode
      );
    }

    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function populatePlayers() {
  console.log('🏀 Populating NBA Players Database from Basketball Reference...\n');

  // Letters a-z
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let totalPlayers = 0;

  for (const letter of letters) {
    const players = await fetchPlayersForLetter(letter);

    if (players.length > 0) {
      await savePlayersToDB(players);
      totalPlayers += players.length;
      console.log(`  ✓ Saved ${players.length} players to database`);
    }
  }

  // Wait for queue to finish
  const waitForQueue = setInterval(() => {
    if (requestQueue.queue.length === 0 && !requestQueue.processing) {
      clearInterval(waitForQueue);

      // Show summary
      db.get('SELECT COUNT(*) as count FROM players', (err, row) => {
        if (!err) {
          console.log(`\n✅ Done! ${row.count} total players in database.`);
        }
        db.close();
      });
    }
  }, 1000);
}

populatePlayers().catch(console.error);
