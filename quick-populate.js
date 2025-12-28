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

// Pre-defined league averages for recent seasons (2000-2024)
// You can verify/update these from basketball-reference.com
const leagueAverages = {
  '2023-24': { regular: 0.588, playoffs: 0.584 },
  '2022-23': { regular: 0.586, playoffs: 0.577 },
  '2021-22': { regular: 0.566, playoffs: 0.562 },
  '2020-21': { regular: 0.574, playoffs: 0.571 },
  '2019-20': { regular: 0.566, playoffs: 0.576 },
  '2018-19': { regular: 0.560, playoffs: 0.558 },
  '2017-18': { regular: 0.556, playoffs: 0.550 },
  '2016-17': { regular: 0.555, playoffs: 0.552 },
  '2015-16': { regular: 0.541, playoffs: 0.538 },
  '2014-15': { regular: 0.535, playoffs: 0.528 },
  '2013-14': { regular: 0.541, playoffs: 0.534 },
  '2012-13': { regular: 0.535, playoffs: 0.527 },
  '2011-12': { regular: 0.529, playoffs: 0.527 },
  '2010-11': { regular: 0.541, playoffs: 0.537 },
  '2009-10': { regular: 0.544, playoffs: 0.535 },
  '2008-09': { regular: 0.544, playoffs: 0.540 },
  '2007-08': { regular: 0.541, playoffs: 0.531 },
  '2006-07': { regular: 0.541, playoffs: 0.533 },
  '2005-06': { regular: 0.536, playoffs: 0.527 },
  '2004-05': { regular: 0.530, playoffs: 0.524 },
  '2003-04': { regular: 0.518, playoffs: 0.509 },
  '2002-03': { regular: 0.518, playoffs: 0.513 },
  '2001-02': { regular: 0.518, playoffs: 0.514 },
  '2000-01': { regular: 0.518, playoffs: 0.506 },
  '1999-00': { regular: 0.524, playoffs: 0.520 },
  '1998-99': { regular: 0.511, playoffs: 0.506 },
  '1997-98': { regular: 0.524, playoffs: 0.522 },
  '1996-97': { regular: 0.536, playoffs: 0.533 },
  '1995-96': { regular: 0.543, playoffs: 0.538 },
  '1994-95': { regular: 0.541, playoffs: 0.536 },
  '1993-94': { regular: 0.536, playoffs: 0.532 },
  '1992-93': { regular: 0.544, playoffs: 0.540 },
  '1991-92': { regular: 0.543, playoffs: 0.536 },
  '1990-91': { regular: 0.543, playoffs: 0.537 },
};

console.log('🏀 Quick populating NBA League Averages...\n');

let count = 0;
for (const [season, averages] of Object.entries(leagueAverages)) {
  db.run(
    `INSERT OR REPLACE INTO league_averages (season, regular_season_ts, playoffs_ts)
     VALUES (?, ?, ?)`,
    [season, averages.regular, averages.playoffs],
    (err) => {
      if (err) {
        console.error(`Error saving ${season}:`, err.message);
      } else {
        count++;
        console.log(`✓ ${season}: Regular ${averages.regular}, Playoffs ${averages.playoffs}`);
      }

      if (count === Object.keys(leagueAverages).length) {
        console.log(`\n✅ Done! ${count} seasons cached in database.`);
        db.close();
      }
    }
  );
}
