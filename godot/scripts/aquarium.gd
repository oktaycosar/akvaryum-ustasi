extends Node2D
## Scene coordinator. UI, persistence, simulation and drawing remain separate modules.
const State = preload("res://scripts/game_state.gd")
const SaveStore = preload("res://scripts/save_store.gd")
const FishScene = preload("res://scenes/fish.tscn")
const Sound = preload("res://scripts/sound.gd")
var state = State.new()
var food: Array[Dictionary] = []
var treasures: Array[Dictionary] = []
var actors: Array = []
var rng := RandomNumberGenerator.new()
var started: bool = false
var paused: bool = false
var selected_id: int = -1
var autosave: float = 0.0
var bubble_time: float = 12.0
var chest_time: float = 45.0
var hud_time: float = 0.0
var persistence_enabled: bool = true
var save_blocked: bool = false
var bounds := Rect2(36, 146, 1208, 530)
var sounds: Dictionary = {}
@onready var view = $Tank
@onready var ui = $UI/Interface
@onready var fish_layer = $Fish

func _ready() -> void:
	rng.seed = 73421
	persistence_enabled = not "--test-session" in OS.get_cmdline_user_args()
	state.new_game()
	var loaded := "new"
	if persistence_enabled:
		loaded = SaveStore.load_game(state)
		save_blocked = loaded == "corrupt"
	state.changed.connect(_on_state_changed)
	state.notice.connect(_notice)
	state.sound_requested.connect(_play_sound)
	for kind: String in ["drop", "eat", "coin", "buy", "level"]:
		var player := AudioStreamPlayer.new()
		player.stream = Sound.stream(kind)
		player.volume_db = -12
		player.max_polyphony = 4
		add_child(player)
		sounds[kind] = player
	view.state = state
	view.food = food
	view.treasures = treasures
	ui.setup(self)
	get_viewport().size_changed.connect(_resize)
	_resize()
	_sync_actors()
	ui.refresh()
	if loaded == "backup":
		_notice("Son sağlam yedekten devam ediliyor.")
	elif save_blocked:
		_notice("Kayıt okunamadı; özgün dosyan korundu. Yeni kayıt için menüden Yeni oyun'u seç.")
	for argument: String in OS.get_cmdline_user_args():
		if argument.begins_with("--capture="):
			start_game()
			_capture.call_deferred(argument.trim_prefix("--capture="))

func _resize() -> void:
	var size := get_viewport_rect().size
	bounds = Rect2(36, 146, maxf(640, size.x - 72), maxf(290, size.y - 260))
	view.bounds = bounds

func start_game() -> void:
	started = true
	ui.hide_intro()
	ui.refresh()

func _physics_process(delta: float) -> void:
	if not started or paused:
		return
	state.tick(delta)
	for pellet: Dictionary in food:
		pellet.position.y += delta * 21.0
		pellet.age += delta
	for index in range(food.size() - 1, -1, -1):
		if food[index].position.y > bounds.end.y - 35 or float(food[index].age) > 25.0:
			food.remove_at(index)
	for actor in actors:
		actor.step(delta, food, state, bounds)
	for item: Dictionary in treasures:
		item.position.y -= delta * 13.0
	for index in range(treasures.size() - 1, -1, -1):
		if treasures[index].position.y < bounds.position.y + 16:
			treasures.remove_at(index)
	bubble_time -= delta
	if bubble_time <= 0:
		_spawn_treasure(15)
		bubble_time = 12.0 * (0.75 if "airpump" in state.decor else 1.0)
	if "chest" in state.decor:
		chest_time -= delta
		if chest_time <= 0:
			_spawn_treasure(25)
			chest_time = 45.0
	autosave += delta
	if autosave >= 12.0:
		save_game()
		autosave = 0.0
	hud_time += delta
	if hud_time >= 0.5:
		ui.refresh()
		hud_time = 0.0

func _spawn_treasure(amount: int) -> void:
	if treasures.size() >= 8:
		return
	treasures.append({"position": Vector2(rng.randf_range(bounds.position.x + 70, bounds.end.x - 70), bounds.end.y - 80), "amount": amount})

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE and started:
			ui.toggle_pause()
		elif event.keycode == KEY_SPACE and started and not paused:
			feed_at(bounds.get_center() - Vector2(0, bounds.size.y * 0.3))
	if not started or paused:
		return
	var point := Vector2.ZERO
	var pressed := false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		point = event.position
		pressed = true
	elif event is InputEventScreenTouch and event.pressed:
		point = event.position
		pressed = true
	if pressed:
		interact_at(point)

func interact_at(point: Vector2) -> void:
	if not bounds.has_point(point):
		return
	for index in range(treasures.size() - 1, -1, -1):
		if point.distance_to(treasures[index].position) < 27:
			var amount := int(treasures[index].amount)
			treasures.remove_at(index)
			state.collect(amount)
			_notice("+%d altın kazandın!" % amount)
			return
	for actor in actors:
		if actor.hit_test(point):
			selected_id = int(actor.data.id)
			for other in actors:
				other.selected = int(other.data.id) == selected_id
			ui.show_fish(selected_id)
			return
	feed_at(point)

func feed_at(point: Vector2) -> void:
	if food.size() >= 80:
		_notice("Önce sudaki yemler bitsin.")
		return
	for index in range(4):
		var p := point + Vector2((index - 1.5) * 9.0, -index * 3.0)
		p.x = clampf(p.x, bounds.position.x + 10, bounds.end.x - 10)
		p.y = clampf(p.y, bounds.position.y + 10, bounds.end.y - 45)
		food.append({"position": p, "age": 0.0})
	_play_sound("drop")

func _sync_actors() -> void:
	var existing: Dictionary = {}
	for actor in actors:
		existing[int(actor.data.id)] = true
	for saved: Dictionary in state.fish:
		if not existing.has(int(saved.id)):
			var actor = FishScene.instantiate()
			actor.setup(saved, bounds)
			fish_layer.add_child(actor)
			actors.append(actor)

func _on_state_changed() -> void:
	_sync_actors()
	ui.refresh()

func _notice(message: String) -> void:
	ui.show_notice(message)

func _play_sound(kind: String) -> void:
	if state.sound_on and sounds.has(kind) and DisplayServer.get_name() != "headless":
		sounds[kind].play()

func save_game() -> bool:
	if not persistence_enabled or save_blocked:
		return false
	var ok := SaveStore.save_game(state)
	ui.set_save_status("Kaydedildi" if ok else "Kayıt yazılamadı")
	return ok

func reset_game() -> void:
	for actor in actors:
		actor.queue_free()
	actors.clear()
	food.clear()
	treasures.clear()
	selected_id = -1
	save_blocked = false
	state.new_game()
	_sync_actors()
	bubble_time = 12
	chest_time = 45
	save_game()
	_notice("Yeni akvaryum hazır. Mercan ve Güneş seni bekliyor.")

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_game()
		get_tree().quit()
	elif what == NOTIFICATION_APPLICATION_FOCUS_OUT and started:
		save_game()

func _capture(path: String) -> void:
	await get_tree().create_timer(3.0).timeout
	if "--capture-shop" in OS.get_cmdline_user_args():
		ui.show_shop()
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(path)
	get_tree().quit()
