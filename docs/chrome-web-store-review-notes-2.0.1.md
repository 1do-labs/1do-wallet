# Chrome Web Store review notes for 1Do 2.0.1

This release addresses rejection reference `Grey Titanium` concerning affiliate marketing disclosure.

## Remediation

- Removed all affiliate and tracking parameters from hardware-wallet vendor links.
- Removed the inherited DeFi referral system, including referral URLs and codes, URL-redirection logic, approval UI, persisted referral state, localized referral text, tests, stories, and bundled images.
- Added regression coverage to ensure hardware-wallet vendor URLs contain no query parameters or fragments.
- Verified the release package does not contain the former affiliate identifiers or referral codes.

1Do 2.0.1 does not append, inject, replace, or open affiliate links, codes, or cookies. It does not receive commissions from hardware-wallet links.

## Suggested reviewer note

> Version 2.0.1 removes all affiliate links and referral-code functionality inherited from the upstream project. Hardware-wallet links now point directly to official vendor pages without tracking parameters. The extension no longer appends, injects, replaces, or opens affiliate URLs, codes, or cookies.
