# Design System

## Design Principles

1. **Focus on the conversation** — The UI should fade into the background during practice. Minimal chrome, maximum content area.
2. **Clear feedback, not criticism** — Corrections and scores should feel helpful, not judgmental. Use supportive language and visual design.
3. **Progressive disclosure** — Show overview first, details on demand. Don't overwhelm with data.
4. **Accessible by default** — Support keyboard navigation, screen readers, and high-contrast modes.

## Color Palette

```
Primary:     Blue (#3B82F6)    — Actions, links, active states
Secondary:   Purple (#8B5CF6)  — Accents, evaluation highlights
Success:     Green (#10B981)   — Correct answers, high scores
Warning:     Amber (#F59E0B)   — Needs improvement, medium scores
Error:       Red (#EF4444)     — Errors, low scores (use sparingly)
Neutral:     Slate (#64748B)   — Text, borders, inactive states

Background:  White + Slate-50  for light surfaces
Dark mode:   TBD (Phase 7+)
```

## Typography

- **Font:** System font stack (Inter for headings, system-ui for body)
- **Scale:** Tailwind defaults (text-sm for captions, text-base for body, text-lg/xl for headings)
- **Conversation text:** text-base (16px) for readability during practice

## Component Patterns

### Conversation Bubble
```
┌──────────────────────────────────────────┐
│ (avatar) Message text here...     12:34  │
│         ┌──────────────────────────┐     │
│         │ Correction: "original" → │     │
│         │ "corrected" (explanation)│     │
│         └──────────────────────────┘     │
└──────────────────────────────────────────┘
```
- User bubbles: right-aligned, primary blue background
- AI bubbles: left-aligned, neutral gray background
- Corrections: collapsed by default, expandable inline below the message

### Scenario Card
```
┌─────────────────────┐
│  🍽️                 │
│  Ordering Food      │
│  Practice ordering  │
│  at a restaurant    │
│                     │
│  Easy · 5 min       │
│  [Start Practice]   │
└─────────────────────┘
```

### Evaluation Card
```
┌──────────────────────────────────────────┐
│  Session Summary                         │
│  ┌──────────┐ ┌──────────┐              │
│  │ Overall  │ │ Fluency  │  ...         │
│  │   78/100 │ │   72/100 │              │
│  └──────────┘ └──────────┘              │
│                                          │
│  Pronunciation Errors (3)                │
│  ├─ pizza: /ˈpitsə/ → /ˈpiːtsə/         │
│  └─ ...                                  │
│                                          │
│  Grammar Corrections (2)                 │
│  ├─ "I go" → "I went" (past tense)      │
│  └─ ...                                  │
│                                          │
│  Vocabulary Used (12 words)              │
│  Recommendations: ...                    │
└──────────────────────────────────────────┘
```

## Layout

### Conversation Page
```
┌─────────────────────────────────┐
│  ← Back    Ordering Food  [End] │  Header (fixed, 56px)
├─────────────────────────────────┤
│                                 │
│  (scenario briefing)            │
│                                 │
│  ┌─────────────────────────┐    │
│  │   AI: Welcome! ...       │    │  Conversation area
│  │                         │    │  (scrollable, flex-grow)
│  │       User: I'd like... │    │
│  │   AI: What kind?        │    │
│  └─────────────────────────┘    │
│                                 │
│  [Interim: "I would like..."]   │  Live transcript
├─────────────────────────────────┤
│  🎤 [Hold to speak / Tap]       │  Audio controls (fixed, 72px)
└─────────────────────────────────┘
```

### States

**Each component should handle these states:**
- **Loading:** Skeleton screens matching component shape
- **Empty:** Friendly illustration + action prompt ("No sessions yet. Start your first practice!")
- **Error:** Error message + retry button
- **Success:** Normal rendering

## Responsive Breakpoints

- **Desktop:** ≥1024px — Full conversation view with side panels
- **Tablet:** 768-1023px — Single column, collapsible evaluation
- **Mobile:** <768px — Full-screen conversation, bottom sheet for evaluation
