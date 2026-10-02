# Build brief — the remaining flows

For Claude Code, in `foodline-mobile`. Written against the actual repo
conventions and the verified RPC catalogue, not against a design file.

---

## Conventions (observed in `src/app/(app)/sales.tsx`, follow exactly)

```ts
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppHeader, initialsFrom } from '@/components/app-header';
import {
  EmptyState, ErrorState, Group, ListRow, Loading, ModuleHero,
  NoticeCard, Screen, SeeAllHeader, StaleBanner, StatusPill,
} from '@/components/ui';
import { useAuth, useCompanyId } from '@/features/auth/auth-context';
import { api, type SalesOrder } from '@/lib/api';
```

Labels come from a `STATE_LABEL: Record<Entity['state'], string>` map at module
scope. Every screen handles **loading, error, empty and stale** — `StaleBanner`
exists because B5 established that a screen offline shows last-known data with a
marker rather than a blank. Keep that.

Routes live in `src/app/(app)/`. Dynamic ones follow the existing shape:
`customer/[id].tsx`, `routine/[id].tsx`, `shipment/[orderId].tsx`, `stop/[id].tsx`.

---

## Priority 1 — screens whose RPC already exists

These are blocked on nothing. Build them first; each closes several dead ends.

### `item/[id].tsx` — item detail
**The highest-leverage screen in the app.** Four flows dead-end without it:
lots and expiry, recall, cycle counts, traceability.

Sections: on-hand by location · lots with expiry (FEFO order, short-dated
tinted) · recent movement · actions.
Exits: lots, recall, traceability, cycle count.
RPC: `product_directory_snapshot` for the list; detail RPC still
`TODO(wiring)` — raise it, do not guess.

### `sales-order/[id].tsx` — sales order detail
```
get_current_sales_order_detail(p_sales_order_id uuid)
get_current_sales_order_fulfillment(p_sales_order_id uuid)
```
Both verified and unused. Header, lines with fulfilment state, customer,
shipment status. Exits: post shipment, resolve short, raise credit, customer.

### `sales-order/[id]/short.tsx` — resolve a short
```
get_current_sales_order_fulfillment(p_sales_order_id uuid)
cancel_current_sales_order_remainder(p_command_key uuid, p_sales_order_id uuid,
                                     p_expected_order_row_version bigint)
```
Three outcomes per line: substitute, backorder, cancel remainder. Terminal —
returns to the order with the change visible.

---

## Priority 2 — new sales order (S1)

Three RPCs, three steps, mirroring the New PO flow that is already built and
verified. Copy that structure; it works.

```
create_sales_order(p_organization_id uuid, p_customer_id uuid,
                   p_customer_site_id uuid, p_requested_delivery_date date,
                   p_source_channel text, p_external_reference text, p_notes text)
add_sales_order_line(p_sales_order_id uuid, p_product_uom_id uuid,
                     p_quantity numeric, p_warehouse_id uuid, p_unit_price numeric, …)
confirm_current_sales_order(p_command_key uuid, p_payload jsonb)
```

Live pricing per line:
`get_current_product_customer_price_preview(p_product_id, p_customer_id, p_customer_site_id, p_product_uom_id, p_quantity, p_as_of)`

**Do not port the desktop item-and-quantity picker.** It is logged unusable and
it is the most-used path a rep has. Search, tap, stepper, running total always
visible once there is a line.

The header exists server-side before the lines, so an interrupted flow is
recoverable. Save the draft id and offer to resume.

---

## Priority 3 — close the dead ends

Currently stranding users with inbound traffic and no exits:

| Screen | Fix |
|---|---|
| Activity | rows link to the record they describe |
| Finance | read-only, but give it a back path and links into the invoices it summarises |
| Reports & Activity | same |
| Traceability | back to the item, and forward to the lot |

A screen that only goes back is not finished. That is the whole loop complaint.

---

## Priority 4 — the remaining flows

**Pick and pack** — queue → task → scan location, item, lot → confirm → complete.
Extend the existing scanner session chain rather than forking it;
`reserve_sales_order_line(...)` is the reservation call.

**Run a stop** — `stop/[id].tsx` exists; finish it.
`transition_current_delivery_route_exact(p_command_key, p_route_id, p_expected_row_version, p_action)`
and `load_current_route_shipment_exact(...)`.
**Proof of delivery collects and submits nowhere** — that is the P2 to clear.

**Shortage at the door** — the one drivers actually need. From a stop, report
short quantity with a photo, notify the customer.

**Credits and returns** —
`create_customer_credit_draft(...)`, `transition_current_customer_credit(...)`,
`get_current_customer_return_candidates(p_shipment_id)`,
`receive_current_customer_return(p_command_key, p_return jsonb)`.

**Cycle count** — assigned counts → blind entry → variance → submit.

**Document ingestion** — last, because it writes into every module.
`materialize_and_approve_governed_receiving_document_review(p_command_key, p_review_id, p_expected_row_version)`.
Demo against our own template document and say so: a confidently wrong parse
writes a wrong cost, and gross profit is then quietly wrong.

---

## Two rules the catalogue has now confirmed

**`p_command_key uuid` is the idempotency key**, on every mutation. Generate it
when the user commits and send the **same value on every retry of that attempt**.
Regenerating per request is what double-counts stock. The backend was built
expecting this — it is not our convention, it is theirs.

**`p_expected_row_version bigint` is optimistic concurrency.** Send back what you
read. On rejection, re-read and tell the user. Never overwrite, never retry in a
loop.

---

## The only genuine backend gap left

The five-week frequency buckets on Customer 360. Nothing in the catalogue returns
per-item ordering cadence — `get_current_customer_analytics` is aggregate over a
date range, not per item per week.

Ask Kartikeya for one RPC returning, per item: item id, pack size, mean weekly
quantity, ordered bucket array. **This is the only thing worth his time now.**
Everything else that was marked `TODO(wiring)` is answered in
`screen-rpc-map-RESOLVED.md`.

---

## Definition of done, per screen

Loading, error, empty and stale states all present · reachable from its own
workspace, not only from Home · every exit goes somewhere real · commits show a
confirmation naming what happened · back preserves entered data · demo fixture in
the same commit as the live adapter · typecheck and lint pass · run on a handset
on mobile data.
