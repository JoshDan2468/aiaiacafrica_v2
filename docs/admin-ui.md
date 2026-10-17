# Milestone 5C — Admin UI Design System & Visual Refinement

Milestone 5C establishes a cohesive, professional administrative design system for the AIAIAC Africa 2027 operations portal. This milestone focused strictly on presentation, accessibility, visual hierarchy, and bundle optimization. No backend business logic, database migrations, APIs, payment flows, or security mechanisms were modified.

---

## 1. Design Tokens & Visual Hierarchy

The Admin portal transitions from inconsistent utility styling to an authoritative, enterprise operations workspace:

- **Typography**: Clean, sans-serif typography (`Inter`, `font-sans`) across all admin interfaces, replacing editorial serif typefaces used on public brochure pages. Monospace (`font-mono`) is reserved for references, IDs, transaction hashes, timestamps, and currency amounts.
- **Color Palette**:
  - **Sidebar**: Neutral deep dark slate `#05190F` with subtle `slate-800` borders, maintaining contrast and brand identity without visual noise or neon accents.
  - **Canvas & Surfaces**: Light neutral background (`bg-slate-50`), high-contrast white content surfaces (`bg-white border-slate-200 shadow-xs`), and `slate-900` text.
  - **Status Tones**: Semantic badge system:
    - `emerald` (`bg-emerald-50 text-emerald-800 border-emerald-200`): Paid, Confirmed, Approved, Valid, Active.
    - `amber` (`bg-amber-50 text-amber-800 border-amber-200`): Pending, More Information Required, In Review.
    - `rose` (`bg-rose-50 text-rose-800 border-rose-200`): Failed, Rejected, Declined, Revoked, Expired.
    - `sky` (`bg-sky-50 text-sky-800 border-sky-200`): Submitted, Open, Processing.
    - `slate` (`bg-slate-50 text-slate-700 border-slate-200`): Neutral, Inactive, Draft.
- **Visual Restraint**: Removed all decorative gradient meshes, glowing halos, pulse animations, and brochure-style marketing cards.

---

## 2. Reusable Admin Components

A modular component suite standardizes layouts across all admin modules:

- **`AdminSidebar`** (`components/admin/AdminSidebar.tsx`):
  - Categorized navigation hierarchy with section labels (`OVERVIEW`, `REGISTRATION`, `COMMERCIAL`, `PROGRAMME`, `OPERATIONS`, `FINANCE`, `REPORTING`, `ADMINISTRATION`).
  - Active route indicators with left border highlight and light background fill.
  - Server-driven RBAC filtering via `admin.permissions`.
  - Administrator identity card featuring initials avatar, role badge, and quick sign-out.
- **`AdminTopbar` & `AdminProfileMenu`** (`components/admin/AdminTopbar.tsx`):
  - Dynamic breadcrumb path derived from active route.
  - Profile dropdown with account details and sign-out action.
  - Mobile hamburger trigger linked to accessible, focus-trapped `AdminMobileNav`.
- **`AdminPageHeader`** (`components/admin/AdminPageHeader.tsx`):
  - Uniform page header with title, descriptive subtitle, and flexible action slot (e.g., export buttons, invite staff triggers).
- **`AdminTable`** (`components/admin/AdminTable.tsx`):
  - Responsive table container with consistent cell padding, uppercase muted headers, zebra hover rows, and right-aligned numeric data.
  - Includes standardized sub-components: `AdminTableLoadingState`, `AdminTableEmptyState`, and `AdminTableErrorState` with retry callback.
- **`AdminStatusBadge`** (`components/admin/AdminStatusBadge.tsx`):
  - Consistent pill badges with semantic tone mapping and circular status dots.
- **`AdminMetricCard`** (`components/admin/AdminMetricCard.tsx`):
  - Standardized statistical metric cards for dashboard overviews and reporting management summaries.
- **`AdminFilterBar`** (`components/admin/AdminFilterBar.tsx`):
  - Modular filter container supporting text search, select dropdowns, date pickers, and active filter resets.

---

## 3. Navigation Hierarchy & RBAC Mapping

The admin navigation structure (`data/adminNavigation.ts`) maps operational areas directly to backend permissions:

| Category | Item | Route | Required Permission |
| --- | --- | --- | --- |
| **OVERVIEW** | Overview | `/admin/dashboard` | *(Authenticated Admin)* |
| **REGISTRATION** | Delegates | `/admin/delegates` | `delegates.read` |
| | Student verifications | `/admin/student-verifications` | `student_verifications.read` |
| **COMMERCIAL** | Sponsors | `/admin/sponsor-applications` | `sponsors.read` |
| | Exhibitors | `/admin/exhibitor-applications` | `exhibitors.read` |
| **PROGRAMME** | Abstracts | `/admin/abstract-submissions` | `abstracts.read` |
| **OPERATIONS** | Enquiries | `/admin/enquiries` | `enquiries.read` |
| **FINANCE** | Payments | `/admin/payments` | `payments.read` |
| **REPORTING** | Reports & Exports | `/admin/reports` | `reports.read` |
| **ADMINISTRATION** | Users & roles | `/admin/users` | `users.read` |
| | Invitations | `/admin/users/invitations` | `users.read` |

Navigation links render only when the authenticated user possesses the required permission. Server-side middleware remains the sole authoritative gatekeeper for API responses.

---

## 4. Admin Overview & Cleanup Addendum

The Admin Dashboard (`pages/admin/dashboard/AdminDashboardPage.tsx`) was cleaned to focus purely on high-signal operational intelligence:

1. **Removed "System Health & Security" Presentation**:
   - Removed the visible dashboard card containing implementation details ("Active Session", "Admin RBAC Authorization", "Backend API Session").
   - All underlying security safeguards (Argon2id hashing, PostgreSQL session store, 30m idle / 12h absolute timeout, CSRF headers, and server-side RBAC) remain 100% active and enforced.
2. **Removed "Operations Workspace" Shortcuts**:
   - Eliminated redundant quick-links and stale copy that duplicated the primary sidebar navigation.
3. **Streamlined Dashboard Sections**:
   - **Header & Welcome**: Contextual administrator welcome and greeting.
   - **Conference Summary (`SummarySection`)**: Displays all 13 authoritative operational metrics (Total Registrations, Paid Registrations, Pending Payments, Dual-Currency Confirmed Revenue NGN & USD, Sponsor Applications & Confirmed Sponsors, Exhibitor Applications & Confirmed Exhibitors, Abstract Submissions & Pending & Accepted, Open Enquiries).
   - **Recent Activity (`RecentActivitySection`)**: Authoritative, chronological audit stream from the server.

---

## 5. Deprecations & Cleanups

- **Image Mapper Removal**:
  - `ImageMapperPage.tsx` was identified as an obsolete development-time visual alignment tool for committee headshots. It had zero public runtime usages (`data/committee.ts` directly stores static asset paths).
  - The page, route, and navigation entry were completely deleted.
- **Initials Avatar Pattern**:
  - Staff profiles render computed two-letter initials in high-contrast circles. No image upload infrastructure was introduced.

---

## 6. Code Splitting & Performance

To optimize client load times and maintain isolation between the public website and the administrative portal:

- All admin pages and layouts are dynamically loaded via `React.lazy()` in `frontend/src/App.tsx`.
- The nested admin layout wraps page outlets in `<Suspense fallback={<AdminLoadingFallback />}>`.
- The admin login and invitation validation views are wrapped in `<Suspense fallback={<AuthLoadingScreen />}>`.
- Dynamic import splits the administrative suite into separate JS bundles, reducing the initial public bundle size and eliminating unnecessary admin code downloads for regular conference attendees.

