package engine

import (
	"math"
	"regexp"
	"strings"
	"unicode"
)

// ResonanceResult represents the findings of the topological curiosity engine
type ResonanceResult struct {
	Coherence      float64  `json:"coherence"`
	Patterns       []string `json:"patterns"`
	LetterCount    int      `json:"letter_count"`
	WordCount      int      `json:"word_count"`
	DiscoveryFound bool     `json:"discovery_found"`
}

// Patterns from Jules AI's DISCOVERIES.md and Quranic constants
var sacredConstants = map[string]int{
	"SABEEN":   7,
	"NINETEEN": 19,
	"ARBAUN":   40,
	"NINE":     9,
}

// CalculateResonance performs real-time analysis of text for Quranic symmetries
func CalculateResonance(text string) ResonanceResult {
	result := ResonanceResult{
		Patterns: []string{},
	}

	// 1. Clean and count
	cleanText := removeArabicDiacritics(text)
	result.LetterCount = countLetters(cleanText)
	result.WordCount = countWords(text)

	// 2. Check for Numerical Symmetries
	if result.LetterCount > 0 {
		for name, constant := range sacredConstants {
			if result.LetterCount%constant == 0 {
				result.Patterns = append(result.Patterns, name+"_LETTERS")
			}
		}
	}

	if result.WordCount > 0 {
		for name, constant := range sacredConstants {
			if result.WordCount%constant == 0 {
				result.Patterns = append(result.Patterns, name+"_WORDS")
			}
		}
	}

	// 3. Check for specific Semantic Pairs (Mizan)
	// Example: Dunya vs Akhirah mentioned in DISCOVERIES.md
	if containsOpposites(text) {
		result.Patterns = append(result.Patterns, "MIZAN_BALANCE")
		result.Coherence += 0.3
	}

	// 4. Final Coherence Calculation
	baseCoherence := float64(len(result.Patterns)) * 0.2
	if baseCoherence > 1.0 {
		baseCoherence = 1.0
	}

	// Add "curiosity" bonus if it's a prime number (sovereign number)
	if isPrime(result.LetterCount) {
		result.Patterns = append(result.Patterns, "PRIME_SOVEREIGNTY")
		baseCoherence += 0.1
	}

	result.Coherence = math.Min(baseCoherence, 1.0)
	result.DiscoveryFound = len(result.Patterns) > 0

	return result
}

// arabicDiacriticsRE matches Arabic diacritic marks (harakat, hamzas above/below,
// Quranic annotation marks). Compiled once at package init for two reasons:
//
//  1. The previous in-function `regexp.MustCompile` re-compiled on every call,
//     wasting cycles on hot paths like batch surah analysis.
//  2. The previous pattern used `\u064B` escapes, which Go's RE2-based `regexp`
//     package does NOT support — it requires `\x{064B}` syntax. As written,
//     the previous regex panicked on its very first call, taking down
//     CalculateTone and CalculateResonance with it. Tests in this PR catch
//     that regression.
var arabicDiacriticsRE = regexp.MustCompile(
	`[\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06DC}\x{06DF}-\x{06E4}\x{06E7}\x{06E8}\x{06EA}-\x{06ED}]`,
)

func removeArabicDiacritics(text string) string {
	return arabicDiacriticsRE.ReplaceAllString(text, "")
}

func countLetters(text string) int {
	count := 0
	for _, r := range text {
		if unicode.IsLetter(r) {
			count++
		}
	}
	return count
}

func countWords(text string) int {
	words := strings.Fields(text)
	return len(words)
}

func containsOpposites(text string) bool {
	// Simplified check for demonstration of "Mizan"
	opposites := [][]string{
		{"الدنيا", "الآخرة"},
		{"الحياة", "الموت"},
		{"الملائكة", "الشياطين"},
	}

	foundPairs := 0
	for _, pair := range opposites {
		if strings.Contains(text, pair[0]) && strings.Contains(text, pair[1]) {
			foundPairs++
		}
	}
	return foundPairs > 0
}

func isPrime(n int) bool {
	if n <= 1 {
		return false
	}
	for i := 2; i <= int(math.Sqrt(float64(n))); i++ {
		if n%i == 0 {
			return false
		}
	}
	return true
}
