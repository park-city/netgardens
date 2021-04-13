'use strict';
// https://stackoverflow.com/a/24137301
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

// https://stackoverflow.com/a/17323608
export function mod(n, m) {
	return ((n % m) + m) % m;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// euclidian distance
export function distance(x1, y1, x2, y2)
{
	return Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
}

// https://stackoverflow.com/a/10215724
export function resize_canvas(){
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
