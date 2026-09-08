# Marketplace booking rules

This document is the source of truth for the core VietTour marketplace flow.

## Roles

- A guest can browse tours, create bookings for their own account, cancel a
  pending booking, and review a completed tour once.
- A host can manage only their own approved tours, departures, and bookings.
- An admin verifies hosts, moderates tours, handles disputes, and reconciles
  payments. The admin is the only role with global reporting access.

## Tour and departure

- A tour is reusable content owned by one host: description, price, child
  policy, images, and booking-sales window.
- A departure is one actual run of a tour. It owns its start/end dates and its
  capacity.
- Before a host can submit a tour for approval, it must include a meeting
  point, itinerary, included services, excluded services, and a cancellation
  policy. This is particularly important because guests arrange their own
  transport to the tour location.
- `booking_open_date` and `booking_close_date` are the sales window. They are
  not travel dates.
- Every new booking must select one future departure. A booking never creates
  an ad-hoc departure date.
- Capacity is reserved and released per departure. The tour template does not
  share one capacity across its departures.
- The platform does not sell airfare, train, or intercity transport. Guests
  receive the departure date and meeting point, arrange their own travel, and
  are subject to the tour's stated cancellation/no-show policy.

## Price and promotion

- The server is authoritative for all prices.
- A booking must send adult and child counts whose sum equals the guest count.
- The server applies the tour child discount and an eligible promotion before
  persisting the final total.
- Client-side totals are only previews and must match the server response.

## Booking lifecycle

Current states are `pending`, `confirmed`, `checked_in`, `completed`,
`no_show`, and `cancelled`.

- A host or admin may confirm or cancel a pending booking.
- A confirmed booking can be checked in from its departure start date; because
  departures currently have dates but no end time, it can be marked completed
  from the calendar day after the departure end date.
- A confirmed booking can be marked no-show from the departure start date when
  the guest does not arrive at the meeting point.
- Completed, no-show, and cancelled bookings are final. They cannot be
  reopened through the ordinary status flow.
- Guest and host reviews require a completed booking, preventing reviews for a
  booking that was merely accepted. A guest can publish only one review for
  each tour, and any attached review images are stored with that review.

Payment is intentionally deferred. A later payment iteration should add a
separate payment/escrow lifecycle and derive refund, commission, and host
earnings from settled payment records rather than from booking creation.
Until then, hosts cannot mark a booking paid or complete a refund themselves;
only an admin may record a manually reconciled payment state.
Any commission or host-payout figures shown before reconciliation are estimates
for confirmed, checked-in, or completed bookings, never settled revenue.

## Access invariants

- Booking lists are derived from the authenticated user role, never from query
  parameters supplied by the browser.
- A host cannot create a tour for another host.
- A host review must point to a completed booking that belongs to that host and
  guest. One booking can have at most one host review.
