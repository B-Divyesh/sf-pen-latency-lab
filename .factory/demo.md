# Stroke Lab demo sandbox

## Open the sample

Use <https://pen-latency-lab.sociobot.in/demo> or open `/demo` in a local production preview. The landing page reaches it with one click through **Try it with sample data**.

The sample contains three pen-like handwriting strokes, a 24 ms smoothing setting, realistic input and render timing, and a filled issue title and note. It produces a populated smoothing diagnosis immediately.

## Isolation

Demo state lives only in the page's in-memory `demo:` session. Stroke Lab does not use localStorage, sessionStorage, IndexedDB, cookies, or a backend for demo state.

The real test also uses tab memory, but `/demo` creates a separate page and probe instance. It never reads or writes another test. Leaving the page discards its sample and edits.

## Reset or leave

**Reset demo** discards all demo edits and restores the three original sample strokes. **Start for real** opens `/` with an empty test.

The sticky banner remains visible throughout the sample: **Demo — sample data, nothing is saved**.
