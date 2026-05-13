// بسم الله الرحمن الرحيم
// Baseline tests for the resonance_engine.go changes in this PR.
//
// Scope: the two changes in this PR —
//   1. arabicDiacriticsRE promoted to a package-level var, with the pattern
//      converted from invalid \uXXXX escapes (which panic at runtime under
//      Go's RE2 engine) to valid \x{XXXX} escapes.
//   2. removeArabicDiacritics now delegates to arabicDiacriticsRE instead of
//      re-compiling on every call.
//
// The critical regression being guarded here: prior to the fix any call to
// CalculateResonance or CalculateTone on Arabic text would PANIC because
// regexp.MustCompile panicked with the invalid \u escapes. The package-level
// var compiles once at startup, so a panic would crash the process, not just
// return an error. These tests verify that the regex compiles (it is var-
// initialized) and produces correct output.

package engine

import (
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// removeArabicDiacritics — regression & correctness
// ---------------------------------------------------------------------------

func TestRemoveArabicDiacritics_NoPanicOnEmpty(t *testing.T) {
	// The previous implementation would have panicked here due to the invalid
	// \u escape in the MustCompile call. Passing this test proves the package-
	// level var initialised successfully.
	got := removeArabicDiacritics("")
	if got != "" {
		t.Errorf("empty input must return empty; got %q", got)
	}
}

func TestRemoveArabicDiacritics_NonArabicUnchanged(t *testing.T) {
	inputs := []string{
		"hello world",
		"1234567890",
		"Ω≈ç√∫˜µ",
	}
	for _, in := range inputs {
		got := removeArabicDiacritics(in)
		if got != in {
			t.Errorf("non-Arabic text must be unchanged; input=%q got=%q", in, got)
		}
	}
}

func TestRemoveArabicDiacritics_StripsFatha(t *testing.T) {
	// U+064E ARABIC FATHAH is a diacritic in the \x{064B}-\x{065F} range.
	// "بَ" = ba (U+0628) + fathah (U+064E); after stripping only "ب" remains.
	withFatha := "بَ"
	got := removeArabicDiacritics(withFatha)
	if strings.ContainsRune(got, '\u064E') {
		t.Errorf("fathah (U+064E) must be stripped; got %q", got)
	}
	if !strings.ContainsRune(got, 'ب') {
		t.Errorf("base letter ب must be preserved; got %q", got)
	}
}

func TestRemoveArabicDiacritics_StripsKasra(t *testing.T) {
	// U+0650 ARABIC KASRA.
	withKasra := "بِ"
	got := removeArabicDiacritics(withKasra)
	if strings.ContainsRune(got, '\u0650') {
		t.Errorf("kasra (U+0650) must be stripped; got %q", got)
	}
}

func TestRemoveArabicDiacritics_StripsQuranicAnnotationMark(t *testing.T) {
	// U+06D8 (ARABIC SMALL HIGH MEEM INITIAL FORM) is in the \x{06D6}-\x{06DC} range,
	// a Quranic annotation mark that should be stripped.
	withMark := "ب\u06D8"
	got := removeArabicDiacritics(withMark)
	if strings.ContainsRune(got, '\u06D8') {
		t.Errorf("Quranic annotation mark U+06D8 must be stripped; got %q", got)
	}
	if !strings.ContainsRune(got, 'ب') {
		t.Errorf("base letter ب must be preserved; got %q", got)
	}
}

func TestRemoveArabicDiacritics_FullyVoweledBismillah(t *testing.T) {
	// بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ — fully voweled.
	// After stripping, only base letters and spaces should remain.
	voweled := "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
	got := removeArabicDiacritics(voweled)

	// The result must be shorter than the input (diacritics removed).
	if len(got) >= len(voweled) {
		t.Errorf("diacritics must reduce string length; input len=%d output len=%d", len(voweled), len(got))
	}

	// No remaining characters in the diacritic codepoint ranges.
	diacriticRanges := [][2]rune{
		{0x064B, 0x065F},
		{0x06D6, 0x06DC},
		{0x06DF, 0x06E4},
		{0x06EA, 0x06ED},
	}
	singles := []rune{0x0670, 0x06E7, 0x06E8}
	for _, r := range got {
		for _, rang := range diacriticRanges {
			if r >= rang[0] && r <= rang[1] {
				t.Errorf("diacritic rune U+%04X found in output %q", r, got)
			}
		}
		for _, s := range singles {
			if r == s {
				t.Errorf("diacritic rune U+%04X found in output %q", r, got)
			}
		}
	}
}

func TestRemoveArabicDiacritics_UndiacritizedUnchanged(t *testing.T) {
	// Text without diacritics must pass through unchanged.
	bare := "بسم الله الرحمن الرحيم"
	got := removeArabicDiacritics(bare)
	if got != bare {
		t.Errorf("undiacritized text must be unchanged; got %q", got)
	}
}

// ---------------------------------------------------------------------------
// CalculateResonance — regression: must not panic on Arabic input
// ---------------------------------------------------------------------------

func TestCalculateResonance_NoPanicOnArabicText(t *testing.T) {
	// This is the primary regression test. Prior to the fix, regexp.MustCompile
	// with \u escapes panicked, meaning ANY call to CalculateResonance with
	// Arabic text would crash the process. The package-level var is initialised
	// once at startup, so if the test binary loaded without panic and we reach
	// this line, the regex compiled correctly. We still call the function to
	// ensure removeArabicDiacritics is reachable via CalculateResonance.
	cases := []string{
		"بسم الله الرحمن الرحيم",
		"بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ",
		"الحمد لله رب العالمين",
		"",
	}
	for _, in := range cases {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("CalculateResonance(%q) panicked: %v", in, r)
				}
			}()
			CalculateResonance(in)
		}()
	}
}

func TestCalculateResonance_LetterCountExcludesDiacritics(t *testing.T) {
	// Adding diacritics to a bare Arabic word must not change the letter count,
	// because removeArabicDiacritics is applied before countLetters.
	bare := "بسم"
	voweled := "بِسْمِ"
	bareResult := CalculateResonance(bare)
	voweledResult := CalculateResonance(voweled)
	if bareResult.LetterCount != voweledResult.LetterCount {
		t.Errorf(
			"diacritics must not affect letter count; bare=%d voweled=%d",
			bareResult.LetterCount, voweledResult.LetterCount,
		)
	}
}

func TestCalculateResonance_EmptyTextZeroValues(t *testing.T) {
	got := CalculateResonance("")
	if got.LetterCount != 0 || got.WordCount != 0 {
		t.Errorf("empty text must produce zero letter/word count; got %+v", got)
	}
	if got.DiscoveryFound {
		t.Error("empty text must not report a discovery")
	}
}

func TestCalculateResonance_CoherenceClampedToOne(t *testing.T) {
	// A long text that triggers many pattern matches should still have coherence <= 1.
	// Repeat a text that hits multiple modular patterns.
	longText := strings.Repeat("بسم الله الرحمن الرحيم\n", 50)
	got := CalculateResonance(longText)
	if got.Coherence > 1.0 {
		t.Errorf("coherence must be clamped to <= 1.0; got %v", got.Coherence)
	}
	if got.Coherence < 0 {
		t.Errorf("coherence must be non-negative; got %v", got.Coherence)
	}
}

func TestCalculateResonance_WordCountMatchesFields(t *testing.T) {
	// "بسم الله الرحمن الرحيم" has 4 words.
	got := CalculateResonance("بسم الله الرحمن الرحيم")
	if got.WordCount != 4 {
		t.Errorf("word count for bismillah: expected 4, got %d", got.WordCount)
	}
}
