'use strict';
import {json as d3_json} from 'd3-fetch';

import {
	Garden_ClaimTile,
	Garden_SellTile,
	Garden_GetAtTile,
	Gardens_GetNearestOwned_Dist,
	Garden_ClaimCoreTile,
	Gardens_SortDistance
} from './garden.js';

import {
	MAP,
	Render_BG_Tile,
	Render_FG_Overlay_Single,
	Render_FG_SiteLink_Single,
	Render_FG_SiteLink_Single_Raw,
	Coord_Lookup_Center,
	Garden_ToggleOverlay,
	Garden_OverlayActive,
	Map_SetAutoScroll,
	X_TILESIZE, Y_TILESIZE,
	SEL_XTILE, SEL_YTILE,
	Map_Init
} from './map.js';

import {
	Quota_CoreTile,
	Quota_AnyTile
} from './accounting.js';

import {
	resize_canvas
} from './helpers.js';

// variables
let SIDEBAR_ID = "";
let USER = "invis";
let PARKS = {};
let PARKS_DEFAULT = "central-park";

// Server-side getters/setters /////////////////////////////////////////////////
// Get name of logged in user
export function User_GetName()
{
	return USER;
}

// Get list of parks
function Parks_GetInfo()
{
	return d3_json("/static/maps/park-info.json"); // temporary
}

// General Sidebar Helpers ////////////////////////////////////////////////////

// Record where the info panel goes
function Info_SetID(sidebars_id)
{
	SIDEBAR_ID = sidebars_id;
	Info_Hide();
}

// Draw a tile to an info panel's preview
function Info_RenderTile(canvas, x, y, garden_obj)
{
	if (!canvas.getContext) { return; }

	// get tile from background position
	// this is poorly coded but i don't care right now
	while (x < 0) { x += MAP[0].length; }
	while (y < 0) { y += MAP.length; }
	x = x % MAP[0].length;
	y = y % MAP.length;
	const tileid = MAP[y][x];

	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (tileid % 2) {
		Render_BG_Tile(ctx, 0, 0, tileid-1);
		Render_BG_Tile(ctx, X_TILESIZE, 0, tileid);
	} else {
		Render_BG_Tile(ctx, 0, 0, tileid);
		Render_BG_Tile(ctx, X_TILESIZE, 0, tileid+1);
	}

	// render any overlays or effects
	if (garden_obj) {
		let tile = garden_obj.tile;
		let color = garden_obj.garden.color;
		Render_FG_Overlay_Single(ctx, X_TILESIZE, Y_TILESIZE, tile);
		Render_FG_SiteLink_Single(ctx, X_TILESIZE, Y_TILESIZE, tile, color);
	}
}
// Set properties for a FancyButton
function Info_SetButton(div, status, cost, action, btn_label)
{
	let button = div.querySelector(".button");
	let status_elem = div.querySelector(".status");
	div.classList.remove("hidden");

	// set text
	status_elem.innerText = status;
	if (btn_label) {
		button.innerText = btn_label;
	}

	// add event handler if applicable
	if (action) {
		button.classList.remove("disabled");
		button.onpointerup = action;
	} else {
		button.classList.add("disabled");
		button.onpointerup = null;
	}
}

// Hide a FancyButton
function Info_HideButton(div)
{
	div.classList.add("hidden");
}

function Info_MakeOwnersLine(owners, element)
{
	for (let owner of owners) {
		let newrow = document.createElement("div");

		let img = document.createElement("img");
		img.src = "/static/profpics/" + owner + ".png"; // temporary

		let a = document.createElement("a");
		a.innerText = owner;
		a.href = "#";

		newrow.appendChild(img);
		newrow.appendChild(a);
		element.appendChild(newrow);
	}
}

// Tile Information Sidebar ///////////////////////////////////////////////////

// get all the elements required for the info sidebar
function Info_Show_GetElems()
{
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='tileinfo']");

	let name = infopanel.querySelector("[data-id='name']");
	let url = infopanel.querySelector("[data-id='url'] .content");
	let owners = infopanel.querySelector("[data-id='owners'] .content");
	let teletarget = infopanel.querySelector("[data-id='teletarget'] .content");

	let coretile = infopanel.querySelector("[data-id='core']");
	let edittile = infopanel.querySelector("[data-id='backdrop']");
	let buytile = infopanel.querySelector("[data-id='buy']");
	let teletile = infopanel.querySelector("[data-id='teleport']");
	let selltile = infopanel.querySelector("[data-id='sell']");

	return {
		'sidebars': sidebars,
		'infopanel': infopanel,
		'name': name,
		'url': url,
		'owners': owners,
		'teletarget': teletarget,
		'coretile': coretile,
		'edittile': edittile,
		'buytile': buytile,
		'teletile': teletile,
		'selltile': selltile
	};
}

// Update TileInfo panel for a tile somebody owns
function Info_Show_OwnedTile(garden, tile)
{
	let a = Info_Show_GetElems();

	// set name and owner
	if (tile.name) {
		a.name.innerText = tile.name;
	} else {
		a.name.innerText = garden.name;
	}
	a.owners.parentElement.classList.remove("hidden");
	a.owners.innerHTML = "";
	Info_MakeOwnersLine(garden.owners, a.owners);

	// set url if applicable
	if (tile.url) {
		a.url.parentElement.classList.remove("hidden");
		a.url.innerText = tile.url;
		a.url.href = tile.url;
	} else {
		a.url.parentElement.classList.add("hidden");
	}

	// set teleport target if applicable
	if (tile.is_tele) {
		a.teletarget.parentElement.classList.remove("hidden")
		a.teletarget.innerText = tile.dpark; // todo: pretty name lookup
	} else {
		a.teletarget.parentElement.classList.add("hidden")
	}

	/// set buttons for owner ///
	if (garden.owners.includes(User_GetName()))
	{
		// core tile
		// todo: hook up to link editor
		Info_SetButton(a.coretile, "Claimed", 0, null, "Edit Link");

		// sell tile
		let selltitle = "Unclaim Tile";
		if (tile.is_core) {
			selltitle = "Unclaim Garden";
		}
		Info_SetButton(
			a.selltile, "", -0, Garden_SellTile, "Unclaim"
		);
		a.selltile.querySelector(".name").innerText = selltitle;

		// buy tile
		Info_HideButton(a.buytile);

		// backdrop
		if (tile.is_gfx) {
			// todo: link to gfx editor
			Info_SetButton(a.edittile, "Purchased", 0, null, "Edit GFX");
		} else {
			// todo: link to buy
			Info_SetButton(a.edittile, "Edit tile gfx", 0, null, "Edit");
		}

		// teleport
		if (tile.is_gfx) {
			// todo: link to target editor
			Info_SetButton(a.teletile, "Purchased", 0, null, "Set Target");
		} else {
			// todo: link to buy
			Info_SetButton(a.teletile, "Link gardens", 0, null, "Add");
		}
	} else {
		Info_HideButton(a.buytile);
		Info_HideButton(a.selltile);
		Info_HideButton(a.edittile);
		Info_HideButton(a.teletile);
		Info_HideButton(a.coretile);
	}

	// Show buttons that related to website feed stuff

}

// Update TileInfo panel for a tile that nobody owns
function Info_Show_VacantTile()
{
	let a = Info_Show_GetElems();

	// set all info lines to default / hidden
	a.name.innerText = "Unclaimed Tile";
	a.url.parentElement.classList.add("hidden");
	a.owners.parentElement.classList.add("hidden");
	a.teletarget.parentElement.classList.add("hidden")

	/// buttons and such ///
	if (User_GetName()) {
		// core tile
		let quota_core = Quota_CoreTile();
		let fcn_core = (quota_core > 0) ? Garden_ClaimCoreTile : null;
		Info_SetButton(
			a.coretile,
			quota_core + " left",
			0,
			fcn_core,
			"Claim"
		);

		// buy tile
		let quota_any = Quota_AnyTile();
		let fcn_any = (quota_any > 0) ? Garden_ClaimTile : null;
		let dist = Gardens_GetNearestOwned_Dist(User_GetName());
		const max_dist = 2.5;
		if (dist < max_dist) {
			Info_SetButton(
				a.buytile,
				quota_any + " left",
				0,
				fcn_any,
				"Claim"
			);
		} else if (max_dist < Infinity) {
			Info_SetButton(
				a.buytile,
				"Not by garden",
				0,
				null,
				"Claim"
			);
		} else {
			// no gardens at all
			console.log("Make a garden!")
			Info_HideButton(a.buytile);
		}
	} else {
		Info_HideButton(a.buytile);
		Info_HideButton(a.coretile);
	}

	// non-applicable tiles
	Info_HideButton(a.edittile);
	Info_HideButton(a.selltile);
	Info_HideButton(a.teletile);
}

// Populate an info panel
export function Info_Show()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='tileinfo']");
	let coords = infopanel.querySelector("[data-id='coords'] .content");
	let preview = infopanel.querySelector("[data-id='preview']");

	// first, hide everything else
	Info_Hide();
	// then, unhide the parts we need
	sidebars.classList.remove("hidden");
	infopanel.classList.remove("hidden");

	// Find the garden at the plot
	let garden_obj = Garden_GetAtTile(SEL_XTILE, SEL_YTILE);

	// List coords
	coords.innerText = "(" + SEL_XTILE + " , " + SEL_YTILE + ")";
	// Render preview
	Info_RenderTile(preview, SEL_XTILE, SEL_YTILE, garden_obj);

	// Branch depending on whether tile is vacant or not
	if (!garden_obj) {
		Info_Show_VacantTile();
	} else {
		let garden = garden_obj.garden;
		let tile = garden_obj.tile;
		Info_Show_OwnedTile(garden, tile);
	}
}

// Hide all sidebars and remove collapse button
export function Info_Hide()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	// hide all sidebars
	for(let e of sidebars.getElementsByClassName("sidebar")) {
		e.classList.add("hidden");
	}
	// then hide the entire container
	sidebars.classList.add("hidden");
	// untick the popout things as well
	let nav_sitelist = document.querySelector("nav a[data-id='browse']");
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");
	nav_sitelist.classList.remove("active");
	nav_parksel.classList.remove("active");
}

/// Park Selection Sidebar /////////////////////////////////////////////////////

function ParkSel_Show()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='parksel']");
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");

	// close if already open
	if (nav_parksel.classList.contains("active")) {
		ParkSel_Hide();
		return;
	}

	// first, hide everything else
	Info_Hide();
	// then, unhide the parts we need
	sidebars.classList.remove("hidden");
	infopanel.classList.remove("hidden");

	// set navbar button active
	nav_parksel.classList.add("active");
}

function ParkSel_Hide()
{
	if (!SIDEBAR_ID) {return;}
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");
	Info_Hide();
	nav_parksel.classList.remove("active");
}

// event handler for button click
function ParkSel_ButtonEvent(e)
{
	let id = e.parentElement.dataset.id;
	let park = PARKS[id];
	console.assert(park, "park list not loaded?!");
	// Start loading map
	Map_Init(park.tiles, park.map, park.gardens);
	// Set navbar text
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");
	nav_parksel.innerText = name;
	// Close panel
	ParkSel_Hide();
}

// create a parksel listing
// this is a good argument for JSX...
function ParkSel_MakeItem(park, id)
{
	let row = document.createElement("div");
	row.dataset.id = id;

	let icon = document.createElement("img");
	icon.classList.add("icon");
	icon.classList.add("tile");
	icon.src = park.icon;
	row.appendChild(icon);

	let name = document.createElement("div");
	name.classList.add("name");
	name.innerText = park.name;
	row.appendChild(name);

	let desc = document.createElement("div");
	desc.classList.add("desc");
	desc.innerText = park.desc;
	row.appendChild(desc);

	let btn = document.createElement("a");
	btn.href = "#";
	btn.classList.add("button");
	btn.classList.add("action");
	btn.onclick = ParkSel_ButtonEvent;
	btn.innerText = "Visit";
	row.appendChild(btn);

	let credits = document.createElement("div")
	credits.classList.add("properties");

	let credits_artists_title = document.createElement("div");
	credits_artists_title.classList.add("header");
	credits_artists_title.innerText = "Artists: ";
	credits.appendChild(credits_artists_title);

	let credits_artists = document.createElement("div");
	credits_artists.classList.add("owners");
	credits_artists.classList.add("content");
	Info_MakeOwnersLine(park.artists, credits_artists);
	credits.appendChild(credits_artists);

	let credits_mappers_title = document.createElement("div");
	credits_mappers_title.classList.add("header");
	credits_mappers_title.innerText = "Mappers: ";
	credits.appendChild(credits_mappers_title);

	let credits_mappers = document.createElement("div");
	credits_mappers.classList.add("owners");
	credits_mappers.classList.add("content");
	Info_MakeOwnersLine(park.mappers, credits_mappers);
	credits.appendChild(credits_mappers);

	row.appendChild(credits);

	return row;
}

// register the parksel icons
function ParkSel_Register()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let parklist = sidebars.querySelector(".sidebar[data-id='parksel'] > .fancylist");

	for (let parkid in PARKS) {
		parklist.appendChild(ParkSel_MakeItem(PARKS[parkid], parkid));
	}
}

// Get the currently active park's name
function ParkSel_GetName()
{
	return document.querySelector("nav a[data-id='parksel']").innerText;
}

/// Browse List Sidebar ///////////////////////////////////////////////////////

function SiteList_Show()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='sitelist']");
	let nav_browse = document.querySelector("nav a[data-id='browse']");

	// close if already open
	if (nav_browse.classList.contains("active")) {
		SiteList_Hide();
		return;
	}

	// first, hide everything else
	Info_Hide();
	// then, unhide the parts we need
	sidebars.classList.remove("hidden");
	infopanel.classList.remove("hidden");

	// set navbar button active
	nav_browse.classList.add("active");

	// populate the sitelist
	SiteList_Populate()
}

function SiteList_Hide()
{
	let nav_sitelist = document.querySelector("nav a[data-id='browse']");
	Info_Hide();
	nav_sitelist.classList.remove("active");
}

// note: not sure how to disambug
function SiteList_MakeEntry(garden, tile)
{
	// 88x31 button
	let preview = document.createElement("canvas");
	preview.width = 88;
	preview.height = 31;
	preview.classList.add("icon");
	let ctx = preview.getContext('2d', {alpha: false});
	Render_FG_SiteLink_Single_Raw(ctx, 0, 0, tile, garden.color);

	// Site name
	let title = document.createElement("div");
	title.classList.add("name");
	if (tile.name) {
		title.innerText = tile.name;
	} else {
		title.innerText = garden.name;
	}

	// Site author(s)
	let owners = document.createElement("div");
	owners.classList.add("owners");
	Info_MakeOwnersLine(garden.owners, owners);

	// and bundle that into a row
	let newrow = document.createElement("div");
	newrow.appendChild(preview);
	newrow.appendChild(title);
	newrow.appendChild(owners);
	return newrow;
}

// Populate the site list
function SiteList_Populate()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='sitelist']");
	let parkname = infopanel.querySelector("[data-id='parkname']");
	let list = infopanel.querySelector(".fancylist");

	// Copy park name over
	parkname.innerText = ParkSel_GetName();

	// Get a list of nearby sites, sorted by distance from viewport
	let center_tile = Coord_Lookup_Center();
	let gardenlist = Gardens_SortDistance(null, center_tile.x, center_tile.y);

	// And then for each garden, add that to the big list
	list.innerHTML = "";
	for (let garden of gardenlist) {
		// only doing the first core tile for each park
		// we might want a more bulletproof solution later
		let tiles = garden.tiles.filter((v) => v.is_core);
		if (!tiles) { continue; }
		list.appendChild(SiteList_MakeEntry(garden, tiles[0]));
	}

}

/// Main Navbar ///////////////////////////////////////////////////////////////

// Toggle garden ownership overlay
function Nav_ToggleOverlay()
{
	let navbar = document.getElementsByTagName("nav")[0];
	let overlay = navbar.querySelector("[data-id='overlay']");

	let state = Garden_ToggleOverlay();
	if (state) {
		overlay.classList.add("active")
	} else {
		overlay.classList.remove("active")
	}
}

// Update login thingy
function Nav_UpdateLogin()
{
	let nav_login = document.querySelector("nav [data-id='login']")
	let nav_login_img = nav_login.querySelector("img");
	let nav_login_name = nav_login.querySelector("span");
	let user = User_GetName();
	if (user) {
		nav_login_img.classList.remove("hidden");
		nav_login_img.src = "/static/profpics/" + user + ".png";
		nav_login_name.innerText = user;
	} else {
		nav_login_img.classList.add("hidden");
		nav_login_name.innerText = "Log in";
	}
}

// init
export function init() {
	console.log("UI_Init");
	/// load map data (async) ///
	Parks_GetInfo().then((parks) => {
		PARKS = parks;
		let default_park = PARKS[PARKS_DEFAULT];
		Map_Init(
			default_park.tiles,
			default_park.map,
			default_park.gardens
		);
	}).then(() => {
		Map_SetAutoScroll(0.5, 0.5); // set demo autoscroll
		ParkSel_Register(); // Register park selection list
	});

	/// set sidebar events ///
	Info_SetID("sidebars");

	// collapsable sidebar(s)
	for(let e of document.getElementsByClassName('collapsebtn')) {
		e.addEventListener('pointerup', (event) => {
			Info_Hide();
		});
	}

	// hide splash on click
	let splash = document.getElementsByClassName('advertise')[0];
	let splash_close = splash.querySelector("[data-id='close']");
	splash_close.addEventListener('pointerup', (event) => {
		splash.classList.add('hidden');
	});

	// resize canvas on window resize
	window.addEventListener('resize', () => { resize_canvas(); });

	/// navbar actions ///
	let navbar = document.getElementsByTagName("nav")[0];

	// logo: show splash screen
	let nav_ngo = navbar.querySelector("[data-id='logo']");
	nav_ngo.addEventListener('pointerup', (e) => {
		e.preventDefault();
		splash.classList.remove('hidden');
	});

	// park name: show park selector
	let nav_parksel = navbar.querySelector("[data-id='parksel']");
	nav_parksel.addEventListener('pointerup', (e) => {
		e.preventDefault();
		ParkSel_Show();
	});

	// 🔍: toggle overlay
	let nav_overlay = navbar.querySelector("[data-id='overlay']");
	nav_overlay.addEventListener('pointerup', (e) => {
		e.preventDefault();
		Nav_ToggleOverlay();
	});
	// and set the active state just in case
	if (Garden_OverlayActive()) {
		nav_overlay.classList.add("active");
	}

	// 📃: browse sites/gardens
	let nav_browse = navbar.querySelector("[data-id='browse']");
	nav_browse.addEventListener('pointerup', (e) => {
		e.preventDefault();
		SiteList_Show();
	});

	// login: set user name and pic accordingly
	Nav_UpdateLogin();
	let nav_login = navbar.querySelector("[data-id='login']")
	nav_login.addEventListener('pointerup', (e) => {
		e.preventDefault();
		// debugging logging in and out
		if (!USER) { USER = "invis"; }
		else { USER = null; }
		Nav_UpdateLogin();
		Info_Hide();
	})
}