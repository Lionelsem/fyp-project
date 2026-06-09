Inspection data model migration notes

Overview
- Old fields removed: `conditionSystem`, `checklistStatus`, `overallStatus`.
- New canonical model: Building -> Floor -> Equipment -> Inspection (parent) -> InspectionResult (per checklist item).

Frontend changes
- `src/pages/fsm/Inspections.jsx` now reads templates from `inspectionTemplates` and creates `inspections` and `inspectionResults` via `createInspection` and `addInspectionResult`.
- `progressPercent` and `status` are stored on the parent `inspections` document.
- Photo URLs should be saved in `photoUrl` on `inspectionResults` (not inline base64). Implemented: preview uses base64, but production should call Storage and replace with URL before saving.

Backend/Firestore
- Collections in `src/constants/collectionNames.js` updated to include:
  - `INSPECTION_TEMPLATES`, `INSPECTIONS`, `INSPECTION_RESULTS`, `EQUIPMENT_HISTORY`, `AI_AUDIT_LOGS`.
- New helper functions in `src/services/firestoreService.js` for creating templates, inspections, results, issues, equipment history, and AI logs.

Migration steps for existing data
1. Export old inspection documents from Firestore.
2. Map old checklist entries into `inspectionResults` documents: set `inspectionId` to new parent id, copy item code/label into `itemCode`/`itemLabel`.
3. Calculate `progressPercent` for parent inspection (completed / total * 100) and set `status` appropriately (`Draft`, `Submitted`, `Completed`).
4. Move photo attachments to Storage and update `photoUrl` fields.

Developer notes
- Temporary dev seeding is available in `src/pages/fsm/Inspections.jsx` (dev-only handler `handleSeedData`). Open the Inspections page in development and call the handler from console or wire a button to seed test data.
- Replace hardcoded `user_fsm_001` with the authenticated user id from `AuthContext` before production use.

If you want, I can add a one-click admin seed page and a migration script to transform legacy documents.