'use strict';
let X_POS = 32;
let Y_POS = 128;
let X_TILESIZE = 128;
let Y_TILESIZE = 64;
let TIME_START = 0;
let TIME_LAST = 0;

const COLORS = ['red', 'blue', 'cyan', 'green', 'purple', 'magenta', 'yellow', 'orange', 'teal', 'pink'];

const NUM_BG = 1;
let CANVAS_BG = [];
let CTX_BG = [];

// https://stackoverflow.com/a/24137301
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

// https://stackoverflow.com/a/17323608
function mod(n, m) {
	return ((n % m) + m) % m;
}

// get an array of tiles to be rendered onto the screen
function Tiles_MakeRandom(w, h)
{
	let map = [];
	for(y = 0; y < h; y += 1) {
		let row = [];
		for (x = 0; x < w; x += 1) {
			let color = COLORS.random();
			row.push(color);
		}
		map.push(row);
	}
	return map;
}

// just a generic grid-like thing for now
function Render_Step_BG(ctx, w, h)
{
	let x = 0;
	let y = (h / 2) - (Y_TILESIZE / 2);
	let xi = 0;
	let yi = 0;

	const tiles = Tiles_MakeRandom(8, 8);
	for (const row of tiles) {
		for (const tile of row) {
			ctx.fillStyle = tile;

			// render isometric tile
			ctx.beginPath();
			ctx.moveTo(x, y+(Y_TILESIZE / 2));
			ctx.lineTo(x+(X_TILESIZE/2), y+(Y_TILESIZE));
			ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE/2));
			ctx.lineTo(x+(X_TILESIZE/2), y);
			ctx.closePath();
			ctx.fill();

			x += X_TILESIZE / 2;
			y -= Y_TILESIZE / 2;
			xi += 1;
		}
		x = ((yi+1) * X_TILESIZE / 2);
		y += (Y_TILESIZE / 2) * (xi + 1);
		xi = 0;
		yi += 1;
	}
}

// thing to do every frame
function Render_Step(timestamp)
{
	// timestamp
	let time = timestamp - TIME_START;

	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	const ctx = canvas.getContext('2d', {alpha: false});

	// temporary motion thing
	X_POS = Math.cos(time / 2000) * 1024 - 512;
	Y_POS = Math.sin(time / 500) * 128;

	// blit background layer to composite canvas
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, 512, 512); // temporary!

	let x_pos = Math.floor(mod(X_POS, CANVAS_BG[0].width));

	const x_off = [
		(x_pos),                              // far-top
		(x_pos + (CANVAS_BG[0].width) / 2),   // top-left
		(x_pos - (CANVAS_BG[0].width) / 2),   // top-right
		(x_pos + CANVAS_BG[0].width),         // far-left
		(x_pos),                              // center
		(x_pos - CANVAS_BG[0].width),         // far-right
		(x_pos + (CANVAS_BG[0].width) / 2),   // bottom-left
		(x_pos - (CANVAS_BG[0].width) / 2),   // bottom-right
		(x_pos)                               // far-bottom
	];
	const y_off = [
		(Y_POS - CANVAS_BG[0].height),         // far-top
		(Y_POS + (CANVAS_BG[0].height) / 2),   // top-left
		(Y_POS + (CANVAS_BG[0].height) / 2),   // top-right
		(Y_POS),                               // far-left
		(Y_POS),                               // center
		(Y_POS),                               // far-right
		(Y_POS - (CANVAS_BG[0].height) / 2),   // bottom-left
		(Y_POS - (CANVAS_BG[0].height) / 2),   // bottom-right
		(Y_POS + CANVAS_BG[0].height)          // far-bottom
	];
	const num_off = 9;

	for(let i = 0; i < num_off; i += 1) {
		ctx.drawImage(
			CANVAS_BG[0],
			x_off[i], y_off[i],                          // src x, y
			canvas.width, canvas.height,           // src w, h
			0, 0, canvas.width, canvas.height      // dst x, y, w, h
		);
	}

	// print some debug info
	ctx.font = '14px monospace';
	ctx.fillStyle = 'white';
	ctx.fillText('X:         ' + X_POS, 10, 20);
	ctx.fillText('X % width: ' + x_pos, 10, 40);
	
	// print fps too
	let fps = Math.round(1/((timestamp - TIME_LAST) / 1000));
	ctx.fillText("FPS: " + fps, 440, 20);

	TIME_LAST = timestamp;
	window.requestAnimationFrame(Render_Step);
}

function Render_Init()
{
	TIME_START = performance.now();
	TIME_LAST = TIME_START;

	// get BG canvas
	CANVAS_BG[0] = document.getElementById('bg0');
	CTX_BG[0] = CANVAS_BG[0].getContext('2d');
	// draw background layers
	Render_Step_BG(CTX_BG[0], CANVAS_BG[0].width, CANVAS_BG[0].height);

	// on each frame
	window.requestAnimationFrame(Render_Step);
}

Render_Init();