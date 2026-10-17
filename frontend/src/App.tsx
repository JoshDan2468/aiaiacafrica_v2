import { useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AboutPage } from "@/pages/public/about/AboutPage";
import { ConferencesPage } from "@/pages/public/conferences/ConferencesPage";
import { ContactPage } from "@/pages/public/contact/ContactPage";
import { ExhibitionPage } from "@/pages/public/exhibition/ExhibitionPage";
import { HomePage } from "@/pages/public/home/HomePage";
import { MediaPage } from "@/pages/public/media/MediaPage";
import { SpeakersPage } from "@/pages/public/speakers/SpeakersPage";
import { SpeakersArchivePage } from "@/pages/public/speakers/SpeakersArchivePage";
import { PartnerArchiveCategoryPage } from "@/pages/public/sponsorship/PartnerArchiveCategoryPage";
import { SponsorshipPage } from "@/pages/public/sponsorship/SponsorshipPage";
import { RegistrationPage } from "@/pages/registration/registration/RegistrationPage";
import { DelegateRegistrationPage } from "@/pages/registration/delegate/DelegateRegistrationPage";
import { PaymentCallbackPage } from "@/pages/registration/payment/PaymentCallbackPage";
import { StudentVerificationAccessPage } from "@/pages/registration/student-verification/StudentVerificationAccessPage";
import { EmailVerificationPage } from "@/pages/registration/email-verification/EmailVerificationPage";
import { RegistrationRecoveryPage } from "@/pages/registration/recovery/RegistrationRecoveryPage";
import { SponsorApplicationPage } from "@/pages/registration/sponsor/SponsorApplicationPage";
import { ExhibitorApplicationPage } from "@/pages/registration/exhibitor/ExhibitorApplicationPage";
import { AbstractSubmissionPage } from "@/pages/registration/abstract/AbstractSubmissionPage";
import { NotFoundPage } from "@/pages/system/not-found/NotFoundPage";

// Keep browser-wide behavior here so individual pages only own their page-specific work.
function NavigationEffects() {
  const { pathname, key } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, key]);

  return null;
}

export function App() {
  // This is the website's route map: each URL selects the page React should display.
  return (
    <BrowserRouter>
      <NavigationEffects />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/conferences" element={<ConferencesPage />} />
        <Route path="/speakers" element={<SpeakersPage />} />
        <Route path="/speakers/archive" element={<SpeakersArchivePage />} />
        <Route path="/exhibition" element={<ExhibitionPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/registration/delegate" element={<DelegateRegistrationPage />} />
        <Route path="/registration/payment/callback" element={<PaymentCallbackPage />} />
        <Route path="/registration/verify-email" element={<EmailVerificationPage />} />
        <Route path="/registration/continue" element={<RegistrationRecoveryPage />} />
        <Route
          path="/registration/student-verification"
          element={<StudentVerificationAccessPage />}
        />
        <Route path="/registration/exhibitor" element={<ExhibitorApplicationPage />} />
        <Route path="/registration/sponsor" element={<SponsorApplicationPage />} />
        <Route path="/registration/abstract" element={<AbstractSubmissionPage />} />
        <Route path="/sponsorship" element={<SponsorshipPage />} />
        <Route
          path="/sponsorship/associate-sponsor"
          element={<PartnerArchiveCategoryPage tierId="associate" />}
        />
        <Route
          path="/sponsorship/knowledge-partner"
          element={<PartnerArchiveCategoryPage tierId="knowledge" />}
        />
        <Route
          path="/sponsorship/exhibitors"
          element={<PartnerArchiveCategoryPage tierId="exhibitor" />}
        />
        <Route
          path="/sponsorship/supporting-partners"
          element={<PartnerArchiveCategoryPage tierId="supporting" />}
        />
        <Route
          path="/sponsorship/media-partners"
          element={<PartnerArchiveCategoryPage tierId="media" />}
        />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/register" element={<Navigate to="/registration" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
