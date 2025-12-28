const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./nbarts.db');

// Create players table
db.serialize(() => {
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
});

// Sample of popular/notable players for quick testing
const samplePlayers = [
  { id: 'bryanko01', firstName: 'Kobe', lastName: 'Bryant', fromYear: 1996, toYear: 2016, position: 'SG' },
  { id: 'jamesle01', firstName: 'LeBron', lastName: 'James', fromYear: 2003, toYear: 2024, position: 'SF' },
  { id: 'curryst01', firstName: 'Stephen', lastName: 'Curry', fromYear: 2009, toYear: 2024, position: 'PG' },
  { id: 'duranke01', firstName: 'Kevin', lastName: 'Durant', fromYear: 2007, toYear: 2024, position: 'SF' },
  { id: 'jordami01', firstName: 'Michael', lastName: 'Jordan', fromYear: 1984, toYear: 2003, position: 'SG' },
  { id: 'onealsh01', firstName: 'Shaquille', lastName: "O'Neal", fromYear: 1992, toYear: 2011, position: 'C' },
  { id: 'duncati01', firstName: 'Tim', lastName: 'Duncan', fromYear: 1997, toYear: 2016, position: 'PF' },
  { id: 'nowitdi01', firstName: 'Dirk', lastName: 'Nowitzki', fromYear: 1998, toYear: 2019, position: 'PF' },
  { id: 'wadedw01', firstName: 'Dwyane', lastName: 'Wade', fromYear: 2003, toYear: 2019, position: 'SG' },
  { id: 'anthoca01', firstName: 'Carmelo', lastName: 'Anthony', fromYear: 2003, toYear: 2022, position: 'SF' },
  { id: 'paulch01', firstName: 'Chris', lastName: 'Paul', fromYear: 2005, toYear: 2024, position: 'PG' },
  { id: 'westbru01', firstName: 'Russell', lastName: 'Westbrook', fromYear: 2008, toYear: 2024, position: 'PG' },
  { id: 'hardeja01', firstName: 'James', lastName: 'Harden', fromYear: 2009, toYear: 2024, position: 'SG' },
  { id: 'leonaka01', firstName: 'Kawhi', lastName: 'Leonard', fromYear: 2011, toYear: 2024, position: 'SF' },
  { id: 'davisan02', firstName: 'Anthony', lastName: 'Davis', fromYear: 2012, toYear: 2024, position: 'PF' },
  { id: 'antetgi01', firstName: 'Giannis', lastName: 'Antetokounmpo', fromYear: 2013, toYear: 2024, position: 'PF' },
  { id: 'embiijo01', firstName: 'Joel', lastName: 'Embiid', fromYear: 2016, toYear: 2024, position: 'C' },
  { id: 'jokicni01', firstName: 'Nikola', lastName: 'Jokic', fromYear: 2015, toYear: 2024, position: 'C' },
  { id: 'doncilu01', firstName: 'Luka', lastName: 'Doncic', fromYear: 2018, toYear: 2024, position: 'PG' },
  { id: 'tatumja01', firstName: 'Jayson', lastName: 'Tatum', fromYear: 2017, toYear: 2024, position: 'SF' },
  { id: 'gilleal01', firstName: 'Alexander', lastName: 'Gilgeous-Alexander', fromYear: 2018, toYear: 2024, position: 'PG' },
  { id: 'garinla01', firstName: 'Luka', lastName: 'Garza', fromYear: 2021, toYear: 2024, position: 'C' },
  { id: 'allenra02', firstName: 'Ray', lastName: 'Allen', fromYear: 1996, toYear: 2014, position: 'SG' },
  { id: 'garneke01', firstName: 'Kevin', lastName: 'Garnett', fromYear: 1995, toYear: 2016, position: 'PF' },
  { id: 'piercpa01', firstName: 'Paul', lastName: 'Pierce', fromYear: 1998, toYear: 2017, position: 'SF' },
  { id: 'cartech01', firstName: 'Vince', lastName: 'Carter', fromYear: 1998, toYear: 2020, position: 'SG' },
  { id: 'mingya01', firstName: 'Yao', lastName: 'Ming', fromYear: 2002, toYear: 2011, position: 'C' },
  { id: 'nashst01', firstName: 'Steve', lastName: 'Nash', fromYear: 1996, toYear: 2014, position: 'PG' },
  { id: 'willidr01', firstName: 'Deron', lastName: 'Williams', fromYear: 2005, toYear: 2017, position: 'PG' },
  { id: 'aldrila01', firstName: 'LaMarcus', lastName: 'Aldridge', fromYear: 2006, toYear: 2022, position: 'PF' },
];

// Wait for table creation, then insert
setTimeout(() => {
  console.log('🏀 Quick populating sample NBA players...\n');

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO players
    (id, first_name, last_name, full_name, url_code, from_year, to_year, position, height, weight, birth_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const player of samplePlayers) {
    const fullName = `${player.firstName} ${player.lastName}`;
    stmt.run(
      player.id,
      player.firstName,
      player.lastName,
      fullName,
      player.id,
      player.fromYear,
      player.toYear,
      player.position,
      null, // height
      null, // weight
      null  // birth_date
    );
    console.log(`✓ ${fullName}`);
  }

  stmt.finalize((err) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`\n✅ Done! ${samplePlayers.length} players added to database.`);
    }
    db.close();
  });
}, 500);
