let subscriptionStatus = null;

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
    return 'logged_out';
  }
  if (response.status == 200) {
    let data = await response.json();
    return data.has_perks ? 'subscribed' : 'not_subscribed';
  }
}

const renderGames = (games) => {
  const catalogList = document.getElementById("catalog-list");
  const gamesHtml = `<div id="game-list">${Object.values(games).map(renderGame).join('')}</div>`;
  catalogList.innerHTML = gamesHtml;
}

const renderGame = (game) => {
   let gameDict = {
    machine_name: game.machine_name,
    human_name: game['human-name'],
    image: game.image,
    downloads: Object.entries(game.downloads).map(([platform, data]) => {
      return {
        platform: `${platform} - ${data.size}`,
        filename: data.url.web,
        machine_name: data.machine_name,
      }
    }),
    // TODO copy more things
  };

  return `
    <div class="game-card">
      <img src="${gameDict.image}" alt="${gameDict.human_name}" />
      <div class="game-name">${gameDict.human_name}</div>
      <div class="downloads">
        ${gameDict.downloads.map(download => `<button class="js-download" data-filename="${download.filename}" data-machinename="${download.machine_name}">${download.platform}</button>`).join('')}
      </div>
    </div>
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
  if (response.redirected) {
    alert("You must login to download this game");
    return;
  }
  if (response.status == 401) {
    alert("You don't own or have access to this game");
    return;
  }
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
    subscriptionStatus = await checkSubscriptionStatus();
    const accessDiv = document.getElementById('subscription-status');
    switch (subscriptionStatus) {
      case 'logged_out': 
        accessDiv.innerHTML = `Status: Logged out - login to use this extension`;
        break;
      case 'not_subscribed':
        accessDiv.innerHTML = `Status: Not subscribed - <a href="https://www.humblebundle.com/membership">Subscribe</a>`;
        break;
      case 'subscribed':
        accessDiv.innerHTML = `Status: Active Subscription`;
        break;
    }
    loadCatalog();
  } catch (error) {
    catalogList.innerHTML = `<li>Error: ${error.message}</li>`;
  }
}

document.getElementById("catalog-list").addEventListener("click", async (event) => {
  if (event.target.matches('.js-download')) {
    const button = event.target;
    const filename = button.getAttribute('data-filename');
    const machinename = button.getAttribute('data-machinename');
    await download(machinename, filename);
  }
})

document.addEventListener("DOMContentLoaded", startup);