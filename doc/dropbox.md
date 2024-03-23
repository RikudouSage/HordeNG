## Setup Dropbox

1. Go to [the Dropbox developer portal](https://www.dropbox.com/developers/apps)
2. Click [Create app](https://www.dropbox.com/developers/apps/create)
3. Configure the app:
   1. **Choose an API**: `Scoped access`
   2. **Choose the type of access you need**: `App folder` (you can also choose `Full Dropbox` but in that case the images will be stored directly in a directory called images in the root of your Dropbox)
   3. **Name your app**: `HordeNG` (can be anything, really)
4. Click `Create app`
5. Switch to the `Permissions` tab and:
   1. Check `files.metadata.write`
   2. Check `files.content.write`
   3. Check `files.content.read`
   4. Click `Submit`
6. Switch back to the `Settings` tab and in the OAuth 2 section, right below **Generated access token** click `Generate`
7. Copy the token and put it in the [settings of HordeNG](https://horde-ng.org/settings)
