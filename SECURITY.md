# Security and responsible use

NetSentinel Shield is an authorized exposure-observation tool. It must only be used against systems that the operator owns or has explicit written permission to assess.

## Current safeguards

- The API requires an explicit `authorized: true` attestation; the UI also requires the permission checkbox.
- Public deployments reject obvious loopback, private, link-local, metadata, and `.local` targets.
- Scan requests are rate-limited and request bodies are size-limited.
- Responses include clickjacking, MIME-sniffing, referrer, permissions, CSP, and HSTS protections in production.
- The public service does not intentionally persist scan results. Optional comparison history is stored in the user's browser only.
- Reports describe observations and do not claim that an open port is exploitable or that a system is secure.

## Before production customer use

This repository is an MVP and is not a legal certification or a completed security assessment. Before accepting customer data, add authenticated accounts, tenant isolation, encrypted server-side storage if needed, verified consent records, deletion/export controls, incident response procedures, vendor agreements, and a reviewed privacy notice. Obtain qualified legal advice for the jurisdictions and customer contracts involved.

To report a security issue, open a private GitHub security report or contact the project owner through the repository profile. Do not include secrets or customer data in a public issue.
