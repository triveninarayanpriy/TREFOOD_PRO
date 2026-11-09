# TreFood Evaluator Walkthrough & Demo Guide

This guide provides a 5-minute interactive walkthrough script for testing the TreFood prototype locally or on the live edge deployment.

**Live Edge Deployment**: [https://trefood-prototype.technicaltriveniyt.workers.dev](https://trefood-prototype.technicaltriveniyt.workers.dev)

---

## 1. Demo User Accounts

When `DEMO_MODE=true` is enabled, all screens display **1-Tap Demo Login** buttons so evaluators and reviewers never get stuck:

| Role | Demo Email | Access URL | Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `student@demo.trefood.test` | `/` and `/browse` | Browse menus, place orders, view live HandoverTicket, confirm gate delivery, review orders |
| **Vendor** | `vendor@demo.trefood.test` | `/v` | Kitchen counter tablet board, 4-column kanban, sound chimes, thermal print slips, stock toggles, CSV settlement export |
| **Admin** | `admin@demo.trefood.test` | `/admin` | Key metrics overview, SVG order volume chart, curfew & festival controls, vendor approvals, force-cancel |

---

## 2. Interactive Walkthrough Script (5 Minutes)

### Step 1: Guest Browsing & Gate Selection
1. Open the landing page at `/`.
2. Observe the signature **live HandoverTicket demo** cycling through order statuses with perforated borders and tabular 4-digit verification numbers.
3. Click **Browse Campus Canteens**.
4. Tap the **Gate Picker** in the top navigation bar and select **Hostel 7 Gate (Ganga View)**. Notice how vendors update dynamically based on reachability and curfew.

### Step 2: Adding Items & Debounced Cart Quote
1. Click into **Ganga Dhaba & Kitchen**.
2. Tap `+ Add` on **Paneer Butter Masala** (₹160.00).
3. Tap `+ Add` on **Butter Naan** (₹35.00).
4. Tap **View Packet** at the bottom of the screen. Notice the server-calculated quote: **Delivery Fee: FREE**, Total: ₹195.00.

### Step 3: Zero-Friction Checkout & Demo Sign-In
1. In the Cart Drawer, click **Proceed to Checkout**.
2. In the modal, click **Continue as Demo Student**.
3. Notice how authentication completes in 1 tap without leaving the checkout context.
4. Click **Confirm Order (Pay at Gate)**.

### Step 4: Live Order Tracking & Handover Ticket
1. You are automatically navigated to `/orders/:id`.
2. Inspect the **HandoverTicket**: note the oversized 4-digit code (e.g., `4821`), the pickup gate, and the status Stepper.
3. The page polls via HTTP ETags every 4 seconds, returning 304 Not Modified when idle.

### Step 5: Kitchen Fulfillment on Vendor Console (`/v`)
1. In a second browser tab (or side-by-side window), open `/v`.
2. Click **1-Tap Login as Vendor (Ganga Canteen)**.
3. Observe the 4-column kitchen tablet board: the placed order appears in the **New Orders** column.
4. Click **Accept & Prepare** (56px touch target). The order transitions to **Preparing**.
5. Click **Dispatch Runner**. The order transitions to **On Route**.
6. Click **Mark At Gate**. The order transitions to **At Gate (Handover)**.
7. Click the **Print Slip** button to preview the 58mm/A6 thermal receipt template.

### Step 6: Customer Handover Confirmation
1. Switch back to the student tab at `/orders/:id`.
2. Notice the live ticket has transitioned to **At Gate**.
3. Tap **Match Code & Confirm Delivery**.
4. Confirm handover. The ticket is stamped as **Delivered**.
5. Submit a 5-star rating and comment.

### Step 7: Admin Operations & Festival Overrides (`/admin`)
1. Open `/admin` in a new tab.
2. Click **1-Tap Login as Admin**.
3. Review the overview metrics and the custom hand-written SVG orders-per-hour histogram.
4. Switch to the **Gates & Curfews** tab. Click **Emergency Festival Override**.
5. Choose **Chhath Puja**, set a closure date, and click Apply.
6. Notice that the student browse screen now immediately displays warning banners.
