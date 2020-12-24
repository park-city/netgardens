# NetGardens Online

This is the source code for [NetGardens Online](http://netgardens.online), an interactive graphical website directory.

## Code Architecture

Still figuring this out. There's a *lot* of work to do.

Here's a brief list of the main components:

### Park Map
The map system renders tiles from the database onto the screen and provides interactivity. Clicking on a tile lets you either claim it as your own, or view details of an existing garden.

Currently this is done via an HTML `<canvas>` tag, which seems to be working so far.

User-provided gardens can use a default overlay tile, or the user can upload a custom one.

All parks are provided by NetGardens administration. In the future we may consider allowing user-generated parks of a fixed size, although this will likely be a "premiumn" feature.

### Garden Details
The Garden Details pages will show additional information about a garden. This will have a thumbnail of the site (if possible), a link to the website, a descriptive bio, a way to follow for RSS updates, and probably a "wall" feature to write comments on. Perhaps people could even write comments on individual RSS entries? Still very up in the air.

### Database
Some sort of SQL database where both the maps and the user/garden information is stored.

### Backend
Something written in either Python or ASP.NET that takes all the stuff and ties it together.

## Terminology

**Garden** - A plot for an user's website
**Park** - A visual space for gardens to be placed in. Analogous to "neighborhoods" in Geocities.
