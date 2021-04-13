'use strict';
/*
	<script src="https://d3js.org/d3-dsv.v2.min.js" defer></script>
	<script src="https://d3js.org/d3-fetch.v2.min.js" defer></script>
	<script src="https://d3js.org/d3-color.v2.min.js" defer></script>
	<script src="/static/scripts/garden.js" defer type="module"></script>
	<script src="/static/scripts/map.js" defer type="module"></script>
	<script src="/static/scripts/accounting.js" defer type="module"></script>
	<script src="/static/scripts/ui.js" defer type="module"></script>
*/

import { init as UI_Init } from './ui.js'
import { init as Map_Init } from './map.js'

document.addEventListener("DOMContentLoaded", (event) => {
	UI_Init();
	Map_Init();
});