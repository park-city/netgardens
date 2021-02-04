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
// collapsable sidebar
document.getElementById('collapsebtn').addEventListener(
	'pointerup', (event) => {
		event.target.parentElement.classList.toggle("closed");
	}
);
// map select
document.getElementById('parksel').addEventListener(
	'change', (e) => {
		Map_Init(
			TILESETS[e.target.value],
			TILEMAPS[e.target.value],
			GARDENSETS[e.target.value]
		);
	}
)
// autoscroll
document.addEventListener("DOMContentLoaded", (event) => {
	Map_Init(
		TILESETS['central-park'],
		TILEMAPS['central-park'],
		GARDENSETS['central-park']
	);
	Map_SetAutoScroll(0.5, 0.5);
	Info_SetID("main_default", "main_info");
});