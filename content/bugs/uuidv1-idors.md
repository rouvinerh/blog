# UUIDv1 IDORs

## Summary

I found an IDOR in a profile update that let me overwrite another account's details. However, this site used UUIDs, and normally IDORs involving unpredictable UUIDs is not an issue.

However, I noticed their IDs were almost identical even though I had created them a short time apart. I looked into how those IDs were generated and found that they were based on UUIDv1 or RFC4122. The algorithm used to generate these is deterministic and are not random!

## Finding IDOR

Testing for IDOR is pretty straightforward: create two accounts, see if updates on one account affects another by replacing the account identifier.

I created two accounts within a few minutes of each other. Each had a `ContactId`, which I could find in the browser's cookies. These were their IDs:

```
Account A: 90827c44-fcdb-f111-84e8-7ced8de54b88
Account B: ef07ce08-fcdb-f111-84e8-7ced8de54b88
```

Only the first group changed, with both ending in `fcdb-f111-84e8-7ced8de54b88`. I thought it was odd that so much of a seemingly random ID was the same, so I started looking into how they were made.

## UUIDv1

These turned out to be UUIDv1 values, which are time-based. A UUIDv1 contains a timestamp, a clock sequence, and a node value. The timestamp is split across the first three fields, while the clock sequence helps avoid duplicate IDs. [The RFC describes the fields here](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.1).

![The UUIDv1 fields after the account ID's GUID byte ordering is normalised: timestamp, version, clock sequence, and node.](/images/bugs/uuidv1-format.svg)

My samples shared the same clock sequence and node. The node can be a MAC address or a generated value, so seeing it repeat seemed to indicate this was a MAC address.

The RFC allows us to build a script to decode the UUIDs easily.

## Decoding the UUIDs

This script here decodes the UUIDs to find out the exact time an account was created.

```python
from datetime import datetime, timedelta, timezone
from uuid import RFC_4122, UUID

EPOCH = datetime(1582, 10, 15, tzinfo=timezone.utc)
SGT = timezone(timedelta(hours=8))
IDS = {
    "A": "90827c44-fcdb-f111-84e8-7ced8de54b88",
    "B": "ef07ce08-fcdb-f111-84e8-7ced8de54b88",
}


def decode(value):
    uid = UUID(bytes_le=bytes.fromhex(value.replace("-", "")))
    if uid.variant != RFC_4122 or uid.version != 1:
        raise ValueError("Expected UUIDv1 in this GUID byte order")

    microseconds, extra_digit = divmod(uid.time, 10)
    created = (EPOCH + timedelta(microseconds=microseconds)).astimezone(SGT)
    timestamp = f"{created:%Y-%m-%d %H:%M:%S}.{created.microsecond:06d}{extra_digit}"
    return uid, timestamp


decoded = {}
for label, value in IDS.items():
    uid, timestamp = decode(value)
    decoded[label] = uid
    print(f"{label}  {value}")
    print(f"    Time: {timestamp} SGT")
    print(f"    Clock seq: {uid.clock_seq}  Node: {uid.node:012x}")
    print()

gap_ticks = abs(decoded["A"].time - decoded["B"].time)
seconds, fraction = divmod(gap_ticks, 10_000_000)
print(f"Gap: {seconds}.{fraction:07d} s")
```

Running it gives the following times in Singapore time, UTC+8:

```text
A  90827c44-fcdb-f111-84e8-7ced8de54b88
    Time: 2026-11-09 13:13:15.2448144 SGT
    Clock seq: 1256  Node: 7ced8de54b88

B  ef07ce08-fcdb-f111-84e8-7ced8de54b88
    Time: 2026-11-09 13:11:35.1157743 SGT
    Clock seq: 1256  Node: 7ced8de54b88

Gap: 100.1290401 s
```

So these UUIDs were not random at all, and were basically integers. This means the IDOR was a valid issue since an attacker can easily calculate more UUIDs to change details of other accounts.

