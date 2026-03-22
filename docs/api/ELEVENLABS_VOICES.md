# ElevenLabs Voice IDs — Language Learning App

Sample voice IDs from the ElevenLabs shared voice library, curated for language learning use cases.
One male and one female voice per language, prioritizing clear pronunciation and natural tone.

> **Last updated:** 2026-03-22
> **Total languages:** 32
> **Source:** ElevenLabs Shared Voice Library
> **Usage:** Pass the Voice ID to the ElevenLabs TTS API as the `voice_id` parameter.
>
> **Deckbase:** `lib/elevenlabs-voices.js` embeds the Quick Reference below as `ELEVENLABS_VOICES` (dashboard voice picker, `GET /api/elevenlabs/voices`, MCP `list_elevenlabs_voices`).

### Voice previews (Firebase Storage)

The dashboard **Sample** button calls **`GET /api/elevenlabs/voice-sample`**. For each `voice_id`, the server uses Firebase Storage at **`tts-samples-v2/{voiceId}.mp3`** (prefix in `ELEVENLABS_VOICE_SAMPLE_STORAGE_PREFIX`). The TTS line is **in that voice’s language** (`ELEVENLABS_SAMPLE_PHRASE_BY_LANGUAGE` in `lib/elevenlabs-voices.js`), not English for every voice — so Ukrainian previews Ukrainian text. If the object is missing, the server generates it once with ElevenLabs (`eleven_multilingual_v2`), saves it, makes it public, and returns the URL; subsequent plays read from Storage only.

To **pre-seed** all curated clips in your bucket (optional), run **`npm run seed:voice-samples`** with env that includes `FIREBASE_*`, `ELEVENLABS_API_KEY`, and your bucket name. See **`docs/VOICE_SAMPLE_STORAGE_SETUP.md`**.

---

## Arabic (العربية)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Farah - Smooth, Calm and Warm | `4wf10lgibMnboGJGCLrP` | Jordanian (Levantine) | Ads, narration, storytelling, audiobooks |
| Male | Omar – Premium Arabic Voice | `xvhpbk8otnNHtT3fjCpr` | Modern Standard Arabic | Documentaries, audiobooks, corporate |

---

## Bulgarian (Български)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Milena - Optimistic, Clear, and Balanced | `M1ydWt7KnBCiuv4CnEDC` | Standard | News, ads, audiobooks |
| Male | Kosta | `gdk0ZsvfAOobfbTtnx6p` | Standard | Conversational |

---

## Chinese — Mandarin (普通话)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Chen Mandarin Chinese | `4NQthjVhIGGVfL3Si000` | Taiwan Mandarin | Dialogue, storytelling, podcasts |
| Male | Adrian - Chinese Mandarin Narration | `agczkAUlHLowaNnL72Cc` | Standard (Mainland) | Documentaries, explainers, educational |

---

## Croatian (Hrvatski)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Nina - Calm, Warm & Resonant | `FXlzTee7Zx2caYKIAwBF` | Standard | Narration, podcasts, audiobooks |
| Male | Fran - Calm, Narrative | `TRnNlYQWHAJwo9K75wNE` | Zagreb | Narration, storytelling, podcasts |

---

## Czech (Čeština)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Kami - Warm, Velvety and Soothing | `e6RzI8kmgjn6nh36K9J3` | Standard | Audiobooks, meditation, podcasts |
| Male | Shoshi - Czech Calm Voice | `oJafrcmhnPdknhWvAMQq` | Standard | Podcasts, explainers, audiobooks |

---

## Danish (Dansk)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Camilla - Engaging, Clear and Calm | `4RklGmuxoAskAbGXplXN` | Standard | Presentations, tutorials, narration |
| Male | Casper - Calm, Confident and Soothing | `ADRrvIX3j1uTFlD5q6DE` | Standard | Storytelling |

---

## Dutch (Nederlands)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Emma - Calm, Clear and Confident | `OlBRrVAItyi00MuGMbna` | Standard | E-learning, tutorials, conversational |
| Male | John | `Jn7U4vF8ZkmjZIZRn4Uk` | Standard | Documentaries, audiobooks, educational |

---

## English

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Viki - Calm American Female Narration | `owHnXhz2H7U5Cv31srDU` | American | Audiobooks, narration, educational |
| Male | James - English Storyteller | `GrVxA7Ub86nJH91Viyiv` | British | Storytelling, narration |

---

## Filipino / Tagalog (Filipino)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Ate Namie - Captivating Narrator | `x67weArB3J1Pw9MN46KC` | Standard | Documentaries, audiobooks, corporate |
| Male | Pocholo Gonzales - Friendly Voice Actor | `XZXkjLOwX1a5QsrVLIzM` | Standard | Documentaries, educational |

---

## Finnish (Suomi)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Lumi - Anxious, Cold and Light | `c4ZwDxrFaobUF5e1KlEM` | Standard | Storytelling, social media |
| Male | Ville - Serious and Condescending | `XFCwH7g0WlOZiFnelted` | Western | News, podcasts, storytelling |

---

## French (Français)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Geneviève - News Anchor | `mlIQEcTmPRMIHZApujDD` | Standard (Paris) | News, educational, formal |
| Male | Yann - Calm French Narration | `243EYe3yd01qZNlIuged` | Standard (Paris) | Narration, storytelling, educational |

---

## German (Deutsch)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Doris – Warm Versatile Narrator | `idJJAzG7sSMi0HPB4sBL` | Standard | Fiction, audiobooks, meditation |
| Male | Daniel – Calm German Storyteller | `KDqku3FJfbImX6HKQdWA` | Standard | Podcasts, audiobooks, educational |

---

## Greek (Ελληνικά)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Martha - Expressive Greek Female | `JrrE7QTGDmQKQuUnqk7H` | Cypriot | Audiobooks, stories, podcasts |
| Male | Atlas - Expressive, Narrational and Warm | `ejJ1ETWS2ohLMMeCu1H3` | Standard | Narration, commercials, documentaries |

---

## Hindi (हिन्दी)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Devi - Encouraging and Motivating | `MF4J4IDTRo0AxOO4dpFR` | Standard | Educational, social media, audiobooks |
| Male | Irfan Ahmad | `QCwUVw5fOJzf8t55fhmR` | Bihari | Storytelling, educational, narration |

---

## Hungarian (Magyar)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Vera - Young, Energetic and Expressive | `xjlfQQ3ynqiEyRpArrT8` | Standard | Commercials, advertising |
| Male | Peter - Youthful, Casual and Easygoing | `TumdjBNWanlT3ysvclWh` | Standard | Storytelling, narration |

---

## Indonesian (Bahasa Indonesia)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Renata - Soothing, Inviting and Calm | `tkD44aBEYVXxC4GxZoBV` | Standard | Narration, storytelling |
| Male | Senja | `YaOJRohVGQB7O7pekQTF` | Standard | Meditation, motivational, audiobooks |

---

## Italian (Italiano)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Lorena - Professional Female Voice | `Ifz6upLTTyg10iqpfWL5` | Standard | Audiobooks, podcasts, professional |
| Male | Valerio – Warm Italian Storyteller | `f8NAZK1ciwrVujah7clz` | Romanesco (Rome) | Documentaries, narration, podcasts |

---

## Japanese (日本語)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Yukiko - Native Japanese Female | `Z5Rahxh8jMhJKEgBfCSS` | Kanto | Business, news, customer service |
| Male | Yusuke - Calm Japanese Business Narration | `94gBdmmazJ025HbvF78b` | Standard | Seminars, educational, corporate |

---

## Korean (한국어)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Jeong-Ah - Versatile Korean Female | `airYK6ydeWdrJg6gyZA3` | Seoul (Standard) | News, vlogs, meditation, narration |
| Male | Hojin Lim — Korean Male, 30s | `fHzGR8qcnsDR2uaj9r16` | Standard | YouTube narration, educational, storytelling |

---

## Malay (Bahasa Melayu)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Aina - Soft, Friendly and Encouraging | `vzENlyfJ5X29uOlVQMWY` | Malaysian | Conversational, e-commerce, digital assistants |
| Male | Faizal - Calm, Clear and Inviting | `Wc6X61hTD7yucJMheuLN` | Malaysian | Conversational, narration |

---

## Norwegian (Norsk)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Celine - Clear and Confident | `k5IgYJw2jfo6mO5HhagG` | Standard (Eastern) | Commercials |
| Male | Erik - Clear and Natural | `EpYEY8MWJrUGskHBoNMA` | Oslo | Conversational |

---

## Polish (Polski)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Aleksandra - Calm, Warm, Trustworthy | `aAY9hMI6VU335JUszdRs` | Mazovian | Meditations, podcasts, audiobooks, e-learning |
| Male | Marcin - Deep & Cinematic Polish Narrator | `B5tmTXp0L7DzqmlGqIMJ` | Standard | Audiobooks, commercials, documentaries |

---

## Portuguese (Português)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Raquel - Expressive and Energetic | `GDzHdQOi6jjf8zaXhCYD` | Brazilian | Conversational AI, social media, podcasts |
| Male | Gabriel Neutro - BR | `ZxhW0J5Q17DnNxZM6VDC` | Brazilian | Explainer videos, courses, ads |

---

## Romanian (Română)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Eva - Friendly & Calm Female | `mSQ52FoQiuRydZA1FOpg` | Standard | Commercials, audiobooks, narration, corporate |
| Male | Vasile Poenaru | `9nKRcmsd1bEJbszIZ2HO` | Standard | Storytelling, children's content |

---

## Russian (Русский)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Elana - Calm Professional Narrator | `Qd4oZ0qGYYI8dkiby8he` | Standard | Audiobooks, documentaries, e-learning |
| Male | Anton Ru | `13JzN9jg1ViUP8Pf3uet` | Standard | Conversational, customer support, business |

---

## Slovak (Slovenčina)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Julia - Young & Airy | `9Nd358gE1qQp0pDh8FgP` | Standard | Conversational |
| Male | Jaro | `DXwrzy2wtKORwDTbsMwk` | Central | Educational, informative |

---

## Spanish (Español)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Rocio | `rnktyBnYiJ9gGJSNsJZn` | Latin American | E-learning, corporate, audiobooks |
| Male | Juan - Friendly & Effortless | `VvYiNBPylZtUh8Bf6u8l` | Latin American | Social media, conversational |

---

## Swedish (Svenska)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Elin - Neutral and Clear | `4Ct5uMEndw4cJ7q0Jx0l` | Standard | Audiobooks, e-learning, voice assistants |
| Male | Ola Paulakoski - Natural, Soft and Warm | `ouhIFI5XkmBelRRcJe51` | Standard | Audiobooks, commercials |

---

## Tamil (தமிழ்)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Mandira – Warm, Young Storyteller | `IC6fkbI5BN65xFmhUCbY` | Standard | Kids' stories, educational, audiobooks |
| Male | Aarumugam – Expressive and Engaging Narrator | `yrFqUM5ku2rYJCdiBKFU` | Standard | Audiobooks, storytelling, podcasts |

---

## Turkish (Türkçe)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Warm Turkish Female | `FDs1ZX5J4e4f2c2erxtW` | Istanbul | Narration, YouTube, audiobooks, conversational |
| Male | Ismail - Calm, Soothing Narrator | `bKzPIaBn2Q715Nv8nEwW` | Istanbul | Narration, documentaries, audiobooks |

---

## Ukrainian (Українська)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Calm Ana | `5erHrdsmUNM63rFLhYiV` | Standard | Narration, educational, audiobooks, conversational AI |
| Male | Yevhenii - Calm, Articulate and Sharp | `0CH1jv2shWMGGZ3uM0rX` | Standard | Lectures, online courses, audiobooks |

---

## Vietnamese (Tiếng Việt)

| Gender | Name | Voice ID | Accent | Best For |
|--------|------|----------|--------|----------|
| Female | Ngoc An - Warm Audiobook Narrator | `D0dFzCacaMgMGjIksFuH` | Standard (Central) | Audiobooks, storytelling, narration |
| Male | Phước - Vietnamese Narrator | `7clfgAuss1M0JUYGlh1t` | Southern | Storytelling, explainers, e-learning |

---

## Quick Reference — All Voice IDs

| Language | Code | Female Voice ID | Male Voice ID |
|----------|------|----------------|---------------|
| Arabic | `ar` | `4wf10lgibMnboGJGCLrP` | `xvhpbk8otnNHtT3fjCpr` |
| Bulgarian | `bg` | `M1ydWt7KnBCiuv4CnEDC` | `gdk0ZsvfAOobfbTtnx6p` |
| Chinese (Mandarin) | `zh` | `4NQthjVhIGGVfL3Si000` | `agczkAUlHLowaNnL72Cc` |
| Croatian | `hr` | `FXlzTee7Zx2caYKIAwBF` | `TRnNlYQWHAJwo9K75wNE` |
| Czech | `cs` | `e6RzI8kmgjn6nh36K9J3` | `oJafrcmhnPdknhWvAMQq` |
| Danish | `da` | `4RklGmuxoAskAbGXplXN` | `ADRrvIX3j1uTFlD5q6DE` |
| Dutch | `nl` | `OlBRrVAItyi00MuGMbna` | `Jn7U4vF8ZkmjZIZRn4Uk` |
| English | `en` | `owHnXhz2H7U5Cv31srDU` | `GrVxA7Ub86nJH91Viyiv` |
| Filipino | `fil` | `x67weArB3J1Pw9MN46KC` | `XZXkjLOwX1a5QsrVLIzM` |
| Finnish | `fi` | `c4ZwDxrFaobUF5e1KlEM` | `XFCwH7g0WlOZiFnelted` |
| French | `fr` | `mlIQEcTmPRMIHZApujDD` | `243EYe3yd01qZNlIuged` |
| German | `de` | `idJJAzG7sSMi0HPB4sBL` | `KDqku3FJfbImX6HKQdWA` |
| Greek | `el` | `JrrE7QTGDmQKQuUnqk7H` | `ejJ1ETWS2ohLMMeCu1H3` |
| Hindi | `hi` | `MF4J4IDTRo0AxOO4dpFR` | `QCwUVw5fOJzf8t55fhmR` |
| Hungarian | `hu` | `xjlfQQ3ynqiEyRpArrT8` | `TumdjBNWanlT3ysvclWh` |
| Indonesian | `id` | `tkD44aBEYVXxC4GxZoBV` | `YaOJRohVGQB7O7pekQTF` |
| Italian | `it` | `Ifz6upLTTyg10iqpfWL5` | `f8NAZK1ciwrVujah7clz` |
| Japanese | `ja` | `Z5Rahxh8jMhJKEgBfCSS` | `94gBdmmazJ025HbvF78b` |
| Korean | `ko` | `airYK6ydeWdrJg6gyZA3` | `fHzGR8qcnsDR2uaj9r16` |
| Malay | `ms` | `vzENlyfJ5X29uOlVQMWY` | `Wc6X61hTD7yucJMheuLN` |
| Norwegian | `no` | `k5IgYJw2jfo6mO5HhagG` | `EpYEY8MWJrUGskHBoNMA` |
| Polish | `pl` | `aAY9hMI6VU335JUszdRs` | `B5tmTXp0L7DzqmlGqIMJ` |
| Portuguese | `pt` | `GDzHdQOi6jjf8zaXhCYD` | `ZxhW0J5Q17DnNxZM6VDC` |
| Romanian | `ro` | `mSQ52FoQiuRydZA1FOpg` | `9nKRcmsd1bEJbszIZ2HO` |
| Russian | `ru` | `Qd4oZ0qGYYI8dkiby8he` | `13JzN9jg1ViUP8Pf3uet` |
| Slovak | `sk` | `9Nd358gE1qQp0pDh8FgP` | `DXwrzy2wtKORwDTbsMwk` |
| Spanish | `es` | `rnktyBnYiJ9gGJSNsJZn` | `VvYiNBPylZtUh8Bf6u8l` |
| Swedish | `sv` | `4Ct5uMEndw4cJ7q0Jx0l` | `ouhIFI5XkmBelRRcJe51` |
| Tamil | `ta` | `IC6fkbI5BN65xFmhUCbY` | `yrFqUM5ku2rYJCdiBKFU` |
| Turkish | `tr` | `FDs1ZX5J4e4f2c2erxtW` | `bKzPIaBn2Q715Nv8nEwW` |
| Ukrainian | `uk` | `5erHrdsmUNM63rFLhYiV` | `0CH1jv2shWMGGZ3uM0rX` |
| Vietnamese | `vi` | `D0dFzCacaMgMGjIksFuH` | `7clfgAuss1M0JUYGlh1t` |
