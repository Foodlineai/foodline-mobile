# RPC catalogue — part 2

*Read from the staging catalogue, 1 Oct. **Every `TODO(wiring)` named in the
Phase 0 punchlist is resolved by this file.** Nothing in that list needs
Kartikeya any more except the frequency buckets.*

---

## Item detail — resolved
```
get_current_product_workspace(p_product_id uuid)
get_current_product_cost_pricing_workspace(p_product_id uuid)
```
The highest-priority screen was never blocked. Cost pricing is a separate call,
which matters for persona gating: **do not fetch it for a persona whose
`costVisibility` is hidden.** Not fetching beats fetching and not rendering.

Planning levels, if the screen wants par/reorder:
```
product_warehouse_planning_read(p_company_id, p_product_id, p_warehouse_id)
product_warehouse_planning_configure(…)
```

---

## Approve a drafted PO — resolved
```
decide_purchase_order_approval_command(p_command_key uuid, p_approval_cycle_id uuid,
  p_expected_purchase_order_row_version text,
  p_expected_approval_request_row_version text, p_outcome text)
```

This is why the typecheck failed when my `DraftedPurchaseOrder` overwrote Claude
Code's: theirs carried `approvalCycleId` and `approvalRequestRowVersion` because
this call needs **two** row versions, the order's and the approval request's.
Theirs was right; mine was a guess. Keep theirs.

Note `p_outcome text` — approve and reject are one call.

---

## Purchase order detail and list — resolved
```
get_purchase_order_workspace(p_purchase_order_id uuid)
purchase_order_read(p_company_id uuid, p_purchase_order_id uuid)
list_purchase_order_work_queue(p_query text, p_status text, p_vendor_id uuid,
  p_category_id text, p_brand_id text, p_sort text, p_after jsonb, p_limit integer)
purchase_order_documents_read(p_company_id uuid, p_purchase_order_id uuid)
get_receivable_purchase_order_lines(p_purchase_order_id uuid)
```
`list_purchase_order_work_queue` takes `p_after jsonb` — cursor paging. Use it;
do not fetch everything and slice on the device.

### New PO is a three-step server flow, not one call
```
preview_purchase_order_draft(p_company_id, p_vendor_id, p_warehouse_id, p_lines jsonb,
  p_order_date, p_expected_delivery_date, p_charges jsonb, p_allocation_method, …)
create_purchase_order_from_preview(p_company_id, p_command_key, …, p_expected_quote_hash text)
submit_purchase_order_command(p_command_key, p_purchase_order_id,
  p_purchase_order_version_id, p_expected_row_version text)
```
**`p_expected_quote_hash`** is the important one: preview returns a hash, create
sends it back, and the server rejects if pricing moved underneath. That is price
integrity on a multi-step flow — exactly the protection our review step needs,
and it is already built. Wire it rather than inventing a client-side check.

---

## Warehouse selection — resolved, unstub receiving
```
warehouse_directory_snapshot(p_company_id uuid)
list_receiving_location_warehouses()
list_purchase_order_warehouses()
```
Punchlist item 7 closed. Two scoped variants exist — use the receiving one for
receiving rather than filtering the general list.

---

## Pick and pack — fully built server-side
```
get_governed_scanner_pick_queue()
pick_current_verified_task(p_command_key, p_pick_wave_id, p_pick_task_id,
  p_expected_wave_row_version, p_evidence jsonb)
record_current_pick_task_event(p_command_key, p_pick_task_id,
  p_expected_task_row_version, p_expected_wave_row_version, p_event_type,
  p_base_quantity, p_reversal_of_event_id)
record_current_catch_weight_pick(p_command_key, p_pick_task_id,
  p_expected_task_version, p_expected_wave_version, p_measurement jsonb,
  p_lock_if_valid boolean)
complete_governed_scanner_pick(…)
transition_current_pick_wave(p_command_key, p_pick_wave_id, p_action,
  p_expected_row_version)
get_current_verified_pick_pack(p_sales_order_id uuid)
```
**Catch-weight picking exists**, with a `p_lock_if_valid` flag. That is the
distinction the 18 Sep review insisted on — case versus weight — already handled
in the backend. The mobile screen must capture a weight measurement for
catch-weight lines, not just a count.

`record_current_pick_task_event` takes `p_reversal_of_event_id`: picks are
reversible by event, so a mis-scan is corrected rather than overwritten. Build
the UI to use that instead of letting someone edit a number.

---

## Cycle count — fully built server-side
```
get_current_cycle_counts_workspace()
create_current_cycle_count(p_command_key, p_description, p_warehouse_id,
  p_targets jsonb, p_assigned_membership_id)
claim_current_cycle_count(p_count_id, p_expected_version, p_command_key)
get_current_cycle_count_sheet(p_session_id, p_sheet_id)
save_current_cycle_count_entries(p_count_id, p_lease_token uuid,
  p_lease_fence bigint, p_entries jsonb)
submit_current_cycle_count(…)  review_current_cycle_count(…)  post_current_cycle_count(…)
complete_governed_scanner_cycle_count(…)
```
Note the **lease token and fence** on entry saving — counts are leased to one
counter at a time, so two people cannot count the same sheet. Honour the lease;
do not retry a save with a stale fence.

Full lifecycle: create → claim → enter → submit → review → post. The review step
is a separate call, so variance approval is a real gate, not a formality.

---

## Recall — resolved, and notifications exist
```
recall_case_create(p_company_id, p_command_key, p_classification text,
  p_title text, p_lots jsonb)
recall_case_read(p_company_id, p_case_id)
recall_case_transition(p_company_id, p_case_id, p_expected_version,
  p_command_key, p_action text)
recall_cases_for_lot(p_company_id, p_lot_id)
recall_notifications_request(p_company_id, p_case_id, p_expected_version,
  p_command_key)
recall_action_decide(p_company_id, p_action_id, p_expected_version,
  p_command_key, p_action text, p_result jsonb)
```

**The "email and call notifications not yet set up" note from 18 Sep is out of
date.** There is a full delivery pipeline — `recall_delivery_claim`,
`recall_delivery_record`, `recall_delivery_reconciliation_queue`. Customer
notification on recall is built.

`recall_case_create` takes classification as free `text`. The mobile screen
should send the exact enum the ERP uses — confirm the accepted values before
wiring, because a typo here fails silently into a wrong classification on a food
safety record.

---

## Still genuinely missing

**The five-week frequency buckets.** Confirmed absent across two sweeps. This
remains the only backend ask.

**Persona source still unsettled.** `get_current_customer_capabilities()` is
commercial, not authorisation. `app_permissions` exists as a table. One more
query will settle it.

---

## Two cross-cutting notes

**Version types are inconsistent.** Some calls take `p_expected_row_version
bigint`, others `text`. Do not coerce — pass through whatever the read returned,
typed as the signature demands.

**`p_company_id uuid` is explicit on some calls** and implicit (session-scoped)
on the `*_current_*` family. Pass `useCompanyId()` where the signature asks for
it; the header alone is not enough for those.
