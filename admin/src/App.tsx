import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { PermissionRoute } from "@/components/admin/PermissionRoute";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthLoadingScreen } from "@/components/admin/AuthLoadingScreen";
import { NotFoundPage } from "@/pages/system/not-found/NotFoundPage";

const AdminDashboardPage = lazy(() =>
  import("@/pages/admin/dashboard/AdminDashboardPage").then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const AdminLoginPage = lazy(() =>
  import("@/pages/admin/login/AdminLoginPage").then((m) => ({ default: m.AdminLoginPage })),
);
const DelegateDetailPage = lazy(() =>
  import("@/pages/admin/delegates/DelegateDetailPage").then((m) => ({
    default: m.DelegateDetailPage,
  })),
);
const DelegatesPage = lazy(() =>
  import("@/pages/admin/delegates/DelegatesPage").then((m) => ({ default: m.DelegatesPage })),
);
const UsersPage = lazy(() =>
  import("@/pages/admin/users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const AdminInvitationsPage = lazy(() =>
  import("@/pages/admin/users/AdminInvitationsPage").then((m) => ({
    default: m.AdminInvitationsPage,
  })),
);
const AcceptInvitationPage = lazy(() =>
  import("@/pages/admin/invitations/AcceptInvitationPage").then((m) => ({
    default: m.AcceptInvitationPage,
  })),
);
const PaymentsPage = lazy(() =>
  import("@/pages/admin/payments/PaymentsPage").then((m) => ({ default: m.PaymentsPage })),
);
const CheckInPage = lazy(() =>
  import("@/pages/admin/check-in/CheckInPage").then((m) => ({ default: m.CheckInPage })),
);
const AccreditationsPage = lazy(() =>
  import("@/pages/admin/accreditations/AccreditationsPage").then((m) => ({
    default: m.AccreditationsPage,
  })),
);
const AccreditationDetailPage = lazy(() =>
  import("@/pages/admin/accreditations/AccreditationDetailPage").then((m) => ({
    default: m.AccreditationDetailPage,
  })),
);
const PaymentDetailPage = lazy(() =>
  import("@/pages/admin/payments/PaymentDetailPage").then((m) => ({
    default: m.PaymentDetailPage,
  })),
);
const StudentVerificationsPage = lazy(() =>
  import("@/pages/admin/student-verifications/StudentVerificationsPage").then((m) => ({
    default: m.StudentVerificationsPage,
  })),
);
const StudentVerificationDetailPage = lazy(() =>
  import("@/pages/admin/student-verifications/StudentVerificationDetailPage").then((m) => ({
    default: m.StudentVerificationDetailPage,
  })),
);
const CommercialApplicationsPage = lazy(() =>
  import("@/pages/admin/commercial/CommercialApplicationsPage").then((m) => ({
    default: m.CommercialApplicationsPage,
  })),
);
const CommercialApplicationDetailPage = lazy(() =>
  import("@/pages/admin/commercial/CommercialApplicationDetailPage").then((m) => ({
    default: m.CommercialApplicationDetailPage,
  })),
);
const AbstractSubmissionsPage = lazy(() =>
  import("@/pages/admin/abstracts/AbstractSubmissionsPage").then((m) => ({
    default: m.AbstractSubmissionsPage,
  })),
);
const AbstractSubmissionDetailPage = lazy(() =>
  import("@/pages/admin/abstracts/AbstractSubmissionDetailPage").then((m) => ({
    default: m.AbstractSubmissionDetailPage,
  })),
);
const EnquiriesPage = lazy(() =>
  import("@/pages/admin/enquiries/EnquiriesPage").then((m) => ({ default: m.EnquiriesPage })),
);
const EnquiryDetailPage = lazy(() =>
  import("@/pages/admin/enquiries/EnquiryDetailPage").then((m) => ({
    default: m.EnquiryDetailPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/pages/admin/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const EmailCentrePage = lazy(() =>
  import("@/pages/admin/communications/CommunicationsPages").then((m) => ({
    default: m.EmailCentrePage,
  })),
);
const ContactsPage = lazy(() =>
  import("@/pages/admin/communications/ContactsPage").then((m) => ({
    default: m.ContactsPage,
  })),
);
const CampaignsPage = lazy(() =>
  import("@/pages/admin/communications/CommunicationsPages").then((m) => ({
    default: m.CampaignsPage,
  })),
);
const CampaignDetailPage = lazy(() =>
  import("@/pages/admin/communications/CommunicationsPages").then((m) => ({
    default: m.CampaignDetailPage,
  })),
);
const TemplatesPage = lazy(() =>
  import("@/pages/admin/communications/CommunicationsPages").then((m) => ({
    default: m.TemplatesPage,
  })),
);
const DeliveryActivityPage = lazy(() =>
  import("@/pages/admin/communications/CommunicationsPages").then((m) => ({
    default: m.DeliveryActivityPage,
  })),
);

// Keep browser-wide behavior here so individual pages only own their page-specific work.
function NavigationEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export function App() {
  // Preserve the current Admin URLs and guards independently of the public route tree.
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavigationEffects />
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<AuthLoadingScreen />}>
                <AdminLoginPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/accept-invite"
            element={
              <Suspense fallback={<AuthLoadingScreen />}>
                <AcceptInvitationPage />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="check-in"
              element={
                <PermissionRoute permission="check_in.read">
                  <CheckInPage />
                </PermissionRoute>
              }
            />
            <Route
              path="accreditations"
              element={
                <PermissionRoute permission="accreditations.read">
                  <AccreditationsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="accreditations/:id"
              element={
                <PermissionRoute permission="accreditations.read">
                  <AccreditationDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications"
              element={
                <PermissionRoute permission="communications.read">
                  <EmailCentrePage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications/contacts"
              element={
                <PermissionRoute permission="communications.read">
                  <ContactsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications/campaigns"
              element={
                <PermissionRoute permission="communications.read">
                  <CampaignsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications/campaigns/:reference"
              element={
                <PermissionRoute permission="communications.read">
                  <CampaignDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications/templates"
              element={
                <PermissionRoute permission="communications.read">
                  <TemplatesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="communications/deliveries"
              element={
                <PermissionRoute permission="communications.read">
                  <DeliveryActivityPage />
                </PermissionRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <PermissionRoute permission="registrations.read">
                  <AdminDashboardPage />
                </PermissionRoute>
              }
            />
            <Route
              path="delegates"
              element={
                <PermissionRoute permission="delegates.read">
                  <DelegatesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="delegates/:id"
              element={
                <PermissionRoute permission="delegates.read">
                  <DelegateDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="users"
              element={
                <PermissionRoute permission="users.read">
                  <UsersPage />
                </PermissionRoute>
              }
            />
            <Route
              path="users/invitations"
              element={
                <PermissionRoute permission="users.read">
                  <AdminInvitationsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="payments"
              element={
                <PermissionRoute permission="payments.read">
                  <PaymentsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="payments/:reference"
              element={
                <PermissionRoute permission="payments.read">
                  <PaymentDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="student-verifications"
              element={
                <PermissionRoute permission="student_verifications.read">
                  <StudentVerificationsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="student-verifications/:reference"
              element={
                <PermissionRoute permission="student_verifications.read">
                  <StudentVerificationDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="sponsor-applications"
              element={
                <PermissionRoute permission="sponsors.read">
                  <CommercialApplicationsPage kind="SPONSOR" />
                </PermissionRoute>
              }
            />
            <Route
              path="sponsor-applications/:reference"
              element={
                <PermissionRoute permission="sponsors.read">
                  <CommercialApplicationDetailPage kind="SPONSOR" />
                </PermissionRoute>
              }
            />
            <Route
              path="exhibitor-applications"
              element={
                <PermissionRoute permission="exhibitors.read">
                  <CommercialApplicationsPage kind="EXHIBITOR" />
                </PermissionRoute>
              }
            />
            <Route
              path="exhibitor-applications/:reference"
              element={
                <PermissionRoute permission="exhibitors.read">
                  <CommercialApplicationDetailPage kind="EXHIBITOR" />
                </PermissionRoute>
              }
            />
            <Route
              path="abstract-submissions"
              element={
                <PermissionRoute permission="abstracts.read">
                  <AbstractSubmissionsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="abstract-submissions/:reference"
              element={
                <PermissionRoute permission="abstracts.read">
                  <AbstractSubmissionDetailPage />
                </PermissionRoute>
              }
            />
            <Route
              path="reports"
              element={
                <PermissionRoute permission="reports.read">
                  <ReportsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="enquiries"
              element={
                <PermissionRoute permission="enquiries.read">
                  <EnquiriesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="enquiries/:reference"
              element={
                <PermissionRoute permission="enquiries.read">
                  <EnquiryDetailPage />
                </PermissionRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
