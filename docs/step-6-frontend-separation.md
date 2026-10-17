# Step 6: frontend separation

Date: 5 October 2026. Result: **GO to the next production-configuration step** on the basis of frontend separation. No production configuration was changed or verified by this step.

## Scope and outcome

The authoritative Admin frontend remains in `admin/`. The public router has no Admin routes or AuthProvider. Removed 81 Admin-only source/test/asset files after inspecting imports and usages. Removed the Admin-only CSS block (shell, login, theme, navigation and table rules), the unconsumed Admin unauthorized event handler, and the unused `qr-scanner` dependency from the public manifest and lockfile.

Public request behavior is preserved: API URL construction, credentials, mutation header, JSON serialization/parsing, status/error mapping and mock registration behavior remain unchanged. Public service payloads, endpoints and domain contracts were retained. Admin and backend source/configuration were not edited; existing unrelated working-tree changes were left in place. Architecture/source-map documentation now reflects the separation.

## Validation

| Check            | Public frontend                      | Admin                      |
| ---------------- | ------------------------------------ | -------------------------- |
| Full tests       | PASS: 12 files, 65 tests             | PASS: 11 files, 76 tests   |
| Type-check       | PASS                                 | PASS                       |
| Production build | PASS                                 | PASS                       |
| Lint             | PASS: 0 errors, 12 existing warnings | PASS: 0 errors, 3 warnings |

Public lint before cleanup also reported exactly 12 warnings, all from React refresh component-export rules. Admin source was unchanged. Public build still reports a non-blocking chunk-size warning (934.42 kB main JavaScript before gzip); this step does not redesign or optimize the public application.

Seven new router regression cases cover `/admin`, login, invitation acceptance, dashboard, delegate detail, communications detail and unknown Admin URLs: all render public not-found and make no fetch calls. Existing public cases were retained from five mixed public/Admin test files; only their Admin cases/imports/fixtures were removed. Remaining suites cover Professional and Student registration, Student evidence/submission/resubmission/payment eligibility, Sponsor/Exhibitor applications, Abstract submissions, enquiries, registration recovery and payment callbacks including Event Pass behavior.

Production-preview browser checks (agent-browser) confirmed public not-found for `/admin/login` and `/admin/delegates/example`; registration choices, Sponsor/Exhibitor form controls, recovery form, missing-reference payment callback, and invalid email-verification state still render. API-backed successful journeys were verified by focused mocked tests, not new live backend/payment/email transactions.

## Import and dependency scan

TypeScript AST scan inspected static imports, re-exports and dynamic imports in each app's source, including tests. Relative imports were resolved to confirm they remain inside their own package. No public imports of removed Admin pages/components/layout/auth/navigation/types/services remain. No cross-package imports were found (955 public imports; 413 Admin imports). Admin uses its own dependencies, Vite/TypeScript configs, assets and build output; it does not depend on frontend source/assets.

All emitted JavaScript, CSS and HTML were scanned: 3 public files and 48 Admin files. Public output contains no `/admin/` route/API markers, Admin auth event, shell/login CSS, Admin dashboard/communications module markers or QR scanner. Admin output has its staff route chunks and no public home/contact/registration route markers. The rebuilt output has no stale Admin chunks in public dist.

- **frontend/dist: Public and attendee only.**
- **admin/dist: Admin only.** Neutral utilities, UI controls and branding are expected in each independent bundle.
- Public `/admin/*` URLs resolve through the catch-all to the public not-found UI. SPA hosting may return HTTP 200 for its HTML fallback; this is not a claim that hosting returns HTTP 404.
- Existing `frontend/dist.zip` was not regenerated and is not the verified deployment artifact. Use the newly built `frontend/dist` and `admin/dist` for the next step.

## Intentionally retained neutral/public code

Retained `components/ui`, common/public layout components, hooks, general utilities, conference data/types, public and attendee services and domain status contracts. These are neutral or used by public flows; unused neutral UI primitives were not removed merely because Admin used them. The light logo remains because the public Media Resources page offers it for download. Student review instructions and statuses remain because attendees need them. Event Pass issuance/status display remains in public payment/recovery services and UI; staff scanning/check-in was removed only from frontend and remains in Admin.

## Remaining public routes

- `/`
- `/about`
- `/conferences`
- `/speakers`
- `/speakers/archive`
- `/exhibition`
- `/registration`
- `/registration/delegate`
- `/registration/payment/callback`
- `/registration/verify-email`
- `/registration/continue`
- `/registration/student-verification`
- `/registration/exhibitor`
- `/registration/sponsor`
- `/registration/abstract`
- `/sponsorship`
- `/sponsorship/associate-sponsor`
- `/sponsorship/knowledge-partner`
- `/sponsorship/exhibitors`
- `/sponsorship/supporting-partners`
- `/sponsorship/media-partners`
- `/media`
- `/contact`
- `/register` → redirects to `/registration`
- `*` → public not-found

## Removed files

Removed directories: `frontend/src/pages/admin/`, `components/admin/`, `layouts/` (only AdminLayout), `context/` (only staff auth), and `services/admin/`, `auth/`, `accreditation/`, `checkIn/`, `communication/`, `report/`. Paths below are the exact inventory, including other removed files.

- `frontend/src/pages/admin/abstracts/AbstractSubmissionDetailPage.tsx`
- `frontend/src/pages/admin/abstracts/AbstractSubmissionsPage.tsx`
- `frontend/src/pages/admin/accreditations/AccreditationDetailPage.tsx`
- `frontend/src/pages/admin/accreditations/AccreditationsPage.tsx`
- `frontend/src/pages/admin/check-in/CheckInPage.tsx`
- `frontend/src/pages/admin/check-in/EventPassScanner.tsx`
- `frontend/src/pages/admin/commercial/CommercialApplicationDetailPage.tsx`
- `frontend/src/pages/admin/commercial/CommercialApplicationsPage.tsx`
- `frontend/src/pages/admin/communications/CommunicationsPages.tsx`
- `frontend/src/pages/admin/communications/ContactsPage.tsx`
- `frontend/src/pages/admin/dashboard/AdminDashboardPage.tsx`
- `frontend/src/pages/admin/dashboard/OverviewSection.tsx`
- `frontend/src/pages/admin/dashboard/RecentActivitySection.tsx`
- `frontend/src/pages/admin/dashboard/SummarySection.tsx`
- `frontend/src/pages/admin/delegates/DelegateDetailPage.tsx`
- `frontend/src/pages/admin/delegates/DelegatesPage.tsx`
- `frontend/src/pages/admin/enquiries/EnquiriesPage.tsx`
- `frontend/src/pages/admin/enquiries/EnquiryDetailPage.tsx`
- `frontend/src/pages/admin/invitations/AcceptInvitationPage.tsx`
- `frontend/src/pages/admin/login/AdminLoginPage.tsx`
- `frontend/src/pages/admin/login/BrandingSection.tsx`
- `frontend/src/pages/admin/login/LoginFormSection.tsx`
- `frontend/src/pages/admin/payments/PaymentDetailPage.tsx`
- `frontend/src/pages/admin/payments/PaymentsPage.tsx`
- `frontend/src/pages/admin/reports/ReportsPage.tsx`
- `frontend/src/pages/admin/student-verifications/StudentVerificationDetailPage.tsx`
- `frontend/src/pages/admin/student-verifications/StudentVerificationsPage.tsx`
- `frontend/src/pages/admin/users/AdminInvitationsPage.tsx`
- `frontend/src/pages/admin/users/UsersPage.tsx`
- `frontend/src/components/admin/AdminFilterBar.tsx`
- `frontend/src/components/admin/adminIcons.ts`
- `frontend/src/components/admin/AdminMetricCard.tsx`
- `frontend/src/components/admin/AdminMobileNav.tsx`
- `frontend/src/components/admin/AdminPageHeader.tsx`
- `frontend/src/components/admin/AdminProfileMenu.tsx`
- `frontend/src/components/admin/AdminSidebar.tsx`
- `frontend/src/components/admin/AdminStatusBadge.tsx`
- `frontend/src/components/admin/AdminTable.tsx`
- `frontend/src/components/admin/adminTheme.ts`
- `frontend/src/components/admin/AdminThemeToggle.tsx`
- `frontend/src/components/admin/AdminTopbar.tsx`
- `frontend/src/components/admin/AuthLoadingScreen.tsx`
- `frontend/src/components/admin/InviteUserModal.tsx`
- `frontend/src/components/admin/PermissionRoute.tsx`
- `frontend/src/components/admin/ProtectedRoute.tsx`
- `frontend/src/layouts/AdminLayout.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/authContextValue.ts`
- `frontend/src/services/admin/adminOverviewService.ts`
- `frontend/src/services/admin/adminUserService.ts`
- `frontend/src/services/auth/authService.ts`
- `frontend/src/services/accreditation/accreditationService.ts`
- `frontend/src/services/checkIn/checkInService.ts`
- `frontend/src/services/communication/communicationService.ts`
- `frontend/src/services/communication/contactService.ts`
- `frontend/src/services/report/reportService.ts`
- `frontend/src/data/adminNavigation.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/lib/adminProfile.ts`
- `frontend/src/types/auth.ts`
- `frontend/src/types/adminUsers.ts`
- `frontend/src/types/accreditation.ts`
- `frontend/public/brand/aiaiac-logo-dark.png`
- `frontend/src/services/abstractSubmission/abstractSubmissionAdminService.ts`
- `frontend/src/services/commercialApplication/commercialApplicationAdminService.ts`
- `frontend/src/services/delegate/delegateAdminService.ts`
- `frontend/src/services/enquiry/enquiryAdminService.ts`
- `frontend/src/services/payment/paymentAdminService.ts`
- `frontend/src/services/studentVerification/studentVerificationAdminService.ts`
- `frontend/src/test/accreditationUi.test.tsx`
- `frontend/src/test/adminAuth.test.tsx`
- `frontend/src/test/adminOverview.test.tsx`
- `frontend/src/test/adminTableRefresh.test.tsx`
- `frontend/src/test/adminUserAccess.test.tsx`
- `frontend/src/test/checkIn.test.tsx`
- `frontend/src/test/communications.test.tsx`
- `frontend/src/test/contactsPage.test.tsx`
- `frontend/src/test/reports.test.tsx`
- `frontend/src/test/superAdminInvitation.test.tsx`
- `frontend/src/test/superAdminPromotion.test.tsx`
- `frontend/src/test/manualPaymentOptionalPayer.test.ts`

## Production decision

**GO**: frontend separation is complete and both applications are independently buildable. Proceed to a separately scoped production-configuration step. Domains, DNS, hosting, environment variables, CORS, cookies, Paystack, Mailjet and backend behavior were not changed. This result is not a claim that the future production configuration is already validated.
