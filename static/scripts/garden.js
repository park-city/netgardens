async function Garden_LoadFromJSON(url)
{
	return d3.json(url);
}

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

function Garden_ClaimTile()
{
	// temporary whatever
	const user = User_GetName();
	const newgarden = {
		"owner": user,
		"name": "New Garden",
		"tiles": [{
			"x": SEL_XTILE,
			"y": SEL_YTILE,
			"orient": 0,
			"is_core": true,
			"is_gfx": true
		}]
	}
	GARDENS.push(newgarden);

	// this should still be server-side
	let cost = Garden_GetPrice(newgarden);
	NetCoins_Transaction(cost);

	// Refresh info panel
	Info_Show();
}

function Garden_ClaimCoreTile()
{
	// temporary whatever
	const user = User_GetName();
	const newgarden = {
		"owner": user,
		"name": "New Garden",
		"tiles": [{
			"x": SEL_XTILE,
			"y": SEL_YTILE,
			"orient": 0
		}]
	}
	GARDENS.push(newgarden);
	NetCoins_Transaction(30);
	Info_Show();
}
