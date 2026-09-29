# Foodline v4 visual assets

This pack supplies the isolated artwork requested by `ASSIGNMENTS-v4.md` without changing files owned by the `src/` implementer.

## Integration map

React Native automatically selects the `@2x` and `@3x` PNG beside each base file.

| App area | Asset |
| --- | --- |
| Admin / command center | `heroes/admin-loading-dock.png` |
| Sales workspace | `heroes/sales-operations.png` |
| Purchasing workspace | `heroes/purchasing-basket.png` |
| Inventory workspace | `heroes/inventory-cold-room.png` |
| Warehouse / receiving | `heroes/admin-loading-dock.png` |
| Driver routes | `heroes/routes-map.png` |
| Center Nova AI tab | `ai/nova-orb.png` |

The complete path mapping is machine-readable in `visual-assets.json`. Workspace icons use one coherent rounded line system with Nova blue primary strokes and lilac secondary strokes. They are SVG source assets so the app can render them sharply at every device density.

## Export details

- Hero base: 512 × 341 PNG with alpha
- Hero @2x: 1024 × 682 PNG with alpha
- Hero @3x: 1536 × 1023 PNG with alpha
- Nova base: 128 × 128 PNG with alpha
- Nova @2x: 256 × 256 PNG with alpha
- Nova @3x: 384 × 384 PNG with alpha
- Workspace icons: 64 × 64 SVG view box

The generated heroes intentionally contain no interface chrome, words, letters, or logos. Their outer transparency lets the existing hero card provide its own background and clipping.

## Generation prompts

The hero prompt family used the matching full-screen reference for composition and asked for an isolated, premium isometric 3D product diorama on a true transparent background. All scenes use white and cool gray equipment, Nova blue-to-lilac accents, soft studio light, ambient occlusion, and a silhouette readable at mobile size.

- Admin: refrigerated box truck at a warehouse loading bay, forklift, cartons, and produce pallets.
- Sales: delivery van with rear doors open, produce crates, office desk, cartons, and pallet jack.
- Purchasing: translucent blue grocery basket with produce beside a purchase-order sheet and checkmark.
- Inventory: chilled shelving with organized produce crates, platform scale, and barcode scanner.
- Routes: isometric city map with blue river, delivery route, refrigerated truck, and four completed stops.
- Nova: cobalt-to-lilac glass orb, white four-point sparkle, and a restrained translucent orbital ring.

## App icon and splash

The assignment requires the finished `mark-badge-colour.png` as the sole source of truth for app-icon and splash exports. That file is absent from the repository and both supplied asset archives, so this pack does not redraw or approximate the mark. Once the finished file is supplied, it can be exported into the existing Expo and Android icon slots without changing its geometry.
