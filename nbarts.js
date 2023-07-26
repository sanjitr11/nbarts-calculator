const button = document.getElementById("btn");

button.addEventListener('click', () => {
  var firstName = document.getElementById("fname").value.trim().toLowerCase();
  var lastName = document.getElementById("lname").value.trim().toLowerCase();

  if (firstName.length === 0 || lastName.length === 0) {
    alert("Please fill out the required fields.");
    return;
  }

  var rsCheck = document.getElementById("cb1");
  var psCheck = document.getElementById("cb2");
  let errorAlertDisplayed = false; 

  // Function to introduce a random delay
  function randomDelay() {
    return Math.floor(Math.random() * 3000) + 1000; // Random delay between 1000ms and 4000ms
  }

  // Function to fetch regular season data with random delay
  function fetchRegularSeasonData() {
    return new Promise((resolve, reject) => {
      if (rsCheck.checked) {
        const playerUrl = `https://www.basketball-reference.com/players/${lastName.charAt(0)}/${lastName.toLowerCase().slice(0, 5)}${firstName.toLowerCase().slice(0, 2)}01.html`;

        // Introduce a random delay before making the request
        setTimeout(() => {
          axios.get(playerUrl)
            .then(playerResponse => {
              const parser = new DOMParser();
              const $player = parser.parseFromString(playerResponse.data, 'text/html');

              const rsTableRows = $player.querySelectorAll('#div_advanced tbody tr');
              const rsSeasons = Array.from(rsTableRows).map(element => element.querySelector('th[data-stat="season"]').textContent);

              const rsLeaguePromises = rsSeasons.map(season => {
                const leagueUrl = `https://www.basketball-reference.com/leagues/NBA_${parseInt(season.split('-')[0]) + 1}.html`;

                return axios.get(leagueUrl)
                  .then(leagueResponse => {
                    const $league = parser.parseFromString(leagueResponse.data, 'text/html');
                    const leagueAverageTS = $league.querySelector('tfoot tr td[data-stat="ts_pct"]').textContent;
                    return parseFloat(leagueAverageTS);
                  })
                  .catch(error => {
                    console.log('An error occurred while fetching league data:', error);
                    return null;
                  });
              });

              Promise.all(rsLeaguePromises)
                .then(leagueAverageTSs => {
                  const regularSeasonData = {};

                  rsTableRows.forEach((element, index) => {
                    const season = rsSeasons[index];
                    const playerTS = element.querySelector('td[data-stat="ts_pct"]').textContent;
                    const leagueAverageTS = leagueAverageTSs[index];

                    regularSeasonData[season] = {
                      playerTS: parseFloat(playerTS),
                      leagueAverageTS: leagueAverageTS,
                    };
                  });

                  resolve(regularSeasonData);
                });
            })
            .catch(error => {
              console.log('An error occurred while fetching player data:', error);
              if (error.response && error.response.status === 429) {
                if (!errorAlertDisplayed) {
                  alert("Basketball Reference has blocked the requests. Please wait and try again later.");
                  errorAlertDisplayed = true; // Set the flag to true to prevent duplicate alerts
                }
              } else {
                if (!errorAlertDisplayed) {
                  alert("Player page not found or an error occurred. Please check the entered names.");
                  errorAlertDisplayed = true; // Set the flag to true to prevent duplicate alerts
                }
              }
              resolve(null);
            });
        }, randomDelay());
      } else {
        resolve(null);
      }
    });
  }

  // Function to fetch playoffs data with random delay
  function fetchPlayoffsData() {
    return new Promise((resolve, reject) => {
      if (psCheck.checked) {
        const playerUrl = `https://www.basketball-reference.com/players/${lastName.charAt(0)}/${lastName.toLowerCase().slice(0, 5)}${firstName.toLowerCase().slice(0, 2)}01.html`;

        // Introduce a random delay before making the request
        setTimeout(() => {
          axios.get(playerUrl)
            .then(playerResponse => {
              const parser = new DOMParser();
              const $player = parser.parseFromString(playerResponse.data, 'text/html');

              const psTableRows = $player.querySelectorAll('#div_playoffs_advanced tbody tr');
              const psSeasons = Array.from(psTableRows).map(element => element.querySelector('th[data-stat="season"]').textContent);

              const psLeaguePromises = psSeasons.map(season => {
                const leagueUrl = `https://www.basketball-reference.com/playoffs/NBA_${parseInt(season.split('-')[0]) + 1}.html`;

                return axios.get(leagueUrl)
                  .then(leagueResponse => {
                    const $league = parser.parseFromString(leagueResponse.data, 'text/html');
                    const leagueAverageTS = $league.querySelector('tfoot tr td[data-stat="ts_pct"]').textContent;
                    return parseFloat(leagueAverageTS);
                  })
                  .catch(error => {
                    console.log('An error occurred while fetching league data:', error);
                    return null;
                  });
              });

              Promise.all(psLeaguePromises)
                .then(leagueAverageTSs => {
                  const playoffsData = {};

                  psTableRows.forEach((element, index) => {
                    const season = psSeasons[index];
                    const playerTS = element.querySelector('td[data-stat="ts_pct"]').textContent;
                    const leagueAverageTS = leagueAverageTSs[index];

                    playoffsData[season] = {
                      playerTS: parseFloat(playerTS),
                      leagueAverageTS: leagueAverageTS,
                    };
                  });

                  resolve(playoffsData);
                });
            })
            .catch(error => {
              console.log('An error occurred while fetching player data:', error);
              if (error.response && error.response.status === 429) {
                if (!errorAlertDisplayed) {
                  alert("Basketball Reference has blocked the requests. Please wait and try again later.");
                  errorAlertDisplayed = true; // Set the flag to true to prevent duplicate alerts
                }
              } else {
                if (!errorAlertDisplayed) {
                  alert("Player page not found or an error occurred. Please check the entered names.");
                  errorAlertDisplayed = true; // Set the flag to true to prevent duplicate alerts
                }
              }
              resolve(null);
            });
        }, randomDelay());
      } else {
        resolve(null);
      }
    });
  }

  // Wait for both regular season and playoffs data retrieval to complete
  Promise.all([fetchRegularSeasonData(), fetchPlayoffsData()])
    .then(([regularSeasonData, playoffsData]) => {
      // Call redirectForResultPage here after both regularSeasonData and playoffsData are ready
      redirectForResultPage(regularSeasonData, playoffsData, rsCheck.checked, psCheck.checked);
    })
    .catch(error => {
      console.log('An error occurred:', error);
      if (!errorAlertDisplayed) {
        alert("Error occurred while processing data. Please try again.");
        errorAlertDisplayed = true; // Set the flag to true to prevent duplicate alerts
      }
    });
});

function redirectForResultPage(regularSeasonData, playoffsData, showRegularSeason, showPlayoffs) {
  const urlParams = new URLSearchParams();
  urlParams.set('showRegularSeason', showRegularSeason ? 'true' : 'false');
  urlParams.set('showPlayoffs', showPlayoffs ? 'true' : 'false');

  if (showRegularSeason) {
    urlParams.set('regularSeasonData', JSON.stringify(regularSeasonData));
  }

  if (showPlayoffs && Object.keys(playoffsData).length > 0) {
    urlParams.set('playoffsData', JSON.stringify(playoffsData));
  }

  const queryString = urlParams.toString();
  const url = queryString ? `result.html?${queryString}` : 'result.html';
  window.location.href = url;
}

  
  

