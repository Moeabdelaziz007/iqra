package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"
)

type ResonanceResponse struct {
	Data struct {
		DiscoveryFound bool      `json:"discovery_found"`
		Coherence      float64   `json:"coherence"`
		Patterns       []string  `json:"patterns"`
		Timestamp      time.Time `json:"timestamp"`
	} `json:"data"`
}

func main() {
	input := flag.String("input", "", "text to analyze")
	mode := flag.String("mode", "resonance", "mode of operation")
	flag.Parse()

	if *input == "" {
		fmt.Println(`{"error": "input is required"}`)
		os.Exit(1)
	}

	switch *mode {
	case "resonance":
		handleResonance(*input)
	case "evolve":
		fmt.Println(`{"status": "evolution cycle recorded"}`)
	default:
		fmt.Println(`{"error": "unknown mode"}`)
	}
}

func handleResonance(input string) {
	resp := ResonanceResponse{}
	resp.Data.Timestamp = time.Now()
	
	patterns := []string{}
	words := strings.Fields(input)
	inputLen := len(input)
	
	// 1. Numerical Symmetry
	if inputLen > 0 {
		if inputLen % 7 == 0 { patterns = append(patterns, "Numerical_Symmetry_7") }
		if inputLen % 19 == 0 { patterns = append(patterns, "Numerical_Symmetry_19") }
	}
	
	if strings.Contains(input, "الله") {
		patterns = append(patterns, "Sacred_Identity_Presence")
	}

	// 2. Chiasmus Check (Ring Structure)
	// A simple check for A-B-...-B-A pattern in words
	if len(words) >= 4 {
		if strings.ToLower(words[0]) == strings.ToLower(words[len(words)-1]) &&
		   strings.ToLower(words[1]) == strings.ToLower(words[len(words)-2]) {
			patterns = append(patterns, "Chiasmus_Symmetry")
		}
	}

	// 3. Motif Recurrence (Topological Motif)
	wordMap := make(map[string]int)
	for _, w := range words {
		wordMap[strings.ToLower(w)]++
	}
	for _, count := range wordMap {
		if count > 2 {
			patterns = append(patterns, "Topological_Motif_Recurrence")
			break
		}
	}

	// 4. Alfaterbo Logic: Entropy Equilibrium
	// Check if word lengths are distributed uniformly (heuristic for "measured speech")
	if len(words) > 5 {
		avgLen := float64(inputLen) / float64(len(words))
		variance := 0.0
		for _, w := range words {
			diff := float64(len(w)) - avgLen
			variance += diff * diff
		}
		variance /= float64(len(words))
		if variance < 2.0 { // Low variance = rhythmic/balanced
			patterns = append(patterns, "Alfaterbo_Entropy_Equilibrium")
		}
	}

	resp.Data.Patterns = patterns
	resp.Data.DiscoveryFound = len(patterns) > 0
	if resp.Data.DiscoveryFound {
		// Coherence is a function of pattern density and variety
		base := 0.6
		variety := float64(len(patterns)) * 0.1
		resp.Data.Coherence = base + variety
		if resp.Data.Coherence > 1.0 {
			resp.Data.Coherence = 1.0
		}
	}

	out, _ := json.Marshal(resp)
	fmt.Println(string(out))
}
