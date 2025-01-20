const loadCatalog = async () => {
  let games = {}
  let result = await chrome.storage.local.get(['catalog']);
  let cachedObject = result.catalog;
  if (!cachedObject || new Date().getTime() > cachedObject.expiry) {
    games = await fetchCatalog();
    await chrome.storage.local.set({'catalog': {
      'data': games,
      'expiry': new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
    }});
  } else {
    games = cachedObject.data;
  }
  renderGames(games);
}

const fetchCatalog = async () => {
  const MAX_PAGES = 4;
  let games = {}
  // TODO I can probably do this in parallel.
  for (let i=0; i<MAX_PAGES; i++) {
    const response = await fetch(`https://www.humblebundle.com/client/catalog?index=${i}`, {
      credentials: "include"
    });
    const data = await response.json();
    data.forEach((game) => {
      // Parse data
      games[game.machine_name] = game;
    })
  }
  return games;
}

const checkSubscriptionStatus = async () => {
  let response = await fetch(`https://www.humblebundle.com/client/user`);
  if (response.status == 401) {
    // TODO this means the user isn't logged in.
    // That's different than not being subscribed.
    // This method could do much more 
    return false;
  }
  if (response.status == 200) {
    let data = await response.json();
    return data.has_perks;
  }
}

const renderGames = (games) => {
  const catalogList = document.getElementById("catalog-list");
  const gamesHtml = Object.values(games).map(renderGame).join('');
  catalogList.innerHTML = gamesHtml;
}

const renderGame = (game) => {
   let gameDict = {
    machine_name: game.machine_name,
    human_name: game['human-name'],
    downloads: Object.entries(game.downloads).map(([platform, data]) => {
      return {
        platform: platform,
        filename: data.url.web,
        machine_name: data.machine_name,
      }
    }),
    // TODO copy more things
  };

  return `
    <li>${gameDict.human_name}
    <ul>
      ${gameDict.downloads.map(download => `<li><button class="js-download" data-filename="${download.filename}" data-machinename="${download.machine_name}">${download.platform}</button></li>`)}
    </ul>
    </li>
  `
}

const download = async (machine_name, filename) => {
  const response = await fetch('https://www.humblebundle.com/api/v1/user/download/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      machine_name: machine_name,
      filename: filename,
    }).toString(),
    credentials: "include"
  });
  const data = await response.json();
  const url = data.signed_url;
  chrome.downloads.download({
    url: url,
    saveAs: true,
  });
}

const startup = async () => {
  const catalogList = document.getElementById("catalog-list");
  catalogList.innerHTML = "<li>Loading...</li>";
  try {
    let hasAccess = await checkSubscriptionStatus();
    const accessDiv = document.getElementById('subscription-status');
    accessDiv.innerHTML = hasAccess ? 'Active Subscription' : 'Not active (or logged out)';
    loadCatalog();
  } catch (error) {
    catalogList.innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

document.getElementById("catalog-list").addEventListener("click", async (event) => {
  // TODO
  if (event.target.matches('button')) {
    const button = event.target;
    const filename = button.getAttribute('data-filename');
    const machinename = button.getAttribute('data-machinename');
    await download(machinename, filename);
  }
})

document.addEventListener("DOMContentLoaded", startup);