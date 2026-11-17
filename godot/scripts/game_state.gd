extends RefCounted
## Pure simulation/economy. No scene references, network, or rendering dependencies.

const Catalog = preload("res://scripts/catalog.gd")
signal changed
signal notice(message: String)
signal sound_requested(kind: String)

var coins: int = 100
var level: int = 1
var fed_total: int = 0
var coins_total: int = 0
var purchases: int = 0
var level_start: Dictionary = {"fed": 0, "coins": 0, "purchases": 0}
var fish: Array[Dictionary] = []
var decor: Array[String] = []
var sound_on: bool = true
var elapsed: float = 0.0
var next_id: int = 1

func new_game() -> void:
	coins = 100
	level = 1
	fed_total = 0
	coins_total = 0
	purchases = 0
	level_start = {"fed": 0, "coins": 0, "purchases": 0}
	fish.clear()
	decor.clear()
	elapsed = 0.0
	next_id = 1
	_add_fish("goldfish", "Mercan", 0.1)
	_add_fish("goldfish", "Güneş", 0.05)
	changed.emit()

func _add_fish(species_id: String, fish_name: String, growth: float = 0.0) -> void:
	fish.append({"id": next_id, "species": species_id, "name": fish_name, "growth": growth, "hunger": 55.0})
	next_id += 1

func get_fish(id: int) -> Dictionary:
	for item: Dictionary in fish:
		if int(item.id) == id:
			return item
	return {}

func buy_fish(species_id: String) -> bool:
	var sp := Catalog.species(species_id)
	if sp.is_empty():
		return false
	if level < int(sp.unlockLevel):
		notice.emit("Bu tür seviye %d'de açılacak." % int(sp.unlockLevel))
		return false
	if fish.size() >= Catalog.TANK_CAP:
		notice.emit("Akvaryum dolu: en fazla %d balık." % Catalog.TANK_CAP)
		return false
	if coins < int(sp.price):
		notice.emit("Yeterli altının yok. Balıklarını besleyip kabarcıkları topla.")
		return false
	coins -= int(sp.price)
	purchases += 1
	_add_fish(species_id, "%s %d" % [sp.name, next_id])
	notice.emit("%s akvaryumuna katıldı!" % sp.name)
	sound_requested.emit("buy")
	_check_levels()
	changed.emit()
	return true

func buy_decor(id: String) -> bool:
	var item := Catalog.decoration(id)
	if item.is_empty() or id in decor:
		return false
	if level < int(item.unlockLevel):
		notice.emit("Bu dekor seviye %d'de açılacak." % int(item.unlockLevel))
		return false
	if coins < int(item.price):
		notice.emit("Bu dekor için yeterli altının yok.")
		return false
	coins -= int(item.price)
	decor.append(id)
	notice.emit("%s eklendi. %s" % [item.name, item.effect])
	sound_requested.emit("buy")
	changed.emit()
	return true

func rename_fish(id: int, value: String) -> void:
	var item := get_fish(id)
	if item.is_empty():
		return
	var clean := value.strip_edges().replace("\n", " ").replace("\r", " ").substr(0, 16)
	if clean.is_empty():
		return
	item.name = clean
	changed.emit()

func tick(delta: float) -> void:
	elapsed += delta
	var hunger_multiplier := 1.0
	for id: String in ["moss", "driftwood", "anchor", "coral"]:
		if id in decor:
			hunger_multiplier -= 0.02
	for item: Dictionary in fish:
		item.hunger = maxf(0.0, float(item.hunger) - float(Catalog.species(item.species).hungerRate) * hunger_multiplier * delta)

func feed_fish(id: int) -> bool:
	var item := get_fish(id)
	if item.is_empty() or float(item.hunger) >= 86.0:
		return false
	item.hunger = minf(100.0, float(item.hunger) + 26.0)
	item.growth = minf(1.0, float(item.growth) + 0.008)
	fed_total += 1
	var reward := int(Catalog.species(item.species).coinPerEat)
	coins += reward
	coins_total += reward
	sound_requested.emit("eat")
	_check_levels()
	changed.emit()
	return true

func collect(amount: int) -> void:
	if amount <= 0:
		return
	coins += amount
	coins_total += amount
	sound_requested.emit("coin")
	_check_levels()
	changed.emit()

func objective_current() -> int:
	match str(Catalog.level(level).objective):
		"feed": return fed_total - int(level_start.fed)
		"coins": return coins_total - int(level_start.coins)
		"buy": return purchases - int(level_start.purchases)
		"fishCount": return fish.size()
		"species":
			var unique: Dictionary = {}
			for item: Dictionary in fish:
				unique[item.species] = true
			return unique.size()
	return 0

func _check_levels() -> void:
	for _step in range(32):
		var definition := Catalog.level(level)
		if objective_current() < int(definition.target):
			break
		coins += int(definition.reward)
		level += 1
		level_start = {"fed": fed_total, "coins": coins_total, "purchases": purchases}
		notice.emit("Seviye %d! +%d altın · Yeni türleri mağazada keşfet." % [level, int(definition.reward)])
		sound_requested.emit("level")

func to_save() -> Dictionary:
	return {"version": Catalog.SAVE_VERSION, "coins": coins, "level": level, "fed_total": fed_total, "coins_total": coins_total, "purchases": purchases, "level_start": level_start.duplicate(), "fish": fish.duplicate(true), "decor": decor.duplicate(), "sound_on": sound_on, "elapsed": elapsed, "next_id": next_id}

static func valid_number(value: Variant, low: float, high: float) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) >= low and float(value) <= high

func apply_save(data: Dictionary) -> bool:
	# Validate the complete payload before mutating the current state.
	if data.get("version") != Catalog.SAVE_VERSION:
		return false
	for key: String in ["coins", "level", "fed_total", "coins_total", "purchases", "next_id"]:
		if not valid_number(data.get(key), 0, 99999999):
			return false
	if int(data.level) < 1 or not data.get("sound_on") is bool or not valid_number(data.get("elapsed"), 0, 1.0e12):
		return false
	if not data.get("fish") is Array or data.fish.is_empty() or data.fish.size() > Catalog.TANK_CAP:
		return false
	var ids: Dictionary = {}
	var loaded_fish: Array[Dictionary] = []
	var max_id := 0
	for raw: Variant in data.fish:
		if not raw is Dictionary:
			return false
		if not raw.get("species") is String or Catalog.species(raw.species).is_empty():
			return false
		if not valid_number(raw.get("id"), 1, 99999999) or not raw.get("name") is String:
			return false
		var id := int(raw.id)
		if ids.has(id) or not valid_number(raw.get("growth"), 0, 1) or not valid_number(raw.get("hunger"), 0, 100):
			return false
		ids[id] = true
		max_id = maxi(max_id, id)
		loaded_fish.append({"id": id, "species": str(raw.species), "name": str(raw.name).substr(0, 16), "growth": float(raw.growth), "hunger": float(raw.hunger)})
	if not data.get("decor") is Array or data.decor.size() > 7 or not data.get("level_start") is Dictionary:
		return false
	var loaded_decor: Array[String] = []
	for id: Variant in data.decor:
		if not id is String or Catalog.decoration(id).is_empty() or id in loaded_decor:
			return false
		loaded_decor.append(id)
	for key: String in ["fed", "coins", "purchases"]:
		if not valid_number(data.level_start.get(key), 0, 99999999):
			return false
	if int(data.level_start.fed) > int(data.fed_total) or int(data.level_start.coins) > int(data.coins_total) or int(data.level_start.purchases) > int(data.purchases):
		return false
	coins = int(data.coins)
	level = int(data.level)
	fed_total = int(data.fed_total)
	coins_total = int(data.coins_total)
	purchases = int(data.purchases)
	level_start = data.level_start.duplicate()
	fish = loaded_fish
	decor = loaded_decor
	sound_on = data.sound_on
	elapsed = float(data.elapsed)
	next_id = maxi(max_id + 1, int(data.next_id))
	changed.emit()
	return true
