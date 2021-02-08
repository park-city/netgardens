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

// lots of global variables
let X_POS       = 0;
let Y_POS       = 0;
let X_TILESIZE  = 64;
let Y_TILESIZE  = 64;     // tile gfx is twice this height
let SCALE       = 1;
let TIME_START  = 0;
let TIME_LAST   = 0;
let MOUSE_DOWN  = false;  // whether mouse is pressed
let MOUSE_START = [];     // 'grab' coordinates when pressing mouse
let MOUSE_LAST  = [0, 0]; // previous coordinates of mouse release
let MOUSE_POS_START = [0, 0];
let AUTOSCROLL  = false;
let AUTOSCROLL_DX = 0;
let AUTOSCROLL_DY = 0;
let SCROLLTO = false;
let SCROLLTO_X = 0;
let SCROLLTO_Y = 0;
let SEL_XTILE = 8;
let SEL_YTILE = 4;
let SEL_VISIBLE = false;
let GARDEN_OVERLAY = false;

const COLORS = [
	"#000022",
	"#000044",
	"#002266",
	"#003399",
	"#0022AA",
	"#1144CC",
	"#1155EE",
]
let SPR = [];
let MAP = [];
let GARDENS = [];
let OVERLAYS = {};

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
	x += X_POS;
	y += Y_POS;
	// determine x
	let x_out = (x / X_TILESIZE);
	// get a y
	let y_out = (y / (Y_TILESIZE / 2));

	// if fractional part of Y > (or <, if odd) fractional part of
	// X, add one to Y
	let x_frac = Math.abs(x_out - Math.trunc(x_out));
	let y_frac = Math.abs(y_out - Math.trunc(y_out));
	if (y_out < 0) {y_frac = (1 - y_frac);}
	if (x_out < 0) {x_frac = (1 - x_frac);}

	let is_left = (
		(Math.abs(Math.floor(x_out)) % 2) ^
		(Math.abs(Math.floor(y_out)) % 2)
	);

	//console.log ("x: ", x_out, "y: ", y_out);
	if (is_left) {
		//console.log("\\")
		//console.log(x_frac, y_frac);
		if (x_frac <= y_frac) {
			//console.log("inside");
		} else {
			y_out -= 1;
			//console.log("outside");
		}
	} else {
		//console.log ("/")
		//console.log(x_frac, y_frac);
		if (x_frac >= (1-y_frac)) {
			//console.log("inside");
		} else {
			y_out -= 1;
			//console.log("outside");
		}
	}


	x_out = Math.floor(x_out);
	y_out = Math.floor(y_out);
	y_out += 1;
	return {x: x_out, y: y_out};
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

async function Map_LoadFromCSV(url)
{
	return d3.text(url)
	.then((raw) => {
		return d3.csvParseRows(raw);
	}).then((data) => {
		// temporary haxx to convert from per-tile to per-tri
		data = data.map((row,y,a) => {
			let newrow = [];
			for(let i = 0; i < row.length; i += 1) {
				if (y % 2) {
					// a normal row
					newrow.push(row[i] * 2);
					newrow.push((row[i] * 2)+1);
				} else {
					// an offset row
					newrow.push((row[i] * 2)+1);
					// handle end-of-row case
					if (i+1 >= row.length) {
						newrow.push(row[0] * 2);
					} else {
						newrow.push(row[i+1] * 2);
					}
				}
			}
			return newrow;
		});
		return data;
	});
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

// cache 88x31 button graphics
function Garden_CacheGfx(gardens)
{
	for (let garden of gardens) {
		for (let tile of garden.tiles) {
			if (!tile.img) { continue; }
			let img = new Image()
			img.src = tile.img;
			img.decode().then(() => {
				return createImageBitmap(img, 0, 0, 88, 31);
			}).then((bitmap) => {
				OVERLAYS[tile.img] = bitmap;
			});
		}
	}
}

function Render_FG_SiteLink_Single(ctx, x, y, tile, color)
{
	const w = 88 * SCALE;
	const h = 31 * SCALE;

	// garden overlay
	if (GARDEN_OVERLAY && color) {
		let color_alpha = d3.color(color);
		color_alpha.opacity = 0.75;
		ctx.fillStyle = color_alpha.toString();
		ctx.strokeStyle = "transparent";
		Render_FG_TileShape(ctx, x, y, tile.orient, 1);
	}

	// special-case tele tiles with fancy border
	if (tile.is_tele) {
		ctx.fillStyle = "transparent";
		ctx.strokeStyle = "gold"; // test
		ctx.lineWidth = 8;
		Render_FG_TileShape(ctx, x, y, tile.orient, 1);
		return;
	}

	// only continue for core tiles
	if (!tile.is_core) { return; }

	// shadow
	ctx.fillStyle = "#00000066";
	ctx.fillRect(
		x-(X_TILESIZE*1.25*0.5*SCALE),
		y+(Y_TILESIZE*0.4*SCALE),
		X_TILESIZE*1.25*SCALE,
		Y_TILESIZE*0.25*SCALE
	)

	// button
	ctx.strokeStyle = "#000000";
	ctx.lineWidth = 2;
	let dx = Math.floor(x - (w/2));
	let dy = Math.floor(y - (h/2));

	// outline
	try {
		// button gfx
		ctx.drawImage(OVERLAYS[tile.img], dx, dy);
	} catch (e) {
		// placeholder when loading
		ctx.fillStyle = "#B0E0E6";
		ctx.strokeRect(dx, dy, w, h);
		ctx.fillRect(dx, dy, w, h);
	}
}

function Render_FG_SiteLink(ctx)
{
	for (let garden of GARDENS) {
		for (let tile of garden.tiles) {
			// currently only supports floor orientation
			let yi = tile.y - 1;
			let xi = Math.floor(tile.x / 2) * 2;
			if (Math.floor(yi % 2) != 0) {
				xi = Math.floor((tile.x + 1) / 2) * 2;
			}
			let x = -X_POS + xi*X_TILESIZE;
			let y = -Y_POS + yi*Y_TILESIZE/2;
			if ((yi % 2) == 0) {x += X_TILESIZE;}

			Render_FG_SiteLink_Single(ctx, x, y, tile, garden.color);
		}
	}
}

// render the shape of some tile at the given x/y coords
function Render_FG_TileShape(ctx, x, y, orient, evenrow)
{
	ctx.beginPath();
	if (evenrow) {
		ctx.moveTo(x, y);
		ctx.lineTo(x-(X_TILESIZE), y+(Y_TILESIZE/2));
		ctx.lineTo(x, y+(Y_TILESIZE));
		ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE/2));
	} else {
		ctx.moveTo(x, y+(Y_TILESIZE / 2));
		ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE));
		ctx.lineTo(x+(X_TILESIZE*2), y+(Y_TILESIZE/2))
		ctx.lineTo(x+(X_TILESIZE), y);
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

function Render_FG_Sel(ctx)
{
	let yi = SEL_YTILE - 1;
	let xi = Math.floor(SEL_XTILE / 2) * 2;
	if (Math.floor(yi % 2) != 0) {
		xi = Math.floor((SEL_XTILE + 1) / 2) * 2;
	}
	let x = -X_POS + xi*X_TILESIZE;
	let y = -Y_POS + yi*Y_TILESIZE/2;

	// set no-tile colors
	ctx.fillStyle = "transparent";
	ctx.strokeStyle = "#000000";
	ctx.lineWidth = 5;
	Render_FG_TileShape(ctx, x, y, 0, (yi % 2));
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
	ctx.stroke();
	// render debug text
	/*ctx.fillStyle = 'white';
	ctx.fillText(
		xi + ',' + yi,
		x + (X_TILESIZE / 2),
		y + (Y_TILESIZE / 2)
	);*/
}

function Render_BG_Tile(ctx, x, y, tile) {
	ctx.drawImage(SPR[tile], x, y, X_TILESIZE*SCALE, 2*Y_TILESIZE*SCALE);
}

function Render_BG_Row(ctx, row, y, yi)
{
	let x = 0;
	let xi = 0;
	for (let tile of row) {
		try {
			Render_BG_Tile(ctx, x, y, tile);
		} catch (e) {
			// tile not loaded, render dummy and try again in some time
			// (don't want to do this every frame)
			Render_BG_Tile_noimg(ctx, x, y, xi, yi);
			setTimeout(() => {BG_RERENDER = true;}, 200);
		}
		x += X_TILESIZE*SCALE;
		xi += 1;
	}
}

// just a generic grid-like thing for now
function Render_BG(ctx)
{
	BG_RERENDER = false;
	// set no-tile colors
	ctx.fillStyle = "#B0E0E6";
	ctx.strokeStyle = "#FFFFFF";

	let y = -Y_TILESIZE*1.5;
	let yi = 0;

	for (const row of MAP) {
		Render_BG_Row(ctx, row, y, yi);
		y += (Y_TILESIZE / 2)*SCALE;
		yi += 1;
	}
	// render first few rows again because graphics
	for (let i = 0; i <= 2; i += 1) {
		Render_BG_Row(ctx, MAP[i], y, yi);
		y += (Y_TILESIZE / 2)*SCALE;
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

// Toggle garden overlay flag and return new value
function Garden_ToggleOverlay()
{
	GARDEN_OVERLAY = !GARDEN_OVERLAY;
	return GARDEN_OVERLAY;
}
// Get current value of garden overlay flag
function Garden_OverlayActive()
{
	return GARDEN_OVERLAY;
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

	// print current selection
	if (SEL_VISIBLE) {
		Render_FG_Sel(ctx);
	}

	// Render all visible 88x31 buttons
	Render_FG_SiteLink(ctx);

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

// Load map data
async function Map_Init(tileset_url, tilemap_url, gardenset_url)
{
	return Map_CacheGfx(tileset_url)
	.then(() => {
		return Garden_LoadFromJSON(gardenset_url);
	})
	.then((gardens) => {
		GARDENS = gardens;
		Garden_CacheGfx(gardens);
		return Map_LoadFromCSV(tilemap_url);
	})
	.then((map) => {
		MAP = map;
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
	//Map_Init(SPR_URL);

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
		if (Math.abs(MOUSE_LAST[0]) + Math.abs(MOUSE_LAST[1]) < 16) {
			let seltile = Coord_Lookup(MOUSE_START[0], MOUSE_START[1]);

			if (SEL_XTILE == seltile.x && SEL_YTILE == seltile.y) {
				// hide if we click on it again
				SEL_VISIBLE = !SEL_VISIBLE;
			} else {
				SEL_XTILE = seltile.x;
				SEL_YTILE = seltile.y;
				SEL_VISIBLE = true;
			}

			if (!SEL_VISIBLE) { Info_Hide(); }
			else { Info_Show(); }
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

document.addEventListener("DOMContentLoaded", (event) => Render_Init());