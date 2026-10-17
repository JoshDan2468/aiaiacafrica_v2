import audienceImage from "@/data/AIAC_images/image20.jpg";
import heroImage from "@/data/AIAC_images/image4.jpg";
import introductionImage from "@/data/AIAC_images/image30.jpg";
import regionalImage from "@/data/AIAC_images/image27.jpg";
import technologyImage from "@/data/AIAC_images/image16.jpg";

export interface AboutImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  objectPosition: string;
}

export const aboutMedia = {
  hero: {
    src: heroImage,
    alt: "A panel discussion in progress on the AIAIAC Africa conference stage",
    width: 1968,
    height: 1090,
    objectPosition: "center 48%",
  },
  introduction: {
    src: introductionImage,
    alt: "AIAIAC Africa delegates taking part in the conference opening ceremony",
    width: 1968,
    height: 1970,
    objectPosition: "center 42%",
  },
  technology: {
    src: technologyImage,
    alt: "A technical speaker presenting on the AIAIAC Africa stage",
    width: 1968,
    height: 1158,
    objectPosition: "center",
  },
  audience: {
    src: audienceImage,
    alt: "A group of participants gathered at an AIAIAC Africa conference edition",
    width: 1968,
    height: 1076,
    objectPosition: "center",
  },
  regional: {
    src: regionalImage,
    alt: "AIAIAC participants at an international industry media stand",
    width: 1968,
    height: 1970,
    objectPosition: "center 45%",
  },
} satisfies Record<string, AboutImage>;

export const aboutIntroduction = [
  "AIAIAC Africa is the premier platform for industrial leaders, engineers, innovators and technology partners shaping the future of asset-intensive industries across the continent.",
  "It brings together global expertise and local insight to address critical challenges across asset integrity, operational excellence, and digital transformation.",
  "Through keynote addresses, technical sessions, real-world case studies, and solution showcases, AIAIAC empowers organisations to build safer, smarter, and more resilient industrial operations.",
] as const;

export const aboutPillars = [
  {
    index: "01",
    title: "Asset Integrity",
    subtitle: "Advance reliability and safety",
    description:
      "Advance reliability and safety through data-driven integrity management across the asset lifecycle.",
  },
  {
    index: "02",
    title: "Artificial Intelligence",
    subtitle: "Unlock predictive insights",
    description:
      "Leverage AI and machine learning to unlock insights, predict risk and optimise industrial performance.",
  },
  {
    index: "03",
    title: "Automation",
    subtitle: "Drive efficiency and consistency",
    description:
      "Drive efficiency and consistency with smart automation and integrated operational technologies.",
  },
  {
    index: "04",
    title: "Cybersecurity",
    subtitle: "Strengthen OT resilience",
    description:
      "Strengthen resilience and protect critical systems in an evolving digital threat landscape.",
  },
] as const;

export const whyAiaiacRationale =
  "Africa's industrial future is at a defining moment. AIAIAC addresses a landscape shaped by critical operational imperatives:";

export const whyAiaiacPoints = [
  {
    index: "01",
    title: "Ageing Infrastructure",
    description:
      "Maintaining structural health, reliability, and extended lifecycle performance across legacy industrial assets.",
  },
  {
    index: "02",
    title: "Rising Operating Costs",
    description:
      "Mitigating unplanned downtime, optimizing resource allocation, and driving operational efficiency.",
  },
  {
    index: "03",
    title: "Rapid AI Adoption",
    description:
      "Harnessing machine learning, predictive analytics, and digital twins for intelligent decision-making.",
  },
  {
    index: "04",
    title: "Growing Cybersecurity Threats",
    description:
      "Protecting OT/IT environments, SCADA networks, and critical national infrastructure against digital vulnerabilities.",
  },
  {
    index: "05",
    title: "Demand for Safer & More Efficient Operations",
    description:
      "Enforcing stringent ESG compliance, process safety, and workforce security standards across plants and facilities.",
  },
  {
    index: "06",
    title: "Need for Local Skills, Technology & Investment",
    description:
      "Developing regional technical capabilities, fostering knowledge transfer, and attracting global capital.",
  },
] as const;

export const conferenceExperienceList = [
  {
    title: "Executive Keynote Sessions",
    description:
      "Visionary perspectives from energy ministers, industry executives, and global technology authorities.",
  },
  {
    title: "Four Specialised Conference Tracks",
    description:
      "Deep-dive technical agendas covering Asset Integrity, AI, Automation, and OT Cybersecurity.",
  },
  {
    title: "Technical Presentations",
    description:
      "Peer-reviewed case studies, operational methodologies, and empirical research disclosures.",
  },
  {
    title: "Innovation Showcase",
    description:
      "Live demonstrations of cutting-edge industrial software, robotics, sensors, and security frameworks.",
  },
  {
    title: "Exhibition",
    description:
      "A dynamic floor featuring world-class technology suppliers, service providers, and equipment manufacturers.",
  },
  {
    title: "Executive Roundtables",
    description:
      "Closed-door strategic discussions on policy, investment, and cross-sector industrial collaboration.",
  },
  {
    title: "Strategic Networking",
    description:
      "Structured networking opportunities connecting asset owners, operators, regulators, and innovators.",
  },
] as const;

export const whoAiaiacBringsTogether = [
  {
    title: "Asset Owners & Operators",
    category: "Operations & Facilities",
  },
  {
    title: "Government & Regulators",
    category: "Policy & Standards",
  },
  {
    title: "Oil, Gas & Energy Companies",
    category: "Upstream, Midstream & Power",
  },
  {
    title: "Maritime & Heavy Industries",
    category: "Logistics, Ports & Manufacturing",
  },
  {
    title: "AI & Technology Companies",
    category: "Digital Transformation & Software",
  },
  {
    title: "Engineering & Maintenance Providers",
    category: "Services & EPC Contractors",
  },
  {
    title: "Cybersecurity & Automation Specialists",
    category: "OT Security & Control Systems",
  },
] as const;

export const industryStripSectors = [
  "Oil & Gas",
  "Maritime",
  "Heavy Industries",
  "Utilities",
  "Manufacturing",
  "Banking",
  "AI & Digital Technology",
] as const;
