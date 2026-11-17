extends RefCounted
## The JSON catalog preserves species, economy and level definitions from the web game.

const TANK_CAP := 10
const SAVE_VERSION := 1
static var _catalog: Dictionary = {}

static func data() -> Dictionary:
	if _catalog.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/catalog.json"))
		if parsed is Dictionary:
			_catalog = parsed
	return _catalog

static func species(id: String) -> Dictionary:
	for item: Dictionary in data().get("species", []):
		if item.id == id:
			return item
	return {}

static func decoration(id: String) -> Dictionary:
	for item: Dictionary in data().get("decor", []):
		if item.id == id:
			return item
	return {}

static func level(number: int) -> Dictionary:
	var levels: Array = data().get("levels", [])
	if number >= 1 and number <= levels.size():
		return levels[number - 1]
	var extra := maxi(1, number - levels.size())
	return {"title": "Ustalık %d" % extra, "desc": "%d yem tanesi daha yedir" % (150 + extra * 40), "objective": "feed", "target": 150 + extra * 40, "reward": 400 + extra * 50}
