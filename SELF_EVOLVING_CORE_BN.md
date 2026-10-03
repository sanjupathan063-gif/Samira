# SANJU Self-Evolving Core

## What this adds
- Declarative dynamic skill registry stored locally.
- User command such as “add a new skill called Calculator” creates a safe skill record.
- Built-in self diagnostics for storage, speech recognition, TTS, network and Capacitor bridge.
- Skill version/source metadata and removable user skills.
- No automatic arbitrary native-code execution.

## Important architecture note
A dynamically created skill is data/configuration, not arbitrary JavaScript/Android code. This avoids silently executing generated native code. New native capabilities still require a reviewed app update.
