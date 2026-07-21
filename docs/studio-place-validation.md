# Studio place validation

The Studio scene editor can validate a POI while reading the scene text.

## Google Maps setup

Set this public environment variable to enable the embedded Google Maps and
Street View previews:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Without this key, the Studio still shows coordinates and external Google Maps /
Street View links, but the Street View iframe is replaced by a call to open the
place in Google.

