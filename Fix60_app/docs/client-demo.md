# Fix60 demo build

One app for both households and service providers. This build runs on built-in test data, so it needs no server or internet (provider photos load from the internet and show initials when offline).

## Install

Copy `Fix60-demo.apk` to an Android phone (Android 8 or later), open it and allow "Install unknown apps" when asked.

## Sign in

No SMS is sent. Use code **123456** for every number.

| Mobile number | Who | What to try |
|---|---|---|
| 9000000001 | Anjali (customer) | Home, browse services, post a quick request (⚡), choose a provider who accepted, bookings, rate a finished job, support |
| 9000000002 | Suresh (approved provider) | Job invitations, accept or decline, schedule, start and finish a job, availability, public profile |
| 9000000003 | Lakshmi (provider applicant) | 9-step application with reviewer notes, document re-upload, submit |
| Any other number | New user | Choose "I need help at home" or "I want to work" and register |

Switch language (English / മലയാളം) on the welcome screen or in Settings.

## Good to know

- Test data resets each time the app is closed and reopened.
- Policy pages, support numbers and the grievance officer are placeholders until legal and operations provide them.
- Malayalam text is a first draft and needs review by a native speaker.
- Real SMS login (Firebase) and push notifications are switched on when the app connects to the live server.
