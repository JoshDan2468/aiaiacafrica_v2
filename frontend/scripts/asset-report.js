import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { technicalChairman, technicalCommittees } from "../src/data/committee.ts";
import { advisoryBoardMembers } from "../src/data/advisoryBoard.ts";
import { organisingCommitteeMembers } from "../src/data/organisingCommittee.ts";
import { heroKeynoteSpeaker } from "../src/data/speakers.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const publicDir = path.resolve(frontendDir, "public");

function checkFileExists(publicPath) {
  if (!publicPath || publicPath.trim() === "" || publicPath.startsWith("http")) {
    return { exists: false, isConfigured: Boolean(publicPath && publicPath.trim() !== "") };
  }
  const relativePath = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const fullPath = path.resolve(publicDir, relativePath);
  return { exists: fs.existsSync(fullPath), isConfigured: true, fullPath };
}

function runAssetReport() {
  console.log("==================================================");
  console.log(" AIAIAC AFRICA 2027 — PORTRAIT AUDIT REPORT");
  console.log("==================================================\n");

  const duplicateMap = new Map();

  function trackPortrait(name, imagePath) {
    if (imagePath && imagePath.trim() !== "") {
      const existing = duplicateMap.get(imagePath) || [];
      existing.push(name);
      duplicateMap.set(imagePath, existing);
    }
  }

  let totalExpectedAll = 0;
  let totalMappedAll = 0;
  let totalMissingAll = 0;

  // Technical Committees Audit
  console.log("1. TECHNICAL COMMITTEES PORTRAITS AUDIT");
  console.log("--------------------------------------------------");

  for (const committee of technicalCommittees) {
    const expectedCount = committee.members.length;
    let mappedCount = 0;
    const missingMembers = [];

    for (const member of committee.members) {
      trackPortrait(member.name, member.image);
      const check = checkFileExists(member.image);
      if (check.exists) {
        mappedCount++;
      } else {
        missingMembers.push(member);
      }
    }

    totalExpectedAll += expectedCount;
    totalMappedAll += mappedCount;
    totalMissingAll += missingMembers.length;

    console.log(`\n📌 ${committee.name} (${committee.slug})`);
    console.log(`   Total Members:       ${expectedCount}`);
    console.log(`   Correctly Mapped:    ${mappedCount}`);
    console.log(`   Initials Fallback:   ${missingMembers.length}`);

    if (missingMembers.length > 0) {
      console.log(`   Members using Initials Fallback (${missingMembers.length}):`);
      for (const m of missingMembers) {
        console.log(`     - [${m.id}] ${m.name} (${m.organisation})`);
      }
    }
  }

  // Advisory Board Audit
  console.log("\n--------------------------------------------------");
  console.log("2. ADVISORY BOARD PORTRAITS AUDIT");
  console.log("--------------------------------------------------");
  let advMapped = 0;
  const advMissing = [];
  for (const member of advisoryBoardMembers) {
    trackPortrait(member.name, member.image);
    const check = checkFileExists(member.image);
    if (check.exists) {
      advMapped++;
    } else {
      advMissing.push(member);
    }
  }

  totalExpectedAll += advisoryBoardMembers.length;
  totalMappedAll += advMapped;
  totalMissingAll += advMissing.length;

  console.log(`\n📌 Advisory Board`);
  console.log(`   Total Members:       ${advisoryBoardMembers.length}`);
  console.log(`   Correctly Mapped:    ${advMapped}`);
  console.log(`   Initials Fallback:   ${advMissing.length}`);

  // Organising Committee Audit
  console.log("\n--------------------------------------------------");
  console.log("3. ORGANISING COMMITTEE PORTRAITS AUDIT");
  console.log("--------------------------------------------------");
  let orgMapped = 0;
  const orgMissing = [];
  for (const member of organisingCommitteeMembers) {
    trackPortrait(member.name, member.image);
    const check = checkFileExists(member.image);
    if (check.exists) {
      orgMapped++;
    } else {
      orgMissing.push(member);
    }
  }

  totalExpectedAll += organisingCommitteeMembers.length;
  totalMappedAll += orgMapped;
  totalMissingAll += orgMissing.length;

  console.log(`\n📌 Organising Committee`);
  console.log(`   Total Members:       ${organisingCommitteeMembers.length}`);
  console.log(`   Correctly Mapped:    ${orgMapped}`);
  console.log(`   Initials Fallback:   ${orgMissing.length}`);

  // Chairman & Keynote Audit
  console.log("\n--------------------------------------------------");
  console.log("4. TECHNICAL CHAIRMAN & KEYNOTE SPEAKER");
  console.log("--------------------------------------------------");
  const chairmanCheck = checkFileExists(technicalChairman.image);
  trackPortrait(technicalChairman.name, technicalChairman.image);
  console.log(
    `👤 Chairman (${technicalChairman.name}): ${chairmanCheck.exists ? "FOUND ✅" : "MISSING ❌"}`,
  );

  const keynoteCheck = checkFileExists(heroKeynoteSpeaker.image);
  trackPortrait(heroKeynoteSpeaker.name, heroKeynoteSpeaker.image);
  console.log(
    `🎤 Keynote (${heroKeynoteSpeaker.name}): ${keynoteCheck.exists ? "FOUND ✅" : "MISSING ❌"}`,
  );

  // Duplicate Portrait Assignments Audit
  console.log("\n--------------------------------------------------");
  console.log("5. DUPLICATE PORTRAIT ASSIGNMENT AUDIT");
  console.log("--------------------------------------------------");
  const duplicates = [];
  for (const [pathStr, names] of duplicateMap.entries()) {
    if (names.length > 1) {
      duplicates.push({ path: pathStr, names });
    }
  }

  if (duplicates.length > 0) {
    console.log(`❌ WARNING: ${duplicates.length} duplicate portrait assignment(s) found:`);
    for (const dup of duplicates) {
      console.log(`   Path: ${dup.path}`);
      console.log(`   Assigned To: ${dup.names.join(", ")}`);
    }
  } else {
    console.log(
      `✅ ZERO duplicate portrait assignments found. All portrait files are uniquely 1-to-1 mapped.`,
    );
  }

  console.log("\n==================================================");
  console.log(" AUDIT REPORT SUMMARY");
  console.log("==================================================");
  console.log(`Total Expected Members (All Groups): ${totalExpectedAll}`);
  console.log(`Total Verified Mapped Portraits:    ${totalMappedAll}`);
  console.log(`Total Safe Initials Fallbacks:       ${totalMissingAll}`);
  console.log(`Duplicate Portrait Assignments:      ${duplicates.length}`);
  console.log("==================================================\n");
}

runAssetReport();
