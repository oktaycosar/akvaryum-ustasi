extends Node2D
## All environment artwork is procedural and editable; no external art downloads.
@export var water_top := Color("246777")
@export var water_bottom := Color("082f3d")
var bounds := Rect2(36, 146, 1208, 530)
var state: RefCounted
var food: Array[Dictionary] = []
var treasures: Array[Dictionary] = []
var time: float = 0.0
var pebbles: Array[Vector3] = []

func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 816
	for _index in range(160):
		pebbles.append(Vector3(rng.randf(), rng.randf(), rng.randf_range(2, 6)))

func _process(delta: float) -> void:
	time += delta
	queue_redraw()

func _ellipse(center: Vector2, radius: Vector2, color: Color) -> void:
	var points := PackedVector2Array()
	for index in range(28):
		var angle := TAU * float(index) / 28.0
		points.append(center + Vector2(cos(angle), sin(angle)) * radius)
	draw_colored_polygon(points, color)

func _plant(x: float, bottom: float, height: float, color: Color, seed_value: float) -> void:
	for stem in range(4):
		var points := PackedVector2Array()
		var lean := (float(stem) - 1.5) * 14.0
		for step in range(15):
			var t := float(step) / 14.0
			var sway := sin(time * 0.65 + seed_value + t * 2.0) * t * 14.0
			points.append(Vector2(x + lean * t + sway, bottom - height * t))
		draw_polyline(points, color.darkened(0.25), 2, true)
		for step in range(3, 14, 2):
			var origin := points[step]
			var side := -1.0 if step % 4 == 1 else 1.0
			var tip := origin + Vector2(side * (22.0 + stem * 3.0), -18.0)
			var axis := tip - origin
			var normal := Vector2(-axis.y, axis.x).normalized()
			var leaf := PackedVector2Array()
			for edge in range(2):
				for segment in range(12):
					var t := float(segment) / 11.0 if edge == 0 else 1.0 - float(segment) / 11.0
					var width := sin(PI * t) * 6.0 * (1.0 if edge == 0 else -1.0)
					leaf.append(origin + axis * t + normal * width)
			draw_colored_polygon(leaf, color.lightened(float(stem) * 0.045))

func _draw() -> void:
	var r := bounds
	var night := 0.0
	if state != null:
		night = (1.0 - cos(float(state.elapsed) / 180.0 * TAU)) * 0.32
	var top := water_top.darkened(night)
	var bottom := water_bottom.darkened(night * 0.5)
	draw_style_box(_box(Color("030f1666"), 22), Rect2(r.position + Vector2(-5, 12), r.size + Vector2(10, 12)))
	draw_style_box(_box(Color("153b47"), 18), r.grow(5))
	for row in range(100):
		var fraction := float(row) / 100.0
		draw_rect(Rect2(r.position + Vector2(0, r.size.y * fraction), Vector2(r.size.x, r.size.y / 100.0 + 1)), top.lerp(bottom, fraction))
	# Light shafts, back glass and surface ripples.
	for index in range(5):
		var x := r.position.x + 80 + index * r.size.x * 0.24
		var drift := sin(time * 0.2 + index) * 35
		draw_colored_polygon(PackedVector2Array([Vector2(x, r.position.y), Vector2(x + 35, r.position.y), Vector2(x + 180 + drift, r.end.y), Vector2(x + 55 + drift, r.end.y)]), Color(0.62, 0.92, 0.82, 0.025))
	for index in range(12):
		var x := r.position.x + index * r.size.x / 12.0
		draw_line(Vector2(x, r.position.y + 7 + sin(time + index) * 2), Vector2(x + 50, r.position.y + 7 + sin(time + index) * 2), Color("a9e9d938"), 1.4, true)
	var ground := r.end.y - 42
	_plant(r.position.x + 70, ground, r.size.y * 0.47, Color("266f66"), 0)
	_plant(r.end.x - 65, ground, r.size.y * 0.62, Color("24594e"), 3)
	_plant(r.end.x - 135, ground, r.size.y * 0.39, Color("358273"), 7)
	_plant(r.position.x + 148, ground, r.size.y * 0.28, Color("3e8872"), 9)
	# A distant stone ridge makes depth legible without obstructing fish.
	for index in range(7):
		var x := r.position.x + 225 + index * 38
		_ellipse(Vector2(x, ground + 13), Vector2(42, 23 + sin(index * 4.0) * 11), Color("254c50"))
	draw_rect(Rect2(r.position.x, ground + 18, r.size.x, 24), Color("8a8270"))
	draw_rect(Rect2(r.position.x, ground + 16, r.size.x, 4), Color("b6aa85"))
	for pebble: Vector3 in pebbles:
		var p := Vector2(r.position.x + pebble.x * r.size.x, ground + 20 + pebble.y * 19)
		_ellipse(p, Vector2(pebble.z, pebble.z * 0.43), Color("b4ac96").lerp(Color("565d59"), pebble.y))
	if state != null:
		_draw_decor(r, ground)
	# Background aeration remains atmospheric; the purchased pump has its own jet.
	for index in range(20):
		var cycle := fmod(time * (12 + index % 3 * 4) + index * 43, r.size.y - 15)
		var x := r.position.x + 30 + fmod(index * 127.7, r.size.x - 60) + sin(time + index) * 5
		draw_arc(Vector2(x, r.end.y - 10 - cycle), 1.5 + index % 4, 0, TAU, 16, Color("bce4db30"), 1, true)
	for pellet: Dictionary in food:
		draw_circle(pellet.position + Vector2(1, 2), 3.8, Color("0a202b44"))
		draw_circle(pellet.position, 2.8, Color("d8a065"))
		draw_circle(pellet.position + Vector2(-0.5, -1), 1.0, Color("ffe4aa"))
	for treasure: Dictionary in treasures:
		var p: Vector2 = treasure.position
		draw_circle(p, 22, Color("e9bb4e16"))
		draw_arc(p, 14, 0, TAU, 36, Color("f4d281"), 1.8, true)
		draw_circle(p, 9, Color("e8bd61"))
		draw_string(ThemeDB.fallback_font, p + Vector2(-4, 5), "+", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color("775224"))
	draw_line(r.position, Vector2(r.end.x, r.position.y), Color("b6efdf77"), 2.0, true)
	draw_line(r.position + Vector2(3, 12), Vector2(r.position.x + 3, r.end.y - 4), Color("9bd9d12a"), 2.0, true)

func _box(color: Color, radius: int) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(radius)
	return box

func _draw_decor(r: Rect2, ground: float) -> void:
	for id: String in state.decor:
		match id:
			"moss":
				_ellipse(Vector2(r.position.x + 205, ground + 6), Vector2(30, 24), Color("3d8254"))
				_ellipse(Vector2(r.position.x + 200, ground), Vector2(23, 18), Color("59965e"))
			"driftwood":
				draw_line(Vector2(r.position.x + 330, ground), Vector2(r.position.x + 470, ground - 53), Color("574b37"), 22, true)
				draw_line(Vector2(r.position.x + 403, ground - 25), Vector2(r.position.x + 380, ground - 92), Color("6f5b3d"), 10, true)
			"anchor":
				var p := Vector2(r.position.x + r.size.x * 0.55, ground - 30)
				draw_line(p - Vector2(0, 45), p + Vector2(0, 16), Color("a2aaa1"), 7, true)
				draw_arc(p - Vector2(0, 46), 10, 0, TAU, 20, Color("b4b7a8"), 4, true)
				draw_arc(p - Vector2(0, 7), 30, 0.1, PI - 0.1, 24, Color("a2aaa1"), 6, true)
			"coral":
				for branch in range(6):
					var p := Vector2(r.end.x - 260 + branch * 11, ground + 9)
					draw_line(p, p + Vector2(sin(branch * 2.0) * 24, -40 - branch % 3 * 15), Color("b77b78"), 9, true)
			"airpump":
				var p := Vector2(r.end.x - 45, ground)
				draw_rect(Rect2(p - Vector2(18, 8), Vector2(36, 13)), Color("4e6867"))
				for bubble in range(12):
					var y := fmod(time * 48 + bubble * 27, r.size.y - 40)
					draw_arc(p + Vector2(sin(time * 2 + bubble) * 9, -y), 3, 0, TAU, 14, Color("c3e5dc88"), 1, true)
			"lantern":
				var p := Vector2(r.end.x - 340, ground - 35)
				draw_circle(p, 65, Color("ffd9930b"))
				draw_circle(p, 38, Color("ffd99316"))
				draw_style_box(_box(Color("e1ba6b"), 4), Rect2(p - Vector2(12, 23), Vector2(24, 36)))
				draw_rect(Rect2(p - Vector2(18, 26), Vector2(36, 5)), Color("594735"))
			"chest":
				var p := Vector2(r.position.x + r.size.x * 0.67, ground - 10)
				draw_style_box(_box(Color("7c5636"), 4), Rect2(p - Vector2(30, 14), Vector2(60, 30)))
				draw_line(p - Vector2(30, 9), p + Vector2(30, -9), Color("c7a262"), 5)
				draw_rect(Rect2(p - Vector2(4, 5), Vector2(8, 12)), Color("d4b46e"))
