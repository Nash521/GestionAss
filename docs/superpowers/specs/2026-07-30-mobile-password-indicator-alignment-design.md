# Mobile password indicator alignment design

## Purpose

Visually center the left password-requirement column so it no longer aligns with the input field edge.

## Layout

The four indicators remain a two-column grid. The left column gains a small left inset while the right column keeps its current position, producing a centered visual group below password confirmation. Labels, icons, validation logic and all form behaviour remain unchanged.

## Verification

The route test asserts the left-column inset style and the mobile test suite plus TypeScript must pass.
