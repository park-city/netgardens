// almost everything in this file should be simple server-side lookups

// User quotas /////////////////////////////////////////////////////////////////
let QUOTA_CORE = 1;
let QUOTA_TILE = 9; // might remove

function Quota_CoreTile() { return QUOTA_CORE; }
function Quota_AnyTile() { return QUOTA_TILE; }

function Quota_Change_CoreTile(delta)
{
	if ((QUOTA_CORE + delta) < 0) { return false;}
	QUOTA_CORE += delta;
	return true;
}

function Quota_Change_AnyTile(delta)
{
	if ((QUOTA_TILE + delta) < 0) { return false;}
	QUOTA_TILE += delta;
	return true;
}

// Garden tile prices //////////////////////////////////////////////////////////
const TILE_ADDON_PRICES = {
	'is_core': 30,
	'is_gfx': 15,
	'is_tele': 15
};
const TILE_PRICE = 15;

// price of a specific addon for a tile
function Garden_GetTileAddonPrice(attrib)
{
	if (attrib == "") { return TILE_PRICE; }
	return TILE_ADDON_PRICES[attrib];
}

// price of a garden tile
function Garden_GetTilePrice(tile)
{
	if (tile.is_core) { return TILE_ADDON_PRICES['is_core']; }
	tile_price = TILE_PRICE;
	if (tile.is_gfx)  { tile_price += TILE_ADDON_PRICES['is_gfx']; }
	if (tile.is_tele) { tile_price += TILE_ADDON_PRICES['is_tele']; }
	return tile_price;
}

// price of an entire garden
function Garden_GetPrice(garden)
{
	return garden.tiles.reduce((a, i) => a += Garden_GetTilePrice(i), 0);
}

/// NetCoins management ////////////////////////////////////////////////////////
// Return the number of "credits" or coins or whatever
// this should query the database
function NetCoins_Query()
{
	return NETCOINS;
}

// Determine if some item can be purchased
// "delta" should be a server-side lookup table
function NetCoins_Test(delta)
{
	return ((NetCoins_Query() - delta) >= 0);
}

// Do a transaction
// this should be server-side
function NetCoins_Transaction(delta)
{
	if ((NETCOINS - delta) < 0) {
		return false;
	} else {
		NETCOINS -= delta;
		NetCoins_UpdateDisplay(NetCoins_Query());
		return true;
	}
}

const NETCOIN_SYMB = '§'; // placeholder
function NetCoins_Format(amount)
{
	return NETCOIN_SYMB + ' ' + amount;
}
