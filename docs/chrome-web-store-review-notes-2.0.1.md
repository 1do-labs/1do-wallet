# Chrome Web Store review notes for 1Do 2.0.1

This release addresses rejection reference `Grey Titanium` concerning affiliate marketing disclosure.

## Remediation

- Removed all affiliate and tracking parameters from hardware-wallet vendor links.
- Removed the inherited DeFi referral system, including referral URLs and codes, URL-redirection logic, approval UI, persisted referral state, localized referral text, tests, stories, and bundled images.
- Added regression coverage to ensure hardware-wallet vendor URLs contain no query parameters or fragments.
- Verified the release package does not contain the former affiliate identifiers or referral codes.

1Do 2.0.1 does not participate in affiliate or commission programs. It does not append, inject, replace, or open affiliate URLs, codes, or cookies.

## Suggested reviewer note

> Version 2.0.1 addresses the Grey Titanium rejection for 2.0.0. We confirmed that 1Do does not participate in affiliate or commission programs. The release removes the inherited affiliate and referral functionality, including referral URLs and codes, URL rewriting, marketing cookies, consent UI, and persisted referral state. Hardware-wallet links now point directly to official vendor pages without tracking parameters. The extension does not append, inject, replace, or open affiliate URLs, codes, or cookies.
