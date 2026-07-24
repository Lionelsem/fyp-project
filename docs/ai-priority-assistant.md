# AI Priority Assistant deployment

The FSM priority assistant is implemented as four authenticated callable
functions in `us-central1`:

- `assessIssuePriority`
- `recordIssuePriorityDecision`
- `getIssuePriorityPolicy`
- `updateIssuePriorityPolicy`

## Google Cloud setup

1. Enable the Vertex AI API in the `fireguardcbre` project.
2. Ensure the Cloud Functions runtime service account can invoke Vertex AI and
   read defect images from the project Storage bucket.
3. Deploy Functions. `AI_PRIORITY_MODEL` defaults to `gemini-2.5-flash`, and
   `AI_PRIORITY_LOCATION` defaults to `us-central1`. Change either Firebase
   deployment parameter when the model or serving region changes; no code edit
   is required.

The function uses the current `@google/genai` SDK in Vertex AI mode; no Gemini
API key is stored in the application.
4. Sign in as an FSM, open **AI Priority Settings**, enter all three rubric
   definitions, and enable the policy.

The runtime policy is stored in `aiPriorityPolicies/active`. It is read and
updated only through role-protected callables.

## App Check rollout

1. Register the web app with Firebase App Check using reCAPTCHA Enterprise.
2. Set `REACT_APP_FIREBASE_APP_CHECK_SITE_KEY` in the frontend build
   environment. The Firebase Web SDK will then attach App Check tokens to
   callable requests.
3. Deploy and monitor App Check request metrics.
4. Set the Functions deployment parameter
   `AI_PRIORITY_ENFORCE_APP_CHECK=true` and redeploy only after valid traffic is
   established. Its default is `false` to avoid interrupting the initial
   rollout.

## Verification

Run:

```powershell
cd functions
npm test

cd ..
$env:CI='true'
npm test -- --watchAll=false --runInBand
npm run build
```

Function tests mock structured Vertex responses and cover all three priorities,
malformed output, text-only input, path and MIME validation, timeout behavior,
role gates, input-change hashing, acceptance, and manual override. Frontend
tests cover the single and consolidated priority review UI and FSM policy
editing.

Official references:

- [Firebase callable functions](https://firebase.google.com/docs/functions/callable)
- [Firebase App Check for Cloud Functions](https://firebase.google.com/docs/app-check/cloud-functions)
- [Vertex AI structured output](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/samples/generativeaionvertexai-gemini-controlled-generation-response-schema-2)
- [Vertex AI image understanding](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/image-understanding)
- [Gemini model lifecycle](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions)
