---
name: Metro over WiFi corrupts chunked HTTP responses to physical phone — use USB + adb reverse
description: Physical-device dev-client fails to load the JS bundle over WiFi with "Expected leading [0-9a-fA-F] character but was 0xd"; USB + adb reverse fixes it
---

## Rule
When testing on a physical Android phone, don't point the dev-client at the
PC's LAN IP over WiFi. Connect the phone via USB, run `adb reverse tcp:8081
tcp:8081` (and `tcp:8080 tcp:8080` if the app also talks to a local API
server), and point the dev-client at `http://127.0.0.1:8081` instead.

**Why:** Metro serving the JS bundle to this phone over WiFi reproducibly
corrupts the HTTP chunked-transfer stream, surfacing as
`Expected leading [0-9a-fA-F] character but was 0xd` or, on retry, a full app
hang/ANR. Three fixes were tried and none resolved it: downgrading Node
20 LTS → still broken, `expo start --tunnel` → still broken, a custom local
shim serving a non-chunked static bundle → still broken. A PC reboot also did
not fix it (retested and reproduced the same ANR after rebooting).

The corruption is on the phone's WiFi hop specifically, not in Metro/Node's
HTTP implementation. This also explains why `--tunnel` didn't help: tunnel
traffic still leaves the phone over its own WiFi radio to the router before
reaching ngrok, so the same corrupting hop stays in the path either way.
Only USB, which bypasses WiFi entirely, avoided it — verified working for
both the initial bundle load and live Fast Refresh (edited a string, saw it
update on-device in ~5s with no manual reload).

**How to apply:**
```
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8080 tcp:8080   # if the app also hits a local API server
```
Then connect the dev-client to `http://127.0.0.1:8081` (deep link:
`referral-robin://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`)
and run `expo start --localhost` on the PC side.

`dev.local.ps1` on this machine now does this automatically: it detects a
physical device via `adb devices` and prefers USB reverse-tunnel over the
emulator/WiFi path when one is attached, also switching
`EXPO_PUBLIC_API_URL` to `http://127.0.0.1:8080` since `10.0.2.2` (the
emulator's host-loopback alias) doesn't resolve on a physical device.

The root cause (what on the WiFi path is actually corrupting the stream —
router, AV/firewall HTTP inspection, phone WiFi driver) is still unknown.
This workaround sidesteps it rather than fixing it.
