# Predator Service Backend

## Environment Variables

Set the following values in your environment or `.env` file:

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GEMINI_ENABLE_SEARCH=false
SUMMARY_CACHE_TTL_SECONDS=90
DEFAULT_TIMEFRAME=4h
```

`GEMINI_API_VERSION` remains supported when calling the Gemini API (defaults to `v1beta` when unset).
