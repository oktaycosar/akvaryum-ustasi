extends Control
## Container-based desktop UI. All actions delegate to the state/coordinator.
const Catalog = preload("res://scripts/catalog.gd")
var game
var coins_label: Label
var fish_label: Label
var task_label: Label
var progress: ProgressBar
var save_label: Label
var sound_button: Button
var notice_label: Label
var notice_time: float = 0.0
var intro: Control
var modal: Control
var modal_body: VBoxContainer
var modal_title: Label
var modal_kind: String = ""
var name_edit: LineEdit
var fish_info: Label
var shop_tab: String = "species"
var buttons: Array[Dictionary] = []

func _ready() -> void:
	theme = _theme()
	_build_hud()
	_build_intro()

func setup(coordinator) -> void:
	game = coordinator
	refresh()

func _theme() -> Theme:
	var result := Theme.new()
	result.default_font_size = 16
	result.set_color("font_color", "Label", Color("e3eeea"))
	for style: String in ["normal", "hover", "pressed", "disabled", "focus"]:
		var box := StyleBoxFlat.new()
		box.bg_color = Color("174e55")
		if style == "hover": box.bg_color = Color("24676a")
		if style == "pressed": box.bg_color = Color("10383f")
		if style == "disabled": box.bg_color = Color("163139")
		if style == "focus":
			box.bg_color = Color.TRANSPARENT
			box.border_color = Color("b3ead5")
			box.set_border_width_all(2)
		box.set_corner_radius_all(9)
		box.content_margin_left = 16
		box.content_margin_right = 16
		box.content_margin_top = 12
		box.content_margin_bottom = 12
		result.set_stylebox(style, "Button", box)
	result.set_color("font_color", "Button", Color("e4f2eb"))
	result.set_color("font_disabled_color", "Button", Color("71888b"))
	result.set_color("font_color", "LineEdit", Color("e4f2eb"))
	return result

func _label(text: String, font_size: int = 16, color: Color = Color("e3eeea")) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func _button(text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.pressed.connect(callback)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	return button

func _panel() -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color("102e39")
	style.set_corner_radius_all(16)
	style.border_color = Color("31616a")
	style.set_border_width_all(1)
	style.content_margin_left = 24
	style.content_margin_right = 24
	style.content_margin_top = 22
	style.content_margin_bottom = 22
	panel.add_theme_stylebox_override("panel", style)
	return panel

func _build_hud() -> void:
	var header := HBoxContainer.new()
	add_child(header)
	header.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	header.offset_left = 38
	header.offset_right = -38
	header.offset_top = 23
	header.add_theme_constant_override("separation", 20)
	var title_column := VBoxContainer.new()
	header.add_child(title_column)
	title_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_column.add_child(_label("AKVARYUM USTASI", 27, Color("f0e8cf")))
	title_column.add_child(_label("Küçük bir sualtı dünyası, senin bakımınla büyür.", 14, Color("8fb7b6")))
	var stats := VBoxContainer.new()
	header.add_child(stats)
	coins_label = _label("100 ALTIN", 24, Color("edc779"))
	fish_label = _label("2 / 10 balık", 14, Color("9cc1bc"))
	stats.add_child(coins_label)
	stats.add_child(fish_label)
	header.add_child(_button("Mağaza", show_shop))
	sound_button = _button("Ses: açık", _toggle_sound)
	header.add_child(sound_button)
	header.add_child(_button("Menü", toggle_pause))
	var top_hint := _label("Suya tıkla: yem bırak   ·   Balığa tıkla: tanış   ·   Altın kabarcığını yakala", 14, Color("91b9b5"))
	add_child(top_hint)
	top_hint.position = Vector2(40, 110)
	var footer := HBoxContainer.new()
	add_child(footer)
	footer.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	footer.offset_left = 40
	footer.offset_right = -40
	footer.offset_top = -94
	footer.offset_bottom = -20
	footer.add_theme_constant_override("separation", 30)
	var task_column := VBoxContainer.new()
	task_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(task_column)
	task_label = _label("", 18)
	task_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	task_column.add_child(task_label)
	progress = ProgressBar.new()
	progress.custom_minimum_size.y = 7
	progress.show_percentage = false
	var progress_bg := StyleBoxFlat.new()
	progress_bg.bg_color = Color("173b45")
	progress_bg.set_corner_radius_all(4)
	var progress_fill := StyleBoxFlat.new()
	progress_fill.bg_color = Color("79c3ac")
	progress_fill.set_corner_radius_all(4)
	progress.add_theme_stylebox_override("background", progress_bg)
	progress.add_theme_stylebox_override("fill", progress_fill)
	task_column.add_child(progress)
	var side := VBoxContainer.new()
	footer.add_child(side)
	side.add_child(_label("Boşluk: yem bırak  ·  Esc: duraklat", 13, Color("83a9aa")))
	save_label = _label("Otomatik kayıt · 12 saniyede bir", 13, Color("83a9aa"))
	side.add_child(save_label)
	notice_label = _label("", 17, Color("f2d39b"))
	add_child(notice_label)
	notice_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	notice_label.offset_top = 86
	notice_label.offset_left = -480
	notice_label.offset_right = 480
	notice_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

func _overlay() -> Control:
	var layer := Control.new()
	add_child(layer)
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var shade := ColorRect.new()
	layer.add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.color = Color("03131bd9")
	return layer

func _build_intro() -> void:
	intro = _overlay()
	var center := CenterContainer.new()
	intro.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := _panel()
	panel.custom_minimum_size = Vector2(520, 0)
	center.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 20)
	panel.add_child(box)
	box.add_child(_label("SUYUN ALTINDA, SAKİN BİR DÜNYA", 13, Color("85c6b5")))
	box.add_child(_label("Akvaryum Ustası", 34, Color("f0e8cf")))
	box.add_child(_label("Besle, büyüt, keşfet.", 21, Color("aed7ce")))
	box.add_child(_label("• Suya tıklayarak yem bırak.\n• Balıklara isim ver, büyümelerini izle.\n• Altın kabarcıklarını topla ve yeni türler aç.\n• 8 balık türü, 7 dekor, 10 görev ve ustalık seviyeleri.", 17))
	var start := _button("Akvaryuma gir", func(): game.start_game())
	box.add_child(start)
	box.add_child(_label("Kayıt bu bilgisayarda tutulur. Çevrimdışı oynanabilir.", 13, Color("83a9aa")))
	start.grab_focus.call_deferred()

func hide_intro() -> void:
	intro.hide()
	_release_focus()

func refresh() -> void:
	if game == null:
		return
	var state = game.state
	coins_label.text = "%d ALTIN" % state.coins
	fish_label.text = "%d / %d balık" % [state.fish.size(), Catalog.TANK_CAP]
	var definition := Catalog.level(state.level)
	var current: int = state.objective_current()
	task_label.text = "Seviye %d · %s   /   %s  (%d/%d)" % [state.level, definition.title, definition.desc, mini(current, int(definition.target)), int(definition.target)]
	progress.max_value = int(definition.target)
	progress.value = current
	sound_button.text = "Ses: açık" if state.sound_on else "Ses: kapalı"
	if modal_kind == "shop":
		for entry: Dictionary in buttons:
			var item: Dictionary = entry.item
			var button: Button = entry.button
			var owned: bool = shop_tab == "decor" and str(item.id) in state.decor
			var locked: bool = int(item.unlockLevel) > state.level
			button.disabled = owned or locked or state.coins < int(item.price) or (shop_tab == "species" and state.fish.size() >= Catalog.TANK_CAP)
			button.text = "Alındı" if owned else ("Seviye %d" % int(item.unlockLevel) if locked else "%d altın · Satın al" % int(item.price))
	if modal_kind == "fish" and fish_info != null:
		var item: Dictionary = state.get_fish(game.selected_id)
		if not item.is_empty():
			fish_info.text = "%s\nDoygunluk: %d%%  ·  Büyüme: %d%%\n%s" % [Catalog.species(item.species).name, int(item.hunger), int(float(item.growth) * 100), "Acıktı; suya yem bırak." if float(item.hunger) < 30 else "Keyfi yerinde."]

func _open_modal(title: String, kind: String) -> VBoxContainer:
	_close_modal(false)
	modal_kind = kind
	game.paused = true
	modal = _overlay()
	var margin := MarginContainer.new()
	modal.add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side: String in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 90)
	for side: String in ["top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 65)
	var panel := _panel()
	margin.add_child(panel)
	modal_body = VBoxContainer.new()
	modal_body.add_theme_constant_override("separation", 14)
	panel.add_child(modal_body)
	var row := HBoxContainer.new()
	modal_body.add_child(row)
	modal_title = _label(title, 25, Color("efe5ca"))
	modal_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(modal_title)
	row.add_child(_button("Kapat  [Esc]", _close_modal))
	return modal_body

func _close_modal(resume: bool = true) -> void:
	if is_instance_valid(modal):
		modal.queue_free()
	modal = null
	modal_kind = ""
	buttons.clear()
	if game != null and resume:
		game.paused = false
	_release_focus()

func _release_focus() -> void:
	var focused := get_viewport().gui_get_focus_owner()
	if focused != null:
		focused.release_focus()

func show_shop() -> void:
	if game == null or not game.started:
		return
	var body := _open_modal("Mağaza · Akvaryumunu zenginleştir", "shop")
	var tabs := HBoxContainer.new()
	body.add_child(tabs)
	tabs.add_child(_button("Balıklar", func(): shop_tab = "species"; show_shop()))
	tabs.add_child(_button("Dekorlar", func(): shop_tab = "decor"; show_shop()))
	tabs.add_child(_label("Oyun mağaza açıkken durur.", 14, Color("95b9b5")))
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(scroll)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 12)
	scroll.add_child(grid)
	for item: Dictionary in Catalog.data()[shop_tab]:
		var card := _panel()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.custom_minimum_size.x = 330
		grid.add_child(card)
		var column := VBoxContainer.new()
		column.add_theme_constant_override("separation", 8)
		card.add_child(column)
		column.add_child(_label(str(item.name), 20, Color("eddbb8")))
		var description := _label(str(item.desc), 14, Color("a6c1bd"))
		description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		description.custom_minimum_size.y = 40
		column.add_child(description)
		var detail := str(item.effect) if shop_tab == "decor" else "Her yemden +%d altın" % int(item.coinPerEat)
		column.add_child(_label(detail, 13, Color("7fc5aa")))
		var id := str(item.id)
		var category := shop_tab
		var purchase := _button("Satın al", func():
			if category == "species": game.state.buy_fish(id)
			else: game.state.buy_decor(id)
			game.save_game()
			refresh())
		column.add_child(purchase)
		buttons.append({"button": purchase, "item": item})
	refresh()

func show_fish(id: int) -> void:
	var item: Dictionary = game.state.get_fish(id)
	if item.is_empty():
		return
	var body := _open_modal("Balığınla tanış", "fish")
	fish_info = _label("", 21)
	body.add_child(fish_info)
	body.add_child(_label("İsim (en fazla 16 karakter)", 16, Color("9ec6bf")))
	name_edit = LineEdit.new()
	name_edit.text = str(item.name)
	name_edit.max_length = 16
	name_edit.custom_minimum_size.y = 46
	body.add_child(name_edit)
	body.add_child(_button("İsmi kaydet", func():
		game.state.rename_fish(id, name_edit.text)
		game.save_game()
		_close_modal()))
	refresh()
	name_edit.grab_focus()

func toggle_pause() -> void:
	if game == null or not game.started:
		return
	if is_instance_valid(modal):
		_close_modal()
		return
	var body := _open_modal("Akvaryum dinleniyor", "pause")
	body.add_child(_label("Oyun duraklatıldı. Balıklar sen dönene kadar acıkmaz.", 18))
	body.add_child(_button("Devam et", _close_modal))
	body.add_child(_button("Şimdi kaydet", func():
		show_notice("Kayıt alındı." if game.save_game() else "Kayıt yazılamadı; eski dosyan korundu.")))
	body.add_child(_button("Yeni oyun…", _confirm_reset))

func _confirm_reset() -> void:
	var body := _open_modal("Yeni akvaryum açılsın mı?", "confirm")
	body.add_child(_label("Bu bilgisayardaki mevcut ilerleme yeni oyunla değiştirilecek.\nSon sağlam kayıt .bak dosyasında korunur.", 18))
	body.add_child(_button("Vazgeç, oyuna dön", _close_modal))
	body.add_child(_button("Evet, yeni oyun başlat", func(): game.reset_game(); _close_modal()))

func _toggle_sound() -> void:
	if game == null:
		return
	game.state.sound_on = not game.state.sound_on
	game.save_game()
	refresh()

func show_notice(message: String) -> void:
	notice_label.text = message
	notice_time = 6.0

func set_save_status(text: String) -> void:
	save_label.text = text

func _process(delta: float) -> void:
	if notice_time > 0:
		notice_time -= delta
		if notice_time <= 0:
			notice_label.text = ""
