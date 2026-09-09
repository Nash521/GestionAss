# Mobile Password Indicator Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the left column of password indicators beneath password confirmation.

**Architecture:** Keep the existing two-column `requirements` flex layout. Add a dedicated style to the left grid items, identified by their index, with a 16 px inset; no form logic changes.

**Tech Stack:** React Native, Node test runner, TypeScript.

---

### Task 1: Add the centered left-column inset

**Files:**
- Modify: `apps/mobile/test/routes.test.mjs`
- Modify: `apps/mobile/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Write the failing test**

```js
test('the left password-indicator column has a centered inset', async () => {
  const source = await readFile(new URL('../app/(auth)/sign-up.tsx', import.meta.url), 'utf8');

  assert.match(source, /index % 2 === 0 && styles\.requirementLeft/);
  assert.match(source, /requirementLeft: \{ marginLeft: 16 \}/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile test`

Expected: FAIL because the current requirement items have no left-column style.

- [ ] **Step 3: Add the indexed left-column style**

Replace the requirements mapping with:

```tsx
{passwordRequirements.map(([label, valid], index) => (
  <View style={[styles.requirement, index % 2 === 0 && styles.requirementLeft]} key={label}>
    <Feather name={valid ? "check-circle" : "circle"} size={13} color={valid ? "#00A99D" : "#8493A1"} />
    <Text style={[styles.requirementLabel, valid && styles.requirementLabelValid]}>{label}</Text>
  </View>
))}
```

Add this style:

```tsx
requirementLeft: { marginLeft: 16 },
```

- [ ] **Step 4: Run verification and commit**

Run: `pnpm --filter mobile test && pnpm --filter mobile typecheck`

Expected: all tests pass and TypeScript exits with code 0.

```bash
git add apps/mobile/app/(auth)/sign-up.tsx apps/mobile/test/routes.test.mjs
git commit -m "fix: center password indicators"
git push
```
