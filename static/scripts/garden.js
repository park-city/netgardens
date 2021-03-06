// Functions related to gardens/occupied tiles

/// Helper functions for rendering, UI, etc. ///////////////////////////////////

// Load a list of gardens from a JSON file
async function Gardens_LoadFromJSON(url)
{
	return d3.json(url);
}

// Get the garden at a specific tile
function Garden_GetAtTile(x, y)
{
	for (let garden of GARDENS) {
		for (let tile of garden.tiles) {
			let retval = {"garden": garden, "tile": tile };
			if (tile.x == x && tile.y == y) { return retval; }
			if (tile.orient == 0) { // floor
				if (tile.x == (x-1) && tile.y == y) { return retval; }
			}
		}
	}
	return null;
}

// find all gardens owned by some user
function Gardens_OwnedBy(user, gardenlist)
{
	if (!user) { user = User_GetName(); }
	if (!gardenlist) {gardenlist = GARDENS;}
	return gardenlist.filter((x) => x.owners.includes(user));
}

// sort gardens by distance from selection
function Gardens_SortDistance(gardenlist, x, y)
{
	if (!gardenlist) {gardenlist = GARDENS;}
	if (!x) { x = SEL_XTILE; }
	if (!y) { y = SEL_YTILE; }
	// if it's a right tile, test the left tile instead
	if ((y % 2) ^ !(x % 2)) { x -= 1; }

	return gardenlist.sort((a, b) => {
		// get all distances
		let a_dist = a.tiles.map(v => distance(v.x, v.y, x, y));
		let b_dist = b.tiles.map(v => distance(v.x, v.y, x, y));
		// figure out which one is the smallest
		let a_min = Math.min(...a_dist);
		let b_min = Math.min(...b_dist);
		return a_min - b_min;
	});
}

// Get distance between selection and nearest garden
function Gardens_GetNearestOwned(user, gardenlist)
{
	if (!user) { user = User_GetName(); }
	let owned = Gardens_OwnedBy(user, gardenlist);
	if (!owned) { return null; }
	return Gardens_SortDistance(owned)[0];
}

// Get nearest owned gardens, sorted by distance
function Gardens_GetNearestOwned_Dist(user, gardenlist)
{
	if (!user) { user = User_GetName(); }
	let nearest = Gardens_GetNearestOwned(user, gardenlist);
	if (!nearest) { return Infinity; }

	let y = SEL_YTILE;
	let x = SEL_XTILE;
	// if it's a right tile, test the left tile instead
	if ((y % 2) ^ !(x % 2)) { x -= 1; }

	let dists = nearest.tiles.map(v => distance(v.x, v.y, x, y));
	return Math.min(...dists);
}

// Determine if a garden contains a link of some sort
// yes, this looks a bit noobish. prevents returning undefined.
function Garden_IsLinked(garden)
{
	if (!garden) { return false; }
	if (garden.tile) {
		if (garden.tile.is_core) { return true; }
		if (garden.tile.is_tele) { return true; }
		return false;
	} else {
		// bare tile
		if (garden.is_core) { return true; }
		if (garden.is_tele) { return true; }
		return false;
	}
}

/// User actions ///////////////////////////////////////////////////////////////
// these should all be server-side!

// Claim a tile, adding it to the nearest garden
function Garden_ClaimTile()
{
	let y = SEL_YTILE;
	let x = SEL_XTILE;
	// if it's a right tile, buy the left tile instead
	if ((y % 2) ^ !(x % 2)) { x -= 1; }
	// temporary whatever
	let newtile = {
			"x": x,
			"y": y,
			"orient": 0
	};

	// Take away from quota
	let quota_okay = Quota_Change_AnyTile(-1);
	if (!quota_okay) { return; }

	// Add tile to closest owned garden (should be valid)
	let tgt_garden = Gardens_GetNearestOwned();
	tgt_garden.tiles.push(newtile);

	// Refresh info panel
	Info_Show();
}

// Claim a "core tile", starting a new garden
function Garden_ClaimCoreTile()
{
	// temporary whatever
	const user = User_GetName();
	const newgarden = {
		"owners": [user],
		"name": "New Garden",
		"color": d3.hsl(getRandomInt(0, 360), 0.4, 0.8),
		"tiles": [{
			"name": "New Site Link",
			"x": SEL_XTILE,
			"y": SEL_YTILE,
			"orient": 0,
			"is_core": true,
			"url": "https://netgardens.online"
		}]
	}

	// Take away from quota
	let quota_okay = Quota_Change_CoreTile(-1);
	if (!quota_okay) { return; }

	// Add to garden list
	GARDENS.push(newgarden);

	// Refresh info panel
	Info_Show();
}

// Sell a tile from a garden (using the tile currently selected)
function Garden_SellTile()
{
	let garden_obj = Garden_GetAtTile(SEL_XTILE, SEL_YTILE);
	let garden = garden_obj.garden;
	let tile = garden_obj.tile;

	// if that was a core tile, kill the whole garden
	if (tile.is_core) {
		index = GARDENS.indexOf(garden);
		GARDENS.splice(index, 1);

		for (let subtile of garden.tiles) {
			if (subtile.is_core) {
				Quota_Change_CoreTile(1);
			} else {
				Quota_Change_AnyTile(1);
			}
		}
	} else {
		let index = garden.tiles.indexOf(tile);
		if (index == -1) { return; }
		garden.tiles.splice(index, 1);

		if (tile.is_core) {
			Quota_Change_CoreTile(1);
		} else {
			Quota_Change_AnyTile(1);
		}
	}



	// Refresh info panel
	Info_Show();
}
