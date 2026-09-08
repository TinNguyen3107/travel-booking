# Marketplace booking rules

This document is the source of truth for the core VietTour marketplace flow.

## Roles

- A guest can browse tours, create bookings for their own account, cancel only
  under the cancellation policy, and review a completed tour once.
- A host can manage only their own approved tours, departures, and bookings.
- An admin verifies hosts, moderates tours, handles disputes, and reconciles
  payments. The admin is the only role with global reporting access.

## Tour and departure

- A tour is reusable content owned by one host: description, price, child
  policy, images, and booking-sales window.
- A departure is one actual run of a tour. It owns its start/end dates and its
  capacity.
- `booking_open_date` and `booking_close_date` are the sales window. They are
  not travel dates.
- Every new booking must select one future departure. A booking never creates
  an ad-hoc departure date.
- Capacity is reserved and released per departure. The tour template does not
  share one capacity across its departures.

## Price and promotion

- The server is authoritative for all prices.
- A booking must send adult and child counts whose sum equals the guest count.
- The server applies the tour child discount and an eligible promotion before
  persisting the final total.
- Client-side totals are only previews and must match the server response.

## Booking lifecycle

Current states are `pending`, `confirmed`, and `cancelled`.

The next payment iteration will introduce `pending_payment`, `paid_escrow`,
`completed`, and `payout_eligible`. Payment, refund, commission, and host
earnings must be derived from that lifecycle rather than from a newly created
booking.

## Access invariants

- Booking lists are derived from the authenticated user role, never from query
  parameters supplied by the browser.
- A host cannot create a tour for another host.
- A host review must point to a confirmed booking that belongs to that host and
  guest. One booking can have at most one host review.
