# How to make a level for Rockfall

1. Download and install [Tiled](https://www.mapeditor.org)

2. Download [rockfall-tiles.png](https://raw.githubusercontent.com/greggman/rockfall/main/tiled/rockfall-tiles.png) (⬅ right click this link and pick Save As..)

3. Download [rockfall-tiles.tsj](https://raw.githubusercontent.com/greggman/rockfall/main/tiled/rockfall-tiles.tsj)  (⬅ right click this link and pick Save As..)

4. Run Tiled and click Open File

   <img src="imgs/making-levels/step-01-open-file.png" width="852">

5. Select the `rockfall-files.tsj` file

   <img src="imgs/making-levels/step-02-load-tiles.png" width="800">

6. From the menus pick File->New->New Map...

   Then choose your map size

   <img src="imgs/making-levels/step-03-new-map.png" width="418">

7. Create your map. 

   1. Select the Stamp Tool
   2. Click tile from the tileset
   3. Draw on the map

   <img src="imgs/making-levels/step-04-edit-map.png" width="852">

8. From the menus pick File->Save

   Make sure you choose the `.tmj JSON` format

   <img src="imgs/making-levels/step-05-save-map.png" width="800">

9. Go to [the Rockfall WebSite](https://greggman.github.io/rockfall)

   Drag and Drop the `.tmj` file onto the game.

   <img src="imgs/making-levels/step-05-run-level.png" width="1106">

## Custom Properties

You can add custom properties to set level settings.

1. From the menus pick Map->Map Properties...

2. Click the [+] icon under Custom Properties

   <img src="imgs/making-levels/custom-props-01.png" width="852">

3. Specify the name and make sure the type is `int` or `string` (see below)

   <img src="imgs/making-levels/custom-props-02.png" width="298">

4. Click the property to edit

   <img src="imgs/making-levels/custom-props-03.png" width="852">

### Valid properties

| property      | default | type   | description |
| ------------- | ------: | :----: | ----------- |
| magicTime     |     250 | int    | how many ticks the magic walls stay active |
| diamondPoints |     100 | int    | points for collecting diamond |
| eggPoints     |      10 | int    | points for collecting egg |
| dirtPoints    |       1 | int    | points for digging dirt |
| requiredCount |      15 | int    | count (eggs + diamonds) needed to open exits |
| timeLimit     |    1500 | int    | time limit in seconds |
| author        |         | string | your name |
| license       |         | string | default CC-BY ([Creative Commons](https://creativecommons.org/share-your-work/) Only Please) |
| name          |         | string | default is filename |

Note: author, license, and name need to be type `string`

# Please consider submitting your level to this repo

If you know github then you can create a pull request. Otherwise,
[go to this issue](https://github.com/greggman/rockfall/issues/21)
and drag-&-drop your `.tmj` file