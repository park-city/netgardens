'use strict';

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

function ParkSel_Show()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let infopanel = sidebars.querySelector("[data-id='parksel']");

	// first, hide everything else
	Info_Hide();
	// then, unhide the parts we need
	sidebars.classList.remove("hidden");
	infopanel.classList.remove("hidden");
}

// register the parksel icons
function ParkSel_Register()
{
	if (!SIDEBAR_ID) {return;}
	let sidebars = document.getElementById(SIDEBAR_ID);
	let parks = sidebars.querySelector(".sidebar[data-id='parksel'] > .fancybuttons").children;
	let nav_parksel = document.querySelector("nav a[data-id='parksel']");

	for (let park of parks) {
		let button = park.getElementsByClassName("button")[0];
		if (button.classList.contains("disabled")) { continue; }
		if (park.dataset.id == "cancel") {
			button.addEventListener('pointerup', (e) => {
				Info_Hide();
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
				Info_Hide();
			});
		}
	}
}

function NetCoins_UpdateDisplay(amount)
{
	let navbar = document.getElementsByTagName("nav")[0];
	let netcoins = document.querySelector("[data-id='viewcoins']");
	netcoins.innerText = "§ " + amount;
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

	// navbar actions
	let navbar = document.getElementsByTagName("nav")[0];

	let nav_ngo = navbar.querySelector("[data-id='logo']");
	nav_ngo.addEventListener('pointerup', (event) => {
		splash.classList.remove('hidden');
	});

	let nav_parksel = navbar.querySelector("[data-id='parksel']");
	nav_parksel.addEventListener('pointerup', (e) => {
		e.preventDefault(); ParkSel_Show();
	});
	ParkSel_Register();

	NetCoins_UpdateDisplay(NetCoins_Query());

	// load map data
	Map_Init(
		TILESETS['central-park'],
		TILEMAPS['central-park'],
		GARDENSETS['central-park']
	);

	// set autoscroll
	Map_SetAutoScroll(0.5, 0.5);
});