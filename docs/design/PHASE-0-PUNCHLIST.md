# Phase 0 — close what exists

Before any new screen. Twelve items, ordered by what unblocks the most.

Every one of these is a flow someone can already reach and cannot finish. That
is worse than a missing feature: a gap reads as unfinished, a dead end reads as
broken.

---

## 1 · Sales order detail — `sales-order/[id].tsx`
**Nothing is blocking this.** Both RPCs exist and are unused:
```
get_current_sales_order_detail(p_sales_order_id uuid)
get_current_sales_order_fulfillment(p_sales_order_id uuid)
```
Sales home, Sales orders list, Customer 360 and Search all point at a screen
that is not there. One screen closes four dangling paths.

**Done when:** every list row linking to an order lands on it, and it exits to
post shipment, resolve short and the customer.

---

## 2 · Item detail — `item/[id].tsx`
Closes four dead ends on its own: lots and expiry, recall, cycle counts,
traceability. Items list is currently a wall.

Detail RPC is still unknown — `TODO(wiring)`, defensive mapper, raise it. Build
the screen against `product_directory_snapshot` plus fixtures until it lands.

**Done when:** tapping any item row opens a record with somewhere to go next.

---

## 3 · Post shipment — wire the RPC
Screen is built. The call is verified:
```
ship_current_sales_order(p_command_key uuid, p_sales_order_id uuid,
  p_expected_row_version bigint, p_shipped_on date,
  p_carrier text, p_tracking_number text, p_notes text)
```
Carrier, tracking and notes are nullable — **send `null`, never `''`**. The
backend already treats them as optional, which is what the Optional badges
promise.

**Done when:** a shipment posts with the date alone and the order reflects it.

---

## 4 · Routine approval — wire the approve call
The screen is the product's central claim and currently cannot complete.
Approve RPC still `TODO(wiring)` — raise it rather than guessing.

**Done when:** approving moves the PO and returns to its detail. Confirm no path
submits without the human tap.

---

## 5 · Proof of delivery — submit
Known P2. It collects a signature and a photo and sends them nowhere, which is
the worst possible failure: the driver believes the job is recorded.
```
load_current_route_shipment_exact(p_command_key uuid, p_route_shipment_id uuid,
  p_expected_row_version bigint, p_expected_shipment_version bigint)
```

**Done when:** a completed stop is visible on the order and the route.

---

## 6 · Stop detail — `stop/[id].tsx`
The route exists but the screen does not finish. Arrive → checklist → proof of
delivery → complete → next stop.
```
transition_current_delivery_route_exact(p_command_key uuid, p_route_id uuid,
  p_expected_row_version bigint, p_action text)
```

**Done when:** a driver can run a stop start to finish without leaving the app.

---

## 7 · Receiving — unstub warehouse and goods receipt
Currently constants. `warehouse_directory_snapshot` is named but unbuilt in the
app.

**Done when:** a receipt against a real PO lands in the right warehouse.

---

## 8 · Recall — review step and commit
The classification screen is built and cannot fire. Add the review surface it
routes to, then the commit.

Classification wording still needs a regulatory read before it goes in front of
a customer — flag it in the PR, do not block on it.

---

## 9 · Customer 360 — recent orders
```
get_current_last_sales_orders(p_limit integer)
```
Wire what exists. The five-week frequency strip stays on fixtures until the
bucket RPC is built — **do not compute it on the device**: payload size over
mobile data, week boundaries that live in the ERP's timezone, and two
implementations that will eventually disagree in front of a customer.

---

## 10 · The four stranded screens
Activity, Finance, Reports & Activity, Traceability. All have inbound traffic
and zero exits.

- **Activity** — every row links to the record it describes
- **Finance** — read-only is fine, but link into the invoices it summarises
- **Reports** — same
- **Traceability** — back to the item, forward to the lot

**A screen that only goes back is not finished.** This is most of the loop
complaint, and it is the cheapest fix on the list.

---

## 11 · My Work — persona-shaped
The matrix exists in `contracts/personas.md` and is not wired. A warehouse
worker should see scanner, receiving and counts; a driver their route and
nothing else.

Hiding, not enforcing — the server is still the gate. Read persona from the
session; `app_permissions` exists as a table, so check there before treating the
source as unknown.

---

## 12 · Sales orders list
Partial, and the entry point to item 1. Finish it last, once detail exists.

---

# Then, and only then

New sales order (S1) — three verified RPCs, mirroring the New PO flow that
already works. Then pick and pack, shortage at the door, credits and returns,
cycle count, and document ingestion last.

---

## Standing checks on every item

`p_command_key` is the **attempt's** key, reused on retry, never regenerated —
this is the backend's own design, confirmed across every mutation in the
catalogue. `p_expected_row_version` returned unchanged; on rejection re-read and
tell the user. Loading, error, empty and stale states all present. Demo fixture
in the same commit as the live adapter. Typecheck and lint pass. Run on a
handset, on mobile data.
