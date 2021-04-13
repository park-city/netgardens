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

import { color as d3_color } from 'd3-color';
import { text as d3_text } from 'd3-fetch';
import { csvParseRows } from 'd3-dsv';

import { Gardens_LoadFromJSON, Garden_GetAtTile, Garden_IsLinked, GARDENS, Gardens_Set } from './garden.js';
import { mod, resize_canvas } from './helpers.js';
import { Info_Hide, Info_Show } from './ui.js';

/// Global Variables ///////////////////////////////////////////////////////////
// this is probably bad form. whatever.
// position
let X_POS       = 0;          // Map scroll offset, X
let Y_POS       = 0;          // Map scroll offset, Y
// graphics sizes
export let X_TILESIZE  = 64;         // x size of tile footprint in tileset
export let Y_TILESIZE  = 64;         // y size of tile footprint in tileset (gfx are twice this height)
export let SCALE       = 1;          // Global graphics scalar
// time
let TIME_START  = 0;          // Time at program start
let TIME_LAST   = 0;          // Time at last frame
// mouse position
let MOUSE_START = [];         // Client X/Y of mouse at time of grab
let MOUSE_LAST  = [0, 0];     // Client X/Y of mouse relative to start
let MOUSE_POS_START = [0, 0]; // X_POS/Y_POS at time of grab
// autoscroll
let AUTOSCROLL  = false;      // Autoscroll flag
let AUTOSCROLL_DX = 0;        // Autoscroll speed, x
let AUTOSCROLL_DY = 0;        // Autoscroll speed, y
let SCROLLTO = false;         // Set true if autoscrolling to a tile
let SCROLLTO_X = 0;           // Target tile for autoscroll, X
let SCROLLTO_Y = 0;           // Target tile for autoscroll, Y
// tile cursor
export let SEL_XTILE = 0;            // Selected tile, X
export let SEL_YTILE = 0;            // Selected tile, Y
export let SEL_VISIBLE = false;      // Selection active flag
export let MOUSE_XTILE = 0;          // Tile under mouse, X
export let MOUSE_YTILE = 0;          // Tile under mouse, Y
// overlays
let GARDEN_OVERLAY = false;   // Garden overlay flag
let DEBUG_OVERLAY = false;    // Debug overlay flag
// loaded data
export let SPR = [];                 // tile sprites
export let MAP = [];                 // map data
export let OVERLAYS = {};            // 88x31 button graphics
// canvas information
let CANVAS_BG = null;         // display canvas reference
let CTX_BG = null;            // display context
let BG_RERENDER = false;      // if true, rerender entire background

/// (uncategorized) ////////////////////////////////////////////////////////////

// Get current selection position
export function Map_GetSelPos() {
	return [SEL_XTILE, SEL_YTILE];
}

// Autoscroll tick
export function Map_DoAutoScroll(t)
{
	if (AUTOSCROLL == false) { return; }
	X_POS += AUTOSCROLL_DX * t;
	Y_POS += AUTOSCROLL_DY * t;
}

// Set autoscroll speed
export function Map_SetAutoScroll(dx, dy)
{
	AUTOSCROLL = (dx != 0 && dy != 0);
	AUTOSCROLL_DX = dx;
	AUTOSCROLL_DY = dy;
}

// Toggle garden overlay flag and return new value
export function Garden_ToggleOverlay()
{
	GARDEN_OVERLAY = !GARDEN_OVERLAY;
	return GARDEN_OVERLAY;
}
// Get current value of garden overlay flag
export function Garden_OverlayActive()
{
	return GARDEN_OVERLAY;
}

// Determine which tile a given mouse coord falls under
// this is complicated
export function Coord_Lookup(x, y)
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

// Get the tile at the center of the display
export function Coord_Lookup_Center()
{
	const canvas = document.getElementById('mapcanvas');
	return Coord_Lookup(canvas.width/2, canvas.height/2);
}

async function Map_LoadFromCSV(url)
{
	return d3_text(url)
	.then((raw) => {
		return csvParseRows(raw);
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
function Gardens_CacheGfx(gardens)
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

// Render ownership overlay for a single tile
export function Render_FG_Overlay_Single(ctx, x, y, tile, color)
{
	// garden overlay
	if (GARDEN_OVERLAY && color) {
		let color_alpha = d3_color(color);
		color_alpha.opacity = 0.75;
		ctx.fillStyle = color_alpha.toString();
		ctx.strokeStyle = "transparent";
		Render_FG_TileShape(ctx, x, y, tile.orient, 1);
	}

	// special overlay for teleport tiles
	if (tile.is_tele) {
		ctx.fillStyle = "transparent";
		ctx.strokeStyle = "gold"; // test
		ctx.lineWidth = 3;
		Render_FG_TileEllipse(ctx, x, y, tile.orient);
	}
}

// Render tile ownership overlay
function Render_FG_Overlay(ctx)
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

			Render_FG_Overlay_Single(ctx, x, y, tile, garden.color);
		}
	}
}

// Renders literally just the 88x31 button, and nothing else
export function Render_FG_SiteLink_Single_Raw(ctx, dx, dy, tile, color)
{
	const w = 88 * SCALE;
	const h = 31 * SCALE;
	try {
		ctx.drawImage(OVERLAYS[tile.img], dx, dy);
	} catch (e) {
		// placeholder when loading / not found
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 4;
		ctx.fillStyle = color;
		ctx.strokeRect(dx, dy, w, h);
		ctx.fillRect(dx, dy, w, h);
		// text!
		ctx.fillStyle = "black";
		ctx.font = "14px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(tile.name, dx+44, dy+20, 80);
	}
}

// Render 88x31 button for a single tile
export function Render_FG_SiteLink_Single(ctx, x, y, tile, color)
{
	const w = 88 * SCALE;
	const h = 31 * SCALE;

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
	let dx = Math.floor(x - (w/2));
	let dy = Math.floor(y - (h/2));
	Render_FG_SiteLink_Single_Raw(ctx, dx, dy, tile, color);
}

// Render all applicable 88x31 buttons
function Render_FG_SiteLink(ctx)
{
	for (let garden of GARDENS) {
		for (let tile of garden.tiles) {
			if (!tile.is_core) { continue; }
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

// render a circle (well, an oval) at the given x/y coords
function Render_FG_TileEllipse(ctx, x, y, orient)
{
	let scalar = 0.65;
	ctx.beginPath();
	ctx.ellipse(
		x, y+(Y_TILESIZE/2),
		X_TILESIZE*scalar, Y_TILESIZE*scalar/2, 0,
		0, 2*Math.PI
	)
	ctx.fill();
	ctx.stroke();
}

// Render a "ghost" cursor wherever the mouse is
function Render_FG_MousePos(ctx)
{
	// don't render if on a touchscreen
	if(window.matchMedia("(any-hover: none)").matches) { return; }

	let yi = MOUSE_YTILE - 1;
	let xi = Math.floor(MOUSE_XTILE / 2) * 2;
	if (Math.floor(yi % 2) != 0) {
		xi = Math.floor((MOUSE_XTILE + 1) / 2) * 2;
	}
	let x = -X_POS + xi*X_TILESIZE;
	let y = -Y_POS + yi*Y_TILESIZE/2;

	ctx.fillStyle = "transparent";
	ctx.strokeStyle = "#00000066";
	ctx.lineWidth = 5;
	Render_FG_TileShape(ctx, x, y, 0, (yi % 2));
}

// Render the selection cursor
function Render_FG_Sel(ctx)
{
	if (!SEL_VISIBLE) { return; }
	let yi = SEL_YTILE - 1;
	let xi = Math.floor(SEL_XTILE / 2) * 2;
	if (Math.floor(yi % 2) != 0) {
		xi = Math.floor((SEL_XTILE + 1) / 2) * 2;
	}
	let x = -X_POS + xi*X_TILESIZE;
	let y = -Y_POS + yi*Y_TILESIZE/2;

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
}

export function Render_BG_Tile(ctx, x, y, tile) {
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

// Render debug information
function Render_FG_Debug(ctx, canvas, timestamp)
{
	if (!DEBUG_OVERLAY) { return; }
	// timestamp
	let x_pos = Math.round(X_POS, 2);
	let y_pos = Math.round(Y_POS, 2);
	let x_rel = Math.floor(mod(X_POS, CANVAS_BG.width));
	let y_rel = Math.floor(mod(Y_POS, CANVAS_BG.height));
	let fps = Math.round(1/((timestamp - TIME_LAST) / 1000));

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 160, 90); //
	ctx.fillRect(0, canvas.height - 30, 100, 30);

	ctx.font = '14px monospace';
	ctx.textAlign = "left";
	ctx.fillStyle = 'white';
	ctx.fillText('X:          ' + x_pos, 10, 20);
	ctx.fillText('X % width:  ' + x_rel, 10, 40);
	ctx.fillText('Y:          ' + y_pos, 10, 60);
	ctx.fillText('Y % height: ' + y_rel, 10, 80);
	ctx.fillText("FPS: " + fps, 10, canvas.height - 10);
}

// blit background layer to composite canvas
function Render_FG_CopyBG(ctx, canvas)
{
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, canvas.width, canvas.height); // temporary!

	let x_pos = Math.floor(mod(-X_POS, CANVAS_BG.width));
	let y_pos = Math.floor(mod(-Y_POS, CANVAS_BG.height));

	// bg copy positions
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
		let x = x_off[i]; let w = CANVAS_BG.width;
		let y = y_off[i]; let h = CANVAS_BG.height;
		ctx.drawImage(CANVAS_BG, 0, 0, w, h, x, y, w, h);
	}

	// print a clipping box
	ctx.fillStyle = 'black';
	ctx.fillRect(
		CANVAS_BG.width,
		0,
		9999999,
		9999999
	);
	ctx.fillRect(
		0,
		CANVAS_BG.height,
		9999999,
		9999999
	);
}

// thing to do every frame
function Render_Step(timestamp)
{
	// this should be important for something
	let frames = (timestamp - TIME_LAST) / (1000 / 60);
	// autoscroll
	Map_DoAutoScroll(frames);

	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	const ctx = canvas.getContext('2d', {alpha: false});

	// Copy BG to screen
	Render_FG_CopyBG(ctx, canvas);
	// Render tile ownership overlay
	Render_FG_Overlay(ctx);
	// Render current selection
	Render_FG_MousePos(ctx);
	Render_FG_Sel(ctx);
	// Render all visible 88x31 buttons
	Render_FG_SiteLink(ctx);
	// print some debug info if applicable
	Render_FG_Debug(ctx, canvas, timestamp);

	// request next frame
	TIME_LAST = timestamp;
	window.requestAnimationFrame(Render_Step);

	// redraw background if requested (outside of vsync)
	if (BG_RERENDER) {
		ctx.clearRect(0, 0, CANVAS_BG.width, CANVAS_BG.height);
		Render_BG(CTX_BG);
	}
}

// Load map data
export async function Map_Init(tileset_url, tilemap_url, gardenset_url)
{
	return Map_CacheGfx(tileset_url)
	.then(() => {
		return Gardens_LoadFromJSON(gardenset_url);
	})
	.then((gardens) => {
		Gardens_Set(gardens);
		Gardens_CacheGfx(GARDENS);
		return Map_LoadFromCSV(tilemap_url);
	})
	.then((map) => {
		MAP = map;
		BG_RERENDER = true;
		X_POS = 0;
		Y_POS = 0;
	});
}

/// Map pointer events /////////////////////////////////////////////////////////
function Map_OnPointerDown(e)
{
	if (e.buttons != 1) {return;}
	MOUSE_START = [
		e.offsetX,
		e.offsetY
	];
	MOUSE_POS_START = [X_POS, Y_POS];
	AUTOSCROLL = false;
}

function Map_OnPointerUp(e)
{
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
	Map_UpdateCursor(e);
}

function Map_OnPointerMove(e)
{
	const canvas = document.getElementById('mapcanvas');
	if ((e.pressure != 0 && e.buttons == 0) || e.buttons == 1) {
		// update map position when dragging
		canvas.classList.remove("clickable");
		MOUSE_LAST = [
			e.offsetX - MOUSE_START[0],
			e.offsetY - MOUSE_START[1]
		];
		X_POS = MOUSE_POS_START[0] - MOUSE_LAST[0];
		Y_POS = MOUSE_POS_START[1] - MOUSE_LAST[1];
	} else {
		Map_UpdateCursor(e);
	}
}

// change cursor type if over a link
function Map_UpdateCursor(e)
{
	const x = e.clientX;
	const y = e.clientY;
	const canvas = document.getElementById('mapcanvas');
	const tile = Coord_Lookup(x, y);
	const garden = Garden_GetAtTile(tile.x, tile.y);

	MOUSE_XTILE = tile.x;
	MOUSE_YTILE = tile.y;
	if (Garden_IsLinked(garden)) {
		canvas.classList.add("clickable");
	} else {
		canvas.classList.remove("clickable");
	}
}

/// Init ///////////////////////////////////////////////////////////////////////
export function init()
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
	canvas.onpointerdown = Map_OnPointerDown;
	canvas.onpointerup = Map_OnPointerUp;
	canvas.onpointermove = Map_OnPointerMove;

	TIME_START = performance.now();
	TIME_LAST = TIME_START;

	// on each frame
	window.requestAnimationFrame(Render_Step);
}
