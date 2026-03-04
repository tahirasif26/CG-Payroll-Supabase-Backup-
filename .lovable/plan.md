

## Professional Page Transition

Add a subtle, clean fade-in animation to page content on route changes — no bouncy slides, just a refined opacity + slight scale transition.

### Changes

1. **`src/components/AppLayout.tsx`**
   - Import `useLocation` from react-router-dom
   - Use `location.pathname` as a `key` on a wrapper div around `{children}` inside `<main>`
   - Apply a `page-transition` CSS class to that wrapper

2. **`src/index.css`**
   - Add `@keyframes page-enter`: opacity 0→1 + scale 0.985→1 over 250ms ease-out
   - Add `.page-transition` class applying the animation

The scale is intentionally minimal (0.985) — just enough to feel alive without being distracting. Fast 250ms duration keeps it snappy and professional.

