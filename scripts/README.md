# Historical FSM sample data

The generator creates deterministic development records for the previous six complete calendar months. It never deletes operational records. All generated documents contain `seedSource: historical-fsm-rolling-v2`.

Authenticate and run from the repository root:

```powershell
firebase login
npm run seed:fsm-history
```

To target a particular assigned building:

```powershell
npm run seed:fsm-history -- --building=BUILDING_DOCUMENT_ID
```

The script uses stable document IDs and Firestore commit batches, so rerunning it updates the same sample documents instead of creating duplicates.

Collections written:

- `inspections`
- `inspectionResults`
- `issues`
- `closureVerifications`
- `fireDrills`
