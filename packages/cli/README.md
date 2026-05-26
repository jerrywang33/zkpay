# @zkpay/cli

Command line tools for zkpay payment links.

```bash
npm install -g @zkpay/cli@next
```

```bash
zkpay link create \
  --amount 20 \
  --coin USDC \
  --receiver 0x84f \
  --label "API credits" \
  --json
```

This alpha CLI currently focuses on payment link creation and JSON output for
merchant backend prototypes.
