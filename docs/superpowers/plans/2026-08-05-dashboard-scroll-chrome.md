# Animation des barres au défilement — Plan d’implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer l’en-tête et la navigation du tableau de bord lors du défilement vers le bas, puis les afficher au défilement vers le haut, en 200 ms.

**Architecture:** Le composant compare la position verticale courante du `ScrollView` à la précédente. Deux `Animated.Value` contrôlent les translations opposées de l’en-tête et de la navigation, avec un seuil de 12 px.

**Tech Stack:** React Native `Animated`, TypeScript, Node test runner.

---

## Fichiers concernés

- Modifier : `apps/mobile/app/(admin)/dashboard.tsx` — état de défilement, animations et conteneurs animés.
- Modifier : `apps/mobile/test/routes.test.mjs` — couverture statique de l’animation.

### Task 1: Définir et vérifier le contrat de l’animation

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`

- [ ] **Step 1: Écrire le test qui échoue**

Ajoutez au test du tableau de bord :

```js
assert.match(source, /Animated\.Value\(0\)/);
assert.match(source, /onScroll=\{handleScroll\}/);
assert.match(source, /duration:\s*200/);
assert.match(source, /translateY:\s*headerTranslateY/);
assert.match(source, /translateY:\s*navTranslateY/);
assert.match(source, /toValue:\s*-120/);
assert.match(source, /toValue:\s*100/);
```

- [ ] **Step 2: Exécuter le test pour confirmer l’échec**

Run: `pnpm --filter mobile test`

Expected: le test du tableau de bord échoue car l’animation n’existe pas encore.

### Task 2: Ajouter l’animation directionnelle minimale

**Files:**
- Modify: `apps/mobile/app/(admin)/dashboard.tsx`

- [ ] **Step 1: Importer les primitives nécessaires**

```tsx
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
```

- [ ] **Step 2: Ajouter le suivi du défilement**

```tsx
const previousOffset = useRef(0);
const headerTranslateY = useRef(new Animated.Value(0)).current;
const navTranslateY = useRef(new Animated.Value(0)).current;
const chromeVisible = useRef(true);

const animateChrome = (visible: boolean) => {
  if (chromeVisible.current === visible) return;
  chromeVisible.current = visible;
  Animated.parallel([
    Animated.timing(headerTranslateY, { toValue: visible ? 0 : -120, duration: 200, useNativeDriver: true }),
    Animated.timing(navTranslateY, { toValue: visible ? 0 : 100, duration: 200, useNativeDriver: true }),
  ]).start();
};

const handleScroll = ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number } } }) => {
  const offset = Math.max(0, nativeEvent.contentOffset.y);
  const delta = offset - previousOffset.current;
  if (Math.abs(delta) >= 12) animateChrome(delta < 0 || offset < 12);
  previousOffset.current = offset;
};
```

- [ ] **Step 3: Brancher le défilement et les deux translations**

```tsx
<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
<Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
<Animated.View style={[styles.nav, { transform: [{ translateY: navTranslateY }] }]}>
```

- [ ] **Step 4: Exécuter les tests puis TypeScript**

Run: `pnpm --filter mobile test; pnpm --filter mobile typecheck`

Expected: les 26 tests et TypeScript réussissent sans erreur.

- [ ] **Step 5: Créer le commit ciblé**

```bash
git add -- 'apps/mobile/app/(admin)/dashboard.tsx' 'apps/mobile/test/routes.test.mjs'
git diff --cached --check
git commit -m "feat: animate dashboard chrome on scroll"
```
