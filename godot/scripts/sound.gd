extends RefCounted
## Small synthesized cues, generated locally instead of using licensed audio assets.
static func stream(kind: String) -> AudioStreamWAV:
	var frequency: float = {"drop": 480.0, "eat": 760.0, "coin": 1040.0, "buy": 660.0, "level": 880.0}.get(kind, 500.0)
	var duration := 0.28 if kind == "level" else 0.10
	var rate := 22050
	var count := int(duration * rate)
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for index in range(count):
		var t := float(index) / float(rate)
		var envelope := sin(PI * float(index) / float(count)) * exp(-t * 12.0)
		var phase := TAU * frequency * t + 1100.0 * t * t
		var sample := int(sin(phase) * envelope * 7500.0)
		bytes.encode_s16(index * 2, sample)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.data = bytes
	return wav
