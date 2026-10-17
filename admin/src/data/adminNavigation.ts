import {
  Building2,
  CircleGauge,
  CreditCard,
  FileCheck2,
  FileText,
  Mail,
  Send,
  LayoutTemplate,
  ListChecks,
  GraduationCap,
  Inbox,
  Store,
  TicketCheck,
  UserPlus,
  UsersRound,
  type TablerIcon,
} from "@/components/admin/adminIcons";
import type { Permission } from "@/types/auth";

export interface AdminNavigationItem {
  label: string;
  icon: TablerIcon;
  emoji?: string;
  href?: string;
  permission?: Permission;
  ariaLabel?: string;
}

export interface AdminNavigationGroup {
  label: string;
  items: AdminNavigationItem[];
}

export const adminNavigation: AdminNavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        ariaLabel: "Overview",
        icon: CircleGauge,
        emoji: "📊",
        href: "/admin/dashboard",
        permission: "registrations.read",
      },
    ],
  },
  {
    label: "Registration",
    items: [
      {
        label: "Delegates",
        icon: TicketCheck,
        emoji: "👥",
        href: "/admin/delegates",
        permission: "delegates.read",
      },
      {
        label: "Student Verification",
        icon: GraduationCap,
        emoji: "🎓",
        href: "/admin/student-verifications",
        permission: "student_verifications.read",
      },
    ],
  },
  {
    label: "Commercial",
    items: [
      {
        label: "Sponsors",
        icon: Building2,
        emoji: "🏢",
        href: "/admin/sponsor-applications",
        permission: "sponsors.read",
      },
      {
        label: "Exhibitors",
        icon: Store,
        emoji: "🏬",
        href: "/admin/exhibitor-applications",
        permission: "exhibitors.read",
      },
    ],
  },
  {
    label: "Programme",
    items: [
      {
        label: "Abstracts",
        icon: FileCheck2,
        emoji: "📑",
        href: "/admin/abstract-submissions",
        permission: "abstracts.read",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Accreditations",
        icon: UsersRound,
        emoji: "🎫",
        href: "/admin/accreditations",
        permission: "accreditations.read",
      },
      {
        label: "Event Check-in",
        icon: TicketCheck,
        emoji: "🎟️",
        href: "/admin/check-in",
        permission: "check_in.read",
      },
      {
        label: "Enquiries",
        icon: Inbox,
        emoji: "📥",
        href: "/admin/enquiries",
        permission: "enquiries.read",
      },
    ],
  },
  {
    label: "Communications",
    items: [
      {
        label: "Email Centre",
        icon: Mail,
        emoji: "✉️",
        href: "/admin/communications",
        permission: "communications.read",
      },
      {
        label: "Contacts & Audiences",
        icon: UsersRound,
        emoji: "👥",
        href: "/admin/communications/contacts",
        permission: "communications.read",
      },
      {
        label: "Campaigns",
        icon: Send,
        emoji: "📣",
        href: "/admin/communications/campaigns",
        permission: "communications.read",
      },
      {
        label: "Templates",
        icon: LayoutTemplate,
        emoji: "📋",
        href: "/admin/communications/templates",
        permission: "communications.read",
      },
      {
        label: "Delivery Activity",
        icon: ListChecks,
        emoji: "⚡",
        href: "/admin/communications/deliveries",
        permission: "communications.read",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Payments",
        icon: CreditCard,
        emoji: "💳",
        href: "/admin/payments",
        permission: "payments.read",
      },
    ],
  },
  {
    label: "Reporting",
    items: [
      {
        label: "Reports & Exports",
        icon: FileText,
        emoji: "📈",
        href: "/admin/reports",
        permission: "reports.read",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users & roles",
        ariaLabel: "Users & roles",
        icon: UsersRound,
        emoji: "🛡️",
        href: "/admin/users",
        permission: "users.read",
      },
      {
        label: "Invitations",
        icon: UserPlus,
        emoji: "✉️",
        href: "/admin/users/invitations",
        permission: "users.read",
      },
    ],
  },
];

export function getAdminHomePath(permissions: readonly Permission[]): string {
  return (
    adminNavigation
      .flatMap((group) => group.items)
      .find((item) => item.href && (!item.permission || permissions.includes(item.permission)))
      ?.href ?? "/admin/login"
  );
}
