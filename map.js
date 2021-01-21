'use strict';
/*
    This file is part of Netgardens Online.

    Netgardens Online is free software: you can redistribute it and/or
    modify it under the terms of the GNU Affero General Public License
    as published by the Free Software Foundation, either version 3 of
    the License, or (at your option) any later version.

    Foobar is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU Affero General Public
    License along with Netgardens Online.
    If not, see <https://www.gnu.org/licenses/>.
*/
let X_POS       = 0;
let Y_POS       = 0;
let X_TILESIZE  = 64;
let Y_TILESIZE  = 64;     // tile gfx is twice this height
let TIME_START  = 0;
let TIME_LAST   = 0;
let MOUSE_DOWN  = false;  // whether mouse is pressed
let MOUSE_START = [];     // 'grab' coordinates when pressing mouse
let MOUSE_LAST  = [0, 0]; // previous coordinates of mouse release
let MOUSE_POS_START = [0, 0];
let AUTOSCROLL  = false;
let AUTOSCROLL_DX = 0;
let AUTOSCROLL_DY = 0;

const COLORS = [
	"#000022",
	"#000044",
	"#002266",
	"#003399",
	"#0022AA",
	"#1144CC",
	"#1155EE",
]
var SPR = [];
const SPR_URL = "static/tiles/central-park.png"
var MAP = [];

const NUM_BG = 1;
let CANVAS_BG = null;
let CTX_BG = null;
let BG_RERENDER = false;

const LEFT = 0;
const RIGHT = 1;

// https://stackoverflow.com/a/24137301
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

// https://stackoverflow.com/a/17323608
function mod(n, m) {
	return ((n % m) + m) % m;
}

// https://stackoverflow.com/a/10215724
function resize_canvas(){
	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	// Make it visually fill the positioned parent
	canvas.style.width ='100%';
	canvas.style.height='100%';
	// ...then set the internal size to match
	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Determine which tile a given mouse coord falls under
// this is complicated
function Coord_Lookup(x, y)
{
	// determine x
	let x_out = x / X_TILESIZE;
	// get a y 
	let y_out = (y / Y_TILESIZE);
	// if fractional part of Y > (or <, if odd) fractional part of
	// X, add one to Y
	/*let x_frac = x_out - Math.floor(x_out);
	let y_frac = y_out - Math.floor(y_out);

	if (Math.floor(x_out) % 2 == 0) {
		if (x_frac <= y_frac) {y_out -= 1;}
	} else {
		if (x_frac >= y_frac) {y_out -= 1;}
	}*/

	return {x: Math.round(x_out), y: Math.round(y_out)};
}

// get an array of tiles to be rendered onto the screen
// this is a big temporary hack
function Map_MakeRandom(w, h)
{
	let map = [];
	const num_tiles = Math.floor(SPR.length / 2) - 1;
	let tile = 0;
	for(let y = 0; y < h; y += 1) {
		let row = [];
		tile = getRandomInt(0, num_tiles) * 2;
		for (let x = 0; x < w; x += 1) {
			if ((x == w-1) && ((y % 2) == 0)) {
				// match tile edges to be seamless
				// (not needed for finite maps)
				tile = row[0]-1;
			} else if (!((x % 2) ^ (y % 2))) {
				tile += 1;
				if (tile >= SPR.length) { tile = 0; }
			} else {
				tile = getRandomInt(0, num_tiles) * 2;
			}
			row.push(tile);
		}
		map.push(row);
	}
	return map;
}

// cache tile graphics
// temporary haxx, probably not great
function Map_CacheGfx(url)
{
	let img = new Image();
	img.src = url;
	SPR = [];
	return img.decode().then(() => {
		let promises = [];
		for (let y = 0; y < img.height; y += Y_TILESIZE*2) {
			for (let x = 0; x < img.width; x += X_TILESIZE) {
				promises.push(createImageBitmap(img, x, y, X_TILESIZE, Y_TILESIZE*2));
			}
		}
		return Promise.all(promises);
	}).then((sprites) => {
		for (let sprite of sprites) {
			SPR.push(sprite);
		}
	});
}

// todo: this doesn't align with bg properly
function Render_BG_Tile_noimg(ctx, x, y, xi, yi)
{
	ctx.beginPath();
	if ((xi % 2) ^ (yi % 2)) {
		ctx.moveTo(x, y+(Y_TILESIZE / 2));
		ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE));
		ctx.lineTo(x+(X_TILESIZE), y);
	} else {
		ctx.moveTo(x, y);
		ctx.lineTo(x, y+(Y_TILESIZE));
		ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE/2));
	}
	ctx.closePath();
	ctx.fill();
	// render debug text
	/*ctx.fillStyle = 'white';
	ctx.fillText(
		xi + ',' + yi,
		x + (X_TILESIZE / 2),
		y + (Y_TILESIZE / 2)
	);*/
}

function Render_BG_Tile(ctx, x, y, tile) {
	ctx.drawImage(SPR[tile], x, y);
}

// just a generic grid-like thing for now
function Render_BG(ctx)
{
	BG_RERENDER = false;
	// set no-tile colors
	ctx.fillStyle = "#B0E0E6";
	ctx.strokeStyle = "#FFFFFF";

	let x = 0;
	let y = -Y_TILESIZE*1.5;
	let xi = 0;
	let yi = 0;
	ctx.font = '8px monospace';

	// append first few rows again because graphics
	let tiles = MAP;
	tiles.push(tiles[0]);
	tiles.push(tiles[1]);
	tiles.push(tiles[2]);

	for (const row of tiles) {
		for (const tile of row) {
			try {
				Render_BG_Tile(ctx, x, y, tile);
			} catch (e) {
				// tile not loaded, render dummy and try again in some time
				// (don't want to do this every frame)
				Render_BG_Tile_noimg(ctx, x, y, xi, yi);
				setTimeout(() => {BG_RERENDER = true;}, 200);
			}
			x += X_TILESIZE;
			xi += 1;
		}
		x = 0;
		y += Y_TILESIZE / 2;
		xi = 0;
		yi += 1;
	}
}

function Map_DoAutoScroll()
{
	if (AUTOSCROLL == false) { return; }
	X_POS += AUTOSCROLL_DX;
	Y_POS += AUTOSCROLL_DY;
}

function Map_SetAutoScroll(dx, dy)
{
	AUTOSCROLL = true;
	AUTOSCROLL_DX = dx;
	AUTOSCROLL_DY = dy;
}

// thing to do every frame
function Render_Step(timestamp)
{
	// timestamp
	let time = timestamp - TIME_START;

	// autoscroll
	Map_DoAutoScroll();

	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	const ctx = canvas.getContext('2d', {alpha: false});

	if (BG_RERENDER) {
		// draw background layers
		ctx.clearRect(0, 0, CANVAS_BG.width, CANVAS_BG.height);
		Render_BG(CTX_BG);
	}

	// blit background layer to composite canvas
	ctx.globalCompositeOperation = 'source-over';
	//ctx.clearRect(0, 0, canvas.width, canvas.height); // temporary!

	let x_pos = Math.floor(mod(X_POS, CANVAS_BG.width));
	let y_pos = Math.floor(mod(Y_POS, CANVAS_BG.height));

	const x_off = [
		x_pos,
		x_pos - CANVAS_BG.width,
		x_pos,
		x_pos - CANVAS_BG.width,
	];
	const y_off = [
		y_pos,
		y_pos,
		y_pos - CANVAS_BG.height,
		y_pos - CANVAS_BG.height,
	];
	const num_off = 4;

	for(let i = 0; i < num_off; i += 1) {
		ctx.drawImage(
			CANVAS_BG,
			x_off[i], y_off[i],                    // src x, y
			canvas.width, canvas.height,           // src w, h
			0, 0, canvas.width, canvas.height      // dst x, y, w, h
		);
	}

	// print a clipping box
	ctx.fillStyle = 'black';
	ctx.fillRect(
		CANVAS_BG.width / 2,
		0,
		9999999,
		9999999
	);
	ctx.fillRect(
		0,
		CANVAS_BG.height / 2,
		9999999,
		9999999
	);

	// print some debug info
	/*ctx.fillRect(0, 0, 160, 90);
	ctx.fillRect(canvas.width - 100, 0, 100, 30);
	ctx.font = '14px monospace';
	ctx.fillStyle = 'white';
	ctx.fillText('X:          ' + X_POS, 10, 20);
	ctx.fillText('X % width:  ' + x_pos, 10, 40);
	ctx.fillText('Y:          ' + Y_POS, 10, 60);
	ctx.fillText('Y % height: ' + y_pos, 10, 80);
	
	// print fps too
	let fps = Math.round(1/((timestamp - TIME_LAST) / 1000));
	ctx.fillText("FPS: " + fps, canvas.width - 80, 20);*/

	TIME_LAST = timestamp;
	window.requestAnimationFrame(Render_Step);
}

function Map_Init(tileset_url)
{
	Map_CacheGfx(tileset_url).then(() => {
		MAP = Map_MakeRandom(
			(CANVAS_BG.width / X_TILESIZE),
			(CANVAS_BG.height*2 / Y_TILESIZE)
		);
	}).then(() => {
		BG_RERENDER = true;
		X_POS = 0;
		Y_POS = 0;
	});
}

function Render_Init()
{
	// get BG canvas
	CANVAS_BG = document.getElementById('bg0');
	CTX_BG = CANVAS_BG.getContext('2d');
	// set display canvas size
	resize_canvas();
	// load map/graphics data
	Map_Init(SPR_URL);

	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }

	// register canvas events
	canvas.onpointerdown = function(e) {
		MOUSE_DOWN = true;
		MOUSE_START = [
			e.offsetX,
			e.offsetY
		];
		MOUSE_POS_START = [X_POS, Y_POS];
		AUTOSCROLL = false;
	};

	canvas.onpointerup = function(e) {
		MOUSE_DOWN = false;
		MOUSE_LAST = [
			e.offsetX - MOUSE_START[0],
			e.offsetY - MOUSE_START[1]
		];
		// if total movement less than 8 pixels
		if (Math.abs(MOUSE_LAST[0]) + Math.abs(MOUSE_LAST[1]) < 8) {
			console.log("Click!");
		}
	};

	canvas.onpointermove = function(e)
	{
		if(!MOUSE_DOWN) return; // don't pan if mouse is not pressed

		var x = e.offsetX;
		var y = e.offsetY;
		MOUSE_LAST = [
			e.offsetX - MOUSE_START[0],
			e.offsetY - MOUSE_START[1]
		];

		//console.log(MOUSE_POS_START, MOUSE_LAST);
		X_POS = MOUSE_POS_START[0] - MOUSE_LAST[0];
		Y_POS = MOUSE_POS_START[1] - MOUSE_LAST[1];
	}

	TIME_START = performance.now();
	TIME_LAST = TIME_START;

	// on each frame
	window.requestAnimationFrame(Render_Step);
}

Render_Init();