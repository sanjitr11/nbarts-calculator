const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
  const playerUrl = 'https://www.basketball-reference.com/players/b/bryanko01.html';

  console.log('Fetching:', playerUrl);

  const response = await axios.get(playerUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  console.log('Status:', response.status);

  // Remove HTML comments
  let htmlContent = response.data;
  htmlContent = htmlContent.replace(/<!--/g, '').replace(/-->/g, '');

  const $ = cheerio.load(htmlContent);

  // Try to find the advanced stats table
  console.log('\n=== Looking for tables ===');

  // Try different selectors
  console.log('Tables with id containing "advanced":', $('table[id*="advanced"]').length);
  console.log('Table with id="advanced":', $('#advanced').length);
  console.log('Table with id="per_game":', $('#per_game').length);

  // List all table IDs on the page
  console.log('\n=== All table IDs on page ===');
  $('table[id]').each((i, el) => {
    console.log(`  ${$(el).attr('id')}`);
  });

  // Try the advanced table specifically
  const advancedTable = $('#advanced');
  if (advancedTable.length > 0) {
    console.log('\n=== Advanced table found ===');
    const rows = advancedTable.find('tbody tr').not('.thead');
    console.log(`Rows found: ${rows.length}`);

    // Try to get first row data
    const firstRow = rows.first();
    console.log('First row HTML:', firstRow.html());

    const seasonTh = firstRow.find('th');
    const season = seasonTh.text();
    const seasonLink = seasonTh.find('a').text();
    const ts_pct = firstRow.find('td[data-stat="ts_pct"]').text();

    console.log(`First row - Season (th): "${season}"`);
    console.log(`First row - Season (link): "${seasonLink}"`);
    console.log(`First row - TS%: "${ts_pct}"`);
  } else {
    console.log('\n=== Advanced table NOT found ===');
  }

  // Try playoffs advanced table
  const playoffsAdvanced = $('#playoffs_advanced');
  if (playoffsAdvanced.length > 0) {
    console.log('\n=== Playoffs advanced table found ===');
    const rows = playoffsAdvanced.find('tbody tr').not('.thead');
    console.log(`Rows found: ${rows.length}`);
  } else {
    console.log('\n=== Playoffs advanced table NOT found ===');
  }
}

testScrape().catch(console.error);
