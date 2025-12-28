const button = document.getElementById("btn");
const playerSearch = document.getElementById("playerSearch");
const autocompleteResults = document.getElementById("autocomplete-results");

let selectedPlayer = null;
let debounceTimer = null;

// Autocomplete search
playerSearch.addEventListener('input', (e) => {
  const searchTerm = e.target.value.trim();

  clearTimeout(debounceTimer);

  if (searchTerm.length < 2) {
    autocompleteResults.classList.remove('show');
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/players/search?q=${encodeURIComponent(searchTerm)}`);
      const players = await response.json();

      if (players.length === 0) {
        autocompleteResults.innerHTML = '<div class="autocomplete-item">No players found</div>';
        autocompleteResults.classList.add('show');
        return;
      }

      autocompleteResults.innerHTML = players
        .map(player => `
          <div class="autocomplete-item" data-player='${JSON.stringify(player)}'>
            ${player.full_name}
          </div>
        `)
        .join('');

      autocompleteResults.classList.add('show');

      // Add click handlers
      document.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          const playerData = item.getAttribute('data-player');
          if (playerData && playerData !== 'undefined') {
            selectedPlayer = JSON.parse(playerData);
            playerSearch.value = selectedPlayer.full_name;
            autocompleteResults.classList.remove('show');
          }
        });
      });
    } catch (error) {
      console.error('Error fetching autocomplete results:', error);
    }
  }, 300);
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    autocompleteResults.classList.remove('show');
  }
});

button.addEventListener('click', async () => {
  const searchInput = playerSearch.value.trim();

  if (searchInput.length === 0) {
    alert("Please enter a player name.");
    return;
  }

  // If no player was selected from autocomplete, try to parse the input
  let firstName, lastName;

  if (selectedPlayer) {
    firstName = selectedPlayer.first_name;
    lastName = selectedPlayer.last_name;
  } else {
    // Try to parse the input as "First Last"
    const nameParts = searchInput.split(' ');
    if (nameParts.length < 2) {
      alert("Please enter both first and last name, or select a player from the dropdown.");
      return;
    }
    lastName = nameParts[nameParts.length - 1];
    firstName = nameParts.slice(0, -1).join(' ');
  }

  var rsCheck = document.getElementById("cb1");
  var psCheck = document.getElementById("cb2");

  if (!rsCheck.checked && !psCheck.checked) {
    alert("Please select at least one season type (Regular Season or Post Season).");
    return;
  }

  // Disable button and show loading state
  button.disabled = true;
  button.textContent = "Loading...";

  try {
    // Call backend API
    const response = await fetch(
      `http://localhost:3000/api/player/${encodeURIComponent(firstName)}/${encodeURIComponent(lastName)}?regular=${rsCheck.checked}&playoffs=${psCheck.checked}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch player data');
    }

    const data = await response.json();

    console.log('Received data from backend:', data);
    console.log('Regular season data:', data.regularSeasonData);
    console.log('Playoffs data:', data.playoffsData);

    // Redirect to result page with data
    redirectForResultPage(
      data.regularSeasonData,
      data.playoffsData,
      rsCheck.checked,
      psCheck.checked
    );
  } catch (error) {
    console.error('Error fetching player data:', error);

    if (error.message.includes('Player not found')) {
      alert("Player page not found. Please check the entered names and try again.");
    } else if (error.message.includes('Too many requests')) {
      alert("Too many requests. Please wait a moment and try again.");
    } else if (error.message.includes('Failed to fetch')) {
      alert("Could not connect to server. Make sure the backend server is running on port 3000.");
    } else {
      alert("An error occurred while fetching data. Please try again.");
    }
  } finally {
    // Re-enable button
    button.disabled = false;
    button.textContent = "Submit";
  }
});

function redirectForResultPage(regularSeasonData, playoffsData, showRegularSeason, showPlayoffs) {
  const urlParams = new URLSearchParams();
  urlParams.set('showRegularSeason', showRegularSeason ? 'true' : 'false');
  urlParams.set('showPlayoffs', showPlayoffs ? 'true' : 'false');

  if (showRegularSeason && regularSeasonData) {
    urlParams.set('regularSeasonData', JSON.stringify(regularSeasonData));
  }

  if (showPlayoffs && playoffsData && Object.keys(playoffsData).length > 0) {
    urlParams.set('playoffsData', JSON.stringify(playoffsData));
  }

  const queryString = urlParams.toString();
  const url = queryString ? `result.html?${queryString}` : 'result.html';
  window.location.href = url;
}
