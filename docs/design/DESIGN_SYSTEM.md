# Design System

## Foundations

- Theme variables live in `apps/web/src/app/globals.css`
- Shared primitives live in `packages/ui`
- Product-specific compositions live in `apps/web/src/components`

## Core tokens

- Background: `--color-bg`
- Elevated background: `--color-bg-elevated`
- Panel: `--color-panel`
- Border: `--color-border`
- Border strong: `--color-border-strong`
- Accent: `--color-accent`
- Success: `--color-success`
- Warning: `--color-warning`
- Danger: `--color-danger`

## Primitive set

- `Button`
- `Badge`
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Input`
- `Select`
- `Table` family
- `MetricCard`
- `EmptyState`
- `Skeleton`
- `Modal`

## Product components

- App shell with sidebar, workspace switcher, and command bar
- Intent cards
- Status badges
- Risk badges
- Policy chips
- Approval and execution timelines
- Diff preview
- Receipt panel
- Audit event table
- Payload viewer

## Interaction rules

- Use modals for confirmation and danger framing, not for routine reading.
- Keep technical depth behind progressive disclosure panels.
- Show lifecycle state near the title of every consequential entity.
- Pair risk and reversibility whenever simulation data exists.
