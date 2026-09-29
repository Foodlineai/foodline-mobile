# Codex Android and device status

Updated: 2026-09-29

## Build

- Branch: `fix/android-apk-pipeline`
- Commit: `4fac7e6` on top of UI commit `8462da5`
- TypeScript: pass (`npx tsc --noEmit --pretty false`)
- Android release: pass (`assembleRelease`)
- APK: `Foodline-Mobile-v3-Latest-Demo.apk`, 136 MB
- SHA-256: `72f65a7d669b12487faadd1c4b3a59b95ae9fc8a5e7bb87d0cab48058ed04203`

## C11 device QA

Device: Samsung SM-A805F, Android package `ai.foodline.mobile` version 0.1.0 (versionCode 1).

Network: pass on Airtel LTE with Wi-Fi disabled. The default route was `rmnet_data0`; Android reported the cellular Internet network as validated. Wi-Fi was restored after the sweep.

| Screen / path | Result | Evidence |
| --- | --- | --- |
| Cold launch | PASS | MainActivity resumed; 1,187 ms total cold-start time |
| Home | PASS | Attention queue and company metrics rendered |
| Sales | PASS | Order list, state tabs, and New sales order rendered |
| Purchasing | PASS | Needs-action card, approvals, and incoming orders rendered |
| Inventory | PASS | Scanner CTA, stock search, par alerts, and stock rows rendered |
| Routes | PASS | Assigned route, next stop, GPS/call/shipment actions rendered |
| Receiving step 1 | PASS | Warehouse selection rendered |
| Receiving step 2 | PASS | Goods receipts rendered |
| Receiving step 3 | PASS | Scanner session started and receiving lines rendered |
| Camera scanner | PASS (preview) | Camera permission granted; live preview and cancel control rendered |
| Nova / AI route | FAIL | `foodline://ai` opens Expo Router's Unmatched Route page; center AI tab is not in the current tab layout |
| Hardware wedge scan | FAIL / not testable | No hardware wedge was attached and the scanner screen exposes no focused text-input or native key-event handler for wedge data |
| Crash check | PASS | No fatal Android or React Native exceptions in the recent log window |

The camera preview was verified, but no physical case barcode was available in the camera view. Barcode decode and the subsequent live RPC mutation therefore remain unverified. The installed build is demo mode, so this sweep does not claim a live-backend RPC pass.

## Visual delivery

C7-C9 are delivered separately on `codex/v4-visual-assets` at `0b498e5`: transparent hero PNGs at three densities, the Nova orb at three densities, a consistent nine-icon workspace set, and a machine-readable integration manifest.

C10 remains blocked by the required finished `mark-badge-colour.png`. The file is absent from the repository and supplied asset archives, and the assignment explicitly forbids redrawing it.
