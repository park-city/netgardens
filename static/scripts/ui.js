'use strict';

// list of map tilesets (temporary)
const TILESETS = {
	'central-park': 'static/tiles/central-park.png'
}
const TILEMAPS = {
	'central-park': 'static/maps/testmap1.csv'
}
const GARDENSETS = {
	'central-park': 'static/maps/testmap1_gardens.json'
}


// init
document.addEventListener("DOMContentLoaded", (event) => {

	// collapsable sidebar(s)
	for(let e of document.getElementsByClassName('collapsebtn')) {
		e.addEventListener('pointerup', (event) => {
			event.target.parentElement.classList.toggle("closed");
		});
	}

	// hide splash on click
	let splash = document.getElementsByClassName('advertise')[0];
	splash.addEventListener('pointerup', (event) => { splash.remove(); });

	// load map data
	Map_Init(
		TILESETS['central-park'],
		TILEMAPS['central-park'],
		GARDENSETS['central-park']
	);

	// set autoscroll
	Map_SetAutoScroll(0.5, 0.5);
	// set sidebar events
	Info_SetID("sidebars");
});