extends SceneTree
## Run with --headless --path godot --script res://tests/run_tests.gd -- --test-session
const State = preload("res://scripts/game_state.gd")
const Catalog = preload("res://scripts/catalog.gd")
const Store = preload("res://scripts/save_store.gd")
var passed: int = 0
var failed: int = 0

func check(condition: bool, description: String) -> void:
	if condition:
		passed += 1
	else:
		failed += 1
		push_error("FAIL: " + description)

func _initialize() -> void:
	for test: String in ["test_economy", "test_progression", "test_persistence", "test_validation"]:
		if call(test) != true:
			failed += 1
			push_error("Test did not finish: " + test)
	await process_frame
	if await test_scene() != true:
		failed += 1
		push_error("Scene test did not finish")
	print("RESULT: %d passed, %d failed" % [passed, failed])
	quit(0 if failed == 0 else 1)

func test_economy() -> bool:
	var state := State.new()
	state.new_game()
	check(Catalog.data().species.size() == 8 and Catalog.data().decor.size() == 7, "ported catalog has all species and decorations")
	check(state.coins == 100 and state.fish.size() == 2, "new aquarium starts with coins and two fish")
	check(not state.buy_fish("betta") and state.coins == 100, "locked species cannot spend money")
	state.coins = 0
	check(not state.buy_fish("goldfish") and state.fish.size() == 2, "insufficient funds cannot spawn fish")
	state.coins = 1000
	check(state.buy_fish("guppy") and state.coins == 940 and state.fish.size() == 3, "fish purchase charges exactly the catalog price")
	check(state.buy_decor("moss") and state.coins == 860, "decoration purchase")
	check(not state.buy_decor("moss") and state.coins == 860, "duplicate decoration does not charge twice")
	state.coins = 100000
	for _index in range(20):
		state.buy_fish("goldfish")
	check(state.fish.size() == 10, "capacity stays at ten after repeated purchases")
	var before: int = state.coins
	check(not state.buy_fish("guppy") and state.coins == before, "full aquarium cannot spend money")
	state.rename_fish(1, "   ÇokUzunBirBalıkAdıBurada\n  ")
	check(state.get_fish(1).name.length() <= 16, "fish names respect length limit")
	return true

func test_progression() -> bool:
	var state := State.new()
	state.new_game()
	var id: int = state.fish[0].id
	for _index in range(10):
		state.get_fish(id).hunger = 20.0
		state.feed_fish(id)
	check(state.level == 2 and state.coins == 180, "ten feeds grant level two and exactly one reward")
	check(state.objective_current() == 0, "next objective starts at zero")
	check(is_equal_approx(float(state.get_fish(id).growth), 0.18), "feeding grows fish")
	state.get_fish(id).hunger = 100
	check(not state.feed_fish(id) and state.fed_total == 10, "full fish cannot generate rewards")
	state.buy_fish("guppy")
	check(state.level == 3, "purchase completes level two")
	state.buy_fish("goldfish")
	check(state.level == 4 and state.fish.size() == 4, "four fish complete the population objective")
	state.collect(120)
	check(state.objective_current() == 120, "coin objective counts earned coins since level start")
	var loaded := State.new()
	check(loaded.apply_save(state.to_save()) and loaded.objective_current() == 120, "reload preserves partial level progress")
	loaded.collect(180)
	check(loaded.level == 5, "resumed coin objective advances at the exact remaining amount")
	state.get_fish(id).hunger = 5
	state.tick(100.0)
	check(state.get_fish(id).hunger == 0, "hunger has a lower bound")
	check(state.feed_fish(id) and state.get_fish(id).hunger == 26, "hungry fish recover by feeding")
	return true

func test_persistence() -> bool:
	var path := "user://test_aquarium_save.json"
	for suffix: String in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(path + suffix):
			DirAccess.remove_absolute(path + suffix)
	var state := State.new()
	state.new_game()
	state.rename_fish(1, "İnci")
	check(Store.save_game(state, path), "initial atomic save")
	state.coins = 142
	check(Store.save_game(state, path), "replacement atomic save")
	var restored := State.new()
	check(Store.load_game(restored, path) == "loaded" and restored.coins == 142, "load uses the newest save")
	check(restored.get_fish(1).name == "İnci", "Turkish fish name survives serialization")
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string("{broken")
	file.close()
	check(Store.load_game(restored, path) == "backup" and restored.coins == 100, "corrupt primary recovers last-known-good backup")
	check(Store.save_game(restored, path), "recovered state can be saved")
	for suffix: String in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(path + suffix):
			DirAccess.remove_absolute(path + suffix)
	return true

func test_validation() -> bool:
	var state := State.new()
	state.new_game()
	var valid: Dictionary = state.to_save()
	var invalid: Dictionary = valid.duplicate(true)
	invalid.fish[0].species = "unknown"
	check(not state.apply_save(invalid) and state.coins == 100, "unknown species rejected without mutating state")
	invalid = valid.duplicate(true)
	invalid.fish[1].id = invalid.fish[0].id
	check(not state.apply_save(invalid), "duplicate fish identifiers rejected")
	invalid = valid.duplicate(true)
	invalid.level_start.fed = 900
	check(not state.apply_save(invalid), "impossible objective baseline rejected")
	invalid = valid.duplicate(true)
	invalid.version = 999
	check(not state.apply_save(invalid), "unknown future save version rejected")
	invalid = valid.duplicate(true)
	invalid.coins = -5
	check(not state.apply_save(invalid), "negative currency rejected")
	return true

func test_scene() -> bool:
	var scene = load("res://scenes/aquarium.tscn").instantiate()
	root.add_child(scene)
	scene.persistence_enabled = false
	scene.start_game()
	scene.set_physics_process(false)
	check(scene.actors.size() == 2, "main scene spawns saved fish")
	var actor = scene.actors[0]
	scene.state.get_fish(1).hunger = 20
	scene.feed_at(actor.position + Vector2(10, 0))
	for _index in range(120):
		scene._physics_process(1.0 / 60.0)
	check(scene.state.fed_total > 0, "fish find and eat in-world food")
	check(scene.food.size() < 4, "eaten food disappears")
	check(scene.bounds.has_point(actor.position), "swimming remains inside the tank")
	scene.treasures.append({"position": scene.bounds.get_center(), "amount": 15})
	var coins: int = scene.state.coins
	scene.interact_at(scene.bounds.get_center())
	check(scene.state.coins == coins + 15 and scene.treasures.is_empty(), "clicking a gold bubble grants its reward once")
	scene.ui.show_shop()
	check(scene.paused and scene.ui.buttons.size() == 8, "shop opens and pauses simulation")
	var before_count: int = scene.state.fish.size()
	scene.ui.buttons[1].button.pressed.emit()
	check(scene.state.fish.size() == before_count + 1 and scene.state.fish[-1].species == "guppy", "shop button buys its own species")
	scene.ui.shop_tab = "decor"
	scene.ui.show_shop()
	check(scene.ui.buttons.size() == 7, "decoration tab lists all seven items")
	scene.state.coins = 1000
	scene.ui.refresh()
	scene.ui.buttons[0].button.pressed.emit()
	check("moss" in scene.state.decor and scene.ui.buttons[0].button.disabled, "decoration purchase disables the owned item")
	scene.ui._close_modal()
	check(not scene.paused, "closing shop resumes simulation")
	scene.selected_id = 1
	scene.ui.show_fish(1)
	check(scene.ui.name_edit.text == "Mercan", "fish details show current name")
	scene.ui.name_edit.text = "İnci"
	scene.ui.modal_body.get_child(scene.ui.modal_body.get_child_count() - 1).pressed.emit()
	check(scene.state.get_fish(1).name == "İnci" and not scene.paused, "rename action saves the entered name and closes its modal")
	scene.ui.toggle_pause()
	scene.ui._confirm_reset()
	scene.ui.modal_body.get_child(2).pressed.emit()
	check(scene.state.get_fish(1).name == "İnci" and not scene.paused, "cancelling restart preserves progress")
	var fresh := State.new()
	fresh.coins = 777
	scene.reset_game()
	check(scene.actors.size() == 2 and scene.state.coins == 100, "restart restores a playable aquarium")
	scene.state.coins = 100000
	for _index in range(8):
		scene.state.buy_fish("guppy")
	for _index in range(25):
		scene.feed_at(scene.bounds.get_center())
	check(scene.food.size() <= 80, "repeated feeding respects the food limit")
	var began := Time.get_ticks_msec()
	for _index in range(1800):
		scene._physics_process(1.0 / 60.0)
	var all_inside := true
	for fish_actor in scene.actors:
		all_inside = all_inside and scene.bounds.has_point(fish_actor.position)
	check(all_inside and scene.actors.size() == 10, "full-tank simulation stays bounded for thirty simulated seconds")
	print("Full-tank simulation: 1800 ticks in %d ms (headless; not a rendered FPS benchmark)" % (Time.get_ticks_msec() - began))
	scene.queue_free()
	await process_frame
	return true
