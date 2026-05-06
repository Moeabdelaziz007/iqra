package main

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

func removeArabicDiacritics(text string) string {
	// Simple regex for common Arabic diacritics
	re := regexp.MustCompile(`[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]`)
	return re.ReplaceAllString(text, "")
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
