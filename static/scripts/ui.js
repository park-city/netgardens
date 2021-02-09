'use strict';

// variables
let SIDEBAR_ID = "";
let USER = "invis";

// list of map tilesets (temporary)
const TILESETS = {
	'central-park': 'static/tiles/central-park.png',
	'debug-park': 'static/tiles/scoli-blocks.png'
}
const TILEMAPS = {
	'central-park': 'static/maps/testmap1.csv',
	'debug-park': 'static/maps/debug-park.csv'
}
const GARDENSETS = {
	'central-park': 'static/maps/testmap1_gardens.json',
	'debug-park': 'static/maps/testmap1_gardens.json'
}

// Server-side getters/setters /////////////////////////////////////////////////
// Get name of logged in user
function User_GetName()
{
	return USER;
}

// Sidebars ////////////////////////////////////////////////////////////////////

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
		Render_FG_Overlay_Single(ctx, X_TILESIZE, Y_TILESIZE, garden_obj.tile);
		Render_FG_SiteLink_Single(ctx, X_TILESIZE, Y_TILESIZE, garden_obj.tile);
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
	// display "out of funds" message if applicable
	if (!NetCoins_Test(cost)) {
		status_elem.innerText = "Out of funds";
	}

	// add event handler if applicable
	if (NetCoins_Test(cost) && action) {
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

// get all the elements required for the info sidebar
function Info_Show_GetElems()
{
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='tileinfo']");

	let name = infopanel.querySelector("[data-id='name']");
	let url = infopanel.querySelector("[data-id='url'] a");
	let owners = infopanel.querySelector("[data-id='owners'] [data-id='list']");
	let teletarget = infopanel.querySelector("[data-id='teletarget'] a");

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
	for (let owner of garden.owners) {
		// todo: add profile pic too
		let newrow = document.createElement("a");
		newrow.innerText = owner;
		newrow.href = "#";
		a.owners.appendChild(newrow);
	}

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
		let sellprice = Garden_GetTilePrice(tile);
		Info_SetButton(
			a.selltile, "", -sellprice, null, NetCoins_Format(sellprice)
		);

		// buy tile
		Info_HideButton(a.buytile);

		// backdrop
		let gfxprice = Garden_GetTileAddonPrice("is_gfx");
		if (tile.is_gfx) {
			// todo: link to gfx editor
			Info_SetButton(a.edittile, "Purchased", 0, null, "Edit GFX");
		} else {
			// todo: link to buy
			Info_SetButton(a.edittile, "Edit tile gfx", gfxprice, null, NetCoins_Format(gfxprice));
		}

		// teleport
		let teleprice = Garden_GetTileAddonPrice("is_tele");
		if (tile.is_gfx) {
			// todo: link to target editor
			Info_SetButton(a.teletile, "Purchased", 0, null, "Set Target");
		} else {
			// todo: link to buy
			Info_SetButton(a.teletile, "Link gardens", teleprice, null, NetCoins_Format(teleprice));
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
	// core tile
	let quota_core = Quota_CoreTile();
	let price_core = Garden_GetTilePrice({is_core: true});
	let fcn_core = (quota_core > 0) ? Garden_ClaimCoreTile : null;
	Info_SetButton(
		a.coretile,
		quota_core + " left",
		price_core,
		fcn_core,
		NetCoins_Format(price_core)
	);

	// buy tile
	let quota_any = Quota_AnyTile();
	let price_any = Garden_GetTilePrice({});
	let fcn_any = (quota_any > 0) ? Garden_ClaimTile : null;
	let dist = Garden_GetNearestOwned_Dist(User_GetName());
	const max_dist = 2.5;
	if (dist < max_dist) {
		Info_SetButton(
			a.buytile,
			quota_any + " left",
			price_any,
			fcn_any,
			NetCoins_Format(price_any)
		);
	} else if (max_dist < Infinity) {
		Info_SetButton(
			a.buytile,
			"Not by garden",
			price_any,
			null,
			NetCoins_Format(price_any)
		);
	} else {
		// no gardens at all
		console.log("Make a garden!")
		Info_HideButton(a.buytile);
	}

	// non-applicable tiles
	Info_HideButton(a.edittile);
	Info_HideButton(a.selltile);
	Info_HideButton(a.teletile);
}

// Populate an info panel
function Info_Show()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='tileinfo']");
	let coords = infopanel.querySelector("[data-id='coords'] span");
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
function Info_Hide()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	// hide all sidebars
	for(let e of sidebars.getElementsByClassName("sidebar")) {
		e.classList.add("hidden");
	}
	// then hide the entire container
	sidebars.classList.add("hidden");
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

// register the parksel icons
function ParkSel_Register()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let parks = sidebars.querySelector(".sidebar[data-id='parksel'] > .fancylist").children;
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");

	for (let park of parks) {
		let button = park.getElementsByClassName("button")[0];
		if (button.classList.contains("disabled")) { continue; }
		if (park.dataset.id == "cancel") {
			button.addEventListener('pointerup', (e) => {
				ParkSel_Hide();
			});
		} else {
			let name = park.getElementsByClassName("name")[0].innerText;
			button.addEventListener('pointerup', (e) => {
				// load map data
				Map_Init(
					TILESETS[park.dataset.id],
					TILEMAPS[park.dataset.id],
					GARDENSETS[park.dataset.id]
				);
				// Set navbar text
				nav_parksel.innerText = name;
				// Close panel
				ParkSel_Hide();
			});
		}
	}
}

/// Main Navbar ////////////////////////////////////////////////////////////////

function Nav_UpdateNetCoins()
{
	let navbar = document.getElementsByTagName("nav")[0];
	let netcoins = navbar.querySelector("[data-id='viewcoins']");

	let amount = NetCoins_Query();
	netcoins.innerText = NetCoins_Format(amount);
}

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

// init
document.addEventListener("DOMContentLoaded", (event) =>
{
	// set sidebar events
	Info_SetID("sidebars");

	// collapsable sidebar(s)
	for(let e of document.getElementsByClassName('collapsebtn')) {
		e.addEventListener('pointerup', (event) => {
			event.target.parentElement.classList.toggle("closed");
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
	nav_ngo.addEventListener('pointerup', (event) => {
		e.preventDefault();
		splash.classList.remove('hidden');
	});

	// park name: show park selector
	let nav_parksel = navbar.querySelector("[data-id='parksel']");
	nav_parksel.addEventListener('pointerup', (e) => {
		e.preventDefault();
		ParkSel_Show();
	});
	ParkSel_Register();

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

	// netcoins: init value
	Nav_UpdateNetCoins();

	// load map data
	Map_Init(
		TILESETS['central-park'],
		TILEMAPS['central-park'],
		GARDENSETS['central-park']
	).then(() => {
		// set demo autoscroll
		Map_SetAutoScroll(0.5, 0.5);
	})

});