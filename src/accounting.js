// almost everything in this file should be simple server-side lookups

// User quotas /////////////////////////////////////////////////////////////////
let QUOTA_CORE = 1;
let QUOTA_TILE = 9; // might remove

export function Quota_CoreTile() { return QUOTA_CORE; }
export function Quota_AnyTile() { return QUOTA_TILE; }

export function Quota_Change_CoreTile(delta)
{
	if ((QUOTA_CORE + delta) < 0) { return false;}
	QUOTA_CORE += delta;
	return true;
}

export function Quota_Change_AnyTile(delta)
{
	if ((QUOTA_TILE + delta) < 0) { return false;}
	QUOTA_TILE += delta;
	return true;
}
