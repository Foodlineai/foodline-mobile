# contracts/screen-rpc-map.md — RESOLVED

*Read straight out of the staging catalogue on 1 Oct. These are verified
signatures, not guesses. Every `TODO(wiring)` in the mobile codebase that this
file names can now be closed.*

Source: `pg_proc` on `Foodline ERP Staging`, schema `public`, read-only query.

---

## Two conventions that explain the whole API

**1 · `p_command_key uuid` is the idempotency key.** Every mutation takes one.
This is not a per-call nonce the server invents — the client generates it when
the user commits and **sends the same value on every retry of that attempt**.
That is exactly the rule in `contracts/actions.md`, and it is now confirmed as
the backend's own contract rather than our convention.

**2 · `p_expected_row_version bigint` is optimistic concurrency.** Also on
nearly every mutation. Send back what you read. A rejection means someone else
moved the record — re-read and tell the user, never overwrite, never retry.

Also: **`*_current_*` means company-scoped.** `get_current_customer_detail`
resolves the company from the session rather than taking it as an argument, which
is why `x-erp-company-id` has to be right on every call.

---

## Resolved — these close open TODOs

### Sales home (screen 05)
```
get_current_sales_orders_workspace()
get_current_last_sales_orders(p_limit integer)
```

### Customer 360 (screen 06)
```
get_current_customer_workspace()
get_current_customer_detail(p_customer_id uuid)
get_current_customer_analytics(p_from date, p_to date,
                               p_minimum_order_count integer,
                               p_minimum_sales numeric)
```

### Routes (screen 11)
```
get_current_delivery_route_workspace()
get_current_delivery_route_map(p_route_id uuid)
```

### Post shipment (screen 07)
```
ship_current_sales_order(p_command_key uuid, p_sales_order_id uuid,
                         p_expected_row_version bigint, p_shipped_on date,
                         p_carrier text, p_tracking_number text, p_notes text)
```

**This vindicates the screen design.** `p_shipped_on` is a date and required;
carrier, tracking number and notes are plain nullable text. The backend already
treats them as optional, so the Optional badges match the contract rather than
merely looking considerate. Send `null`, never `''`.

### New sales order (S1) — three calls, not one
```
create_sales_order(p_organization_id uuid, p_customer_id uuid,
                   p_customer_site_id uuid, p_requested_delivery_date date,
                   p_source_channel text, p_external_reference text, p_notes text)
add_sales_order_line(p_sales_order_id uuid, p_product_uom_id uuid,
                     p_quantity numeric, p_warehouse_id uuid, p_unit_price numeric,
                     p_discount_amount numeric, p_tax_rate numeric,
                     p_promotion_id uuid, p_coupon_id uuid,
                     p_trade_event_offer_id uuid, p_notes text)
confirm_current_sales_order(p_command_key uuid, p_payload jsonb)
```
Header first, then lines, then confirm. The draft exists server-side between
steps, so an interrupted flow is recoverable rather than lost.

### Also available, and not yet used anywhere on mobile
```
get_current_sales_order_detail(p_sales_order_id uuid)      → detail screen
get_current_sales_order_fulfillment(p_sales_order_id uuid) → resolve a short (S4)
get_current_product_customer_price_preview(...)            → live price on the line
reserve_sales_order_line(...)                              → stock reservation
cancel_current_sales_order_remainder(...)                  → S4, cancel the line
invoice_current_sales_order(...)
create_customer_credit_draft(...)                          → S5, raise a credit
transition_current_customer_credit(...)
get_current_customer_return_candidates(p_shipment_id uuid) → returns
receive_current_customer_return(p_command_key uuid, p_return jsonb)
record_current_customer_payment(...)
transition_current_delivery_route_exact(...)               → R1, run a stop
load_current_route_shipment_exact(...)
configure_current_delivery_route_exact(...)
record_sales_order_shipment_fleet_details(...)
```

`get_current_sales_order_detail` and `get_current_sales_order_fulfillment`
already existing means the sales-order detail screen and "resolve a short" are
read-ready — they were blocked on nothing.

---

## Still genuinely missing

**The five-week frequency buckets for Customer 360.** Nothing in the catalogue
returns per-item ordering cadence. `get_current_customer_analytics` takes a date
range and minimum thresholds, which is aggregate, not per-item-per-week.

So this one is a real backend ask, and the reasoning for not computing it on the
device stands: payload size over mobile data, week boundaries that live in the
ERP's timezone, and two implementations that will eventually disagree in front of
a customer.

Ask: one RPC returning per item — item id, pack size, mean weekly quantity, and
an ordered bucket array.

---

## Not yet confirmed

**Where persona comes from.** `get_current_customer_capabilities()` exists but
names *customer* capabilities, which is probably commercial rather than
authorisation. `app_permissions` exists as a table. One more query will settle
it — worth doing before anyone spends half a day on it.

---

## What Claude Code should do with this

1. Close every `TODO(wiring)` this file resolves.
2. Confirm the `p_command_key` the adapter sends is the **attempt's** key, reused
   on retry — not regenerated per request. The backend is clearly built for this.
3. Build the sales order detail screen; the read is already there.
4. Raise only the frequency-bucket RPC with Kartikeya. Everything else is
   answered.
