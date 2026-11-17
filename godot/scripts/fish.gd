extends Node2D
## A reusable fish actor: species-shaped vector art and food-seeking steering.
const Catalog = preload("res://scripts/catalog.gd")
var data: Dictionary = {}
var species: Dictionary = {}
var tank: Rect2
var velocity := Vector2(38, 0)
var destination := Vector2.ZERO
var rng := RandomNumberGenerator.new()
var phase: float = 0.0
var wander_time: float = 0.0
var facing: float = 1.0
var selected: bool = false
var body_length: float = 65.0

func setup(saved: Dictionary, bounds: Rect2) -> void:
	data = saved
	species = Catalog.species(str(data.species))
	tank = bounds
	rng.seed = int(data.id) * 12497
	phase = rng.randf_range(0, TAU)
	position = Vector2(rng.randf_range(tank.position.x + 90, tank.end.x - 90), rng.randf_range(tank.position.y + 80, tank.end.y - 85))
	destination = position
	body_length = float(species.baseSize) * minf(tank.size.y, 650.0) * (0.78 + 0.5 * float(data.growth))

func step(delta: float, food: Array[Dictionary], state: RefCounted, bounds: Rect2) -> void:
	tank = bounds
	phase += delta * 5.2
	wander_time -= delta
	var target_index := -1
	var nearest := INF
	if float(data.hunger) < 86.0:
		for index in range(food.size()):
			var distance := position.distance_squared_to(food[index].position)
			if distance < nearest:
				nearest = distance
				target_index = index
	if target_index >= 0:
		destination = food[target_index].position
		if nearest < 24.0 * 24.0 and state.feed_fish(int(data.id)):
			food.remove_at(target_index)
			body_length = float(species.baseSize) * minf(tank.size.y, 650.0) * (0.78 + 0.5 * float(data.growth))
	elif wander_time <= 0.0 or position.distance_to(destination) < 25.0:
		destination = Vector2(rng.randf_range(tank.position.x + 55, tank.end.x - 55), rng.randf_range(tank.position.y + 40, tank.end.y - 60))
		wander_time = rng.randf_range(2.5, 6.0)
	var speed := float(species.speed) * (1.7 if target_index >= 0 else 1.0)
	if float(data.hunger) < 4.0:
		speed *= 0.48
	var desired := position.direction_to(destination) * speed
	velocity = velocity.lerp(desired, 1.0 - exp(-delta * 1.6))
	position += velocity * delta
	position.x = clampf(position.x, tank.position.x + 35, tank.end.x - 35)
	position.y = clampf(position.y, tank.position.y + 25, tank.end.y - 40)
	if absf(velocity.x) > 2.0:
		facing = move_toward(facing, signf(velocity.x), delta * 3.0)
	queue_redraw()

func hit_test(point: Vector2) -> bool:
	return position.distance_to(point) < maxf(26.0, body_length * 0.66)

func _ellipse(center: Vector2, radius: Vector2, color: Color) -> void:
	var points := PackedVector2Array()
	for index in range(40):
		var angle := TAU * float(index) / 40.0
		points.append(center + Vector2(cos(angle), sin(angle)) * radius)
	draw_colored_polygon(points, color)

func _draw() -> void:
	if species.is_empty():
		return
	var length := body_length
	var half_h := length * float(species.bodyRatio) * 0.5
	var tail_sway := sin(phase * 1.9) * 5.0
	var main_color := Color(str(species.cMid))
	var back := Color(str(species.cBack))
	var belly := Color(str(species.cBelly))
	var fin := Color(str(species.cTail))
	if float(data.hunger) < 4.0:
		main_color = main_color.lerp(Color("a1aca1"), 0.5)
	draw_set_transform(Vector2.ZERO, clampf(velocity.y * 0.004, -0.16, 0.16), Vector2(facing, 1.0))
	# Veil tails are broad and articulated; slim species retain their forked profile.
	var tail_spread := half_h * (2.1 if str(species.finStyle) in ["veil", "betta"] else 1.25)
	var tail_tip := -length * (0.92 if str(species.tail) == "long" else 0.76)
	var tail_points := PackedVector2Array([Vector2(-length * 0.35, 0), Vector2(tail_tip, -tail_spread + tail_sway), Vector2(tail_tip + length * 0.13, tail_sway), Vector2(tail_tip, tail_spread + tail_sway)])
	draw_colored_polygon(tail_points, Color(fin, 0.86))
	for part in range(7):
		var end := Vector2(tail_tip + sin(float(part)) * 2.0, lerpf(-tail_spread, tail_spread, float(part) / 6.0) + tail_sway)
		draw_line(Vector2(-length * 0.34, 0), end, Color(belly, 0.28), 1.0, true)
	var dorsal := PackedVector2Array([Vector2(-length * 0.32, -half_h * 0.65), Vector2(-length * 0.1, -half_h * (2.0 if str(species.shape) == "tall" else 1.65)), Vector2(length * 0.25, -half_h * 0.75)])
	draw_colored_polygon(dorsal, Color(fin, 0.7))
	_ellipse(Vector2(0, 2), Vector2(length * 0.51, half_h + 1), back.darkened(0.15))
	_ellipse(Vector2(1, 0), Vector2(length * 0.5, half_h), main_color)
	_ellipse(Vector2(length * 0.035, half_h * 0.24), Vector2(length * 0.4, half_h * 0.63), Color(belly, 0.45))
	_ellipse(Vector2(-length * 0.05, -half_h * 0.42), Vector2(length * 0.32, half_h * 0.24), Color("ffffff28"))
	match str(species.id):
		"clownfish":
			for x: float in [-0.26, 0.08, 0.32]:
				draw_line(Vector2(x * length, -half_h * 0.82), Vector2(x * length - 3, half_h * 0.82), Color("eee7d8"), length * 0.07, true)
		"neonTetra":
			draw_line(Vector2(-length * 0.35, -2), Vector2(length * 0.35, -2), Color("32dcdf"), 4, true)
			draw_line(Vector2(-length * 0.32, 3), Vector2(length * 0.08, 3), Color("e65a52"), 3, true)
		"angelfish", "discus":
			for x: float in [-0.25, -0.08, 0.1, 0.27]:
				draw_line(Vector2(x * length, -half_h * 0.8), Vector2(x * length - 3, half_h * 0.85), Color("233d4b66"), 4, true)
		"koi":
			_ellipse(Vector2(-length * 0.16, -half_h * 0.4), Vector2(length * 0.13, half_h * 0.8), Color("d55a32"))
			_ellipse(Vector2(length * 0.25, 0), Vector2(length * 0.1, half_h * 0.85), Color("c54e29"))
	_ellipse(Vector2(length * 0.05, half_h * 0.36), Vector2(length * 0.14, half_h * 0.38), Color(fin.lightened(0.15), 0.68))
	var eye := Vector2(length * 0.31, -half_h * 0.24)
	draw_circle(eye, maxf(3.0, length * 0.052), Color("d3d0ac"))
	draw_circle(eye + Vector2(0.6, 0), maxf(2.0, length * 0.036), Color("12252a"))
	draw_circle(eye + Vector2(1, -1), 0.9, Color.WHITE)
	draw_arc(Vector2(length * 0.13, 0), half_h * 0.8, -0.9, 0.9, 12, Color(back.darkened(0.25), 0.45), 1.2, true)
	draw_set_transform(Vector2.ZERO)
	if selected:
		draw_arc(Vector2.ZERO, length * 0.7 + 8, 0, TAU, 64, Color("8ae4ca"), 1.5, true)
	if float(data.hunger) < 4.0:
		draw_string(ThemeDB.fallback_font, Vector2(-5, -half_h - 15), "!", HORIZONTAL_ALIGNMENT_LEFT, -1, 19, Color("f3bd76"))
