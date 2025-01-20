# humbletrove
A browser extension to restore access to trove.

# How To Use
After installing, click the extension to open a page that shows all the games in the Humble Trove.
Download links for Windows, Mac, and Linux will appear if available.

# FAQ
## How does it work
The frontend page that let you download trove games was removed in favor of the desktop app. The backend API calls still exist, and are used by the desktop app to do its job.
Since the linux and mac builds are still loaded on Humble Bundle, they can still be downloaded if you are an active subscriber. 
This doesn't let you download games you don't own on Humble, it just asks the site if you have permission to download a game. Even if you aren't subscribed, you may still have download access if you were subscribed the specific month that a game got released. 

## Is this safe?
Browser extensions are inherently risky. Since this runs in the context of humblebundle.com, an extension could have full access to your account.
You also need to trust that an update isn't going to blo

I've requested the bare minimum permissions I need to make this work. 
Specifically I make three api calls
* "https://www.humblebundle.com/client/catalog*"
    * Public catalog of games in the vault. 
* "https://www.humblebundle.com/client/user"
    * Displays status of your user account. 
* "https://www.humblebundle.com/api/v1/user/download/sign"
    * Given a humble download object, returns a signed download link

I don't request permission for api calls that expose your steam keys.

I also ask for storage permissions to cache the catalog of games, and the download permission to intiate downloads of games.

## It's kind of ugly
Yes.