# Local Music Player

A music player that runs in the browser and plays songs stored on your own computer. It's made with plain HTML, CSS and JavaScript, so there's no framework and nothing to install. The design is copied from Spotify's dark theme because I like how it looks.

I built it because I have a lot of mp3 files sitting in folders and I didn't want to upload them anywhere just to listen to them.

## How to run it

1. Put `index.html`, `style.css` and `script.js` in the same folder.
2. Double click `index.html` to open it in your browser.

That's it. There's also a single file version (`music-player.html`) that has the CSS and JS pasted inside, in case you only want to move one file around.

## How to use it

- Click **Add songs** to pick files, or **Add album folder** to pick a whole folder.
- You can also drag files or folders onto the window.
- Click a song to play it. Click it again to pause.
- The heart button likes a song, and the Liked Songs tab shows them.
- The **＋** button on a song lets you put it in a playlist (or make a new one).
- Open the Albums tab to see everything grouped by album.

Keyboard shortcuts:

- Space: play / pause
- Left / Right arrow: jump 5 seconds
- Shift + Left / Right: previous / next song

## What's in it

- Library, Albums, Liked Songs and your own playlists
- Search box
- Shuffle and repeat (off / all / one)
- Seek bar and volume
- Album art
- Works on phones, with a bottom tab bar and a full screen player when you tap the small one
- Media keys and lock screen controls (it uses the Media Session API)
- Dark mode only

## Album art

The script reads the tags inside the file to get the title, artist, album, track number and the cover image. It can do this for mp3 (ID3 tags), m4a and flac. If a song has no embedded cover, it looks for an image in the same folder, like `cover.jpg` or `folder.jpg`, and uses that. If there's nothing, you get a coloured gradient.

The images get shrunk to about 400px before they're shown, otherwise big covers made everything slow.

## Files

- `index.html` is the page layout
- `style.css` is all the styling, including the phone layout at the bottom
- `script.js` has everything else (reading tags, playing, playlists, drawing the lists)

## Stuff that doesn't work yet

- **Your songs disappear when you refresh.** Browsers don't let a page keep access to files on your computer, so you have to add them again each time.
- Playlists are saved in the browser (localStorage) so they do come back, but only once you add the same files again. It matches songs by file path and size, so if you rename or move a file it won't be found.
- Likes are not saved. They reset on refresh.
- wav and ogg files play fine but I don't read their tags, so the title comes from the file name. Naming files like `Artist - Title.mp3` helps.
- Picking a folder doesn't work on most phones, only on desktop browsers.
- Which formats play depends on the browser. mp3 is the safest.
- Very big folders can take a few seconds to load because every file's tags get read.

## Things I want to add

- Remember the music folder using the File System Access API (I think that only works in Chrome and Edge)
- A reset button to clear everything
- Drag to reorder songs in a playlist
- Save likes