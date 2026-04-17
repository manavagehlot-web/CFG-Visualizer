<div align="center">

# CFG Derivation & Parse Tree Visualizer

### An Interactive Educational Tool for Context-Free Grammar Analysis

![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-2.0%2B-000000?style=for-the-badge&logo=flask&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

*A comprehensive, browser-based tool for visualizing Context-Free Grammar derivations, animated parse tree construction, and automated grammar ambiguity detection. Built for students and educators studying the Theory of Automata and Formal Languages (TAFL).*

</div>

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Motivation](#motivation)
- [Features](#features)
  - [Core Derivation Engine](#1-core-derivation-engine)
  - [Animated Parse Tree Visualization](#2-animated-parse-tree-visualization)
  - [Grammar Ambiguity Checker](#3-grammar-ambiguity-checker)
  - [Comprehensive Crash Course](#4-comprehensive-crash-course--tutorial)
  - [Smart Input System](#5-smart-input-system)
  - [Theme System](#6-dual-theme-system)
- [Architecture](#architecture)
  - [System Overview](#system-overview)
  - [Backend Components](#backend-components)
  - [Frontend Components](#frontend-components)
- [Technical Details](#technical-details)
  - [Earley Parsing Algorithm](#earley-parsing-algorithm)
  - [Derivation Extraction](#derivation-extraction)
  - [Ambiguity Detection Pipeline](#ambiguity-detection-pipeline)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Preloaded Examples](#preloaded-examples)
- [Limitations & Performance](#limitations--performance)
- [Requirements](#requirements)

---

## Problem Statement

In the study of **Theory of Automata and Formal Languages (TAFL)**, students frequently encounter the following challenges:

1. **Derivation Complexity**: Manually performing leftmost and rightmost derivations for non-trivial grammars is tedious and error-prone. A single misstep in a multi-step derivation can cascade into incorrect results.

2. **Parse Tree Construction**: Translating a derivation sequence into a correct parse tree requires spatial reasoning that many students struggle with, especially for deep or wide trees.

3. **Ambiguity Identification**: Determining whether a grammar is ambiguous requires finding a witness string with two distinct parse trees. This is computationally challenging by hand and nearly impossible for complex grammars.

4. **Conceptual Gap**: The abstract nature of formal grammars, production rules, and the Chomsky hierarchy makes it difficult for students to build intuition about how grammars actually "work" to generate strings.

**This project addresses all four challenges** by providing an interactive, visual, and educational tool that automates grammar parsing, visualizes every step of the derivation process, detects ambiguity automatically, and includes a comprehensive theory tutorial.

---

## Motivation

Traditional TAFL instruction relies on blackboard derivations and textbook exercises. While these are valuable, they have inherent limitations:

- **Static medium**: Textbooks show completed derivations but not the *process* of deriving.
- **No feedback loop**: Students writing derivations on paper have no way to verify correctness until an instructor grades their work.
- **Scale limitations**: Manually testing a grammar for ambiguity across all possible strings up to a given length is infeasible.
- **Theory-practice gap**: Students learn rules but don't develop intuition for *why* grammars work the way they do.

This visualizer bridges these gaps by:

- **Animating** the derivation process step-by-step, so students see exactly how each rule application transforms the sentential form.
- **Providing instant feedback** on whether a string can be derived from a grammar.
- **Automating ambiguity detection** with visual proof via two distinct derivation trees.
- **Teaching theory in-context** through an integrated crash course that connects formal definitions to the tool's functionality.

---

## Features

### 1. Core Derivation Engine

The heart of the application is a robust **Earley parser** that handles any Context-Free Grammar, including:

| Capability | Description |
|---|---|
| **Leftmost Derivation (LMD)** | Step-by-step expansion always choosing the leftmost non-terminal |
| **Rightmost Derivation (RMD)** | Step-by-step expansion always choosing the rightmost non-terminal |
| **Left-recursive grammars** | Handles grammars like `A → A a \| b` without infinite loops |
| **Right-recursive grammars** | Handles grammars like `A → a A \| b` correctly |
| **Highly ambiguous grammars** | Grammars like `S → S S \| a` that cause naive parsers to explode |
| **Epsilon (ε) productions** | Full support for nullable productions and empty string derivation |
| **Multi-terminal symbols** | Supports terminals of arbitrary length (e.g., `id`, `num`, `if`) |

Each derivation step includes:
- **Color-coded tokens**: Non-terminals in orange, terminals in green, the next NT to expand underlined in purple.
- **Expandable explanations**: Click any step to see a detailed, natural-language explanation of which rule was applied and why.
- **Step navigation**: Previous/Next buttons and a step counter for manual traversal.

### 2. Animated Parse Tree Visualization

- **SVG-rendered parse trees** that grow incrementally as derivation steps progress.
- **Spring animations**: Nodes pop into existence with a satisfying cubic-bezier bounce effect.
- **Node differentiation**: Non-terminal nodes (orange), terminal leaf nodes (green), and epsilon nodes (italic orange) are visually distinct.
- **Directional arrows**: Edges use SVG markers with arrow tips showing parent-child relationships.
- **Dual tree toggle**: Switch between LMD-based and RMD-based parse trees with a single click.
- **Collapsible tree explanation panel**: A detailed step-by-step breakdown of how the parse tree was constructed, explaining each node expansion.

### 3. Grammar Ambiguity Checker

A dedicated page (`/ambiguity`) that automatically determines whether a grammar is ambiguous:

- **Automated string generation**: Uses BFS over leftmost derivation to enumerate all strings up to a configurable length.
- **Multi-tree Earley parser**: A modified parser that finds up to 2 structurally distinct parse trees per string.
- **Visual proof**:
  - If **ambiguous**: Displays the witness string and animates both derivations side-by-side with:
    - Color-coded steps showing where derivations are identical vs. where they diverge.
    - A divergence legend and step-by-step animation with adjustable speed.
  - If **not ambiguous**: Shows a celebratory popup with the number of strings tested.
- **Preloaded examples**: Includes classic ambiguous and unambiguous grammars for quick testing.

### 4. Comprehensive Crash Course / Tutorial

An integrated educational module (`/tutorial`) structured into six tabbed sections:

| Section | Content |
|---|---|
| **Quick Start** | Interactive slideshow walking through the tool's features in 6 slides |
| **Grammar Theory** | Formal definition of grammars (G = V, T, P, S), the Chomsky Hierarchy, and real-world motivations |
| **Regular Grammar** | Right-linear vs. left-linear forms, what makes a grammar NOT regular, DFA-to-RG conversion with worked examples |
| **CFG In-Depth** | CFG production rule constraints, comparison with regular grammars, classic examples (palindromes, balanced parentheses, a^n b^n), the role of stack-based memory (PDA), and ambiguity theory |
| **How It Works** | Detailed explanation of every backend function (`parse_grammar`, `earley_parse`, `extract_derivation`, etc.) and frontend renderer (`buildStepDom`, `renderTree`, auto-formatters) with motivation behind each |
| **Troubleshooting** | Performance limits, error message guide, and usage tips |

### 5. Smart Input System

- **Auto-formatting**: Every character typed is automatically spaced for readability. The `->` sequence is auto-converted to the proper `→` arrow symbol.
- **Spacebar lock**: Manual space input is blocked to prevent tokenization ambiguity. The formatter handles all spacing.
- **Greedy tokenization**: The input string field uses longest-match first to correctly tokenize multi-character terminals.
- **Symbol insertion buttons**: Quick-insert `→`, `|`, and `ε` symbols with dedicated buttons.
- **Example loader**: A dropdown menu with 10 preloaded grammar examples covering common TAFL scenarios.

### 6. Dual Theme System

- **Light theme**: Warm cream tones with orange accents (glassmorphism aesthetic).
- **Dark theme**: Deep navy with cyan/teal accents.
- **Persistent preference**: Theme choice is saved to `localStorage` and respected on page reload.
- **System preference detection**: Automatically matches `prefers-color-scheme` on first visit.
- **Full SVG adaptation**: Parse tree nodes, edges, and text colors dynamically adjust to the active theme.

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                     │
│  ┌─────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │  index.html  │  │ ambiguity.html│  │   tutorial.html      │ │
│  │  + main.js   │  │ + ambiguity.js│  │   (self-contained)   │ │
│  └──────┬───────┘  └──────┬────────┘  └─────────────────────┘ │
│         │                  │                                   │
│         │    POST /derive  │  POST /check_ambiguity            │
│         ▼                  ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                    style.css + theme.js                     ││
│  │            (Shared design system & theme toggle)            ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP (JSON)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     Flask Server (app.py)                      │
│                                                                │
│  ┌─────────────────┐   ┌──────────────────────────────────┐   │
│  │  parse_grammar() │   │        Earley Parser             │   │
│  │  (Input parsing)  │──▶│  earley_parse()                 │   │
│  └─────────────────┘   │  earley_parse_multi()             │   │
│                         └────────────┬─────────────────────┘   │
│                                      │                         │
│  ┌─────────────────────┐  ┌──────────▼──────────────────┐     │
│  │  extract_derivation()│  │  build_tree_snapshots()     │     │
│  │  (LMD / RMD steps)  │  │  (Incremental tree growth)  │     │
│  └──────────┬──────────┘  └──────────┬──────────────────┘     │
│             │                        │                         │
│  ┌──────────▼──────────────────────── ▼──────────────────┐     │
│  │  generate_derivation_explanation()                     │     │
│  │  generate_tree_explanation()                           │     │
│  │  (Human-readable step descriptions)                    │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ambiguity Detection Pipeline                            │  │
│  │  generate_strings() → earley_parse_multi() →             │  │
│  │  check_grammar_ambiguity()                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Backend Components

| Component | File | Purpose |
|---|---|---|
| Grammar Parser | `app.py` | Parses raw grammar text into structured dictionary with error handling |
| Earley Parser | `app.py` | O(n³) chart-based parser for recognition and tree extraction |
| Multi-Tree Parser | `app.py` | Modified Earley parser finding multiple distinct parse trees |
| Derivation Extractor | `app.py` | Converts parse trees into LMD/RMD step sequences |
| Tree Snapshot Builder | `app.py` | Creates incremental tree growth snapshots for animation |
| Explanation Generator | `app.py` | Produces natural-language descriptions for each step |
| String Generator | `app.py` | BFS enumeration of grammar's language for ambiguity testing |
| Ambiguity Checker | `app.py` | Orchestrates the full ambiguity detection pipeline |

### Frontend Components

| Component | File | Purpose |
|---|---|---|
| Main Visualizer | `main.js` | Handles derivation rendering, animation, view mode switching, SVG tree drawing |
| Ambiguity UI | `ambiguity.js` | Handles ambiguity results display, side-by-side animations, popup overlays |
| Theme Engine | `theme.js` | Manages dark/light mode toggle with localStorage persistence |
| Design System | `style.css` | Complete CSS with CSS custom properties, glassmorphism, and responsive layout |

---

## Technical Details

### Earley Parsing Algorithm

The application uses the **Earley parsing algorithm** (Jay Earley, 1970), chosen for its unique combination of properties:

1. **Handles any CFG**: Unlike LL or LR parsers, Earley parsers work with ambiguous, left-recursive, and right-recursive grammars without modification.
2. **Guaranteed termination**: The chart-based approach ensures O(n³) worst-case time complexity, preventing infinite loops.
3. **Parse forest**: The algorithm naturally produces a parse forest that can represent multiple parse trees, essential for ambiguity detection.

**The three operations:**

| Operation | When | Action |
|---|---|---|
| **Prediction** | Dot is before a non-terminal | Add new items for all productions of that non-terminal |
| **Scanning** | Dot is before a terminal that matches the current input token | Advance the dot and add to the next chart position |
| **Completion** | Dot is at the end of a production | Find items waiting for this non-terminal and advance their dots |

Each item in the chart is represented as:

```
[Head → α • β, origin]
```

Where `α` is what's been parsed, `β` is what remains, and `origin` is the chart position where this rule started.

### Derivation Extraction

Given a complete parse tree from the Earley parser, derivations are extracted by:

1. Maintaining a **sentential form** as a list of `(type, value)` pairs where type is either `"nt"` (with a subtree reference) or `"terminal"`.
2. At each step, finding the leftmost (or rightmost) entry with type `"nt"`.
3. Replacing it with the children of its subtree root.
4. Recording the new sentential form with highlight flags on newly introduced symbols.

This approach guarantees that the derivation matches the parse tree exactly, unlike approaches that re-derive from scratch.

### Ambiguity Detection Pipeline

```
Grammar Input
    │
    ▼
generate_strings()          ← BFS enumeration up to max_length
    │
    ▼
For each string:
    earley_parse_multi()    ← Find up to 2 distinct parse trees
    │
    ├─ 0 trees: string not in language (skip)
    ├─ 1 tree:  unambiguous for this string (continue)
    └─ 2 trees: AMBIGUOUS! Extract both derivations
                    │
                    ▼
              Compute divergence index
              Return witness string + both derivations + both trees
```

The pipeline tests up to 200 strings of length ≤ 6 tokens, with a safety limit of 30,000 BFS iterations. If no ambiguity is found within these bounds, the grammar is reported as "not ambiguous (within tested bounds)".

---

## Project Structure

```
Tafl Project/
│
├── app.py                          # Flask backend (900 lines)
│   ├── parse_grammar()             # Grammar text → structured dict
│   ├── EarleyItem class            # Chart item representation
│   ├── earley_parse()              # Single-tree Earley parser
│   ├── earley_parse_multi()        # Multi-tree Earley parser
│   ├── extract_derivation()        # Parse tree → LMD/RMD steps
│   ├── build_tree_snapshots()      # Incremental tree snapshots
│   ├── generate_derivation_explanation()  # Natural language explanations
│   ├── generate_tree_explanation()        # Tree construction explanations
│   ├── generate_strings()          # BFS string enumeration
│   ├── check_grammar_ambiguity()   # Ambiguity detection orchestrator
│   └── Routes: /, /tutorial, /ambiguity, /derive, /check_ambiguity
│
├── templates/
│   ├── index.html                  # Main visualizer page
│   ├── tutorial.html               # Crash course & theory guide (6 sections)
│   └── ambiguity.html              # Grammar ambiguity checker page
│
├── static/
│   ├── css/
│   │   └── style.css               # Complete design system (327 lines)
│   │       ├── CSS custom properties (light + dark theme)
│   │       ├── Glassmorphism card system
│   │       ├── Derivation step styling & color coding
│   │       ├── SVG parse tree styles & animations
│   │       ├── View mode tab bar
│   │       └── Ambiguity checker styles
│   │
│   └── js/
│       ├── main.js                 # Main visualizer logic (705 lines)
│       │   ├── Grammar examples (10 preloaded)
│       │   ├── Smart auto-formatting
│       │   ├── View mode switching (LMD/RMD/Tree/All)
│       │   ├── Step animation engine
│       │   ├── SVG tree renderer
│       │   └── Explanation accordion system
│       │
│       ├── ambiguity.js            # Ambiguity checker logic
│       │   ├── Example grammars (ambiguous + unambiguous)
│       │   ├── Side-by-side derivation animation
│       │   ├── Divergence highlighting
│       │   └── Result popup system
│       │
│       └── theme.js                # Theme toggle with localStorage
│
└── README.md                       # This file
```

---

## Installation & Setup

### Prerequisites

- **Python 3.8+** installed on your system
- **pip** (Python package manager)

### Steps

1. **Clone or download** the project:

   ```bash
   git clone <repository-url>
   cd "Tafl Project"
   ```

2. **Install Flask**:

   ```bash
   pip install flask
   ```

   > Flask is the **only** external dependency. The project uses no other Python packages beyond the standard library (`copy`, `time`, `collections`).

3. **Run the application**:

   ```bash
   python app.py
   ```

4. **Open your browser** and navigate to:

   ```
   http://localhost:5000
   ```

The application will be running with Flask's development server on port 5000.

---

## Usage Guide

### Deriving a String

1. **Enter grammar rules** in the "Grammar Rules" textarea. Use `→` or `->` for arrows, `|` for alternatives, and `ε` for the empty string.
2. **Enter an input string** in the "Input String" field. Tokens are auto-separated.
3. Click **Derive** to generate the derivation.
4. The animation starts automatically. Use:
   - **← Previous / Next →** to step through manually
   - **Pause / Resume** to control the animation
   - **Speed Slider** to adjust animation speed (200ms - 2000ms)
5. Switch between **LMD**, **RMD**, **Parse Tree**, or **All** views using the tab bar.
6. **Click any derivation step** to expand its detailed explanation.

### Checking Ambiguity

1. Navigate to the **Ambiguity Checker** page via the header button.
2. Enter a grammar (or select from preloaded examples).
3. Click **Check Ambiguity**.
4. If ambiguous: view the witness string and animated side-by-side derivations.
5. If not ambiguous: a confirmation popup shows the number of strings tested.

### Learning Theory

1. Click **Crash Course / Tutorial** from the main page header.
2. Navigate through the six tabbed sections.
3. Start with **Quick Start** for a tool overview, then explore **Grammar Theory**, **Regular Grammar**, and **CFG In-Depth** for the theoretical foundations.

---

## Preloaded Examples

The visualizer includes 10 preloaded grammar examples:

| # | Name | Grammar | Test String | Concept Demonstrated |
|---|---|---|---|---|
| 1 | Simple Ambiguous | `E → E + E \| E * E \| id` | `id + id * id` | Operator ambiguity |
| 2 | Even Palindrome | `P → a P a \| b P b \| ε` | `a b b a` | Recursive symmetry |
| 3 | Balanced Parentheses | `S → ( S ) S \| ε` | `( ( ) ) ( )` | Nested structure |
| 4 | Left Recursive | `A → A a \| b` | `b a a a` | Left recursion handling |
| 5 | Right Recursive | `A → a A \| b` | `a a a b` | Right recursion handling |
| 6 | Non-Derivable | `S → a S b \| ε` | `a b b` | Negative test case |
| 7 | Empty String (ε) | `S → A B, A → ε, B → ε` | `ε` | Nullable productions |
| 8 | Highly Ambiguous | `S → S S \| a` | `a a a a` | Extreme ambiguity |
| 9 | Mixed Nullable | `S → A B \| B A, A → a A \| ε, B → b B \| ε` | `a a b b` | Complex nullable |
| 10 | Multi-Terminal | `S → A B C D \| S S, ...` | `a*5 b*5 c*5 d*5` | Large grammar |

---

## Limitations & Performance

| Aspect | Limit | Reason |
|---|---|---|
| Input string length | 50-70 tokens recommended | Earley parser is O(n³); beyond 100 tokens, latency increases noticeably |
| Ambiguity test strings | Up to 200 strings, length ≤ 6 | BFS enumeration is bounded to prevent excessive computation |
| BFS iterations | 30,000 max | Safety cap on string generation |
| Chart safety limit | 8,000 iterations per position | Prevents runaway in the multi-tree parser |
| Concurrent users | Single-threaded Flask dev server | For classroom use; deploy with Gunicorn/uWSGI for production |

**Guaranteed Properties:**
- The Earley parser will **never enter an infinite loop**, regardless of grammar structure.
- All recursive grammars (left, right, and mutually recursive) are handled correctly.
- Epsilon productions are fully supported with proper tree representation.

---

## Requirements

| Requirement | Version |
|---|---|
| Python | 3.8 or higher |
| Flask | 2.0 or higher |
| Modern browser | Chrome, Firefox, Edge, Safari (ES6 support required) |

No additional Python packages, build tools, or npm dependencies are required. The frontend is built with vanilla HTML, CSS, and JavaScript.

---

<div align="center">

**Built for TAFL students who deserve better tools.**

*Theory of Automata and Formal Languages*

</div>
