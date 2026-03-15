# Image block: crop aspect ratio (web + mobile sync)

The image block supports a **default crop aspect ratio** so templates and cards can enforce 1:1, 1.91:1, or 4:5 when users crop images.

## Where it’s stored

- **Template:** `blocks[].configJson` (JSON string) with an object that may include `cropAspect`.
- **Card:** `blocks_snapshot[].config_json` or `configJson` (same shape as template). Synced via Firebase when saving templates and cards.

## Config shape

```json
{
  "cropAspect": 1
}
```

For mobile/Firestore snake_case:

```json
{
  "crop_aspect": 1
}
```

## Allowed values

| Value  | Ratio   | Use case        |
|--------|---------|------------------|
| `1`    | 1:1     | Square           |
| `1.91` | 1.91:1  | Landscape        |
| `0.8`  | 4:5     | Portrait (4÷5)   |

Web uses **camelCase** (`cropAspect`); mobile can read **snake_case** (`crop_aspect`) from Firestore. If missing, default is **1** (1:1).

## Web behavior

- **Template editor:** Image blocks have a “Default crop aspect” setting (1:1, 1.91:1, 4:5). Saved in the template’s `blocks[].configJson`.
- **Card editor:** When the user adds an image and the crop modal opens, the initial aspect is taken from the block config (template or card). User can still change it in the modal before applying.

## Mobile

When showing an image crop UI (or when deciding how to display an image), read the block’s config and use `cropAspect` / `crop_aspect` as the default aspect ratio. Same numeric values: `1`, `1.91`, `0.8`. No extra sync step: the field is part of the existing template and card block payloads in Firebase.
