# Screens

Every screen touched by a flow spec gets a row. Contradictions between specs about a shared
screen surface here rather than at audit.

| Screen | Purpose | Flow specs that touch it | States considered |
|---|---|---|---|
| Today dashboard — weight card (`TodayDashboard/WeightCard.jsx`) | Shows the client's current weight and, when known, the goal it is heading towards | 01 | Ideal (weight + goal) · No goal set — invitation · No weight ever logged — existing empty state, no invitation · Profile loading — no invitation · Declined — no invitation |
| Goal-weight entry overlay | Lets the client name a goal weight without leaving the dashboard | 01 | Ideal · Declining · Save failed, entered value preserved |
| Weight chart, Nutrition → Тяло | Shows the weight trend over time | 01 | Ideal (target line drawn) · No goal set (no target line, no invitation — the card owns the invitation) |
| Profile — body section (`Profile/Profile.jsx`) | Holds the goal weight as an ordinary editable field, and is the permanent path after a decline | 01 | Ideal · Value carried over from the old browser-storage copy |
| Training tab, no plan (`Training/Training.jsx:557`) | Invites the client to start a programme | — (existing, referenced by 01's Verified section) | Already has its own invitation; no spec changes it |
| Today dashboard — habits card, zero habits (`TodayDashboard.jsx:257`) | Invites the client to choose habits | — (existing, referenced by 01's Verified section) | Already has its own invitation; no spec changes it |
