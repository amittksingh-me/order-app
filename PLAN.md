# Shopping List Enrichment Engine (Phase 1)

## Overview

Build a mobile-first Shopping List Enrichment Engine that converts a simple grocery item list into a structured, enriched shopping list.

The primary user workflow is:

```
Open App

↓

Quickly type or paste shopping items

↓

Tap Enrich

↓

Review improved shopping list

↓

Tap Copy

↓

Paste into BigBasket
```

Phase 1 intentionally excludes image processing, OCR, and AI Vision.

The purpose of this phase is to build and validate the core enrichment logic, product preference system, user memory, and fast shopping workflow.

Future phases such as camera capture, OCR, voice input, and barcode scanning will use this enrichment engine as the core processing layer.

---

# Goals

The application should allow users to:

- Quickly enter grocery items.
- Paste existing shopping lists.
- Normalize item names.
- Detect duplicate items.
- Match items against product preferences.
- Enrich items with preferred products.
- Remember user choices.
- Review and edit the generated list.
- Copy the final shopping list for BigBasket.

---

# Non-Goals

The following features are not included in Phase 1:

- Camera integration
- Image upload
- OCR
- AI Vision processing
- Barcode scanning
- Voice input
- Recipe parsing
- Cloud synchronization
- User accounts
- Shared shopping lists
- Price comparison

---

# High-Level Architecture

```
User Input

↓

Normalization

↓

Duplicate Detection

↓

User Memory Lookup

↓

Built-in Product Database Lookup

↓

Product Enrichment

↓

User Review

↓

Shopping List Generation

↓

Copy Clipboard
```

---

# Core Concept

The application is not a text formatter.

It is a **Shopping List Enrichment Engine**.

The input:

```
milk
bread
rice
tomato
```

is transformed into:

```
Nandini Toned Milk 500 ml x2

Britannia Bread 400 g x1

India Gate Basmati Rice 5 kg

Tomatoes 1 kg
```

The enrichment engine should remain independent of the input method.

Future inputs:

- Camera
- OCR
- Voice
- Barcode
- Recipe parser

should all produce a simple item list and reuse this same engine.

---

# User Experience Requirements

## Primary User Flow

The application should optimize for:

> Type quickly → enrich automatically → copy result.

The user should not need to navigate through multiple screens.

---

# Main Screen

The main screen is the primary workspace.

## Input Area

Provide a large mobile-friendly multiline text box.

Example:

```
milk
bread
eggs
tomato
rice
```

Requirements:

- Optimized for mobile keyboard
- Supports typing
- Supports paste
- One item per line
- Ignores empty lines
- Allows clearing input

Placeholder:

```
Type your shopping items...

Example:
milk
bread
eggs
tomato
```

---

# Enrich Button

Primary action:

```
✨ Enrich List
```

Behavior:

- Read entered items
- Normalize items
- Detect duplicates
- Apply User Memory
- Apply Built-in Product Database
- Generate enriched list

During processing:

- Disable button
- Show loading indicator

---

# Review Screen

After enrichment, display the generated shopping list.

Example:

Input:

```
milk
bread
eggs
```

Output:

```
Nandini Toned Milk 500 ml x2

Britannia Bread 400 g x1

Eggs 12 pcs
```

Users should be able to:

- Edit item name
- Change quantity
- Change package size
- Delete item
- Add item manually

---

# Copy To Clipboard

The final screen must provide a prominent button:

```
📋 Copy Shopping List
```

Behavior:

- Copy formatted text
- Show confirmation

Example:

```
Copied!
```

The output should be directly pasteable into BigBasket.

---

# Product Knowledge Architecture

The application uses two product knowledge layers.

```
Built-in Product Database
        +
User Memory
        ↓
Merged Product Knowledge
```

User Memory always takes priority over the built-in database.

---

# Built-in Product Database

The initial product database is stored inside the Git repository.

Example:

```
/data/products.json
```

Characteristics:

- Version controlled
- Read-only at runtime
- Updated through application releases
- Shared by all installations

Example:

```json
{
  "milk": {
    "preferredProduct": "Nandini Toned Milk",
    "brand": "Nandini",
    "size": "500 ml",
    "defaultQty": 2,
    "alternatives": [
      "Amul Toned Milk"
    ],
    "keywords": [
      "milk",
      "doodh"
    ],
    "category": "Dairy"
  }
}
```

Each entry may contain:

- Keywords
- Aliases
- Preferred product
- Brand
- Package size
- Default quantity
- Alternative products
- Category

---

# User Memory

The application maintains user-specific preferences locally using IndexedDB.

User Memory stores:

- User preferred products
- Custom mappings
- Quantity preferences
- Package preferences
- New products learned by the user

The built-in database is never modified.

---

# Preference Learning

When a user changes an item, the application can offer to remember the choice.

Example:

Input:

```
milk
```

Suggested:

```
Nandini Toned Milk
```

User changes:

```
Akshayakalpa Organic Milk
```

Prompt:

```
Save as your preferred product for "milk"?
```

If accepted:

Store:

```json
{
  "milk": {
    "preferredProduct": "Akshayakalpa Organic Milk"
  }
}
```

Future enrichment should use this preference first.

---

# Unknown Product Learning

If an item is unknown:

Example:

```
avocado oil
```

User can specify:

```
Figaro Avocado Oil 250 ml
```

The application can offer:

```
Remember this product?
```

If accepted, store locally.

---

# Product Lookup Strategy

Lookup order:

1. Normalize input
2. Check User Memory
3. Check Built-in Database
4. Exact keyword match
5. Alias match
6. Fuzzy match
7. Unknown item

Unknown items must never be silently removed.

They should remain editable.

---

# Input Normalization

Normalization includes:

- Trim whitespace
- Convert to lowercase
- Remove punctuation
- Remove duplicate spaces
- Correct common spelling mistakes
- Singular/plural handling

Examples:

| Input | Result |
|---|---|
| Milk | milk |
| MILK | milk |
| milkk | milk |
| Tomatoes | tomato |
| Bread. | bread |

---

# Duplicate Detection

Duplicate items should merge.

Example:

Input:

```
milk
Milk
MILK
bread
Bread
```

Output:

```
Milk x3

Bread x2
```

Quantity should remain editable.

---

# Internal Data Model

Use structured data internally.

Example:

```typescript
{
    id: string,
    input: string,
    normalized: string,
    quantity: number,

    source:
      "user-memory"
      | "builtin"
      | "unknown",

    matched: boolean,

    preferredProduct: string,
    brand: string,
    size: string,

    alternatives: string[],
    category: string,

    editable: boolean
}
```

Final text formatting should only happen during copy/export.

---

# Storage

## Built-in Database

Location:

```
/data/products.json
```

Properties:

- Read-only
- Git managed
- Application shipped

---

## User Memory

Storage:

```
IndexedDB
```

Suggested collections:

```
userProducts

userPreferences
```

---

# Settings

Settings should be secondary.

The normal user flow should not require opening settings.

Settings may include:

## Product Memory

Display:

```
Built-in Products: 1500

Learned Products: 45
```

Actions:

- Export Memory
- Import Memory
- Reset Memory

---

# Error Handling

Handle:

- Empty input
- Unknown items
- Missing product database
- Invalid database format
- Corrupt IndexedDB
- Import failure

The application should continue processing whenever possible.

---

# Test Assets

The project should maintain a regression test suite.

Structure:

```
/test-assets

    manual-input/

        basic-001.txt
        basic-001.expected.json

        duplicate-001.txt
        duplicate-001.expected.json

        spelling-001.txt
        spelling-001.expected.json

        unknown-001.txt
        unknown-001.expected.json

        memory-001.txt
        memory-001.expected.json
```

Each test case contains:

- Input text
- Expected normalized items
- Expected matches
- Expected enriched output
- Expected final shopping list

Every bug fix should add a regression test.

---

# Acceptance Criteria

Phase 1 is complete when a user can:

1. Open the application.
2. Type:

```
milk
bread
eggs
```

3. Tap:

```
✨ Enrich List
```

4. Receive:

```
Nandini Toned Milk 500 ml x2

Britannia Bread 400 g x1

Eggs 12 pcs
```

5. Edit if required.
6. Tap:

```
📋 Copy Shopping List
```

7. Paste directly into BigBasket.

---

# Future Phases

The enrichment engine becomes the foundation for:

## Phase 2

Image and AI processing:

```
Camera

↓

Vision AI

↓

Extract Items

↓

Phase 1 Enrichment Engine

↓

Shopping List
```

## Future Extensions

- Barcode scanning
- Voice input
- Recipe conversion
- Household sharing
- Cloud sync
- Grocery provider integrations
- Multilingual support

---

# Success Criteria

Phase 1 succeeds when:

- Grocery input can be enriched accurately.
- User preferences are remembered.
- Built-in knowledge can evolve through Git.
- Users can quickly create a shopping list.
- The final output requires minimal editing before pasting into BigBasket.
- The enrichment engine is reusable for future AI-powered inputs.