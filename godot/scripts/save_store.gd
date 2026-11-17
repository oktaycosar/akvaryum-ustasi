extends RefCounted
## Versioned local JSON, atomic replacement and last-known-good backup.
const State = preload("res://scripts/game_state.gd")
const PATH := "user://aquarium_v1.json"
const MAX_BYTES := 262144

static func read_payload(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() > MAX_BYTES:
		return {}
	var parser := JSON.new()
	var result := parser.parse(file.get_as_text())
	file.close()
	if result != OK:
		return {}
	var parsed: Variant = parser.data
	if not parsed is Dictionary:
		return {}
	var probe := State.new()
	if not probe.apply_save(parsed):
		return {}
	return parsed

static func load_game(state: RefCounted, path: String = PATH) -> String:
	var data := read_payload(path)
	if not data.is_empty():
		state.apply_save(data)
		return "loaded"
	data = read_payload(path + ".bak")
	if not data.is_empty():
		state.apply_save(data)
		return "backup"
	return "corrupt" if FileAccess.file_exists(path) else "new"

static func save_game(state: RefCounted, path: String = PATH) -> bool:
	var payload: Dictionary = state.to_save()
	var probe := State.new()
	if not probe.apply_save(payload):
		return false
	var temp := path + ".tmp"
	var file := FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(payload))
	file.flush()
	file.close()
	# Preserve only a validated primary. A corrupt primary must not replace a valid backup.
	if not read_payload(path).is_empty():
		if DirAccess.copy_absolute(path, path + ".bak") != OK:
			return false
	return DirAccess.rename_absolute(temp, path) == OK
